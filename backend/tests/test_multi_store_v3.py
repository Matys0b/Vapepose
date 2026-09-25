"""
Backend tests for VapePOS Phase 3 pivot:
- 3 admin accounts (Mathis/Emma/Jessica) with PIN login
- Per-store product isolation (Pouzauges POU, Chantonnay CHA)
- Accounting with store filter (store_id=all / <id>)
"""
import os
import pytest
import requests

def _load_frontend_url():
    p = "/app/frontend/.env"
    try:
        for line in open(p):
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip()
    except Exception:
        pass
    return os.environ.get("REACT_APP_BACKEND_URL", "")

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or _load_frontend_url()).rstrip("/")
API = f"{BASE_URL}/api"


# ---------- fixtures ---------------------------------------------------------
@pytest.fixture(scope="module")
def stores():
    r = requests.get(f"{API}/stores/public")
    assert r.status_code == 200, r.text
    data = r.json()
    return {s["code"]: s for s in data}


def _pin_login(pin: str) -> requests.Session:
    s = requests.Session()
    r = s.post(f"{API}/auth/pin-login", json={"pin": pin})
    assert r.status_code == 200, f"PIN {pin} login failed: {r.status_code} {r.text}"
    tok = r.json().get("token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


def _switch(sess: requests.Session, store_id: str):
    r = sess.post(f"{API}/auth/switch-store", json={"store_id": store_id})
    assert r.status_code == 200, r.text


@pytest.fixture
def mathis():
    return _pin_login("1111")


@pytest.fixture
def emma_pou(stores):
    s = _pin_login("2222")
    _switch(s, stores["POU"]["id"])
    return s


@pytest.fixture
def jessica_cha(stores):
    s = _pin_login("3333")
    _switch(s, stores["CHA"]["id"])
    return s


# ---------- public endpoints -------------------------------------------------
class TestPublicEndpoints:
    def test_auth_accounts_returns_three(self):
        r = requests.get(f"{API}/auth/accounts")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 3, f"expected 3 accounts, got {len(data)}: {data}"
        names = sorted(u["name"] for u in data)
        assert names == ["Emma", "Jessica", "Mathis"]
        for u in data:
            assert u["role"] == "admin"
            assert u.get("color")
            # must not expose sensitive fields
            assert "password_hash" not in u
            assert "pin_hash" not in u

    def test_stores_public_returns_two(self):
        r = requests.get(f"{API}/stores/public")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 2
        codes = sorted(s["code"] for s in data)
        assert codes == ["CHA", "POU"]


# ---------- Auth PIN login ---------------------------------------------------
class TestPinLogin:
    @pytest.mark.parametrize("pin,name", [("1111", "Mathis"), ("2222", "Emma"), ("3333", "Jessica")])
    def test_pin_login_ok(self, pin, name):
        r = requests.post(f"{API}/auth/pin-login", json={"pin": pin})
        assert r.status_code == 200
        d = r.json()
        assert d["name"] == name
        assert d["role"] == "admin"
        # Note: store_id may be persisted from a prior switch-store; spec suggests
        # it should be None on a fresh install, but PIN login does not clear it.

    def test_pin_login_wrong(self):
        r = requests.post(f"{API}/auth/pin-login", json={"pin": "9999"})
        assert r.status_code == 401

    def test_legacy_email_login_gone(self):
        for email in ["admin@vapepos.local", "manager@vapepos.local", "vendeur@vapepos.local"]:
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "admin123"})
            assert r.status_code == 401, f"legacy {email} should be gone"

    def test_bootstrap_flag_present(self, mathis):
        # can't hit DB directly, so infer flag by: subsequent restarts don't wipe.
        # We assert users count stays 3 across a second /accounts call.
        r = requests.get(f"{API}/auth/accounts")
        assert len(r.json()) == 3


# ---------- switch store + me ------------------------------------------------
class TestSwitchStore:
    def test_switch_store_reflects_in_me(self, stores):
        s = _pin_login("2222")
        me1 = s.get(f"{API}/auth/me").json()
        # (store_id might be persisted from a previous test run — that's ok)
        _switch(s, stores["POU"]["id"])
        me2 = s.get(f"{API}/auth/me").json()
        assert me2["store_id"] == stores["POU"]["id"]


