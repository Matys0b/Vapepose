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
from fastapi.responses import FileResponse
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


CUSTOMER_TTL_MIN = 60 * 24 * 30  # 30 days


def make_customer_token(customer_id: str) -> str:
    payload = {
        "sub": customer_id,
        "type": "customer",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=CUSTOMER_TTL_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def current_customer(request: Request) -> dict:
    token = request.cookies.get("customer_token")
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
    if payload.get("type") != "customer":
        raise HTTPException(401, "Not a customer token")
    c = await db.customers.find_one({"id": payload["sub"]}, {"password_hash": 0})
    if not c:
        raise HTTPException(401, "Customer not found")
    c.pop("_id", None)
    return c


def set_customer_cookie(response: Response, token: str):
    response.set_cookie(
        "customer_token", token,
        httponly=True, secure=True, samesite="none",
        max_age=CUSTOMER_TTL_MIN * 60, path="/",
    )


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
    email: str
    password: str


class PinLoginIn(BaseModel):
    pin: str


class UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: Literal["admin", "manager", "cashier"]
    store_id: Optional[str] = None


class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    pin: Optional[str] = None
    role: Literal["admin", "manager", "cashier"] = "cashier"
    store_id: Optional[str] = None


class Category(BaseModel):
    id: str = Field(default_factory=new_id)
    name: str
    parent_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0


class CategoryIn(BaseModel):
    name: str
    parent_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0


class ProductImportRow(BaseModel):
    name: str
    brand: Optional[str] = None
    category_path: Optional[str] = None  # "E-liquides/50ml"
    sku: Optional[str] = None
    ean: Optional[str] = None
    price: float = 0.0
    cost_price: Optional[float] = 0.0
    vat_rate: float = 20.0
    stock: int = 0
    stock_alert: int = 5
    variant: Optional[str] = None
    image_url: Optional[str] = None
    is_favorite: bool = False


class ProductImportIn(BaseModel):
    rows: List[ProductImportRow]
    upsert_by: Literal["ean", "sku", "name"] = "ean"
    apply_to_all_stores: bool = False
    auto_fetch_images: bool = False


class ReorderItem(BaseModel):
    id: str
    sort_order: int
    parent_id: Optional[str] = None  # categories only; "root" to move to root, None to leave unchanged


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
    sort_order: int = 0
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
    sort_order: int = 0


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
    applied_reward_id: Optional[str] = None


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
    await db.products.create_index([("store_id", 1), ("ean", 1)])
    await db.products.create_index([("store_id", 1), ("sku", 1)])
    await db.products.create_index([("store_id", 1), ("active", 1), ("category_id", 1), ("sort_order", 1)])
    await db.products.create_index([("store_id", 1), ("active", 1), ("is_favorite", 1), ("sort_order", 1)])
    await db.products.create_index([("store_id", 1), ("active", 1), ("name", 1)])
    await db.products.create_index("ean")
    await db.products.create_index("sku")
    # Text index for fast full-text search on the catalog
    try:
        await db.products.create_index(
            [("name", "text"), ("brand", "text"), ("variant", "text"), ("sku", "text"), ("ean", "text")],
            name="products_text",
            default_language="french",
            weights={"name": 10, "brand": 5, "variant": 3, "sku": 2, "ean": 2},
        )
    except Exception:
        pass
    await db.customers.create_index("id", unique=True)
    await db.customers.create_index("qr_token", unique=True)
    await db.notifications.create_index([("target_type", 1), ("target_id", 1), ("at", -1)])
    await db.notifications.create_index("id", unique=True)
    await db.categories.create_index("id", unique=True)
    await db.categories.create_index([("parent_id", 1), ("sort_order", 1)])
    await db.sales.create_index("id", unique=True)
    await db.sales.create_index("created_at")
    await db.sales.create_index([("store_id", 1), ("status", 1), ("created_at", -1)])
    await db.sales.create_index("customer_id")
    await db.stock_movements.create_index([("product_id", 1), ("at", -1)])
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
        {"email": "mathis@vapepos.local", "name": "Mathis", "role": "admin", "password": "vapepos", "pin": "1111", "color": "#8B5CF6"},
        {"email": "emma@vapepos.local", "name": "Emma", "role": "admin", "password": "vapepos", "pin": "2222", "color": "#EC4899"},
        {"email": "jessica@vapepos.local", "name": "Jessica", "role": "admin", "password": "vapepos", "pin": "3333", "color": "#06B6D4"},
        {"email": "rautureau.m85@gmail.com", "name": "Rautureau", "role": "admin", "password": "Freddy030884!", "pin": None, "color": "#F97316"},
    ]
    for u in seed_users:
        existing = await db.users.find_one({"email": u["email"]})
        doc = {
            "id": new_id(),
            "email": u["email"].lower(),
            "name": u["name"],
            "role": u["role"],
            "store_id": None,  # user picks at login
            "color": u.get("color"),
            "password_hash": hash_password(u["password"]),
            "pin_hash": hash_password(u["pin"]) if u.get("pin") else None,
            "created_at": now_iso(),
        }
        if not existing:
            await db.users.insert_one(doc)
        else:
            await db.users.update_one(
                {"email": u["email"].lower()},
                {"$set": {
                    "password_hash": doc["password_hash"],
                    "pin_hash": doc["pin_hash"],
                    "name": u["name"],
                    "role": u["role"],
                    "color": u.get("color"),
                }},
            )

    # Categories — legacy demo seed. Only runs if the catalog is completely empty,
    # otherwise the client's imported categories are the source of truth.
    cat_map = {}
    if await db.categories.count_documents({}) == 0:
        for name, color, icon, order in VAPE_CATEGORIES:
            existing = await db.categories.find_one({"name": name, "parent_id": None})
            if existing:
                cat_map[name] = existing["id"]
            else:
                cid = new_id()
                await db.categories.insert_one({"id": cid, "name": name, "parent_id": None, "color": color, "icon": icon, "sort_order": order})
                cat_map[name] = cid

    # Sub-categories (seed a few realistic ones so the tree isn't flat)
    SUB_CATEGORIES = [
        ("E-liquides",   [("10ml", 1), ("50ml", 2), ("100ml", 3), ("Sels de nicotine", 4)]),
        ("Kits",         [("Débutant", 1), ("Confirmé", 2), ("Expert", 3)]),
        ("Pods",         [("Ouverts", 1), ("Fermés", 2)]),
        ("Résistances",  [("Voopoo", 1), ("Vaporesso", 2), ("Uwell", 3), ("Smok", 4)]),
        ("Accessoires",  [("Coton", 1), ("Chargeurs", 2), ("Housses", 3), ("Câbles", 4)]),
        ("DIY / Bases",  [("Base 50/50", 1), ("Base 70/30", 2), ("Arômes concentrés", 3)]),
    ]
    for parent_name, subs in SUB_CATEGORIES:
        parent_id = cat_map.get(parent_name)
        if not parent_id:
            continue
        for sub_name, order in subs:
            key = f"{parent_name}/{sub_name}"
            if key in cat_map:
                continue
            existing = await db.categories.find_one({"name": sub_name, "parent_id": parent_id})
            if existing:
                cat_map[key] = existing["id"]
            else:
                cid = new_id()
                await db.categories.insert_one({"id": cid, "name": sub_name, "parent_id": parent_id, "sort_order": order})
                cat_map[key] = cid

    # Products — duplicated per store so each shop has its own stock.
    # NOTE: real catalog is loaded via /tmp/import_products.py from the client Excel file.
    # This demo block only runs when the catalog is fully empty (never on production).
    if await db.products.count_documents({}) == 0 and False:
        docs = []
        for st in stores:
            variance = 1.0 if st["code"] == "POU" else 0.8
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
                    "stock": max(0, int(stock * variance)),
                    "stock_alert": 5,
                    "image_url": image,
                    "is_favorite": fav,
                    "variant": variant,
                    "active": True,
                    "store_id": st["id"],
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


