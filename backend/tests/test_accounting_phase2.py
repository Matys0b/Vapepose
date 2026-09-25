"""Phase 2 delta tests: accounting, expenses, bulk stock, store switch."""
import os
import uuid
import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://vape-register-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "4gr7wkdgjn@privaterelay.appleid.com", "password": "ChangeMe2026!"}
MANAGER = {"email": "manager@vapepos.local", "password": "Manager2026!"}
CASHIER = {"email": "vendeur@vapepos.local", "password": "Vendeur2026!"}


def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, r.text
    return s, r.json()


@pytest.fixture(scope="module")
def admin():
    s, d = _login(ADMIN)
    return s, d


@pytest.fixture(scope="module")
def manager():
    s, d = _login(MANAGER)
    return s, d


@pytest.fixture(scope="module")
def cashier():
    s, d = _login(CASHIER)
    return s, d


# --- Expenses -----------------------------------------------------------
class TestExpenses:
    created_id = None

    def test_cashier_forbidden_create(self, cashier):
        s, _ = cashier
        r = s.post(f"{API}/expenses", json={"label": "TEST_x", "amount": 10.0}, timeout=30)
        assert r.status_code == 403

    def test_cashier_forbidden_list(self, cashier):
        s, _ = cashier
        r = s.get(f"{API}/expenses", timeout=30)
        assert r.status_code == 403

    def test_manager_create_expense_vat_ttc(self, manager):
        s, _ = manager
        body = {"label": f"TEST_exp_{uuid.uuid4().hex[:6]}", "amount": 120.0, "vat_rate": 20.0,
                "category": "TEST", "payment_method": "card"}
        r = s.post(f"{API}/expenses", json=body, timeout=30)
        assert r.status_code == 200, r.text
        e = r.json()
        assert e["id"]
        assert e["amount"] == 120.0
        # vat_amount is TTC-based: 120 - 120/1.2 = 20.0
        assert abs(e["vat_amount"] - 20.0) < 0.01
        assert "_id" not in e
        TestExpenses.created_id = e["id"]

    def test_list_expenses_admin(self, admin):
        s, _ = admin
        r = s.get(f"{API}/expenses", timeout=30)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert any(e["id"] == TestExpenses.created_id for e in items)

    def test_list_expenses_date_filter(self, admin):
        s, _ = admin
        # far past range yields empty
        r = s.get(f"{API}/expenses", params={"date_from": "2000-01-01", "date_to": "2000-01-02"}, timeout=30)
        assert r.status_code == 200
        assert r.json() == []

    def test_delete_expense_cashier_forbidden(self, cashier):
        s, _ = cashier
        r = s.delete(f"{API}/expenses/{TestExpenses.created_id}", timeout=30)
        assert r.status_code == 403

    def test_delete_expense(self, manager):
        s, _ = manager
        assert TestExpenses.created_id
        r = s.delete(f"{API}/expenses/{TestExpenses.created_id}", timeout=30)
        assert r.status_code == 200
        # deleting again -> 404
        r2 = s.delete(f"{API}/expenses/{TestExpenses.created_id}", timeout=30)
        assert r2.status_code == 404


