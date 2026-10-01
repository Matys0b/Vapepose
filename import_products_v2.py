import os, asyncio, openpyxl
from uuid import uuid4
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')

def now(): return datetime.now(timezone.utc).isoformat()
def nid(): return str(uuid4())

async def main():
    c = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = c[os.environ['DB_NAME']]

    stores = await db.stores.find({}, {"_id": 0}).to_list(10)
    pou = next((s for s in stores if s['code'] == 'POU'), None)
    cha = next((s for s in stores if s['code'] == 'CHA'), None)
    assert pou and cha
    print(f"POU={pou['id']} CHA={cha['id']}")

    wb = openpyxl.load_workbook('/tmp/import2.xlsx', data_only=True)
    ws = wb.active
    headers = [c.value for c in ws[1]]
    idx = {h: i for i, h in enumerate(headers)}
    def val(row, key):
        i = idx.get(key)
        return row[i] if i is not None and i < len(row) else None

    # Load existing categories into {(parent_id, lower_name): id}
    existing_cats = await db.categories.find({}, {"_id": 0}).to_list(5000)
    cat_lookup = {(c.get("parent_id") or None, c["name"].strip().lower()): c["id"] for c in existing_cats}
    print(f"Existing cats: {len(cat_lookup)}")

    cat_paths = set()
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        name = val(row, 'Produit')
        if not name: continue
        name = str(name).strip()
        cat = val(row, 'Catégorie')
        parts = [p.strip() for p in str(cat).split('>')] if cat else []
        parts = [p for p in parts if p]
        if parts:
            for i in range(1, len(parts)+1):
                cat_paths.add(tuple(parts[:i]))
        def _f(k, dft=0.0):
            v = val(row, k)
            try: return float(v or 0)
            except: return dft
        def _i(k, dft=0):
            v = val(row, k)
            try: return int(v or 0)
            except: return dft
        ean = val(row, 'Codebarre')
        if ean is not None:
            ean = str(int(ean)) if isinstance(ean, float) and ean.is_integer() else str(ean).strip()
        img = val(row, 'image') or None
        rows.append({
            'name': name, 'cat_parts': parts, 'ean': ean or None,
            'price': _f('Prix de vente TTC'), 'cost': _f("Dernier prix d'achat HT"),
            'tva': _f('TVA', 20), 'stock': _i('Quantité'), 'image': img,
        })
    print(f"Read {len(rows)} rows, {len(cat_paths)} unique paths")

    # Create missing categories (deduplicate against existing by parent+name)
    path_to_id = {}
    created_cats = 0
    for path in sorted(cat_paths, key=lambda p: len(p)):
        parent_id = path_to_id.get(path[:-1]) if len(path) > 1 else None
        key = (parent_id, path[-1].strip().lower())
        if key in cat_lookup:
            path_to_id[path] = cat_lookup[key]
            continue
        cid = nid()
        doc = {'id': cid, 'name': path[-1], 'parent_id': parent_id, 'sort_order': 0}
        if len(path) == 1:
            palette = ["#EC4899","#8B5CF6","#06B6D4","#10B981","#F59E0B","#F43F5E","#A855F7","#3B82F6","#64748B","#EAB308"]
            doc['color'] = palette[created_cats % len(palette)]
        await db.categories.insert_one(doc)
        cat_lookup[key] = cid
        path_to_id[path] = cid
        created_cats += 1
    print(f"Created {created_cats} new categories (deduped against existing)")

    # Load existing products in both stores to dedupe
    def pkey(name, ean):
        return (name.lower().strip(), (ean or '').strip())
    exist_pou = await db.products.find({"store_id": pou['id']}, {"_id": 0, "name": 1, "ean": 1}).to_list(10000)
    exist_cha = await db.products.find({"store_id": cha['id']}, {"_id": 0, "name": 1, "ean": 1}).to_list(10000)
    pou_set = {pkey(p['name'], p.get('ean')) for p in exist_pou}
    cha_set = {pkey(p['name'], p.get('ean')) for p in exist_cha}
    print(f"Existing products: POU={len(pou_set)} CHA={len(cha_set)}")

    added_pou = 0
    added_cha = 0
    docs_pou, docs_cha = [], []
    seen_this_run = set()
    for r in rows:
        k = pkey(r['name'], r['ean'])
        if k in seen_this_run:
            continue
        seen_this_run.add(k)
        cat_id = path_to_id.get(tuple(r['cat_parts'])) if r['cat_parts'] else None
        base = {
            'name': r['name'], 'brand': None, 'variant': None,
            'category_id': cat_id, 'sku': r['ean'], 'ean': r['ean'],
            'price': r['price'], 'cost_price': r['cost'], 'vat_rate': r['tva'],
            'stock_alert': 5, 'image_url': r['image'],
            'is_favorite': False, 'active': True, 'sort_order': 0,
        }
        if k not in pou_set:
            docs_pou.append({**base, 'id': nid(), 'store_id': pou['id'], 'stock': r['stock'], 'created_at': now()})
            pou_set.add(k); added_pou += 1
        if k not in cha_set:
            docs_cha.append({**base, 'id': nid(), 'store_id': cha['id'], 'stock': 0, 'created_at': now()})
            cha_set.add(k); added_cha += 1
    if docs_pou: await db.products.insert_many(docs_pou)
    if docs_cha: await db.products.insert_many(docs_cha)
    print(f"Inserted new products — POU +{added_pou}, CHA +{added_cha}")
    print(f"Totals: POU={await db.products.count_documents({'store_id': pou['id'], 'active': True})}, CHA={await db.products.count_documents({'store_id': cha['id'], 'active': True})}")
    c.close()

asyncio.run(main())