async def bootstrap_reset():
    """One-time destructive reset to switch to the 3-account per-store schema."""
    flag = await db.app_settings.find_one({"key": "bootstrap_reset_v3"})
    if flag:
        return
    for coll in ("users", "products", "sales", "stock_movements", "cash_sessions",
                 "suspended_carts", "expenses", "audit_logs", "counters",
                 "loyalty_transactions"):
        await db[coll].delete_many({})
    await db.app_settings.insert_one({"key": "bootstrap_reset_v3", "at": now_iso()})
    log.info("Bootstrap reset v3 executed (3 users + per-store stock)")


@app.on_event("startup")
async def on_startup():
    await ensure_indexes()
    await bootstrap_reset()
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
            # Force store re-selection each session
            await db.users.update_one({"id": u["id"]}, {"$set": {"store_id": None}})
            token = make_token(u["id"], u["role"])
            set_auth_cookie(response, token)
            return {
                "id": u["id"], "email": u["email"], "name": u["name"],
                "role": u["role"], "store_id": None, "color": u.get("color"), "token": token,
            }
    raise HTTPException(401, "PIN incorrect")


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/accounts")
async def list_accounts():
    """Public list of user accounts for the tablet login picker (no auth)."""
    users = await db.users.find({}, {"_id": 0, "id": 1, "name": 1, "role": 1, "color": 1}).to_list(20)
    return users


@api.get("/stores/public")
async def stores_public():
    """Public store list for the login store-picker."""
    return await db.stores.find({}, {"_id": 0}).to_list(50)


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
async def list_categories(
    parent_id: Optional[str] = None,
    user: dict = Depends(current_user),
):
    q: dict = {}
    if parent_id == "root":
        q["parent_id"] = None
    elif parent_id:
        q["parent_id"] = parent_id
    return await db.categories.find(q, {"_id": 0}).sort("sort_order", 1).to_list(500)


@api.get("/categories/tree")
async def category_tree(user: dict = Depends(current_user)):
    cats = await db.categories.find({}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    by_parent: dict = {}
    for c in cats:
        by_parent.setdefault(c.get("parent_id"), []).append(c)
    match: dict = {"active": True}
    if user.get("store_id"):
        match["store_id"] = user["store_id"]
    counts = {}
    async for row in db.products.aggregate([
        {"$match": match},
        {"$group": {"_id": "$category_id", "n": {"$sum": 1}}},
    ]):
        counts[row["_id"]] = row["n"]
    def build(pid):
        return [
            {**c, "children": build(c["id"]), "product_count": counts.get(c["id"], 0)}
            for c in sorted(by_parent.get(pid, []), key=lambda x: x.get("sort_order", 0))
        ]
    return build(None)


@api.get("/categories/{cid}")
async def get_category(cid: str, user: dict = Depends(current_user)):
    c = await db.categories.find_one({"id": cid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Catégorie introuvable")
    trail = [c]
    cur = c
    while cur.get("parent_id"):
        parent = await db.categories.find_one({"id": cur["parent_id"]}, {"_id": 0})
        if not parent:
            break
        trail.insert(0, parent)
        cur = parent
    children = await db.categories.find({"parent_id": cid}, {"_id": 0}).sort("sort_order", 1).to_list(200)
    pq: dict = {"active": True, "category_id": cid}
    if user.get("store_id"):
        pq["store_id"] = user["store_id"]
    product_count = await db.products.count_documents(pq)
    return {"category": c, "breadcrumb": trail, "children": children, "product_count": product_count}


@api.post("/categories")
async def create_category(body: CategoryIn, actor: dict = Depends(require_role("admin", "manager"))):
    if body.parent_id:
        parent = await db.categories.find_one({"id": body.parent_id})
        if not parent:
            raise HTTPException(400, "Catégorie parente introuvable")
    doc = Category(**body.model_dump()).model_dump()
    await db.categories.insert_one(doc)
    await audit(actor, "category.create", "categories", doc["id"], {"name": doc["name"], "parent": body.parent_id})
    doc.pop("_id", None)
    return doc


@api.post("/categories/reorder")
async def reorder_categories(items: List[ReorderItem], actor: dict = Depends(require_role("admin", "manager"))):
    for it in items:
        update = {"sort_order": it.sort_order}
        if it.parent_id == "root":
            update["parent_id"] = None
        elif it.parent_id is not None:
            update["parent_id"] = it.parent_id
        await db.categories.update_one({"id": it.id}, {"$set": update})
    return {"ok": True, "updated": len(items)}


@api.put("/categories/{cid}")
async def update_category(cid: str, body: CategoryIn, actor: dict = Depends(require_role("admin", "manager"))):
    if body.parent_id == cid:
        raise HTTPException(400, "Une catégorie ne peut pas être son propre parent")
    res = await db.categories.update_one({"id": cid}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Catégorie introuvable")
    await audit(actor, "category.update", "categories", cid, body.model_dump())
    return await db.categories.find_one({"id": cid}, {"_id": 0})


@api.delete("/categories/{cid}")
async def delete_category(cid: str, actor: dict = Depends(require_role("admin"))):
    kids = await db.categories.count_documents({"parent_id": cid})
    if kids:
        raise HTTPException(400, f"Impossible : {kids} sous-catégorie(s)")
    prods = await db.products.count_documents({"category_id": cid, "active": True})
    if prods:
        raise HTTPException(400, f"Impossible : {prods} produit(s) actifs")
    await db.categories.delete_one({"id": cid})
    await audit(actor, "category.delete", "categories", cid)
    return {"ok": True}


# --- Products ------------------------------------------------------------
@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    category_id: Optional[str] = None,
    favorite: Optional[bool] = None,
    store_id: Optional[str] = None,  # 'all' to bypass, else specific id, else user's store
    limit: int = 100,
    offset: int = 0,
    user: dict = Depends(current_user),
):
    query: dict = {"active": True}
    if store_id == "all":
        pass
    elif store_id:
        query["store_id"] = store_id
    elif user.get("store_id"):
        query["store_id"] = user["store_id"]
    if category_id:
        query["category_id"] = category_id
    if favorite is not None:
        query["is_favorite"] = favorite
    if q:
        # Prefix regex on indexed fields — supports partial typing, uses indexes
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"name": rx}, {"brand": rx}, {"sku": rx}, {"ean": rx}, {"variant": rx}]
    limit = max(1, min(int(limit), 500))
    offset = max(0, int(offset))
    cursor = db.products.find(query, {"_id": 0}).sort([("sort_order", 1), ("name", 1)]).skip(offset).limit(limit)
    return await cursor.to_list(limit)


@api.get("/products/count")
async def count_products(
    q: Optional[str] = None,
    category_id: Optional[str] = None,
    favorite: Optional[bool] = None,
    store_id: Optional[str] = None,
    user: dict = Depends(current_user),
):
    query: dict = {"active": True}
    if store_id == "all":
        pass
    elif store_id:
        query["store_id"] = store_id
    elif user.get("store_id"):
        query["store_id"] = user["store_id"]
    if category_id:
        query["category_id"] = category_id
    if favorite is not None:
        query["is_favorite"] = favorite
    if q:
        rx = {"$regex": q, "$options": "i"}
        query["$or"] = [{"name": rx}, {"brand": rx}, {"sku": rx}, {"ean": rx}, {"variant": rx}]
    total = await db.products.count_documents(query)
    return {"total": total}


@api.get("/products/lookup")
async def lookup_product(code: str, user: dict = Depends(current_user)):
    if not user.get("store_id"):
        raise HTTPException(400, "Sélectionnez d'abord un magasin")
    p = await db.products.find_one(
        {"$or": [{"ean": code}, {"sku": code}], "store_id": user["store_id"]},
        {"_id": 0},
    )
    if not p:
        raise HTTPException(404, "Produit introuvable dans ce magasin")
    return p


@api.post("/products")
async def create_product(body: ProductIn, actor: dict = Depends(require_role("admin", "manager"))):
    if not actor.get("store_id"):
        raise HTTPException(400, "Sélectionnez d'abord un magasin")
    doc = Product(**body.model_dump()).model_dump()
    doc["store_id"] = actor["store_id"]
    doc["created_at"] = now_iso()
    await db.products.insert_one(doc)
    doc.pop("_id", None)
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


@api.post("/products/import")
async def import_products(body: ProductImportIn, actor: dict = Depends(require_role("admin", "manager"))):
    if not actor.get("store_id") and not body.apply_to_all_stores:
        raise HTTPException(400, "Sélectionnez d'abord un magasin")

    # Which stores to import into
    if body.apply_to_all_stores:
        target_stores = [s["id"] for s in await db.stores.find({}, {"_id": 0, "id": 1}).to_list(50)]
    else:
        target_stores = [actor["store_id"]]

    async def resolve_category_path(path: Optional[str]) -> Optional[str]:
        if not path:
            return None
        parts = [p.strip() for p in path.replace(">", "/").split("/") if p.strip()]
        parent = None
        for name in parts:
            existing = await db.categories.find_one({"name": name, "parent_id": parent})
            if existing:
                parent = existing["id"]
            else:
                cid = new_id()
                await db.categories.insert_one({
                    "id": cid, "name": name, "parent_id": parent, "sort_order": 0
                })
                parent = cid
        return parent

    async def fetch_ean_image(ean: str) -> Optional[str]:
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=4) as c:
                r = await c.get(f"https://world.openfoodfacts.org/api/v2/product/{ean}.json")
                if r.status_code == 200:
                    d = r.json()
                    if d.get("status") == 1:
                        p = d.get("product", {})
                        return p.get("image_front_url") or p.get("image_url")
        except Exception:
            return None
        return None

    created = 0
    updated = 0
    errors: List[dict] = []
    for i, row in enumerate(body.rows):
        try:
            cat_id = await resolve_category_path(row.category_path)
            img = row.image_url
            if body.auto_fetch_images and not img and row.ean:
                img = await fetch_ean_image(row.ean)

            for sid in target_stores:
                match: Optional[dict] = {"store_id": sid, "active": True}
                key = body.upsert_by
                if key == "ean" and row.ean:
                    match["ean"] = row.ean
                elif key == "sku" and row.sku:
                    match["sku"] = row.sku
                elif key == "name":
                    match["name"] = row.name
                else:
                    match = None

                payload = {
                    "name": row.name, "brand": row.brand, "category_id": cat_id,
                    "sku": row.sku, "ean": row.ean,
                    "price": float(row.price), "cost_price": float(row.cost_price or 0),
                    "vat_rate": float(row.vat_rate), "stock": int(row.stock),
                    "stock_alert": int(row.stock_alert), "variant": row.variant,
                    "image_url": img, "is_favorite": bool(row.is_favorite),
                    "active": True, "store_id": sid,
                }
                existing = await db.products.find_one(match) if match else None
                if existing:
                    await db.products.update_one({"id": existing["id"]}, {"$set": payload})
                    updated += 1
                else:
                    payload["id"] = new_id()
                    payload["created_at"] = now_iso()
                    await db.products.insert_one(payload)
                    created += 1
        except Exception as e:
            errors.append({"row": i, "name": row.name, "error": str(e)})
    await audit(actor, "product.import", "products", None, {
        "created": created, "updated": updated, "errors": len(errors),
        "stores": len(target_stores), "auto_img": body.auto_fetch_images,
    })
    return {
        "created": created, "updated": updated, "errors": errors,
        "total": len(body.rows), "stores": len(target_stores),
    }


