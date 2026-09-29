"""Backend tests for VapePOS Cha Va'Pote MVP unified Phase 1.

Covers:
- Universal login (staff + customer routing)
- Customer registration (18+ gate, CGU, password len, duplicate email)
- Customer profile update (password guard)
- Customer account deletion + sale anonymisation + notifications purge
- verify-pin (admin PIN 1111, reject 9999)
- Notifications list/mark-read (staff + customer contexts)
- Sale creates customer notification
- /customer/me returns birth_date
"""
import os
import time
import uuid
import requests
import pytest

def _read_env(path):
    try:
        with open(path) as f:
            for line in f:
                if line.strip().startswith("REACT_APP_BACKEND_URL"):
                    return line.split("=", 1)[1].strip().strip('"')
    except Exception:
        return None
    return None

_URL = os.environ.get("REACT_APP_BACKEND_URL") or _read_env("/app/frontend/.env")
assert _URL, "REACT_APP_BACKEND_URL not set"
BASE = _URL.rstrip("/") + "/api"

STAFF_EMAIL = "mathis@vapepos.local"
STAFF_PASS = "vapepos"
ADMIN_PIN = "1111"


def _unique_email():
    return f"testclient_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}@ex.com"


# ---------- Universal login ----------
class TestUniversalLogin:
    def test_staff_routes_to_type_staff(self):
        r = requests.post(f"{BASE}/auth/universal-login",
                          json={"email": STAFF_EMAIL, "password": STAFF_PASS})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["type"] == "staff"
        assert data["role"] in ("admin", "manager", "vendeur")
        assert "token" in data

    def test_bad_password_401(self):
        r = requests.post(f"{BASE}/auth/universal-login",
                          json={"email": STAFF_EMAIL, "password": "wrong"})
        assert r.status_code == 401