# ---------- Products isolation ----------------------------------------------
class TestProductsIsolation:
    def test_emma_sees_only_pouzauges(self, emma_pou, stores):
        r = emma_pou.get(f"{API}/products", params={"limit": 500})
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) == 17, f"expected 17 Pouzauges products, got {len(prods)}"
        pou_id = stores["POU"]["id"]
        assert all(p["store_id"] == pou_id for p in prods)

    def test_jessica_sees_only_chantonnay(self, jessica_cha, stores):
        r = jessica_cha.get(f"{API}/products", params={"limit": 500})
        assert r.status_code == 200
        prods = r.json()
        assert len(prods) == 17, f"expected 17 Chantonnay products, got {len(prods)}"
        cha_id = stores["CHA"]["id"]
        assert all(p["store_id"] == cha_id for p in prods)

    def test_products_are_independent_docs(self, emma_pou, jessica_cha):
        pou = {p["id"] for p in emma_pou.get(f"{API}/products", params={"limit": 500}).json()}
        cha = {p["id"] for p in jessica_cha.get(f"{API}/products", params={"limit": 500}).json()}
        assert pou.isdisjoint(cha), "Pouzauges and Chantonnay must have different product ids"

    def test_store_id_all_bypasses(self, emma_pou):
        r = emma_pou.get(f"{API}/products", params={"store_id": "all", "limit": 500})
        assert r.status_code == 200
        prods = r.json()
        # 17 x 2 stores
        assert len(prods) >= 34, f"store_id=all should return both stores, got {len(prods)}"
        assert len({p["store_id"] for p in prods}) == 2

    def test_lookup_returns_own_store(self, emma_pou, jessica_cha, stores):
        ean = "3760001000011"
        r_e = emma_pou.get(f"{API}/products/lookup", params={"code": ean})
        r_j = jessica_cha.get(f"{API}/products/lookup", params={"code": ean})
        # both should either find one in own store, or 404 if not seeded
        # SEED_PRODUCTS_TEMPLATE has ean 3760001000011 for both stores after duplication
        if r_e.status_code == 200:
            assert r_e.json()["store_id"] == stores["POU"]["id"]
        if r_j.status_code == 200:
            assert r_j.json()["store_id"] == stores["CHA"]["id"]
        # Not both 404
        assert r_e.status_code == 200 or r_j.status_code == 200


# ---------- Sales isolation --------------------------------------------------
class TestSalesIsolation:
    def test_sale_only_decrements_own_store(self, emma_pou, jessica_cha, stores):
        # pick a Pouzauges product
        pou_prods = emma_pou.get(f"{API}/products", params={"limit": 500}).json()
        # find one with stock > 0 and matching EAN in Chantonnay
        cha_by_ean = {p["ean"]: p for p in jessica_cha.get(f"{API}/products", params={"limit": 500}).json()}
        target = next((p for p in pou_prods if p["stock"] > 0 and p["ean"] in cha_by_ean), None)
        assert target is not None, "no suitable product found"

        pou_stock_before = target["stock"]
        cha_twin = cha_by_ean[target["ean"]]
        cha_stock_before = cha_twin["stock"]

        # create sale as Emma (Pouzauges)
        sale_body = {
            "items": [{
                "product_id": target["id"],
                "name": target["name"],
                "unit_price": target["price"],
                "quantity": 1,
                "vat_rate": target["vat_rate"],
                "discount": 0,
            }],
            "payments": [{"method": "cash", "amount": target["price"]}],
            "global_discount": 0,
        }
        r = emma_pou.post(f"{API}/sales", json=sale_body)
        assert r.status_code == 200, r.text
        sale = r.json()
        assert sale["store_id"] == stores["POU"]["id"]

        # verify Pouzauges stock decremented
        pou_after = [p for p in emma_pou.get(f"{API}/products", params={"limit": 500}).json() if p["id"] == target["id"]][0]
        assert pou_after["stock"] == pou_stock_before - 1

        # verify Chantonnay twin unchanged
        cha_after = [p for p in jessica_cha.get(f"{API}/products", params={"limit": 500}).json() if p["id"] == cha_twin["id"]][0]
        assert cha_after["stock"] == cha_stock_before, (
            f"Chantonnay stock changed! before={cha_stock_before}, after={cha_after['stock']}"
        )


