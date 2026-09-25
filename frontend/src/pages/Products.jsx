import { useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { toast } from "sonner";
import { Plus, Edit, Star } from "lucide-react";

const fmt = (n) => `${(Math.round(n * 100) / 100).toFixed(2).replace(".", ",")} €`;

const empty = { name: "", brand: "", category_id: "", sku: "", ean: "", price: 0, cost_price: 0, vat_rate: 20, stock: 0, stock_alert: 5, image_url: "", is_favorite: false, variant: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([api.get("/products", { params: q ? { q } : {} }), api.get("/categories")]);
    setProducts(p.data); setCategories(c.data);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const open = (p) => { setEditing(p); setForm(p ? { ...empty, ...p } : empty); };

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      ...form,
      price: parseFloat(form.price) || 0,
      cost_price: parseFloat(form.cost_price) || 0,
      vat_rate: parseFloat(form.vat_rate) || 20,
      stock: parseInt(form.stock) || 0,
      stock_alert: parseInt(form.stock_alert) || 5,
    };
    try {
      if (editing?.id) await api.put(`/products/${editing.id}`, body);
      else await api.post("/products", body);
      toast.success(editing ? "Produit mis à jour" : "Produit créé");
      setEditing(null); load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  return (
    <div className="space-y-4" data-testid="products-page">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">Produits</h1>
        <Button onClick={() => open({})} className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-add-product">
          <Plus className="w-4 h-4 mr-1" /> Nouveau produit
        </Button>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" className="bg-slate-900/60 border-violet-500/20" data-testid="input-products-search" />

      <Card className="bg-slate-900/70 border-violet-500/20 overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-widest text-slate-400 border-b border-violet-500/15">
          <div className="col-span-4">Produit</div>
          <div className="col-span-2">Marque</div>
          <div className="col-span-2">Prix</div>
          <div className="col-span-2">Stock</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {products.map((p) => (
          <div key={p.id} className="grid grid-cols-12 px-4 py-3 items-center border-b border-violet-500/10 hover:bg-slate-950/40" data-testid={`row-product-${p.id}`}>
            <div className="col-span-4 flex items-center gap-2">
              {p.is_favorite && <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />}
              <div>
                <div className="font-semibold text-sm">{p.name}</div>
                <div className="text-xs text-slate-500">{p.variant} · {p.ean || p.sku || "—"}</div>
              </div>
            </div>
            <div className="col-span-2 text-sm text-slate-300">{p.brand}</div>
            <div className="col-span-2 font-mono-num text-pink-300">{fmt(p.price)}</div>
            <div className={`col-span-2 font-mono-num ${p.stock <= p.stock_alert ? "text-rose-300" : "text-slate-200"}`}>{p.stock}</div>
            <div className="col-span-2 text-right">
              <Button size="sm" variant="outline" onClick={() => open(p)} data-testid={`btn-edit-product-${p.id}`}>
                <Edit className="w-3.5 h-3.5 mr-1" /> Modifier
              </Button>
            </div>
          </div>
        ))}
        {products.length === 0 && <div className="p-6 text-sm text-slate-500 text-center">Aucun produit</div>}
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl bg-slate-950 border-violet-500/30">
          <DialogTitle className="font-display text-xl font-black">{editing?.id ? "Modifier" : "Nouveau"} produit</DialogTitle>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <Field label="Nom"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-dark" data-testid="pf-name" /></Field>
            <Field label="Marque"><input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="input-dark" data-testid="pf-brand" /></Field>
            <Field label="Catégorie">
              <select value={form.category_id || ""} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="input-dark" data-testid="pf-cat">
                <option value="">—</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Variante"><input value={form.variant || ""} onChange={(e) => setForm({ ...form, variant: e.target.value })} className="input-dark" data-testid="pf-variant" /></Field>
            <Field label="SKU"><input value={form.sku || ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="input-dark" data-testid="pf-sku" /></Field>
            <Field label="EAN"><input value={form.ean || ""} onChange={(e) => setForm({ ...form, ean: e.target.value })} className="input-dark" data-testid="pf-ean" /></Field>
            <Field label="Prix TTC"><input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-dark" data-testid="pf-price" /></Field>
            <Field label="Prix d'achat"><input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className="input-dark" data-testid="pf-cost" /></Field>
            <Field label="TVA %"><input type="number" step="0.1" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} className="input-dark" data-testid="pf-vat" /></Field>
            <Field label="Stock"><input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="input-dark" data-testid="pf-stock" /></Field>
            <Field label="Seuil alerte"><input type="number" value={form.stock_alert} onChange={(e) => setForm({ ...form, stock_alert: e.target.value })} className="input-dark" data-testid="pf-alert" /></Field>
            <Field label="Image URL"><input value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input-dark" data-testid="pf-image" /></Field>
            <label className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.is_favorite} onChange={(e) => setForm({ ...form, is_favorite: e.target.checked })} data-testid="pf-favorite" />
              Favori (accès rapide caisse)
            </label>
            <div className="col-span-2 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button type="submit" className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-save-product">Enregistrer</Button>
            </div>
          </form>
          <style>{`.input-dark{width:100%;height:40px;border-radius:8px;background:#0f172a;border:1px solid rgba(139,92,246,.25);padding:0 10px;color:#f8fafc}`}</style>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-slate-400">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
