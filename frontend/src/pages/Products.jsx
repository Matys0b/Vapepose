import { useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import {
  ChevronRight, Home, FolderPlus, Plus, Edit, Trash2, Upload, Package, Star,
  Search, Layers, Download
} from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

const emptyProduct = {
  name: "", brand: "", sku: "", ean: "", price: 0, cost_price: 0,
  vat_rate: 20, stock: 0, stock_alert: 5, image_url: "", is_favorite: false, variant: "",
};

export default function ProductsPage() {
  const [currentId, setCurrentId] = useState(null); // null = root
  const [view, setView] = useState({ category: null, breadcrumb: [], children: [], product_count: 0 });
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [pForm, setPForm] = useState(emptyProduct);
  const [creatingCat, setCreatingCat] = useState(false);
  const [catName, setCatName] = useState("");
  const [importing, setImporting] = useState(false);

  const loadView = useCallback(async () => {
    if (!currentId) {
      const [rootCats, prods] = await Promise.all([
        api.get("/categories", { params: { parent_id: "root" } }),
        [], // don't load products at root
      ]);
      const counts = await api.get("/categories/tree");
      const map = {};
      const walk = (arr) => arr.forEach((c) => { map[c.id] = c.product_count; walk(c.children || []); });
      walk(counts.data);
      setView({
        category: null,
        breadcrumb: [],
        children: rootCats.data.map((c) => ({ ...c, product_count: map[c.id] || 0 })),
        product_count: 0,
      });
      setProducts([]);
      return;
    }
    const [v, p] = await Promise.all([
      api.get(`/categories/${currentId}`),
      api.get("/products", { params: { category_id: currentId } }),
    ]);
    // enrich children with product counts (from tree)
    const t = await api.get("/categories/tree");
    const map = {};
    const walk = (arr) => arr.forEach((c) => { map[c.id] = c.product_count; walk(c.children || []); });
    walk(t.data);
    setView({ ...v.data, children: (v.data.children || []).map((c) => ({ ...c, product_count: map[c.id] || 0 })) });
    setProducts(p.data);
  }, [currentId]);

  useEffect(() => { loadView(); }, [loadView]);

  const filtered = products.filter((p) => !q || `${p.name} ${p.brand} ${p.ean} ${p.sku}`.toLowerCase().includes(q.toLowerCase()));

  const openProduct = (p) => { setEditing(p); setPForm(p ? { ...emptyProduct, ...p } : emptyProduct); };
  const submitProduct = async (e) => {
    e.preventDefault();
    const body = {
      ...pForm,
      category_id: currentId,
      price: parseFloat(pForm.price) || 0,
      cost_price: parseFloat(pForm.cost_price) || 0,
      vat_rate: parseFloat(pForm.vat_rate) || 20,
      stock: parseInt(pForm.stock) || 0,
      stock_alert: parseInt(pForm.stock_alert) || 5,
    };
    try {
      if (editing?.id) await api.put(`/products/${editing.id}`, body);
      else await api.post("/products", body);
      toast.success(editing?.id ? "Produit mis à jour" : "Produit créé");
      setEditing(null); loadView();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  const deleteProduct = async (p) => {
    if (!window.confirm(`Supprimer ${p.name} ?`)) return;
    try { await api.delete(`/products/${p.id}`); loadView(); } catch (e) { toast.error(formatApiError(e)); }
  };

  const submitCategory = async (e) => {
    e.preventDefault();
    try {
      await api.post("/categories", { name: catName, parent_id: currentId });
      setCreatingCat(false); setCatName(""); toast.success("Catégorie créée"); loadView();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const deleteCategory = async (c) => {
    if (!window.confirm(`Supprimer "${c.name}" ?`)) return;
    try { await api.delete(`/categories/${c.id}`); toast.success("Supprimée"); loadView(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const goTo = (idx) => {
    if (idx === -1) setCurrentId(null);
    else setCurrentId(view.breadcrumb[idx].id);
  };

  return (
    <div className="space-y-4" data-testid="products-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl font-black">Produits</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setImporting(true)} data-testid="btn-import-products">
            <Upload className="w-4 h-4 mr-1" /> Importer CSV
          </Button>
          <Button onClick={() => setCreatingCat(true)} variant="outline" data-testid="btn-add-category">
            <FolderPlus className="w-4 h-4 mr-1" /> Sous-catégorie
          </Button>
          {currentId && (
            <Button onClick={() => openProduct({})} className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-add-product">
              <Plus className="w-4 h-4 mr-1" /> Produit
            </Button>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        <button onClick={() => goTo(-1)} className="flex items-center gap-1 px-2 h-8 rounded-lg hover:bg-slate-900 text-slate-300" data-testid="crumb-root">
          <Home className="w-3.5 h-3.5" /> Toutes les catégories
        </button>
        {view.breadcrumb.map((b, i) => (
          <div key={b.id} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <button onClick={() => goTo(i)} className={`px-2 h-8 rounded-lg hover:bg-slate-900 ${i === view.breadcrumb.length - 1 ? "text-pink-300 font-semibold" : "text-slate-300"}`} data-testid={`crumb-${b.id}`}>
              {b.name}
            </button>
          </div>
        ))}
      </div>

      {/* Sub-categories grid */}
      {view.children.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-400 mb-2">
            {currentId ? "Sous-catégories" : "Catégories principales"}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {view.children.map((c) => (
              <button
                key={c.id}
                onClick={() => setCurrentId(c.id)}
                className="group text-left rounded-2xl p-4 bg-slate-900/70 border border-violet-500/15 hover:border-fuchsia-500/50 transition relative"
                data-testid={`cat-tile-${c.id}`}
                style={c.color ? { boxShadow: `0 0 0 1px ${c.color}22 inset` } : undefined}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: c.color ? `linear-gradient(135deg, ${c.color}, #EC4899)` : "linear-gradient(135deg,#8B5CF6,#EC4899)" }}
                >
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div className="font-display font-bold text-lg leading-tight">{c.name}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {c.product_count} produit(s)
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCategory(c); }}
                  className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition"
                  data-testid={`btn-del-cat-${c.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products list inside current category */}
      {currentId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-slate-400">
              Produits dans "{view.category?.name}" — {products.length}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…" className="pl-9 h-9 w-64 bg-slate-900/60 border-violet-500/20" data-testid="input-products-search" />
            </div>
          </div>
          <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-widest text-slate-400 border-b border-violet-500/15">
              <div className="col-span-5">Produit</div>
              <div className="col-span-2">Marque</div>
              <div className="col-span-2">Prix</div>
              <div className="col-span-1">Stock</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
            {filtered.map((p) => (
              <div key={p.id} className="grid grid-cols-12 px-4 py-2 items-center border-b border-violet-500/10 text-sm hover:bg-slate-950/40" data-testid={`row-product-${p.id}`}>
                <div className="col-span-5 flex items-center gap-2">
                  {p.is_favorite && <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />}
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.variant} · {p.ean || p.sku || "—"}</div>
                  </div>
                </div>
                <div className="col-span-2 text-slate-300">{p.brand}</div>
                <div className="col-span-2 font-mono-num text-pink-300">{fmt(p.price)}</div>
                <div className={`col-span-1 font-mono-num ${p.stock <= p.stock_alert ? "text-rose-300" : "text-slate-200"}`}>{p.stock}</div>
                <div className="col-span-2 flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => openProduct(p)} data-testid={`btn-edit-product-${p.id}`}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteProduct(p)} className="text-rose-300 border-rose-500/40" data-testid={`btn-delete-product-${p.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                <Package className="w-8 h-8 text-violet-400/40" />
                Aucun produit dans cette catégorie
              </div>
            )}
          </Card>
        </div>
      )}

      {!currentId && view.children.length === 0 && (
        <div className="text-center text-slate-500 py-10">
          Aucune catégorie. Cliquez sur <span className="text-fuchsia-300 font-semibold">+ Sous-catégorie</span> pour commencer.
        </div>
      )}

      {/* Category create dialog */}
      <Dialog open={creatingCat} onOpenChange={(o) => !o && setCreatingCat(false)}>
        <DialogContent className="bg-slate-950 border-violet-500/30 max-w-md">
          <DialogTitle className="font-display text-xl font-black">
            Nouvelle catégorie {view.category ? `dans "${view.category.name}"` : "principale"}
          </DialogTitle>
          <form onSubmit={submitCategory} className="space-y-3">
            <input required autoFocus value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nom de la catégorie" className="w-full h-11 rounded-lg bg-slate-900 border border-violet-500/20 px-3 text-slate-100" data-testid="cat-name" />
            <Button type="submit" className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-save-category">Créer</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Product form dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl bg-slate-950 border-violet-500/30">
          <DialogTitle className="font-display text-xl font-black">
            {editing?.id ? "Modifier" : "Nouveau"} produit — <span className="text-fuchsia-300">{view.category?.name}</span>
          </DialogTitle>
          <form onSubmit={submitProduct} className="grid grid-cols-2 gap-3">
            <Field label="Nom"><input required value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} className="input-dark" data-testid="pf-name" /></Field>
            <Field label="Marque"><input value={pForm.brand} onChange={(e) => setPForm({ ...pForm, brand: e.target.value })} className="input-dark" data-testid="pf-brand" /></Field>
            <Field label="Variante"><input value={pForm.variant || ""} onChange={(e) => setPForm({ ...pForm, variant: e.target.value })} className="input-dark" data-testid="pf-variant" /></Field>
            <Field label="SKU"><input value={pForm.sku || ""} onChange={(e) => setPForm({ ...pForm, sku: e.target.value })} className="input-dark" data-testid="pf-sku" /></Field>
            <Field label="EAN"><input value={pForm.ean || ""} onChange={(e) => setPForm({ ...pForm, ean: e.target.value })} className="input-dark" data-testid="pf-ean" /></Field>
            <Field label="Prix TTC"><input type="number" step="0.01" value={pForm.price} onChange={(e) => setPForm({ ...pForm, price: e.target.value })} className="input-dark" data-testid="pf-price" /></Field>
            <Field label="Prix d'achat"><input type="number" step="0.01" value={pForm.cost_price} onChange={(e) => setPForm({ ...pForm, cost_price: e.target.value })} className="input-dark" data-testid="pf-cost" /></Field>
            <Field label="TVA %"><input type="number" step="0.1" value={pForm.vat_rate} onChange={(e) => setPForm({ ...pForm, vat_rate: e.target.value })} className="input-dark" data-testid="pf-vat" /></Field>
            <Field label="Stock"><input type="number" value={pForm.stock} onChange={(e) => setPForm({ ...pForm, stock: e.target.value })} className="input-dark" data-testid="pf-stock" /></Field>
            <Field label="Seuil alerte"><input type="number" value={pForm.stock_alert} onChange={(e) => setPForm({ ...pForm, stock_alert: e.target.value })} className="input-dark" data-testid="pf-alert" /></Field>
            <Field label="Image URL" wide><input value={pForm.image_url || ""} onChange={(e) => setPForm({ ...pForm, image_url: e.target.value })} className="input-dark" data-testid="pf-image" /></Field>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!pForm.is_favorite} onChange={(e) => setPForm({ ...pForm, is_favorite: e.target.checked })} data-testid="pf-favorite" />
              Favori (raccourci en caisse)
            </label>
            <div className="col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit" className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-save-product">Enregistrer</Button>
            </div>
            <style>{`.input-dark{width:100%;height:40px;border-radius:8px;background:#0f172a;border:1px solid rgba(139,92,246,.25);padding:0 10px;color:#f8fafc}`}</style>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import CSV modal */}
      {importing && <ImportCSV onClose={() => setImporting(false)} onDone={loadView} />}
    </div>
  );
}

function Field({ label, children, wide }) {
  return (
    <label className={`block ${wide ? "col-span-2" : ""}`}>
      <span className="text-xs uppercase tracking-widest text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ImportCSV({ onClose, onDone }) {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState([]);
  const [upsertBy, setUpsertBy] = useState("ean");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const template = `name,brand,category_path,sku,ean,price,cost_price,vat_rate,stock,stock_alert,variant,image_url,is_favorite
Red Astaire 50ml,T-Juice,E-liquides/50ml,,3760001000011,19.90,11.00,20,24,5,0mg,,true
Sub Zero 10ml,Halo,E-liquides/10ml,,3760001000028,5.90,3.20,20,60,5,6mg,,true`;

  const parse = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      // simple CSV parser (no quoted commas support beyond basics)
      const cells = [];
      let cur = ""; let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === "," && !inQ) { cells.push(cur); cur = ""; continue; }
        cur += ch;
      }
      cells.push(cur);
      const row = {};
      headers.forEach((h, i) => { row[h] = (cells[i] ?? "").trim(); });
      // coerce
      ["price", "cost_price", "vat_rate", "stock", "stock_alert"].forEach((k) => {
        if (row[k] !== undefined && row[k] !== "") row[k] = parseFloat(String(row[k]).replace(",", "."));
        else delete row[k];
      });
      if (row.is_favorite !== undefined) row.is_favorite = /^(1|true|oui|yes)$/i.test(row.is_favorite);
      Object.keys(row).forEach((k) => { if (row[k] === "") delete row[k]; });
      return row;
    });
  };

  const onFile = (f) => {
    const r = new FileReader();
    r.onload = () => { const t = String(r.result || ""); setRaw(t); setRows(parse(t)); };
    r.readAsText(f);
  };

  const submit = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/products/import", { rows, upsert_by: upsertBy });
      setResult(data);
      onDone?.();
      toast.success(`Import : ${data.created} créés, ${data.updated} mis à jour`);
    } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
  };

  const downloadTemplate = () => {
    const blob = new Blob([template], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vapepos_import_template.csv";
    a.click();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl bg-slate-950 border-violet-500/30">
        <DialogTitle className="font-display text-xl font-black flex items-center gap-2">
          <Upload className="w-5 h-5 text-fuchsia-400" /> Import produits (CSV)
        </DialogTitle>

        {!result ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-400">
                Colonnes : <code className="text-pink-300">name, brand, category_path, sku, ean, price, cost_price, vat_rate, stock, stock_alert, variant, image_url, is_favorite</code>
              </div>
              <Button size="sm" variant="outline" onClick={downloadTemplate} data-testid="btn-download-template">
                <Download className="w-3.5 h-3.5 mr-1" /> Modèle
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs uppercase tracking-widest text-slate-400">
                Fichier CSV
                <input type="file" accept=".csv,.txt" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} className="block mt-1 text-slate-100 text-xs" data-testid="import-file" />
              </label>
              <label className="text-xs uppercase tracking-widest text-slate-400">
                Dédoublonner sur
                <select value={upsertBy} onChange={(e) => setUpsertBy(e.target.value)} className="block mt-1 h-10 w-full rounded-lg bg-slate-900 border border-violet-500/20 px-2 text-slate-100" data-testid="import-upsert-by">
                  <option value="ean">EAN (recommandé)</option>
                  <option value="sku">SKU</option>
                  <option value="name">Nom</option>
                </select>
              </label>
            </div>
            <textarea
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setRows(parse(e.target.value)); }}
              placeholder="Ou collez ici le contenu CSV…"
              className="w-full h-40 rounded-lg bg-slate-900 border border-violet-500/20 p-3 font-mono-num text-xs text-slate-100"
              data-testid="import-paste"
            />
            <div className="text-sm text-slate-300">
              {rows.length > 0 ? (
                <>
                  <span className="text-emerald-300 font-semibold">{rows.length}</span> ligne(s) prête(s) — aperçu :
                  <div className="mt-1 max-h-40 overflow-auto scroll-thin rounded-lg bg-slate-950/60 border border-violet-500/10">
                    <table className="w-full text-xs">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="text-left px-2 py-1">Nom</th>
                          <th className="text-left px-2 py-1">Catégorie</th>
                          <th className="text-right px-2 py-1">Prix</th>
                          <th className="text-right px-2 py-1">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 8).map((r, i) => (
                          <tr key={i} className="border-t border-violet-500/10">
                            <td className="px-2 py-1">{r.name}</td>
                            <td className="px-2 py-1 text-slate-400">{r.category_path || "—"}</td>
                            <td className="px-2 py-1 text-right font-mono-num text-pink-300">{r.price ?? "—"}</td>
                            <td className="px-2 py-1 text-right font-mono-num">{r.stock ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <span className="text-slate-500">Aucune ligne détectée.</span>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button disabled={busy || rows.length === 0} onClick={submit} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold" data-testid="btn-import-submit">
                Importer {rows.length} produit(s)
              </Button>
            </div>
            <div className="text-[10px] text-amber-300/80">
              L'import applique au magasin en cours. Les sous-catégories manquantes sont créées automatiquement à partir de <code>category_path</code> (ex : "E-liquides/50ml").
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Créés" value={result.created} tint="from-emerald-500 to-teal-500" />
              <Stat label="Mis à jour" value={result.updated} tint="from-violet-500 to-fuchsia-500" />
              <Stat label="Erreurs" value={result.errors.length} tint="from-rose-500 to-orange-500" />
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-auto scroll-thin rounded-lg bg-slate-950/60 border border-rose-500/20 p-2 text-xs">
                {result.errors.map((e, i) => (
                  <div key={i} className="text-rose-300">Ligne {e.row + 2} · {e.name} — {e.error}</div>
                ))}
              </div>
            )}
            <Button className="w-full" onClick={onClose} data-testid="btn-close-import-result">Fermer</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tint }) {
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ${tint} text-slate-950`}>
      <div className="text-[10px] uppercase tracking-widest opacity-80">{label}</div>
      <div className="font-display text-2xl font-black">{value}</div>
    </div>
  );
}
