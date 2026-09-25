"""VapePOS backend regression test suite.

Covers: auth (email+password, pin, /me via cookie & bearer), categories,
products (filters, lookup), cash-sessions (open/current/close), sales
(stock, VAT, session totals, insufficient payment, loyalty), refund role
guard, suspended carts, stock/adjust + movement, customers CRUD & QR,
suppliers, users role guard, dashboard stats.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vape-register-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "4gr7wkdgjn@privaterelay.appleid.com", "password": "ChangeMe2026!"}
MANAGER = {"email": "manager@vapepos.local", "password": "Manager2026!"}
CASHIER = {"email": "vendeur@vapepos.local", "password": "Vendeur2026!"}
CASHIER_PIN = "1234"


def _login(email, password):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="session")
def admin_session():
    s, data = _login(ADMIN["email"], ADMIN["password"])
    return s, data


@pytest.fixture(scope="session")
def manager_session():
    s, data = _login(MANAGER["email"], MANAGER["password"])
    return s, data


@pytest.fixture(scope="session")
def cashier_session():
    s, data = _login(CASHIER["email"], CASHIER["password"])
    return s, data


# --- Auth ---------------------------------------------------------------
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN["email"].lower()
        assert data["role"] == "admin"
        assert isinstance(data["token"], str) and len(data["token"]) > 20
        # cookie set
        assert any(c.name == "access_token" for c in r.cookies)

    def test_login_bad_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=30)
        assert r.status_code == 401

    def test_pin_login_cashier(self):
        r = requests.post(f"{API}/auth/pin-login", json={"pin": CASHIER_PIN}, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "cashier"
        assert data["name"] == "Thomas V."

    def test_pin_login_bad(self):
        r = requests.post(f"{API}/auth/pin-login", json={"pin": "0000"}, timeout=30)
        assert r.status_code == 401

    def test_me_via_cookie(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        assert r.json()["role"] == "admin"
        assert "password_hash" not in r.json()

    def test_me_via_bearer(self, admin_session):
        _, data = admin_session
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {data['token']}"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"].lower()

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401


# --- Categories & Products ----------------------------------------------
class TestCatalog:
    def test_categories(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/categories", timeout=30)
        assert r.status_code == 200
        cats = r.json()
        assert len(cats) == 10
        names = [c["name"] for c in cats]
        assert "E-liquides" in names and "Batteries" in names

    def test_products_favorite(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/products", params={"favorite": "true"}, timeout=30)
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) > 0
        assert all(p["is_favorite"] for p in prods)

    def test_products_search_red(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/products", params={"q": "Red"}, timeout=30)
        assert r.status_code == 200
        prods = r.json()
        assert any("Red Astaire" in p["name"] for p in prods)

    def test_lookup_ean_found(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/products/lookup", params={"code": "3760001000011"}, timeout=30)
        assert r.status_code == 200
        assert "Red Astaire" in r.json()["name"]

    def test_lookup_not_found(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/products/lookup", params={"code": "0000000000000"}, timeout=30)
        assert r.status_code == 404


# --- Cash sessions ------------------------------------------------------
@pytest.fixture(scope="session")
def open_cashier_session(cashier_session):
    """Ensure cashier has an open cash session. Close any existing first."""
    s, _ = cashier_session
    cur = s.get(f"{API}/cash-sessions/current", timeout=30).json()
    if cur:
        s.post(f"{API}/cash-sessions/close", json={"counted_amount": 0.0}, timeout=30)
    r = s.post(f"{API}/cash-sessions/open", json={"opening_amount": 150.0}, timeout=30)
    assert r.status_code == 200, r.text
    return s, r.json()


class TestCashSessions:
    def test_open_session(self, open_cashier_session):
        s, sess = open_cashier_session
        assert sess["opening_amount"] == 150.0
        assert sess["closed_at"] is None
        assert sess["cash_sales_total"] == 0.0

    def test_open_double_fails(self, open_cashier_session):
        s, _ = open_cashier_session
        r = s.post(f"{API}/cash-sessions/open", json={"opening_amount": 100.0}, timeout=30)
        assert r.status_code == 400

    def test_current_session(self, open_cashier_session):
        s, sess = open_cashier_session
        r = s.get(f"{API}/cash-sessions/current", timeout=30)
        assert r.status_code == 200
        cur = r.json()
        assert cur and cur["id"] == sess["id"]


# --- Sales --------------------------------------------------------------
class TestSales:
    def _get_product(self, s, ean="3760001000011"):
        r = s.get(f"{API}/products/lookup", params={"code": ean}, timeout=30)
        assert r.status_code == 200
        return r.json()

    def test_insufficient_payment(self, open_cashier_session):
        s, _ = open_cashier_session
        p = self._get_product(s)
        body = {
            "items": [{"product_id": p["id"], "quantity": 1, "unit_price": p["price"], "name": p["name"], "vat_rate": 20.0}],
            "payments": [{"method": "cash", "amount": 1.0}],
        }
        r = s.post(f"{API}/sales", json=body, timeout=30)
        assert r.status_code == 400

    def test_create_sale_flow(self, open_cashier_session):
        s, sess = open_cashier_session
        p = self._get_product(s)
        stock_before = p["stock"]

        # session before
        sess_before = s.get(f"{API}/cash-sessions/current", timeout=30).json()

        overpay = round(p["price"] * 2 + 5.0, 2)
        body = {
            "items": [{"product_id": p["id"], "quantity": 2, "unit_price": p["price"], "name": p["name"], "vat_rate": 20.0}],
            "payments": [{"method": "cash", "amount": overpay}],
        }
        r = s.post(f"{API}/sales", json=body, timeout=30)
        assert r.status_code == 200, r.text
        sale = r.json()

        # sale number
        assert sale["number"] and "-" in sale["number"]
        # change_due
        expected_total = round(p["price"] * 2, 2)
        assert sale["total"] == expected_total
        assert sale["change_due"] == round(overpay - expected_total, 2)
        # VAT ~ total - total/1.20
        expected_vat = round(expected_total - expected_total / 1.2, 2)
        assert abs(sale["vat_total"] - expected_vat) < 0.02

        # stock decrement
        p_after = self._get_product(s)
        assert p_after["stock"] == stock_before - 2

        # session totals
        sess_after = s.get(f"{API}/cash-sessions/current", timeout=30).json()
        assert sess_after["sales_count"] == sess_before["sales_count"] + 1
        assert round(sess_after["cash_sales_total"] - sess_before["cash_sales_total"], 2) == overpay

    def test_sale_with_customer_loyalty(self, open_cashier_session):
        s, _ = open_cashier_session
        # find a customer
        cust = s.get(f"{API}/customers", timeout=30).json()[0]
        pts_before = cust["loyalty_points"]

        p = self._get_product(s, "3760001000028")  # Sub Zero 5.90€
        body = {
            "items": [{"product_id": p["id"], "quantity": 2, "unit_price": p["price"], "name": p["name"], "vat_rate": 20.0}],
            "payments": [{"method": "card", "amount": round(p["price"] * 2, 2)}],
            "customer_id": cust["id"],
        }
        r = s.post(f"{API}/sales", json=body, timeout=30)
        assert r.status_code == 200, r.text
        sale = r.json()
        expected_pts = int(sale["total"] // 1.0)
        assert sale["loyalty_added"] == expected_pts

        cust_after = s.get(f"{API}/customers/{cust['id']}", timeout=30).json()
        assert cust_after["loyalty_points"] == pts_before + expected_pts

    def test_refund_cashier_forbidden(self, open_cashier_session, admin_session):
        s_cash, _ = open_cashier_session
        # get a completed sale
        sales = s_cash.get(f"{API}/sales", timeout=30).json()
        sid = sales[0]["id"]
        r = s_cash.post(f"{API}/sales/{sid}/refund", timeout=30)
        assert r.status_code == 403

    def test_refund_admin_restocks(self, admin_session, open_cashier_session):
        s_admin, _ = admin_session
        s_cash, _ = open_cashier_session
        # get a fresh completed sale
        sales = s_cash.get(f"{API}/sales", timeout=30).json()
        completed = [x for x in sales if x["status"] == "completed"]
        assert completed, "need a completed sale"
        sale = completed[0]
        pid = sale["items"][0]["product_id"]
        qty = sale["items"][0]["quantity"]

        prod_before = s_admin.get(f"{API}/products/lookup", params={"code": None}, timeout=30)
        # simpler: fetch via list
        p_before = [p for p in s_admin.get(f"{API}/products", timeout=30).json() if p["id"] == pid][0]

        r = s_admin.post(f"{API}/sales/{sale['id']}/refund", timeout=30)
        assert r.status_code == 200, r.text

        p_after = [p for p in s_admin.get(f"{API}/products", timeout=30).json() if p["id"] == pid][0]
        assert p_after["stock"] == p_before["stock"] + qty

        # sale marked refunded
        detail = s_admin.get(f"{API}/sales/{sale['id']}", timeout=30).json()
        assert detail["status"] == "refunded"


# --- Suspended carts ----------------------------------------------------
class TestSuspendedCarts:
    def test_round_trip(self, cashier_session):
        s, _ = cashier_session
        body = {"items": [{"product_id": "x", "quantity": 1, "unit_price": 5.0, "name": "Test", "vat_rate": 20.0}],
                "label": "TEST_cart"}
        r = s.post(f"{API}/suspended-carts", json=body, timeout=30)
        assert r.status_code == 200
        cid = r.json()["id"]

        lst = s.get(f"{API}/suspended-carts", timeout=30).json()
        assert any(c["id"] == cid for c in lst)

        r = s.delete(f"{API}/suspended-carts/{cid}", timeout=30)
        assert r.status_code == 200

        lst2 = s.get(f"{API}/suspended-carts", timeout=30).json()
        assert not any(c["id"] == cid for c in lst2)


# --- Stock adjust -------------------------------------------------------
class TestStock:
    def test_cashier_cannot_adjust(self, cashier_session, admin_session):
        s_cash, _ = cashier_session
        s_admin, _ = admin_session
        products = s_admin.get(f"{API}/products", timeout=30).json()
        pid = products[0]["id"]
        r = s_cash.post(f"{API}/stock/adjust", json={"product_id": pid, "delta": 5, "reason": "test"}, timeout=30)
        assert r.status_code == 403

    def test_manager_adjust_and_movement(self, manager_session):
        s, _ = manager_session
        products = s.get(f"{API}/products", timeout=30).json()
        pid = products[0]["id"]
        stock_before = products[0]["stock"]
        r = s.post(f"{API}/stock/adjust", json={"product_id": pid, "delta": 7, "reason": "TEST_reception"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["stock"] == stock_before + 7

        movs = s.get(f"{API}/stock/movements", timeout=30).json()
        assert any(m["product_id"] == pid and m["delta"] == 7 and m["reason"] == "TEST_reception" for m in movs)


# --- Customers ----------------------------------------------------------
class TestCustomers:
    def test_search(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/customers", params={"q": "Lucie"}, timeout=30)
        assert r.status_code == 200
        assert any("Lucie" in c["first_name"] for c in r.json())

    def test_create_and_qr(self, admin_session):
        s, _ = admin_session
        body = {"first_name": "TEST_Alice", "last_name": "Dupont", "email": f"alice{uuid.uuid4().hex[:6]}@ex.com"}
        r = s.post(f"{API}/customers", json=body, timeout=30)
        assert r.status_code == 200
        c = r.json()
        assert c["qr_token"] and len(c["qr_token"]) > 10
        assert c["loyalty_points"] == 0

        r2 = s.get(f"{API}/customers/qr/{c['qr_token']}", timeout=30)
        assert r2.status_code == 200
        assert r2.json()["id"] == c["id"]


# --- Suppliers ----------------------------------------------------------
class TestSuppliers:
    def test_manager_create(self, manager_session):
        s, _ = manager_session
        r = s.post(f"{API}/suppliers", json={"name": f"TEST_Sup_{uuid.uuid4().hex[:6]}"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["id"]


# --- Users --------------------------------------------------------------
class TestUsers:
    def test_list_no_hashes(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/users", timeout=30)
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 4
        for u in users:
            assert "password_hash" not in u
            assert "pin_hash" not in u

    def test_cashier_cannot_list_users(self, cashier_session):
        s, _ = cashier_session
        r = s.get(f"{API}/users", timeout=30)
        assert r.status_code == 403

    def test_cashier_cannot_create_user(self, cashier_session):
        s, _ = cashier_session
        r = s.post(f"{API}/users", json={"email": "x@x.com", "name": "X", "password": "Pw12345!"}, timeout=30)
        assert r.status_code == 403

    def test_admin_creates_user(self, admin_session):
        s, _ = admin_session
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        r = s.post(f"{API}/users", json={"email": email, "name": "TEST_User", "password": "Pw12345!", "role": "cashier"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == email


# --- Dashboard ----------------------------------------------------------
class TestDashboard:
    def test_stats(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/dashboard/stats", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("day_total", "day_count", "day_avg", "low_stock", "top_products"):
            assert k in d
        assert isinstance(d["low_stock"], list)
        assert isinstance(d["top_products"], list)

    def test_cashier_forbidden(self, cashier_session):
        s, _ = cashier_session
        r = s.get(f"{API}/dashboard/stats", timeout=30)
        assert r.status_code == 403


# --- Close session (last) -----------------------------------------------
class TestZClose:
    def test_close_session(self, open_cashier_session):
        s, sess = open_cashier_session
        cur = s.get(f"{API}/cash-sessions/current", timeout=30).json()
        expected = round(cur["opening_amount"] + cur["cash_sales_total"], 2)
        r = s.post(f"{API}/cash-sessions/close", json={"counted_amount": expected + 1.0}, timeout=30)
        assert r.status_code == 200
        closed = r.json()
        assert closed["closed_at"] is not None
        assert closed["expected_amount"] == expected
        assert closed["difference"] == 1.0