@api.post("/products/reorder")
async def reorder_products(items: List[ReorderItem], actor: dict = Depends(require_role("admin", "manager"))):
    for it in items:
        await db.products.update_one({"id": it.id}, {"$set": {"sort_order": it.sort_order}})
    return {"ok": True, "updated": len(items)}


@api.get("/products/lookup-image")
async def lookup_image(ean: str, user: dict = Depends(current_user)):
    """Best-effort image fetch from Open Food Facts by EAN."""
    try:
        import httpx as _httpx
        async with _httpx.AsyncClient(timeout=5) as c:
            r = await c.get(f"https://world.openfoodfacts.org/api/v2/product/{ean}.json")
            if r.status_code == 200:
                d = r.json()
                if d.get("status") == 1:
                    p = d.get("product", {})
                    img = p.get("image_front_url") or p.get("image_url")
                    return {"image_url": img, "name": p.get("product_name"), "source": "openfoodfacts"}
    except Exception as e:
        return {"image_url": None, "error": str(e), "source": None}
    return {"image_url": None, "source": None}


@api.get("/products/export.csv")
async def export_products_csv(
    store_id: Optional[str] = None,
    user: dict = Depends(require_role("admin", "manager")),
):
    from fastapi.responses import Response as FResponse
    sid = store_id or user.get("store_id")
    q: dict = {"active": True}
    if sid and sid != "all":
        q["store_id"] = sid
    prods = await db.products.find(q, {"_id": 0}).sort([("category_id", 1), ("sort_order", 1), ("name", 1)]).to_list(20000)
    cats = {c["id"]: c for c in await db.categories.find({}, {"_id": 0}).to_list(1000)}

    def path(cid):
        parts = []
        seen = set()
        while cid and cid in cats and cid not in seen:
            seen.add(cid)
            parts.insert(0, cats[cid]["name"])
            cid = cats[cid].get("parent_id")
        return "/".join(parts)

    def esc(v):
        s = "" if v is None else str(v)
        if "," in s or '"' in s or "\n" in s:
            s = '"' + s.replace('"', '""') + '"'
        return s

    header = "name,brand,category_path,sku,ean,price,cost_price,vat_rate,stock,stock_alert,variant,image_url,is_favorite"
    lines = [header]
    for p in prods:
        lines.append(",".join(esc(x) for x in [
            p.get("name", ""), p.get("brand", ""), path(p.get("category_id")),
            p.get("sku", ""), p.get("ean", ""), p.get("price", 0), p.get("cost_price", 0),
            p.get("vat_rate", 20), p.get("stock", 0), p.get("stock_alert", 5),
            p.get("variant", ""), p.get("image_url", ""), "true" if p.get("is_favorite") else "false",
        ]))
    return FResponse(
        content="\n".join(lines),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="catalog_{sid or "all"}.csv"'}
    )