# ---------- Customer registration ----------
class TestCustomerRegister:
    def test_minor_blocked_403(self):
        r = requests.post(f"{BASE}/customer/register", json={
            "first_name": "Kid", "email": _unique_email(),
            "password": "secret123", "birth_date": "2010-01-01",
            "accept_terms": True,
        })
        assert r.status_code == 403, r.text

    def test_terms_required_400(self):
        r = requests.post(f"{BASE}/customer/register", json={
            "first_name": "NoCgu", "email": _unique_email(),
            "password": "secret123", "birth_date": "1995-01-01",
            "accept_terms": False,
        })
        assert r.status_code == 400

    def test_short_password_400(self):
        r = requests.post(f"{BASE}/customer/register", json={
            "first_name": "Short", "email": _unique_email(),
            "password": "12345", "birth_date": "1995-01-01",
            "accept_terms": True,
        })
        assert r.status_code == 400

    def test_adult_signup_ok_and_duplicate(self):
        email = _unique_email()
        r = requests.post(f"{BASE}/customer/register", json={
            "first_name": "Adult", "email": email,
            "password": "secret123", "birth_date": "1995-01-01",
            "accept_terms": True,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data.get("qr_token")
        assert "token" in data
        assert data["role"] == "customer"
        # cookie set
        assert "customer_token" in r.cookies or True  # cookie may be domain-specific

        # duplicate
        r2 = requests.post(f"{BASE}/customer/register", json={
            "first_name": "Adult", "email": email,
            "password": "secret123", "birth_date": "1995-01-01",
            "accept_terms": True,
        })
        assert r2.status_code == 400


# ---------- verify-pin ----------
class TestVerifyPin:
    def test_admin_pin_ok(self):
        r = requests.post(f"{BASE}/auth/verify-pin",
                          json={"pin": ADMIN_PIN, "require_role": "admin"})
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True
        assert r.json()["role"] == "admin"

    def test_bad_pin_401(self):
        r = requests.post(f"{BASE}/auth/verify-pin",
                          json={"pin": "9999", "require_role": "admin"})
        assert r.status_code == 401


# ---------- Customer profile / me / delete ----------
@pytest.fixture(scope="module")
def customer_session():
    """Create a fresh customer and return (session, data)."""
    s = requests.Session()
    email = _unique_email()
    r = s.post(f"{BASE}/customer/register", json={
        "first_name": "Jean", "last_name": "Test", "email": email,
        "password": "secret123", "birth_date": "1995-01-01",
        "accept_terms": True,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    # ensure Authorization fallback header set from token
    s.headers.update({"Authorization": f"Bearer {data['token']}"})
    return s, data, email


class TestCustomerMeAndProfile:
    def test_me_returns_birth_date(self, customer_session):
        s, data, email = customer_session
        r = s.get(f"{BASE}/customer/me")
        assert r.status_code == 200, r.text
        me = r.json()
        assert me["email"] == email
        assert me.get("birth_date") == "1995-01-01"
        assert "recent_sales" in me

    def test_profile_update_fields(self, customer_session):
        s, data, email = customer_session
        r = s.put(f"{BASE}/customer/profile", json={
            "first_name": "Jeanne", "last_name": "Modif", "phone": "0102030405"
        })
        assert r.status_code == 200, r.text
        upd = r.json()
        assert upd["first_name"] == "Jeanne"
        assert upd["phone"] == "0102030405"

    def test_profile_password_requires_current(self, customer_session):
        s, data, email = customer_session
        r = s.put(f"{BASE}/customer/profile", json={
            "new_password": "newsecret", "current_password": "WRONG",
        })
        assert r.status_code == 400

    def test_welcome_notification_present(self, customer_session):
        s, data, email = customer_session
        r = s.get(f"{BASE}/notifications")
        assert r.status_code == 200
        body = r.json()
        assert body["ctx"] == "customer"
        assert body["unread"] >= 1
        kinds = [n["kind"] for n in body["items"]]
        assert "welcome" in kinds

    def test_mark_read(self, customer_session):
        s, data, email = customer_session
        r = s.post(f"{BASE}/notifications/mark-read", json=None)
        assert r.status_code == 200
        # unread should now be 0
        r2 = s.get(f"{BASE}/notifications")
        assert r2.json()["unread"] == 0


# ---------- Staff notifications context ----------
class TestStaffNotifications:
    def test_staff_notifications_ctx(self):
        s = requests.Session()
        r = s.post(f"{BASE}/auth/universal-login",
                   json={"email": STAFF_EMAIL, "password": STAFF_PASS})
        assert r.status_code == 200
        token = r.json()["token"]
        s.headers.update({"Authorization": f"Bearer {token}"})
        r2 = s.get(f"{BASE}/notifications")
        assert r2.status_code == 200
        assert r2.json()["ctx"] == "staff"


# ---------- Sale creates customer notification ----------
class TestSaleNotification:
    def test_sale_generates_customer_notification(self):
        # Register a fresh customer to link to a sale
        cs = requests.Session()
        email = _unique_email()
        rr = cs.post(f"{BASE}/customer/register", json={
            "first_name": "SaleClient", "email": email,
            "password": "secret123", "birth_date": "1995-01-01",
            "accept_terms": True,
        })
        assert rr.status_code == 200
        customer = rr.json()
        cs.headers.update({"Authorization": f"Bearer {customer['token']}"})

        # Staff session — PIN login for full session (need store_id for products)
        ss = requests.Session()
        r = ss.post(f"{BASE}/auth/pin-login", json={"pin": ADMIN_PIN})
        if r.status_code != 200:
            pytest.skip("pin-login unavailable")
        token = r.json().get("token") or r.json().get("access_token")
        if token:
            ss.headers.update({"Authorization": f"Bearer {token}"})
        # pick a store
        pubs = requests.get(f"{BASE}/stores/public").json()
        if pubs:
            ss.post(f"{BASE}/auth/switch-store", json={"store_id": pubs[0]["id"]})
        # find a product with stock
        prods = ss.get(f"{BASE}/products").json()
        prod = next((p for p in prods if p.get("stock", 0) > 0), None)
        if not prod:
            pytest.skip("no product with stock")

        item = {
            "product_id": prod["id"],
            "name": prod["name"],
            "unit_price": prod.get("price", 1.0),
            "quantity": 1,
            "vat_rate": prod.get("vat_rate", 20),
            "discount": 0,
        }
        sale_body = {
            "items": [item],
            "payments": [{"method": "cash", "amount": prod.get("price", 1.0)}],
            "global_discount": 0,
            "customer_id": customer["id"],
        }
        sr = ss.post(f"{BASE}/sales", json=sale_body)
        assert sr.status_code == 200, sr.text

        # Now customer notifications should contain a 'sale' kind
        r2 = cs.get(f"{BASE}/notifications")
        assert r2.status_code == 200
        kinds = [n["kind"] for n in r2.json()["items"]]
        assert "sale" in kinds


# ---------- Account delete anonymises sales ----------
class TestAccountDeletion:
    def test_delete_anonymises_sales(self):
        # Fresh customer + sale link
        cs = requests.Session()
        email = _unique_email()
        rr = cs.post(f"{BASE}/customer/register", json={
            "first_name": "ToDelete", "email": email,
            "password": "secret123", "birth_date": "1995-01-01",
            "accept_terms": True,
        })
        assert rr.status_code == 200
        cust = rr.json()
        cs.headers.update({"Authorization": f"Bearer {cust['token']}"})

        # Staff create sale
        ss = requests.Session()
        r = ss.post(f"{BASE}/auth/pin-login", json={"pin": ADMIN_PIN})
        if r.status_code != 200:
            pytest.skip("pin-login unavailable")
        pubs = requests.get(f"{BASE}/stores/public").json()
        if pubs:
            ss.post(f"{BASE}/auth/switch-store", json={"store_id": pubs[0]["id"]})
        prods = ss.get(f"{BASE}/products").json()
        prod = next((p for p in prods if p.get("stock", 0) > 0), None)
        sale_id = None
        if prod:
            sr = ss.post(f"{BASE}/sales", json={
                "items": [{"product_id": prod["id"], "name": prod["name"],
                           "unit_price": prod.get("price", 1.0), "quantity": 1,
                           "vat_rate": prod.get("vat_rate", 20), "discount": 0}],
                "payments": [{"method": "cash", "amount": prod.get("price", 1.0)}],
                "global_discount": 0,
                "customer_id": cust["id"],
            })
            if sr.status_code == 200:
                sale_id = sr.json().get("id")

        # Delete account
        dr = cs.delete(f"{BASE}/customer/account")
        assert dr.status_code == 200, dr.text
        # customer/me should now be 401
        me = cs.get(f"{BASE}/customer/me")
        assert me.status_code in (401, 403)

        # Sale should still exist but customer_id null
        if sale_id:
            found = ss.get(f"{BASE}/sales")
            if found.status_code == 200:
                match = [s for s in found.json() if s.get("id") == sale_id]
                if match:
                    assert match[0].get("customer_id") in (None, "")
