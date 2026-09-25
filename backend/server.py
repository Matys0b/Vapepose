from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from uuid import uuid4

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# --- Config ---------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
ACCESS_TTL_MIN = 60 * 12  # 12 hours – POS shift friendly

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="VapePOS API")
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("vapepos")


# --- Helpers --------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid4())


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        "access_token",
        token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TTL_MIN * 60,
        path="/",
    )


async def current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"password_hash": 0, "pin_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    user.pop("_id", None)
    return user


def require_role(*roles: str):
    async def _dep(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, "Forbidden – insufficient role")
        return user
    return _dep


async def audit(actor: dict, action: str, entity: str, entity_id: Optional[str] = None, meta: Optional[dict] = None):
    await db.audit_logs.insert_one({
        "id": new_id(),
        "actor_id": actor.get("id"),
        "actor_name": actor.get("name"),
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "meta": meta or {},
        "at": now_iso(),
    })


# --- Models ---------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class PinLoginIn(BaseModel):
    pin: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: Literal["admin", "manager", "cashier"]
    store_id: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    pin: Optional[str] = None
    role: Literal["admin", "manager", "cashier"] = "cashier"
    store_id: Optional[str] = None


class Category(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0


class CategoryIn(BaseModel):
    name: str
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0


class Product(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    brand: Optional[str] = None
    category_id: Optional[str] = None
    sku: Optional[str] = None
    ean: Optional[str] = None
    price: float
    cost_price: Optional[float] = 0.0
    vat_rate: float = 20.0
    stock: int = 0
    stock_alert: int = 5
    image_url: Optional[str] = None
    is_favorite: bool = False
    variant: Optional[str] = None  # e.g. nicotine level, flavor
    active: bool = True


class ProductIn(BaseModel):
    name: str
    brand: Optional[str] = None
    category_id: Optional[str] = None
    sku: Optional[str] = None
    ean: Optional[str] = None
    price: float
    cost_price: Optional[float] = 0.0
    vat_rate: float = 20.0
    stock: int = 0
    stock_alert: int = 5
    image_url: Optional[str] = None
    is_favorite: bool = False
    variant: Optional[str] = None


class Customer(BaseModel):
    id: str = Field(default_factory=new_id)
    first_name: str
    last_name: Optional[str] = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    qr_token: str = Field(default_factory=lambda: secrets.token_urlsafe(24))
    loyalty_points: int = 0
    created_at: str = Field(default_factory=now_iso)


class CustomerIn(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    email: Optional[str] = None
    phone: Optional[str] = None


class SaleItemIn(BaseModel):
    product_id: str
    quantity: int
    unit_price: float
    discount: float = 0.0  # amount, on this line total
    name: str
    vat_rate: float = 20.0


class PaymentIn(BaseModel):
    method: Literal["card", "cash", "other"]
    amount: float


class SaleIn(BaseModel):
    items: List[SaleItemIn]
    payments: List[PaymentIn]
    global_discount: float = 0.0
    customer_id: Optional[str] = None
    store_id: Optional[str] = None
    register_id: Optional[str] = None
    note: Optional[str] = None


class CashOpenIn(BaseModel):
    opening_amount: float
    store_id: Optional[str] = None
    register_id: Optional[str] = None


class CashCloseIn(BaseModel):
    counted_amount: float
    note: Optional[str] = None


class SuspendedCartIn(BaseModel):
    items: List[SaleItemIn]
    customer_id: Optional[str] = None
    global_discount: float = 0.0
    label: Optional[str] = None


class SupplierIn(BaseModel):
    name: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    note: Optional[str] = None


class StockAdjustIn(BaseModel):
    product_id: str
    delta: int  # +N reception, -N shrink
    reason: str
    supplier_id: Optional[str] = None


# --- Startup: indexes + seed --------------------------------------------
VAPE_CATEGORIES = [
    ("E-liquides", "#EC4899", "Droplet", 1),
    ("Pods", "#8B5CF6", "Zap", 2),
    ("Kits", "#06B6D4", "Package", 3),
    ("Box", "#10B981", "Square", 4),
    ("Résistances", "#F59E0B", "Coil", 5),
    ("Cartouches", "#F43F5E", "Layers", 6),
    ("Boosters", "#A855F7", "Battery", 7),
    ("DIY / Bases", "#3B82F6", "FlaskConical", 8),
    ("Accessoires", "#64748B", "Wrench", 9),
    ("Batteries", "#EAB308", "BatteryCharging", 10),
]

SEED_PRODUCTS_TEMPLATE = [
    # (name, brand, cat_name, price, ean, stock, variant, favorite, image)
    ("Red Astaire 50ml", "T-Juice", "E-liquides", 19.90, "3760001000011", 24, "0mg", True,
     "https://images.unsplash.com/photo-1715613814847-a124f06fcf3a?w=400"),
    ("Sub Zero 10ml", "Halo", "E-liquides", 5.90, "3760001000028", 60, "6mg", True, None),
    ("Fruits Rouges 10ml", "Alfaliquid", "E-liquides", 5.50, "3760001000035", 40, "12mg", False, None),
    ("Menthe Glaciale 10ml", "Liquideo", "E-liquides", 5.50, "3760001000042", 35, "3mg", True, None),
    ("Vanille Custard 50ml", "Curieux", "E-liquides", 21.90, "3760001000059", 15, "0mg", False, None),
    ("Drag X Kit", "Voopoo", "Kits", 49.90, "3760001000066", 8, "Noir", True,
     "https://images.unsplash.com/photo-1715613812185-4496341f236c?w=400"),
    ("Argus P1 Pod", "Voopoo", "Pods", 24.90, "3760001000073", 12, "Bleu", True,
     "https://images.unsplash.com/photo-1715613813943-af12c13b07d6?w=400"),
    ("Caliburn A2S", "Uwell", "Pods", 22.90, "3760001000080", 10, "Argent", False, None),
    ("Drag S2 Box", "Voopoo", "Box", 59.90, "3760001000097", 6, "Silver", False,
     "https://images.unsplash.com/photo-1715613814819-dac39808e80f?w=400"),
    ("Résistance PnP 0.3", "Voopoo", "Résistances", 12.90, "3760001000103", 30, "5 pcs", True, None),
    ("Résistance GTX 0.2", "Vaporesso", "Résistances", 13.90, "3760001000110", 22, "5 pcs", False, None),
    ("Cartouche Caliburn G", "Uwell", "Cartouches", 8.90, "3760001000127", 25, "2 pcs", False, None),
    ("Booster Nicotine 20mg", "Nicoshoot", "Boosters", 0.80, "3760001000134", 200, "10ml", True, None),
    ("Base DIY 50/50 1L", "Inawera", "DIY / Bases", 19.90, "3760001000141", 4, "1L", False, None),
    ("Chargeur USB-C 2A", "Générique", "Accessoires", 9.90, "3760001000158", 18, None, False, None),
    ("Coton Bacon Bits", "Cotton Bacon", "Accessoires", 6.90, "3760001000165", 20, None, False, None),
    ("Accu 18650 3000mAh", "Sony", "Batteries", 12.90, "3760001000172", 14, "VTC6", True, None),
]


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.products.create_index("id", unique=True)
    await db.products.create_index("ean")
    await db.products.create_index("sku")
    await db.customers.create_index("id", unique=True)
    await db.customers.create_index("qr_token", unique=True)
    await db.categories.create_index("id", unique=True)
    await db.sales.create_index("id", unique=True)
    await db.sales.create_index("created_at")
    await db.cash_sessions.create_index("id", unique=True)
    await db.stores.create_index("id", unique=True)


async def seed():
    # Stores
    if await db.stores.count_documents({}) == 0:
        await db.stores.insert_many([
            {"id": new_id(), "name": "Pouzauges", "code": "POU", "created_at": now_iso()},
            {"id": new_id(), "name": "Chantonnay", "code": "CHA", "created_at": now_iso()},
        ])
    stores = await db.stores.find({}, {"_id": 0}).to_list(10)
    default_store = stores[0]["id"] if stores else None

    # Users
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@vapepos.local")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "admin123")
    admin_name = os.environ.get("ADMIN_NAME", "Owner")
    seed_users = [
        {"email": admin_email, "name": admin_name, "role": "admin", "password": admin_pw, "pin": "9999"},
        {"email": "manager@vapepos.local", "name": "Manager", "role": "manager", "password": "Manager2026!", "pin": "2580"},
        {"email": "vendeur@vapepos.local", "name": "Thomas V.", "role": "cashier", "password": "Vendeur2026!", "pin": "1234"},
        {"email": "vendeur2@vapepos.local", "name": "Lucie B.", "role": "cashier", "password": "Vendeur2026!", "pin": "4321"},
    ]
    for u in seed_users:
        existing = await db.users.find_one({"email": u["email"]})
        doc = {
            "id": new_id(),
            "email": u["email"].lower(),
            "name": u["name"],
            "role": u["role"],
            "store_id": default_store,
            "password_hash": hash_password(u["password"]),
            "pin_hash": hash_password(u["pin"]) if u.get("pin") else None,
            "created_at": now_iso(),
        }
        if not existing:
            await db.users.insert_one(doc)
        else:
            # keep id, refresh password + pin so env-driven credentials stay valid
            await db.users.update_one(
                {"email": u["email"].lower()},
                {"$set": {
                    "password_hash": doc["password_hash"],
                    "pin_hash": doc["pin_hash"],
                    "name": u["name"],
                    "role": u["role"],
                }},
            )

    # Categories
    cat_map = {}
    for name, color, icon, order in VAPE_CATEGORIES:
        existing = await db.categories.find_one({"name": name})
        if existing:
            cat_map[name] = existing["id"]
        else:
            cid = new_id()
            await db.categories.insert_one({"id": cid, "name": name, "color": color, "icon": icon, "sort_order": order})
            cat_map[name] = cid

    # Products
    if await db.products.count_documents({}) == 0:
        docs = []
        for (name, brand, cat_name, price, ean, stock, variant, fav, image) in SEED_PRODUCTS_TEMPLATE:
            docs.append({
                "id": new_id(),
                "name": name,
                "brand": brand,
                "category_id": cat_map.get(cat_name),
                "sku": ean,
                "ean": ean,
                "price": price,
                "cost_price": round(price * 0.55, 2),
                "vat_rate": 20.0,
                "stock": stock,
                "stock_alert": 5,
                "image_url": image,
                "is_favorite": fav,
                "variant": variant,
                "active": True,
                "created_at": now_iso(),
            })
        await db.products.insert_many(docs)

    # Customers
    if await db.customers.count_documents({}) == 0:
        await db.customers.insert_many([
            {"id": new_id(), "first_name": "Lucie", "last_name": "Bernard", "email": "lucie@example.com", "phone": "0612345678",
             "qr_token": secrets.token_urlsafe(24), "loyalty_points": 140, "created_at": now_iso()},
            {"id": new_id(), "first_name": "Matys", "last_name": "Durand", "email": "matys@example.com", "phone": "0623456789",
             "qr_token": secrets.token_urlsafe(24), "loyalty_points": 240, "created_at": now_iso()},
        ])

    # Loyalty rules doc
    if await db.app_settings.count_documents({"key": "loyalty"}) == 0:
        await db.app_settings.insert_one({"key": "loyalty", "euro_per_point": 1.0, "point_value_euro": 0.05})


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await seed()
    log.info("VapePOS backend started")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# --- Auth endpoints -------------------------------------------------------
@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email ou mot de passe invalide")
    token = make_token(user["id"], user["role"])
    set_auth_cookie(response, token)
    return {
        "id": user["id"], "email": user["email"], "name": user["name"],
        "role": user["role"], "store_id": user.get("store_id"), "token": token,
    }


@api.post("/auth/pin-login")
async def pin_login(body: PinLoginIn, response: Response):
    async for u in db.users.find({"pin_hash": {"$ne": None}}):
        if u.get("pin_hash") and verify_password(body.pin, u["pin_hash"]):
            token = make_token(u["id"], u["role"])
            set_auth_cookie(response, token)
            return {
                "id": u["id"], "email": u["email"], "name": u["name"],
                "role": u["role"], "store_id": u.get("store_id"), "token": token,
            }
    raise HTTPException(401, "PIN incorrect")


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return user


# --- Users ---------------------------------------------------------------
@api.get("/users")
async def list_users(user: dict = Depends(require_role("admin", "manager"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(500)
    return users


@api.post("/users")
async def create_user(body: UserCreate, actor: dict = Depends(require_role("admin"))):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email déjà utilisé")
    doc = {
        "id": new_id(),
        "email": body.email.lower(),
        "name": body.name,
        "role": body.role,
        "store_id": body.store_id,
        "password_hash": hash_password(body.password),
        "pin_hash": hash_password(body.pin) if body.pin else None,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await audit(actor, "user.create", "users", doc["id"], {"email": doc["email"]})
    return {"id": doc["id"], "email": doc["email"], "name": doc["name"], "role": doc["role"]}


# --- Stores --------------------------------------------------------------
@api.get("/stores")
async def list_stores(user: dict = Depends(current_user)):
    return await db.stores.find({}, {"_id": 0}).to_list(50)


# --- Categories ----------------------------------------------------------
@api.get("/categories")
async def list_categories(user: dict = Depends(current_user)):
    return await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(200)


@api.post("/categories")
async def create_category(body: CategoryIn, actor: dict = Depends(require_role("admin", "manager"))):
    doc = Category(**body.model_dump()).model_dump()
    await db.categories.insert_one(doc)
    return doc


# --- Products ------------------------------------------------------------
@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    category_id: Optional[str] = None,
    favorite: Optional[bool] = None,
    limit: int = 500,
    user: dict = Depends(current_user),
):
    query: dict = {"active": True}
    if category_id:
        query["category_id"] = category_id
    if favorite is not None:
        query["is_favorite"] = favorite
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"name": rx}, {"brand": rx}, {"sku": rx}, {"ean": rx}, {"variant": rx}]
    return await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)


@api.get("/products/lookup")
async def lookup_product(code: str, user: dict = Depends(current_user)):
    p = await db.products.find_one({"$or": [{"ean": code}, {"sku": code}]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Produit introuvable")
    return p


@api.post("/products")
async def create_product(body: ProductIn, actor: dict = Depends(require_role("admin", "manager"))):
    doc = Product(**body.model_dump()).model_dump()
    doc["created_at"] = now_iso()
    await db.products.insert_one(doc)
    await audit(actor, "product.create", "products", doc["id"], {"name": doc["name"]})
    return doc


@api.put("/products/{pid}")
async def update_product(pid: str, body: ProductIn, actor: dict = Depends(require_role("admin", "manager"))):
    res = await db.products.update_one({"id": pid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Produit introuvable")
    await audit(actor, "product.update", "products", pid, body.model_dump())
    return await db.products.find_one({"id": pid}, {"_id": 0})


@api.delete("/products/{pid}")
async def delete_product(pid: str, actor: dict = Depends(require_role("admin"))):
    await db.products.update_one({"id": pid}, {"$set": {"active": False}})
    await audit(actor, "product.delete", "products", pid)
    return {"ok": True}


# --- Customers -----------------------------------------------------------
@api.get("/customers")
async def list_customers(q: Optional[str] = None, user: dict = Depends(current_user)):
    query: dict = {}
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"first_name": rx}, {"last_name": rx}, {"email": rx}, {"phone": rx}]
    return await db.customers.find(query, {"_id": 0}).limit(200).to_list(200)


@api.get("/customers/qr/{token}")
async def customer_by_qr(token: str, user: dict = Depends(current_user)):
    c = await db.customers.find_one({"qr_token": token}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Client introuvable")
    return c


@api.post("/customers")
async def create_customer(body: CustomerIn, user: dict = Depends(current_user)):
    doc = Customer(**body.model_dump()).model_dump()
    await db.customers.insert_one(doc)
    return doc


@api.get("/customers/{cid}")
async def get_customer(cid: str, user: dict = Depends(current_user)):
    c = await db.customers.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Client introuvable")
    # attach recent sales
    sales = await db.sales.find({"customer_id": cid}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    c["recent_sales"] = sales
    return c


# --- Cash sessions -------------------------------------------------------
@api.get("/cash-sessions/current")
async def current_session(user: dict = Depends(current_user)):
    sess = await db.cash_sessions.find_one({"user_id": user["id"], "closed_at": None}, {"_id": 0})
    return sess or None


@api.post("/cash-sessions/open")
async def open_session(body: CashOpenIn, user: dict = Depends(current_user)):
    existing = await db.cash_sessions.find_one({"user_id": user["id"], "closed_at": None})
    if existing:
        raise HTTPException(400, "Une session est déjà ouverte")
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user["name"],
        "store_id": body.store_id or user.get("store_id"),
        "register_id": body.register_id or "R1",
        "opening_amount": body.opening_amount,
        "opened_at": now_iso(),
        "closed_at": None,
        "counted_amount": None,
        "expected_amount": None,
        "cash_sales_total": 0.0,
        "card_sales_total": 0.0,
        "other_sales_total": 0.0,
        "total_sales": 0.0,
        "sales_count": 0,
    }
    await db.cash_sessions.insert_one(doc)
    await audit(user, "cash.open", "cash_sessions", doc["id"], {"opening_amount": body.opening_amount})
    doc.pop("_id", None)
    return doc


@api.post("/cash-sessions/close")
async def close_session(body: CashCloseIn, user: dict = Depends(current_user)):
    sess = await db.cash_sessions.find_one({"user_id": user["id"], "closed_at": None})
    if not sess:
        raise HTTPException(400, "Aucune session ouverte")
    expected = sess["opening_amount"] + sess["cash_sales_total"]
    diff = round(body.counted_amount - expected, 2)
    await db.cash_sessions.update_one(
        {"id": sess["id"]},
        {"$set": {
            "closed_at": now_iso(),
            "counted_amount": body.counted_amount,
            "expected_amount": expected,
            "difference": diff,
            "note": body.note,
        }},
    )
    await audit(user, "cash.close", "cash_sessions", sess["id"], {"counted": body.counted_amount, "diff": diff})
    updated = await db.cash_sessions.find_one({"id": sess["id"]}, {"_id": 0})
    return updated


@api.get("/cash-sessions")
async def list_sessions(limit: int = 30, user: dict = Depends(require_role("admin", "manager"))):
    return await db.cash_sessions.find({}, {"_id": 0}).sort("opened_at", -1).limit(limit).to_list(limit)


# --- Sales ---------------------------------------------------------------
def _compute_totals(items: List[SaleItemIn], global_discount: float):
    subtotal = 0.0
    vat_total = 0.0
    for it in items:
        line = it.unit_price * it.quantity - it.discount
        subtotal += line
        vat_total += line - (line / (1 + it.vat_rate / 100))
    total = round(subtotal - global_discount, 2)
    vat_total = round(vat_total, 2)
    subtotal = round(subtotal, 2)
    return subtotal, vat_total, total


async def _next_sale_number() -> str:
    year = datetime.now(timezone.utc).strftime("%Y")
    counter = await db.counters.find_one_and_update(
        {"key": f"sale-{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter["seq"] if counter else 1
    return f"{year}-{seq:06d}"


@api.post("/sales")
async def create_sale(body: SaleIn, user: dict = Depends(current_user)):
    if not body.items:
        raise HTTPException(400, "Panier vide")
    subtotal, vat_total, total = _compute_totals(body.items, body.global_discount)
    paid = round(sum(p.amount for p in body.payments), 2)
    if paid + 0.001 < total:
        raise HTTPException(400, f"Paiement insuffisant ({paid}€ < {total}€)")

    sess = await db.cash_sessions.find_one({"user_id": user["id"], "closed_at": None})

    sale_id = new_id()
    sale_number = await _next_sale_number()
    change_due = round(max(0.0, paid - total), 2)

    # decrement stock
    for it in body.items:
        await db.products.update_one({"id": it.product_id}, {"$inc": {"stock": -it.quantity}})
        await db.stock_movements.insert_one({
            "id": new_id(),
            "product_id": it.product_id,
            "delta": -it.quantity,
            "reason": "sale",
            "sale_id": sale_id,
            "at": now_iso(),
            "user_id": user["id"],
        })

    # loyalty
    loyalty_added = 0
    if body.customer_id:
        settings = await db.app_settings.find_one({"key": "loyalty"}) or {"euro_per_point": 1.0}
        loyalty_added = int(total // settings.get("euro_per_point", 1.0))
        if loyalty_added > 0:
            await db.customers.update_one({"id": body.customer_id}, {"$inc": {"loyalty_points": loyalty_added}})
            await db.loyalty_transactions.insert_one({
                "id": new_id(), "customer_id": body.customer_id, "delta": loyalty_added,
                "reason": "sale", "sale_id": sale_id, "at": now_iso(),
            })

    cash_total = sum(p.amount for p in body.payments if p.method == "cash")
    card_total = sum(p.amount for p in body.payments if p.method == "card")
    other_total = sum(p.amount for p in body.payments if p.method == "other")

    sale_doc = {
        "id": sale_id,
        "number": sale_number,
        "items": [it.model_dump() for it in body.items],
        "payments": [p.model_dump() for p in body.payments],
        "global_discount": body.global_discount,
        "subtotal": subtotal,
        "vat_total": vat_total,
        "total": total,
        "paid": paid,
        "change_due": change_due,
        "customer_id": body.customer_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "store_id": body.store_id or user.get("store_id"),
        "register_id": body.register_id,
        "session_id": sess["id"] if sess else None,
        "loyalty_added": loyalty_added,
        "created_at": now_iso(),
        "status": "completed",
        "note": body.note,
    }
    await db.sales.insert_one(sale_doc)

    if sess:
        await db.cash_sessions.update_one({"id": sess["id"]}, {"$inc": {
            "cash_sales_total": cash_total,
            "card_sales_total": card_total,
            "other_sales_total": other_total,
            "total_sales": total,
            "sales_count": 1,
        }})

    await audit(user, "sale.create", "sales", sale_id, {"number": sale_number, "total": total})
    sale_doc.pop("_id", None)
    return sale_doc


@api.get("/sales")
async def list_sales(
    limit: int = 50,
    customer_id: Optional[str] = None,
    user: dict = Depends(current_user),
):
    q: dict = {}
    if customer_id:
        q["customer_id"] = customer_id
    return await db.sales.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


@api.get("/sales/{sid}")
async def get_sale(sid: str, user: dict = Depends(current_user)):
    s = await db.sales.find_one({"id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Vente introuvable")
    if s.get("customer_id"):
        s["customer"] = await db.customers.find_one({"id": s["customer_id"]}, {"_id": 0, "qr_token": 0})
    return s


@api.post("/sales/{sid}/refund")
async def refund_sale(sid: str, actor: dict = Depends(require_role("admin", "manager"))):
    s = await db.sales.find_one({"id": sid})
    if not s:
        raise HTTPException(404, "Vente introuvable")
    if s.get("status") == "refunded":
        raise HTTPException(400, "Déjà remboursée")
    # restock
    for it in s["items"]:
        await db.products.update_one({"id": it["product_id"]}, {"$inc": {"stock": it["quantity"]}})
        await db.stock_movements.insert_one({
            "id": new_id(), "product_id": it["product_id"], "delta": it["quantity"],
            "reason": "refund", "sale_id": sid, "at": now_iso(), "user_id": actor["id"],
        })
    await db.sales.update_one({"id": sid}, {"$set": {"status": "refunded", "refunded_at": now_iso()}})
    await audit(actor, "sale.refund", "sales", sid, {"total": s["total"]})
    return {"ok": True}


# --- Suspended carts -----------------------------------------------------
@api.get("/suspended-carts")
async def list_suspended(user: dict = Depends(current_user)):
    return await db.suspended_carts.find({"resumed_at": None}, {"_id": 0}).sort("created_at", -1).to_list(50)


@api.post("/suspended-carts")
async def suspend_cart(body: SuspendedCartIn, user: dict = Depends(current_user)):
    doc = {
        "id": new_id(),
        "items": [it.model_dump() for it in body.items],
        "customer_id": body.customer_id,
        "global_discount": body.global_discount,
        "label": body.label,
        "user_id": user["id"],
        "user_name": user["name"],
        "created_at": now_iso(),
        "resumed_at": None,
    }
    await db.suspended_carts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/suspended-carts/{cid}")
async def resume_or_delete_suspended(cid: str, user: dict = Depends(current_user)):
    await db.suspended_carts.update_one({"id": cid}, {"$set": {"resumed_at": now_iso()}})
    return {"ok": True}


# --- Stock / Suppliers ---------------------------------------------------
@api.post("/stock/adjust")
async def stock_adjust(body: StockAdjustIn, actor: dict = Depends(require_role("admin", "manager"))):
    p = await db.products.find_one({"id": body.product_id})
    if not p:
        raise HTTPException(404, "Produit introuvable")
    await db.products.update_one({"id": body.product_id}, {"$inc": {"stock": body.delta}})
    await db.stock_movements.insert_one({
        "id": new_id(), "product_id": body.product_id, "delta": body.delta,
        "reason": body.reason, "supplier_id": body.supplier_id, "at": now_iso(), "user_id": actor["id"],
    })
    await audit(actor, "stock.adjust", "products", body.product_id, {"delta": body.delta, "reason": body.reason})
    return await db.products.find_one({"id": body.product_id}, {"_id": 0})


@api.get("/stock/movements")
async def stock_movements(limit: int = 100, user: dict = Depends(require_role("admin", "manager"))):
    return await db.stock_movements.find({}, {"_id": 0}).sort("at", -1).limit(limit).to_list(limit)


@api.get("/suppliers")
async def list_suppliers(user: dict = Depends(current_user)):
    return await db.suppliers.find({}, {"_id": 0}).to_list(200)


@api.post("/suppliers")
async def create_supplier(body: SupplierIn, actor: dict = Depends(require_role("admin", "manager"))):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.suppliers.insert_one(doc)
    return doc


# --- Dashboard -----------------------------------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(require_role("admin", "manager"))):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    day_sales = await db.sales.find({"created_at": {"$gte": today}, "status": "completed"}, {"_id": 0}).to_list(2000)
    total_ca = round(sum(s["total"] for s in day_sales), 2)
    count = len(day_sales)
    avg = round(total_ca / count, 2) if count else 0.0

    low_stock = await db.products.find({"active": True, "$expr": {"$lte": ["$stock", "$stock_alert"]}}, {"_id": 0}).limit(20).to_list(20)
    total_customers = await db.customers.count_documents({})

    # Top products (last 30 sales)
    recent = await db.sales.find({"status": "completed"}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    counter: dict = {}
    for s in recent:
        for it in s["items"]:
            counter[it["product_id"]] = counter.get(it["product_id"], 0) + it["quantity"]
    top_ids = sorted(counter.items(), key=lambda x: -x[1])[:5]
    top = []
    for pid, qty in top_ids:
        p = await db.products.find_one({"id": pid}, {"_id": 0})
        if p:
            top.append({"product": p, "qty": qty})

    return {
        "day_total": total_ca,
        "day_count": count,
        "day_avg": avg,
        "low_stock": low_stock,
        "total_customers": total_customers,
        "top_products": top,
    }


# --- Loyalty settings ----------------------------------------------------
@api.get("/loyalty/settings")
async def loyalty_settings(user: dict = Depends(current_user)):
    doc = await db.app_settings.find_one({"key": "loyalty"}, {"_id": 0}) or {"euro_per_point": 1.0, "point_value_euro": 0.05}
    return doc


# --- Health --------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "VapePOS API", "ok": True}


app.include_router(api)