# --- Customers -----------------------------------------------------------
class CustomerRegisterIn(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    email: str
    password: str
    phone: Optional[str] = None
    birth_date: str  # ISO date YYYY-MM-DD — required, 18+ check server-side
    accept_terms: bool = False


class CustomerLoginIn(BaseModel):
    email: str
    password: str


class CustomerProfileIn(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    preferred_store_id: Optional[str] = None


class UniversalLoginIn(BaseModel):
    email: str
    password: str


class VerifyPinIn(BaseModel):
    pin: str
    require_role: Optional[str] = None  # e.g. "admin"


def _age_from_birth(birth_date: str) -> int:
    try:
        b = datetime.fromisoformat(birth_date).date()
    except Exception:
        return -1
    today = datetime.now(timezone.utc).date()
    return today.year - b.year - ((today.month, today.day) < (b.month, b.day))


@api.post("/customer/register")
async def customer_register(body: CustomerRegisterIn, response: Response):
    email = body.email.lower().strip()
    if len(body.password) < 6:
        raise HTTPException(400, "Mot de passe trop court (6 caractères minimum)")
    if not body.accept_terms:
        raise HTTPException(400, "Vous devez accepter les conditions d'utilisation")
    age = _age_from_birth(body.birth_date)
    if age < 0:
        raise HTTPException(400, "Date de naissance invalide")
    if age < 18:
        raise HTTPException(403, "L'inscription est réservée aux personnes majeures (18 ans et plus)")
    existing = await db.customers.find_one({"email": email})
    if existing and existing.get("password_hash"):
        raise HTTPException(400, "Un compte existe déjà avec cet email")
    if existing:
        # Upgrade an existing in-store customer to a portal account
        await db.customers.update_one({"id": existing["id"]}, {"$set": {
            "password_hash": hash_password(body.password),
            "first_name": body.first_name or existing.get("first_name"),
            "last_name": body.last_name or existing.get("last_name", ""),
            "phone": body.phone or existing.get("phone"),
            "birth_date": body.birth_date,
        }})
        c = await db.customers.find_one({"id": existing["id"]}, {"_id": 0, "password_hash": 0})
        await db.notifications.insert_one({
            "id": new_id(), "target_type": "customer", "target_id": c["id"],
            "kind": "welcome", "title": "Bienvenue chez Cha Va'Pote 💜",
            "body": "Ton compte est prêt. Montre ton QR au vendeur pour cumuler tes points.",
            "read": False, "at": now_iso(),
        })
    else:
        doc = {
            "id": new_id(),
            "first_name": body.first_name,
            "last_name": body.last_name or "",
            "email": email,
            "phone": body.phone,
            "birth_date": body.birth_date,
            "password_hash": hash_password(body.password),
            "qr_token": secrets.token_urlsafe(24),
            "loyalty_points": 0,
            "created_at": now_iso(),
        }
        await db.customers.insert_one(doc)
        c = {k: v for k, v in doc.items() if k not in ("password_hash", "_id")}
        # Welcome notification
        await db.notifications.insert_one({
            "id": new_id(), "target_type": "customer", "target_id": c["id"],
            "kind": "welcome", "title": "Bienvenue chez Cha Va'Pote 💜",
            "body": "Ton compte est prêt. Montre ton QR au vendeur pour gagner tes premiers points.",
            "read": False, "at": now_iso(),
        })
    token = make_customer_token(c["id"])
    set_customer_cookie(response, token)
    return {**c, "token": token, "role": "customer"}


@api.post("/customer/login")
async def customer_login(body: CustomerLoginIn, response: Response):
    c = await db.customers.find_one({"email": body.email.lower().strip()})
    if not c or not c.get("password_hash") or not verify_password(body.password, c["password_hash"]):
        raise HTTPException(401, "Email ou mot de passe invalide")
    token = make_customer_token(c["id"])
    set_customer_cookie(response, token)
    c.pop("password_hash", None); c.pop("_id", None)
    return {**c, "token": token, "role": "customer"}


@api.post("/auth/universal-login")
async def universal_login(body: UniversalLoginIn, response: Response):
    """Single entry-point: tries staff first, then customer.
    Returns { type: 'staff'|'customer', role, ...user, token }."""
    email = body.email.lower().strip()
    u = await db.users.find_one({"email": email})
    if u and verify_password(body.password, u["password_hash"]):
        token = make_token(u["id"], u["role"])
        set_auth_cookie(response, token)
        return {
            "type": "staff", "id": u["id"], "email": u["email"], "name": u["name"],
            "role": u["role"], "store_id": u.get("store_id"),
            "color": u.get("color"), "token": token,
        }
    c = await db.customers.find_one({"email": email})
    if c and c.get("password_hash") and verify_password(body.password, c["password_hash"]):
        token = make_customer_token(c["id"])
        set_customer_cookie(response, token)
        c.pop("password_hash", None); c.pop("_id", None)
        return {"type": "customer", "role": "customer", "token": token, **c}
    raise HTTPException(401, "Email ou mot de passe invalide")


@api.post("/auth/verify-pin")
async def verify_pin(body: VerifyPinIn):
    """Verify a staff PIN without switching session — used to unlock kiosk mode."""
    async for u in db.users.find({"pin_hash": {"$ne": None}}):
        if u.get("pin_hash") and verify_password(body.pin, u["pin_hash"]):
            if body.require_role and u["role"] != body.require_role:
                raise HTTPException(403, f"Rôle {body.require_role} requis")
            return {"ok": True, "user_id": u["id"], "name": u["name"], "role": u["role"]}
    raise HTTPException(401, "PIN incorrect")


@api.post("/customer/logout")
async def customer_logout(response: Response):
    response.delete_cookie("customer_token", path="/")
    return {"ok": True}


@api.get("/customer/me")
async def customer_me_endpoint(c: dict = Depends(current_customer)):
    sales = await db.sales.find({"customer_id": c["id"], "status": "completed"}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    txns = await db.loyalty_transactions.find({"customer_id": c["id"]}, {"_id": 0}).sort("at", -1).limit(30).to_list(30)
    settings = await db.app_settings.find_one({"key": "loyalty"}, {"_id": 0}) or {"euro_per_point": 1.0, "point_value_euro": 0.05}
    stores = {s["id"]: s["name"] for s in await db.stores.find({}, {"_id": 0}).to_list(50)}
    for s in sales:
        s["store_name"] = stores.get(s.get("store_id"), "")
    total_spent = round(sum(s["total"] for s in sales), 2)
    return {**c, "recent_sales": sales, "loyalty_txns": txns, "loyalty_settings": settings, "total_spent": total_spent}


@api.post("/customer/qr-refresh")
async def customer_qr_refresh(c: dict = Depends(current_customer)):
    new_token = secrets.token_urlsafe(24)
    await db.customers.update_one({"id": c["id"]}, {"$set": {"qr_token": new_token}})
    return {"qr_token": new_token}


@api.put("/customer/profile")
async def customer_profile_update(body: CustomerProfileIn, c: dict = Depends(current_customer)):
    updates: dict = {}
    if body.first_name is not None:
        updates["first_name"] = body.first_name.strip()
    if body.last_name is not None:
        updates["last_name"] = body.last_name.strip()
    if body.phone is not None:
        updates["phone"] = body.phone.strip() or None
    if body.preferred_store_id is not None:
        if body.preferred_store_id:
            exists = await db.stores.find_one({"id": body.preferred_store_id})
            if not exists:
                raise HTTPException(400, "Magasin inconnu")
        updates["preferred_store_id"] = body.preferred_store_id or None
    if body.new_password:
        if len(body.new_password) < 6:
            raise HTTPException(400, "Mot de passe trop court")
        current = await db.customers.find_one({"id": c["id"]})
        if not current or not verify_password(body.current_password or "", current.get("password_hash", "")):
            raise HTTPException(400, "Mot de passe actuel incorrect")
        updates["password_hash"] = hash_password(body.new_password)
    if updates:
        await db.customers.update_one({"id": c["id"]}, {"$set": updates})
    fresh = await db.customers.find_one({"id": c["id"]}, {"_id": 0, "password_hash": 0})
    return fresh


@api.delete("/customer/account")
async def customer_delete_account(response: Response, c: dict = Depends(current_customer)):
    """Definitively remove personal data. Keeps sale rows for legal accounting but wipes customer_id link."""
    cid = c["id"]
    await db.sales.update_many({"customer_id": cid}, {"$set": {"customer_id": None, "_orphan_customer": True}})
    await db.loyalty_transactions.delete_many({"customer_id": cid})
    await db.notifications.delete_many({"target_type": "customer", "target_id": cid})
    await db.customers.delete_one({"id": cid})
    response.delete_cookie("customer_token", path="/")
    return {"ok": True}


# --- Notifications -------------------------------------------------------
@api.get("/notifications")
async def list_notifications(request: Request, limit: int = 30):
    """Returns notifications for current auth context (staff OR customer)."""
    # Try staff first
    try:
        user = await current_user(request)
        q = {
            "$or": [
                {"target_type": "staff", "target_id": user["id"]},
                {"target_type": "staff", "target_id": None},
            ]
        }
        items = await db.notifications.find(q, {"_id": 0}).sort("at", -1).limit(limit).to_list(limit)
        unread = await db.notifications.count_documents({**q, "read": False})
        return {"items": items, "unread": unread, "ctx": "staff"}
    except HTTPException:
        pass
    c = await current_customer(request)
    q = {"target_type": "customer", "target_id": c["id"]}
    items = await db.notifications.find(q, {"_id": 0}).sort("at", -1).limit(limit).to_list(limit)
    unread = await db.notifications.count_documents({**q, "read": False})
    return {"items": items, "unread": unread, "ctx": "customer"}


@api.post("/notifications/mark-read")
async def mark_notifications_read(request: Request, ids: Optional[List[str]] = None):
    try:
        user = await current_user(request)
        q = {"$or": [{"target_type": "staff", "target_id": user["id"]}, {"target_type": "staff", "target_id": None}]}
    except HTTPException:
        c = await current_customer(request)
        q = {"target_type": "customer", "target_id": c["id"]}
    if ids:
        q["id"] = {"$in": ids}
    r = await db.notifications.update_many(q, {"$set": {"read": True}})
    return {"updated": r.modified_count}


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
    doc.pop("_id", None)
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

    # loyalty — 2 points per euro (configurable)
    loyalty_added = 0
    reward_applied = None
    if body.customer_id:
        settings = await db.app_settings.find_one({"key": "loyalty"}) or {"points_per_euro": 2.0}
        rate = settings.get("points_per_euro", 2.0)
        loyalty_added = int(total * rate)
        new_balance = 0
        if loyalty_added > 0:
            cust = await db.customers.find_one_and_update(
                {"id": body.customer_id},
                {"$inc": {"loyalty_points": loyalty_added}},
                return_document=True,
            )
            new_balance = (cust or {}).get("loyalty_points", 0)
            await db.loyalty_transactions.insert_one({
                "id": new_id(), "customer_id": body.customer_id, "delta": loyalty_added,
                "reason": "sale", "sale_id": sale_id, "at": now_iso(),
            })
        # Unlock any reward templates whose threshold is now reached
        async for tpl in db.reward_templates.find({"active": True}):
            if new_balance >= tpl.get("points_threshold", 0):
                already = await db.rewards.find_one({
                    "customer_id": body.customer_id,
                    "template_id": tpl["id"],
                    "status": {"$in": ["available", "used"]},
                })
                if already:
                    continue
                exp_days = int(tpl.get("expires_days", 30))
                await db.rewards.insert_one({
                    "id": new_id(), "customer_id": body.customer_id,
                    "template_id": tpl["id"], "name": tpl["name"],
                    "kind": tpl["kind"], "value": tpl.get("value", 0),
                    "status": "available",
                    "unlocked_at": now_iso(),
                    "expires_at": (datetime.now(timezone.UTC) + timedelta(days=exp_days)).isoformat() if exp_days else None,
                })
                await db.notifications.insert_one({
                    "id": new_id(), "target_type": "customer", "target_id": body.customer_id,
                    "kind": "reward_unlocked", "title": f"🎉 Nouvelle récompense : {tpl['name']}",
                    "body": "Elle sera proposée automatiquement à ton prochain passage en caisse.",
                    "meta": {"reward_name": tpl["name"]}, "read": False, "at": now_iso(),
                })
        # Mark the reward actually applied on this sale as used
        if body.applied_reward_id:
            await db.rewards.update_one(
                {"id": body.applied_reward_id, "customer_id": body.customer_id, "status": "available"},
                {"$set": {"status": "used", "used_at": now_iso(), "sale_id": sale_id}},
            )
            reward_applied = body.applied_reward_id
        # Notify customer of the sale
        await db.notifications.insert_one({
            "id": new_id(), "target_type": "customer", "target_id": body.customer_id,
            "kind": "sale", "title": f"Merci pour ton passage · {total:.2f} €".replace(".", ","),
            "body": (f"+{loyalty_added} points de fidélité gagnés." if loyalty_added else "Retrouve ton ticket dans l'app."),
            "meta": {"sale_id": sale_id, "loyalty_added": loyalty_added, "total": total, "reward_applied": reward_applied},
            "read": False, "at": now_iso(),
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
    store_id: Optional[str] = None,
    user: dict = Depends(current_user),
):
    q: dict = {}
    if customer_id:
        q["customer_id"] = customer_id
    if store_id == "all":
        pass
    elif store_id:
        q["store_id"] = store_id
    elif user.get("store_id"):
        q["store_id"] = user["store_id"]
    return await db.sales.find(q, {"_id": 0, "_orphan_customer": 0}).sort("created_at", -1).limit(limit).to_list(limit)


@api.get("/sales/{sid}")
async def get_sale(sid: str, user: dict = Depends(current_user)):
    s = await db.sales.find_one({"id": sid}, {"_id": 0, "_orphan_customer": 0})
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
    doc.pop("_id", None)
    return doc


# --- Dashboard -----------------------------------------------------------
@api.get("/dashboard/stats")
async def dashboard_stats(
    store_id: Optional[str] = None,
    user: dict = Depends(require_role("admin", "manager")),
):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sq: dict = {"created_at": {"$gte": today}, "status": "completed"}
    pq: dict = {"active": True, "$expr": {"$lte": ["$stock", "$stock_alert"]}}
    rq: dict = {"status": "completed"}
    if store_id == "all":
        pass
    elif store_id:
        sq["store_id"] = store_id
        pq["store_id"] = store_id
        rq["store_id"] = store_id
    elif user.get("store_id"):
        sq["store_id"] = user["store_id"]
        pq["store_id"] = user["store_id"]
        rq["store_id"] = user["store_id"]

    day_sales = await db.sales.find(sq, {"_id": 0}).to_list(2000)
    total_ca = round(sum(s["total"] for s in day_sales), 2)
    count = len(day_sales)
    avg = round(total_ca / count, 2) if count else 0.0

    low_stock = await db.products.find(pq, {"_id": 0}).limit(20).to_list(20)
    total_customers = await db.customers.count_documents({})

    # Top products (last 30 sales)
    recent = await db.sales.find(rq, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
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


# --- Expenses (Dépenses) -------------------------------------------------
class ExpenseIn(BaseModel):
    label: str
    amount: float
    vat_rate: float = 20.0
    category: str = "Général"
    supplier_id: Optional[str] = None
    payment_method: Literal["card", "cash", "transfer", "other"] = "card"
    at: Optional[str] = None
    note: Optional[str] = None


@api.get("/expenses")
async def list_expenses(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: dict = Depends(require_role("admin", "manager")),
):
    q: dict = {}
    if date_from or date_to:
        q["at"] = {}
        if date_from:
            q["at"]["$gte"] = date_from
        if date_to:
            q["at"]["$lte"] = date_to + "T23:59:59"
    items = await db.expenses.find(q, {"_id": 0}).sort("at", -1).limit(500).to_list(500)
    return items


@api.post("/expenses")
async def create_expense(body: ExpenseIn, actor: dict = Depends(require_role("admin", "manager"))):
    doc = {
        "id": new_id(),
        "label": body.label,
        "amount": round(body.amount, 2),
        "vat_rate": body.vat_rate,
        "vat_amount": round(body.amount - body.amount / (1 + body.vat_rate / 100), 2),
        "category": body.category,
        "supplier_id": body.supplier_id,
        "payment_method": body.payment_method,
        "at": body.at or now_iso(),
        "note": body.note,
        "created_by": actor["id"],
        "created_at": now_iso(),
    }
    await db.expenses.insert_one(doc)
    doc.pop("_id", None)
    await audit(actor, "expense.create", "expenses", doc["id"], {"amount": doc["amount"]})
    return doc


@api.delete("/expenses/{eid}")
async def delete_expense(eid: str, actor: dict = Depends(require_role("admin", "manager"))):
    r = await db.expenses.delete_one({"id": eid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Dépense introuvable")
    await audit(actor, "expense.delete", "expenses", eid)
    return {"ok": True}


# --- Accounting summary --------------------------------------------------
def _iso_range(date_from: Optional[str], date_to: Optional[str]):
    today = datetime.now(timezone.utc)
    if not date_from:
        date_from = today.replace(day=1).strftime("%Y-%m-%d")
    if not date_to:
        date_to = today.strftime("%Y-%m-%d")
    return date_from, date_to + "T23:59:59"


@api.get("/accounting/summary")
async def accounting_summary(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    store_id: Optional[str] = None,  # 'all' or None => all stores; else filter
    user: dict = Depends(require_role("admin", "manager")),
):
    df, dt = _iso_range(date_from, date_to)
    q: dict = {"status": "completed", "created_at": {"$gte": df, "$lte": dt}}
    if store_id and store_id != "all":
        q["store_id"] = store_id
    sales = await db.sales.find(q, {"_id": 0}).to_list(20000)

    total_ttc = 0.0
    total_ht = 0.0
    total_vat = 0.0
    vat_by_rate: dict = {}
    pay_by_method = {"cash": 0.0, "card": 0.0, "other": 0.0}
    ca_by_user: dict = {}
    ca_by_category: dict = {}

    # cache category names
    cats = await db.categories.find({}, {"_id": 0}).to_list(200)
    cat_name = {c["id"]: c["name"] for c in cats}
    prods = await db.products.find({}, {"_id": 0}).to_list(2000)
    prod_cat = {p["id"]: p.get("category_id") for p in prods}

    for s in sales:
        total_ttc += s["total"]
        total_vat += s.get("vat_total", 0.0)
        total_ht += s["total"] - s.get("vat_total", 0.0)
        for it in s["items"]:
            line = it["unit_price"] * it["quantity"] - it.get("discount", 0)
            rate = it.get("vat_rate", 20.0)
            key = f"{rate:.1f}"
            slot = vat_by_rate.setdefault(key, {"rate": rate, "ht": 0.0, "vat": 0.0, "ttc": 0.0})
            ht = line / (1 + rate / 100)
            slot["ttc"] += line
            slot["ht"] += ht
            slot["vat"] += line - ht
            cid = prod_cat.get(it["product_id"])
            cname = cat_name.get(cid, "Autres")
            ca_by_category[cname] = ca_by_category.get(cname, 0.0) + line
        for p in s["payments"]:
            m = p["method"] if p["method"] in pay_by_method else "other"
            pay_by_method[m] += p["amount"]
        u = s.get("user_name", "—")
        ca_by_user[u] = ca_by_user.get(u, 0.0) + s["total"]

    exp = await db.expenses.find(
        {"at": {"$gte": df, "$lte": dt}}, {"_id": 0}
    ).to_list(5000)
    exp_total = sum(e["amount"] for e in exp)
    exp_vat = sum(e.get("vat_amount", 0.0) for e in exp)

    def r(x): return round(x, 2)

    return {
        "range": {"from": df[:10], "to": dt[:10]},
        "sales": {
            "count": len(sales),
            "total_ttc": r(total_ttc),
            "total_ht": r(total_ht),
            "total_vat_collected": r(total_vat),
            "avg_basket": r(total_ttc / len(sales)) if sales else 0.0,
        },
        "vat_by_rate": [
            {"rate": v["rate"], "ht": r(v["ht"]), "vat": r(v["vat"]), "ttc": r(v["ttc"])}
            for v in sorted(vat_by_rate.values(), key=lambda x: -x["rate"])
        ],
        "payments": {k: r(v) for k, v in pay_by_method.items()},
        "ca_by_user": [{"user": k, "total": r(v)} for k, v in sorted(ca_by_user.items(), key=lambda x: -x[1])],
        "ca_by_category": [{"category": k, "total": r(v)} for k, v in sorted(ca_by_category.items(), key=lambda x: -x[1])],
        "expenses": {
            "count": len(exp),
            "total": r(exp_total),
            "vat_deductible": r(exp_vat),
        },
        "vat_due": r(total_vat - exp_vat),
        "gross_margin_estimate": r(total_ht - (exp_total - exp_vat)),
    }


@api.get("/accounting/timeseries")
async def accounting_timeseries(
    period: Literal["day", "week", "month"] = "day",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    store_id: Optional[str] = None,
    user: dict = Depends(require_role("admin", "manager")),
):
    df, dt = _iso_range(date_from, date_to)
    q: dict = {"status": "completed", "created_at": {"$gte": df, "$lte": dt}}
    if store_id and store_id != "all":
        q["store_id"] = store_id
    sales = await db.sales.find(q, {"_id": 0}).to_list(20000)
    buckets: dict = {}
    for s in sales:
        d = s["created_at"][:10]
        if period == "month":
            key = d[:7]
        elif period == "week":
            dt_obj = datetime.fromisoformat(d)
            key = f"{dt_obj.isocalendar().year}-W{dt_obj.isocalendar().week:02d}"
        else:
            key = d
        b = buckets.setdefault(key, {"key": key, "total": 0.0, "count": 0})
        b["total"] += s["total"]
        b["count"] += 1
    series = sorted(buckets.values(), key=lambda x: x["key"])
    for b in series:
        b["total"] = round(b["total"], 2)
    return series


@api.get("/accounting/export.csv")
async def accounting_export(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    store_id: Optional[str] = None,
    user: dict = Depends(require_role("admin", "manager")),
):
    from fastapi.responses import Response as FResponse
    df, dt = _iso_range(date_from, date_to)
    q: dict = {"status": "completed", "created_at": {"$gte": df, "$lte": dt}}
    if store_id and store_id != "all":
        q["store_id"] = store_id
    sales = await db.sales.find(q, {"_id": 0}).sort("created_at", 1).to_list(20000)
    stores = {s["id"]: s["name"] for s in await db.stores.find({}, {"_id": 0}).to_list(50)}
    lines = ["numero;date;magasin;vendeur;total_ttc;total_ht;tva;moyens_paiement;nb_articles"]
    for s in sales:
        methods = "|".join(f"{p['method']}:{p['amount']}" for p in s["payments"])
        nb = sum(i["quantity"] for i in s["items"])
        shop = stores.get(s.get("store_id"), "")
        lines.append(
            f"{s['number']};{s['created_at']};{shop};{s.get('user_name','')};{s['total']};"
            f"{round(s['total'] - s.get('vat_total',0),2)};{s.get('vat_total',0)};{methods};{nb}"
        )
    csv = "\n".join(lines)
    return FResponse(content=csv, media_type="text/csv", headers={
        "Content-Disposition": f'attachment; filename="ventes_{df[:10]}_{dt[:10]}.csv"'
    })


# --- Bulk stock ----------------------------------------------------------
class BulkStockLine(BaseModel):
    product_id: str
    delta: int


class BulkStockIn(BaseModel):
    lines: List[BulkStockLine]
    reason: str = "reception"
    supplier_id: Optional[str] = None


@api.post("/stock/bulk")
async def stock_bulk(body: BulkStockIn, actor: dict = Depends(require_role("admin", "manager"))):
    if not body.lines:
        raise HTTPException(400, "Aucune ligne")
    updated = []
    for ln in body.lines:
        if ln.delta == 0:
            continue
        r = await db.products.update_one({"id": ln.product_id}, {"$inc": {"stock": ln.delta}})
        if r.matched_count == 0:
            continue
        await db.stock_movements.insert_one({
            "id": new_id(), "product_id": ln.product_id, "delta": ln.delta,
            "reason": body.reason, "supplier_id": body.supplier_id, "at": now_iso(), "user_id": actor["id"],
        })
        updated.append(ln.product_id)
    await audit(actor, "stock.bulk", "products", None, {"count": len(updated), "reason": body.reason})
    return {"updated": len(updated)}


# --- Store switch (self-service) ----------------------------------------
class StoreSwitchIn(BaseModel):
    store_id: str


@api.post("/auth/switch-store")
async def switch_store(body: StoreSwitchIn, user: dict = Depends(current_user)):
    s = await db.stores.find_one({"id": body.store_id})
    if not s:
        raise HTTPException(404, "Magasin introuvable")
    await db.users.update_one({"id": user["id"]}, {"$set": {"store_id": body.store_id}})
    return {"ok": True, "store_id": body.store_id}


# --- Health --------------------------------------------------------------
@api.get("/")
async def root():
    return {"service": "VapePOS API", "ok": True}


@api.get("/preview/expo-go-qr.png")
async def preview_expo_qr():
    """Serve the Expo Go QR code generated for the mobile preview tunnel."""
    path = "/app/mobile/.preview/expo-go-qr.png"
    if not os.path.exists(path):
        raise HTTPException(404, "QR non généré")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "no-store"})


@api.get("/preview/expo-go-cloudflare.png")
async def preview_expo_cf_qr():
    """Alternate QR encoded for the Cloudflare tunnel (no Expo login required)."""
    path = "/app/mobile/.preview/expo-go-cloudflare.png"
    if not os.path.exists(path):
        raise HTTPException(404, "QR non généré")
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "no-store"})


@api.get("/preview/vapepos-source.tar.gz")
async def preview_source_archive():
    """One-shot download of the entire source tree (excl. node_modules + caches)."""
    path = "/app/mobile/.preview/vapepos-source.tar.gz"
    if not os.path.exists(path):
        raise HTTPException(404, "Archive non générée")
    return FileResponse(
        path,
        media_type="application/gzip",
        filename="vapepos-source.tar.gz",
        headers={"Cache-Control": "no-store"},
    )


# === V2 CLIENT — rewards, messaging, events, news, stats =================
class RewardTemplateIn(BaseModel):
    name: str
    points_threshold: int
    kind: Literal["percent", "amount", "free_product", "custom"]
    value: float = 0.0
    product_id: Optional[str] = None
    expires_days: int = 30
    active: bool = True


@api.get("/admin/reward-templates")
async def list_reward_tpls(_: dict = Depends(require_role("admin", "manager"))):
    return await db.reward_templates.find({}, {"_id": 0}).sort("points_threshold", 1).to_list(500)


@api.post("/admin/reward-templates")
async def create_reward_tpl(body: RewardTemplateIn, _: dict = Depends(require_role("admin", "manager"))):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.reward_templates.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/reward-templates/{rid}")
async def update_reward_tpl(rid: str, body: RewardTemplateIn, _: dict = Depends(require_role("admin", "manager"))):
    await db.reward_templates.update_one({"id": rid}, {"$set": body.model_dump()})
    return await db.reward_templates.find_one({"id": rid}, {"_id": 0})


@api.delete("/admin/reward-templates/{rid}")
async def delete_reward_tpl(rid: str, _: dict = Depends(require_role("admin"))):
    await db.reward_templates.delete_one({"id": rid})
    return {"ok": True}


@api.get("/customer/rewards")
async def customer_rewards(c: dict = Depends(current_customer)):
    items = await db.rewards.find({"customer_id": c["id"]}, {"_id": 0}).sort("unlocked_at", -1).to_list(100)
    # Mark expired
    now = datetime.now(timezone.utc).isoformat()
    for r in items:
        if r.get("status") == "available" and r.get("expires_at") and r["expires_at"] < now:
            r["status"] = "expired"
    return items


@api.get("/customers/{cid}/available-rewards")
async def customer_available_rewards_for_pos(cid: str, _: dict = Depends(current_user)):
    """Called from POS right after scanning a customer QR."""
    now = datetime.now(timezone.utc).isoformat()
    items = await db.rewards.find(
        {"customer_id": cid, "status": "available", "$or": [{"expires_at": None}, {"expires_at": {"$gte": now}}]},
        {"_id": 0}
    ).sort("unlocked_at", 1).to_list(20)
    return items


# --- Messaging ------------------------------------------------------------
class MessageIn(BaseModel):
    conversation_id: Optional[str] = None
    body: str


async def _resolve_or_create_conversation(customer_id: str) -> dict:
    cust = await db.customers.find_one({"id": customer_id})
    if not cust:
        raise HTTPException(404, "Client introuvable")
    conv = await db.conversations.find_one({"customer_id": customer_id, "status": "open"}, {"_id": 0})
    if conv:
        return conv
    store_id = cust.get("preferred_store_id") or None
    doc = {
        "id": new_id(), "customer_id": customer_id, "store_id": store_id,
        "status": "open", "unread_customer": 0, "unread_staff": 0,
        "created_at": now_iso(), "last_message_at": now_iso(),
    }
    await db.conversations.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/customer/conversation")
async def customer_conversation(c: dict = Depends(current_customer)):
    conv = await _resolve_or_create_conversation(c["id"])
    msgs = await db.messages.find({"conversation_id": conv["id"]}, {"_id": 0}).sort("at", 1).limit(200).to_list(200)
    await db.conversations.update_one({"id": conv["id"]}, {"$set": {"unread_customer": 0}})
    conv["unread_customer"] = 0
    return {"conversation": conv, "messages": msgs}


@api.post("/customer/messages")
async def customer_send_message(body: MessageIn, c: dict = Depends(current_customer)):
    conv = await _resolve_or_create_conversation(c["id"])
    msg = {
        "id": new_id(), "conversation_id": conv["id"],
        "from_type": "customer", "from_id": c["id"],
        "body": body.body.strip()[:4000], "at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one(
        {"id": conv["id"]},
        {"$set": {"last_message_at": msg["at"]}, "$inc": {"unread_staff": 1}}
    )
    # Notify staff of the preferred store (or all admins if none)
    staff_q = {"role": {"$in": ["admin", "manager"]}}
    if conv.get("store_id"):
        staff_q["$or"] = [{"store_id": conv["store_id"]}, {"role": "admin"}]
    async for u in db.users.find(staff_q, {"id": 1}):
        await db.notifications.insert_one({
            "id": new_id(), "target_type": "staff", "target_id": u["id"],
            "kind": "message", "title": f"Nouveau message · {c.get('first_name', 'Client')}",
            "body": msg["body"][:120], "meta": {"conversation_id": conv["id"]},
            "read": False, "at": now_iso(),
        })
    msg.pop("_id", None)
    return msg


@api.get("/staff/conversations")
async def staff_list_conversations(user: dict = Depends(require_role("admin", "manager", "seller"))):
    q: dict = {}
    if user.get("store_id") and user.get("role") != "admin":
        q["store_id"] = {"$in": [user["store_id"], None]}
    convs = await db.conversations.find(q, {"_id": 0}).sort("last_message_at", -1).limit(100).to_list(100)
    # enrich with customer name + last message
    for cv in convs:
        cust = await db.customers.find_one({"id": cv["customer_id"]}, {"_id": 0, "first_name": 1, "last_name": 1})
        cv["customer_name"] = f"{cust.get('first_name','')} {cust.get('last_name','')}".strip() if cust else "Client"
        last = await db.messages.find_one({"conversation_id": cv["id"]}, {"_id": 0}, sort=[("at", -1)])
        cv["last_message"] = (last or {}).get("body", "")[:160]
    return convs


@api.get("/staff/conversations/{cid}")
async def staff_get_conversation(cid: str, user: dict = Depends(require_role("admin", "manager", "seller"))):
    conv = await db.conversations.find_one({"id": cid}, {"_id": 0})
    if not conv:
        raise HTTPException(404, "Conversation introuvable")
    msgs = await db.messages.find({"conversation_id": cid}, {"_id": 0}).sort("at", 1).limit(500).to_list(500)
    await db.conversations.update_one({"id": cid}, {"$set": {"unread_staff": 0}})
    conv["unread_staff"] = 0
    cust = await db.customers.find_one({"id": conv["customer_id"]}, {"_id": 0, "password_hash": 0})
    return {"conversation": conv, "messages": msgs, "customer": cust}


@api.post("/staff/conversations/{cid}/messages")
async def staff_send_message(cid: str, body: MessageIn, user: dict = Depends(require_role("admin", "manager", "seller"))):
    conv = await db.conversations.find_one({"id": cid})
    if not conv:
        raise HTTPException(404, "Conversation introuvable")
    msg = {
        "id": new_id(), "conversation_id": cid,
        "from_type": "staff", "from_id": user["id"], "from_name": user.get("name", ""),
        "body": body.body.strip()[:4000], "at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one(
        {"id": cid},
        {"$set": {"last_message_at": msg["at"]}, "$inc": {"unread_customer": 1}}
    )
    staff_name = user.get("name") or "L'équipe"
    await db.notifications.insert_one({
        "id": new_id(), "target_type": "customer", "target_id": conv["customer_id"],
        "kind": "staff_reply", "title": f"{staff_name} t'a répondu",
        "body": msg["body"][:120], "meta": {"conversation_id": cid},
        "read": False, "at": now_iso(),
    })
    msg.pop("_id", None)
    return msg


# --- Events / News / Store info ------------------------------------------
class EventIn(BaseModel):
    title: str
    description: Optional[str] = ""
    image_url: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    location: Optional[str] = None
    store_id: Optional[str] = None
    active: bool = True


class NewsIn(BaseModel):
    title: str
    body: Optional[str] = ""
    image_url: Optional[str] = None
    pinned: bool = False
    active: bool = True


@api.get("/events")
async def list_events_public():
    now = datetime.now(timezone.utc).isoformat()
    q = {"active": True, "$or": [{"ends_at": None}, {"ends_at": {"$gte": now}}]}
    return await db.events.find(q, {"_id": 0}).sort("starts_at", 1).limit(50).to_list(50)


@api.post("/admin/events")
async def create_event(body: EventIn, _: dict = Depends(require_role("admin", "manager"))):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/events/{eid}")
async def update_event(eid: str, body: EventIn, _: dict = Depends(require_role("admin", "manager"))):
    await db.events.update_one({"id": eid}, {"$set": body.model_dump()})
    return await db.events.find_one({"id": eid}, {"_id": 0})


@api.delete("/admin/events/{eid}")
async def delete_event(eid: str, _: dict = Depends(require_role("admin"))):
    await db.events.delete_one({"id": eid})
    return {"ok": True}


@api.get("/news")
async def list_news_public():
    return await db.news.find({"active": True}, {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).limit(50).to_list(50)


@api.post("/admin/news")
async def create_news(body: NewsIn, _: dict = Depends(require_role("admin", "manager"))):
    doc = {"id": new_id(), **body.model_dump(), "created_at": now_iso()}
    await db.news.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/news/{nid}")
async def update_news(nid: str, body: NewsIn, _: dict = Depends(require_role("admin", "manager"))):
    await db.news.update_one({"id": nid}, {"$set": body.model_dump()})
    return await db.news.find_one({"id": nid}, {"_id": 0})


@api.delete("/admin/news/{nid}")
async def delete_news(nid: str, _: dict = Depends(require_role("admin"))):
    await db.news.delete_one({"id": nid})
    return {"ok": True}


# --- Customer stats + favorites ------------------------------------------
@api.get("/customer/stats")
async def customer_stats(c: dict = Depends(current_customer)):
    sales = await db.sales.find({"customer_id": c["id"], "status": "paid"}, {"_id": 0}).to_list(1000)
    total_spent = sum(s.get("total", 0) for s in sales)
    visits = len(sales)
    # Favorite store
    store_counts: dict = {}
    first_at = None
    last_at = None
    product_ids = set()
    for s in sales:
        if s.get("store_id"):
            store_counts[s["store_id"]] = store_counts.get(s["store_id"], 0) + 1
        at = s.get("created_at")
        if at:
            if not first_at or at < first_at: first_at = at
            if not last_at or at > last_at: last_at = at
        for it in s.get("items", []):
            if it.get("product_id"): product_ids.add(it["product_id"])
    top_store_id = max(store_counts, key=store_counts.get) if store_counts else None
    top_store = None
    if top_store_id:
        s = await db.stores.find_one({"id": top_store_id}, {"_id": 0, "name": 1})
        if s: top_store = s.get("name")
    rewards_count = await db.rewards.count_documents({"customer_id": c["id"]})
    return {
        "visits": visits,
        "total_spent": round(total_spent, 2),
        "loyalty_points": c.get("loyalty_points", 0),
        "distinct_products": len(product_ids),
        "rewards_total": rewards_count,
        "top_store": top_store,
        "first_visit_at": first_at,
        "last_visit_at": last_at,
    }


# --- Year recap (Mon Année Vape) -----------------------------------------
@api.get("/customer/year-recap")
async def customer_year_recap(year: Optional[int] = None, c: dict = Depends(current_customer)):
    y = int(year) if year else datetime.now(timezone.utc).year
    start_iso = f"{y}-01-01T00:00:00+00:00"
    end_iso = f"{y+1}-01-01T00:00:00+00:00"
    sales = await db.sales.find(
        {"customer_id": c["id"], "status": "completed", "created_at": {"$gte": start_iso, "$lt": end_iso}},
        {"_id": 0},
    ).sort("created_at", 1).to_list(5000)
    total_spent = round(sum(s.get("total", 0) for s in sales), 2)
    visits = len(sales)
    points_earned = sum(s.get("loyalty_added", 0) for s in sales)
    tally: dict = {}
    store_counts: dict = {}
    busiest_month: dict = {}
    biggest = None
    for s in sales:
        if s.get("store_id"):
            store_counts[s["store_id"]] = store_counts.get(s["store_id"], 0) + 1
        at = s.get("created_at")
        if at:
            busiest_month[at[:7]] = busiest_month.get(at[:7], 0) + 1
        if biggest is None or s.get("total", 0) > biggest.get("total", 0):
            biggest = s
        for it in s.get("items", []):
            pid = it.get("product_id")
            if not pid:
                continue
            prev = tally.get(pid) or {"product_id": pid, "name": it.get("name", ""), "quantity": 0, "revenue": 0.0}
            prev["quantity"] += int(it.get("quantity", 0))
            prev["revenue"] += (it.get("unit_price", 0) * it.get("quantity", 0)) - (it.get("discount", 0) or 0)
            tally[pid] = prev
    top_products = sorted(tally.values(), key=lambda x: x["quantity"], reverse=True)[:5]
    for p in top_products:
        p["revenue"] = round(p["revenue"], 2)
    top_store = None
    top_store_visits = 0
    if store_counts:
        top_store_id = max(store_counts, key=store_counts.get)
        top_store_visits = store_counts[top_store_id]
        s = await db.stores.find_one({"id": top_store_id}, {"_id": 0, "name": 1})
        if s:
            top_store = s.get("name")
    peak_month = max(busiest_month, key=busiest_month.get) if busiest_month else None
    rewards_unlocked = await db.rewards.count_documents({
        "customer_id": c["id"], "unlocked_at": {"$gte": start_iso, "$lt": end_iso},
    })
    rewards_used = await db.rewards.count_documents({
        "customer_id": c["id"], "status": "used", "used_at": {"$gte": start_iso, "$lt": end_iso},
    })
    return {
        "year": y,
        "has_data": visits > 0,
        "visits": visits,
        "total_spent": total_spent,
        "points_earned": points_earned,
        "distinct_products": len(tally),
        "top_products": top_products,
        "top_store": top_store,
        "top_store_visits": top_store_visits,
        "peak_month": peak_month,
        "rewards_unlocked": rewards_unlocked,
        "rewards_used": rewards_used,
        "biggest_sale": (
            {
                "total": round(biggest.get("total", 0), 2),
                "created_at": biggest.get("created_at"),
                "items": len(biggest.get("items", [])),
            }
            if biggest
            else None
        ),
        "first_sale_at": sales[0].get("created_at") if sales else None,
        "last_sale_at": sales[-1].get("created_at") if sales else None,
    }


class FavoriteIn(BaseModel):
    product_id: str


@api.get("/customer/favorites")
async def list_favorites(c: dict = Depends(current_customer)):
    favs = await db.customer_favorites.find({"customer_id": c["id"]}, {"_id": 0}).to_list(500)
    product_ids = [f["product_id"] for f in favs]
    if not product_ids: return []
    prods = await db.products.find({"id": {"$in": product_ids}}, {"_id": 0}).to_list(500)
    # Dedupe products by name across stores for client view
    seen = {}
    for p in prods:
        seen.setdefault(p["name"].lower(), p)
    return list(seen.values())


@api.post("/customer/favorites")
async def add_favorite(body: FavoriteIn, c: dict = Depends(current_customer)):
    await db.customer_favorites.update_one(
        {"customer_id": c["id"], "product_id": body.product_id},
        {"$set": {"customer_id": c["id"], "product_id": body.product_id, "at": now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.delete("/customer/favorites/{pid}")
async def remove_favorite(pid: str, c: dict = Depends(current_customer)):
    await db.customer_favorites.delete_one({"customer_id": c["id"], "product_id": pid})
    return {"ok": True}


# --- Store info enhanced -------------------------------------------------
class StoreInfoIn(BaseModel):
    address: Optional[str] = None
    hours: Optional[str] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None


@api.get("/stores/public-full")
async def stores_public_full():
    return await db.stores.find({}, {"_id": 0}).sort("code", 1).to_list(20)


@api.put("/admin/stores/{sid}/info")
async def update_store_info(sid: str, body: StoreInfoIn, _: dict = Depends(require_role("admin"))):
    await db.stores.update_one({"id": sid}, {"$set": body.model_dump(exclude_none=True)})
    return await db.stores.find_one({"id": sid}, {"_id": 0})



app.include_router(api)
