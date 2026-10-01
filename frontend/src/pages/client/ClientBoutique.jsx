import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Card } from "../../components/ui/card";
import { api } from "../../lib/api";
import { toast } from "sonner";
import { Store, Calendar, Newspaper, MapPin, MessageCircle, Heart, ChevronRight } from "lucide-react";

export default function ClientBoutique() {
  const { customer, updateProfile } = useCustomerAuth();
  const [stores, setStores] = useState([]);
  const [events, setEvents] = useState([]);
  const [news, setNews] = useState([]);

  useEffect(() => {
    api.get("/stores/public-full").then((r) => setStores(r.data)).catch(() => {});
    api.get("/events").then((r) => setEvents(r.data)).catch(() => {});
    api.get("/news").then((r) => setNews(r.data)).catch(() => {});
  }, []);

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (!customer) return <Navigate to="/client/login" replace />;

  const pickStore = async (s) => {
    try {
      await updateProfile({ preferred_store_id: s.id });
      toast.success(`${s.name} défini comme magasin préféré`);
    } catch { toast.error("Impossible"); }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-5" data-testid="client-boutique">
      {/* Messagerie shortcut */}
      <Link to="/client/me/messagerie" data-testid="cta-messagerie">
        <Card className="p-4 bg-gradient-to-br from-violet-700/40 to-fuchsia-700/30 border-fuchsia-500/30 hover:border-fuchsia-500/60 transition">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold">Parler à l'équipe</div>
              <div className="text-xs text-slate-200/80">Pose ta question, on te répond !</div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300" />
          </div>
        </Card>
      </Link>

      {/* Stores */}
      <section>
        <div className="font-display text-lg font-black mb-2 flex items-center gap-2">
          <Store className="w-4 h-4 text-fuchsia-400" /> Nos magasins
        </div>
        <div className="space-y-2">
          {stores.map((s) => {
            const preferred = customer.preferred_store_id === s.id;
            return (
              <Card
                key={s.id}
                className={`p-3 border transition ${preferred ? "border-fuchsia-500/60 bg-fuchsia-500/10" : "border-violet-500/20 bg-slate-900/70"}`}
                data-testid={`store-card-${s.code}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-black text-base">{s.name}</div>
                    {s.address && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {s.address}
                      </div>
                    )}
                    {s.hours && <div className="text-[11px] text-slate-500 mt-0.5">{s.hours}</div>}
                  </div>
                  <button
                    onClick={() => pickStore(s)}
                    className={`shrink-0 h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1 ${
                      preferred ? "bg-fuchsia-500 text-white" : "bg-slate-800 text-slate-300 hover:text-fuchsia-200"
                    }`}
                    data-testid={`btn-pick-store-${s.code}`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${preferred ? "fill-white" : ""}`} />
                    {preferred ? "Préféré" : "Choisir"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Events */}
      <section>
        <div className="font-display text-lg font-black mb-2 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-fuchsia-400" /> Événements
        </div>
        {events.length === 0 ? (
          <Card className="p-4 bg-slate-900/70 border-violet-500/20 text-center text-xs text-slate-500">
            Aucun événement pour le moment — reviens bientôt 💜
          </Card>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <Card key={e.id} className="overflow-hidden bg-slate-900/70 border-violet-500/20">
                {e.image_url && <img src={e.image_url} alt={e.title} className="w-full h-32 object-cover" />}
                <div className="p-3">
                  <div className="font-display font-bold">{e.title}</div>
                  {e.description && <div className="text-xs text-slate-400 mt-1">{e.description}</div>}
                  <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
                    {e.starts_at && <span>📅 {new Date(e.starts_at).toLocaleDateString("fr-FR")}</span>}
                    {e.location && <span>📍 {e.location}</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* News */}
      <section>
        <div className="font-display text-lg font-black mb-2 flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-fuchsia-400" /> Actualités
        </div>
        {news.length === 0 ? (
          <Card className="p-4 bg-slate-900/70 border-violet-500/20 text-center text-xs text-slate-500">
            Pas de nouveauté pour l'instant.
          </Card>
        ) : (
          <div className="space-y-2">
            {news.map((n) => (
              <Card key={n.id} className="overflow-hidden bg-slate-900/70 border-violet-500/20">
                {n.image_url && <img src={n.image_url} alt={n.title} className="w-full h-32 object-cover" />}
                <div className="p-3">
                  <div className="font-display font-bold flex items-center gap-1">
                    {n.pinned && <span className="text-amber-300">📌</span>}
                    {n.title}
                  </div>
                  {n.body && <div className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{n.body}</div>}
                  <div className="text-[10px] text-slate-500 mt-2">{new Date(n.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