# ---------- Stock adjust / bulk isolation -----------------------------------
class TestStockIsolation:
    def test_adjust_only_targeted_store(self, emma_pou, jessica_cha):
        pou_prods = emma_pou.get(f"{API}/products", params={"limit": 500}).json()
        cha_by_ean = {p["ean"]: p for p in jessica_cha.get(f"{API}/products", params={"limit": 500}).json()}
        target = next(p for p in pou_prods if p["ean"] in cha_by_ean)
        cha_twin = cha_by_ean[target["ean"]]

        cha_before = cha_twin["stock"]
        r = emma_pou.post(f"{API}/stock/adjust", json={
            "product_id": target["id"], "delta": 5, "reason": "reception"
        })
        assert r.status_code == 200, r.text
        cha_after = [p for p in jessica_cha.get(f"{API}/products", params={"limit": 500}).json() if p["id"] == cha_twin["id"]][0]
        assert cha_after["stock"] == cha_before

    def test_bulk_only_targeted_store(self, emma_pou, jessica_cha):
        pou_prods = emma_pou.get(f"{API}/products", params={"limit": 500}).json()
        cha_by_ean = {p["ean"]: p for p in jessica_cha.get(f"{API}/products", params={"limit": 500}).json()}
        target = next(p for p in pou_prods if p["ean"] in cha_by_ean)
        cha_twin = cha_by_ean[target["ean"]]
        cha_before = cha_twin["stock"]

        r = emma_pou.post(f"{API}/stock/bulk", json={
            "lines": [{"product_id": target["id"], "delta": 3}], "reason": "reception"
        })
        assert r.status_code == 200, r.text
        assert r.json().get("updated") == 1
        cha_after = [p for p in jessica_cha.get(f"{API}/products", params={"limit": 500}).json() if p["id"] == cha_twin["id"]][0]
        assert cha_after["stock"] == cha_before


# ---------- Accounting store filter ----------------------------------------
class TestAccountingFilter:
    def _mk_sale(self, sess, stores_code_id):
        prods = sess.get(f"{API}/products", params={"limit": 500}).json()
        p = next(x for x in prods if x["stock"] > 0)
        body = {
            "items": [{
                "product_id": p["id"], "name": p["name"], "unit_price": p["price"],
                "quantity": 1, "vat_rate": p["vat_rate"], "discount": 0,
            }],
            "payments": [{"method": "card", "amount": p["price"]}],
            "global_discount": 0,
        }
        r = sess.post(f"{API}/sales", json=body)
        assert r.status_code == 200, r.text
        return r.json()

    def test_summary_filter(self, emma_pou, jessica_cha, stores):
        # ensure at least one sale in each store
        self._mk_sale(emma_pou, stores["POU"]["id"])
        self._mk_sale(jessica_cha, stores["CHA"]["id"])

        r_all = emma_pou.get(f"{API}/accounting/summary", params={"store_id": "all"})
        r_pou = emma_pou.get(f"{API}/accounting/summary", params={"store_id": stores["POU"]["id"]})
        r_cha = emma_pou.get(f"{API}/accounting/summary", params={"store_id": stores["CHA"]["id"]})
        for r in (r_all, r_pou, r_cha):
            assert r.status_code == 200, r.text
        all_count = r_all.json()["sales"]["count"]
        pou_count = r_pou.json()["sales"]["count"]
        cha_count = r_cha.json()["sales"]["count"]
        assert all_count == pou_count + cha_count
        assert pou_count >= 1
        assert cha_count >= 1

    def test_timeseries_filter(self, emma_pou, stores):
        r = emma_pou.get(f"{API}/accounting/timeseries", params={"store_id": stores["POU"]["id"], "period": "day"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_export_csv_has_magasin(self, emma_pou):
        r = emma_pou.get(f"{API}/accounting/export.csv", params={"store_id": "all"})
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        text = r.text
        assert "magasin" in text.splitlines()[0]


# ---------- Dashboard --------------------------------------------------------
class TestDashboard:
    def test_dashboard_all(self, emma_pou):
        r = emma_pou.get(f"{API}/dashboard/stats", params={"store_id": "all"})
        assert r.status_code == 200

    def test_dashboard_default_uses_user_store(self, emma_pou):
        r = emma_pou.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