# --- Accounting summary --------------------------------------------------
class TestAccountingSummary:
    def test_cashier_forbidden(self, cashier):
        s, _ = cashier
        r = s.get(f"{API}/accounting/summary", timeout=30)
        assert r.status_code == 403

    def test_summary_admin_default(self, admin):
        s, _ = admin
        r = s.get(f"{API}/accounting/summary", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("range", "sales", "vat_by_rate", "payments", "ca_by_user",
                  "ca_by_category", "expenses", "vat_due", "gross_margin_estimate"):
            assert k in d, f"missing {k}"
        assert set(d["payments"].keys()) == {"cash", "card", "other"}
        assert isinstance(d["vat_by_rate"], list)
        assert isinstance(d["ca_by_user"], list)
        assert isinstance(d["ca_by_category"], list)
        for k in ("count", "total_ttc", "total_ht", "total_vat_collected", "avg_basket"):
            assert k in d["sales"]

    def test_summary_with_dates(self, manager):
        s, _ = manager
        r = s.get(f"{API}/accounting/summary",
                  params={"date_from": "2025-01-01", "date_to": "2030-01-01"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["range"]["from"] == "2025-01-01"
        assert d["range"]["to"] == "2030-01-01"

    def test_summary_expense_impacts_vat_due(self, manager):
        s, _ = manager
        # snapshot
        d1 = s.get(f"{API}/accounting/summary", timeout=30).json()
        exp_total_before = d1["expenses"]["total"]
        vat_due_before = d1["vat_due"]

        r = s.post(f"{API}/expenses", json={"label": "TEST_impact", "amount": 60.0, "vat_rate": 20.0}, timeout=30)
        assert r.status_code == 200
        eid = r.json()["id"]
        exp_vat = r.json()["vat_amount"]  # 10.0

        d2 = s.get(f"{API}/accounting/summary", timeout=30).json()
        assert round(d2["expenses"]["total"] - exp_total_before, 2) == 60.0
        # vat_due decreases by the deductible VAT of the expense
        assert abs((vat_due_before - d2["vat_due"]) - exp_vat) < 0.02

        # cleanup
        s.delete(f"{API}/expenses/{eid}", timeout=30)


# --- Accounting timeseries -----------------------------------------------
class TestTimeseries:
    def test_cashier_forbidden(self, cashier):
        s, _ = cashier
        r = s.get(f"{API}/accounting/timeseries", timeout=30)
        assert r.status_code == 403

    @pytest.mark.parametrize("period", ["day", "week", "month"])
    def test_periods(self, admin, period):
        s, _ = admin
        r = s.get(f"{API}/accounting/timeseries", params={"period": period}, timeout=30)
        assert r.status_code == 200, r.text
        arr = r.json()
        assert isinstance(arr, list)
        for b in arr:
            assert set(b.keys()) >= {"key", "total", "count"}
        keys = [b["key"] for b in arr]
        assert keys == sorted(keys)

    def test_invalid_period(self, admin):
        s, _ = admin
        r = s.get(f"{API}/accounting/timeseries", params={"period": "quarter"}, timeout=30)
        assert r.status_code == 422


# --- Accounting CSV export -----------------------------------------------
class TestExportCsv:
    def test_cashier_forbidden(self, cashier):
        s, _ = cashier
        r = s.get(f"{API}/accounting/export.csv", timeout=30)
        assert r.status_code == 403

    def test_csv_headers(self, admin):
        s, _ = admin
        r = s.get(f"{API}/accounting/export.csv", timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        first_line = r.text.splitlines()[0]
        assert first_line == "numero;date;vendeur;total_ttc;total_ht;tva;moyens_paiement;nb_articles"


# --- Bulk stock ----------------------------------------------------------
class TestBulkStock:
    def test_cashier_forbidden(self, cashier):
        s, _ = cashier
        r = s.post(f"{API}/stock/bulk",
                   json={"lines": [{"product_id": "x", "delta": 1}], "reason": "test"}, timeout=30)
        assert r.status_code == 403

    def test_empty_lines_400(self, manager):
        s, _ = manager
        r = s.post(f"{API}/stock/bulk", json={"lines": [], "reason": "test"}, timeout=30)
        assert r.status_code == 400

    def test_bulk_increments_and_movement(self, manager):
        s, _ = manager
        products = s.get(f"{API}/products", timeout=30).json()
        p1, p2 = products[0], products[1]
        stock1_before, stock2_before = p1["stock"], p2["stock"]

        body = {"lines": [
            {"product_id": p1["id"], "delta": 3},
            {"product_id": p2["id"], "delta": 5},
            {"product_id": "does-not-exist-" + uuid.uuid4().hex, "delta": 9},  # silently skipped
            {"product_id": p1["id"], "delta": 0},  # zero -> skipped, doesn't count
        ], "reason": "TEST_bulk_reception"}
        r = s.post(f"{API}/stock/bulk", json=body, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["updated"] == 2  # unknown + zero skipped

        prods_after = {p["id"]: p for p in s.get(f"{API}/products", timeout=30).json()}
        assert prods_after[p1["id"]]["stock"] == stock1_before + 3
        assert prods_after[p2["id"]]["stock"] == stock2_before + 5

        movs = s.get(f"{API}/stock/movements", timeout=30).json()
        assert any(m["product_id"] == p1["id"] and m["delta"] == 3 and m["reason"] == "TEST_bulk_reception" for m in movs)
        assert any(m["product_id"] == p2["id"] and m["delta"] == 5 and m["reason"] == "TEST_bulk_reception" for m in movs)


# --- Store switch --------------------------------------------------------
class TestStoreSwitch:
    def test_switch_unknown_404(self, cashier):
        s, _ = cashier
        r = s.post(f"{API}/auth/switch-store", json={"store_id": "nope-" + uuid.uuid4().hex}, timeout=30)
        assert r.status_code == 404

    def test_switch_success_cashier(self, cashier):
        s, _ = cashier
        stores = s.get(f"{API}/stores", timeout=30).json()
        assert stores, "need at least one store"
        target = stores[0]["id"]
        r = s.post(f"{API}/auth/switch-store", json={"store_id": target}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["store_id"] == target

        # verify persisted via /me
        me = s.get(f"{API}/auth/me", timeout=30).json()
        assert me.get("store_id") == target

    def test_unauth_switch(self):
        r = requests.post(f"{API}/auth/switch-store", json={"store_id": "x"}, timeout=30)
        assert r.status_code == 401
