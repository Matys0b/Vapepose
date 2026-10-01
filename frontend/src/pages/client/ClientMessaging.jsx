import { useEffect, useRef, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useCustomerAuth } from "../../contexts/CustomerAuthContext";
import { Card } from "../../components/ui/card";
import { api } from "../../lib/api";
import { Send, MessageCircle } from "lucide-react";

export default function ClientMessaging() {
  const { customer } = useCustomerAuth();
  const [conv, setConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/customer/conversation");
      setConv(data.conversation);
      setMsgs(data.messages);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  if (customer === null) return <div className="p-6 text-center text-slate-400">Chargement…</div>;
  if (!customer) return <Navigate to="/client/login" replace />;

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await api.post("/customer/messages", { body });
      setBody("");
      await load();
    } finally { setSending(false); }
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-3 flex flex-col min-h-[80vh]" data-testid="client-messaging">
      <div className="flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-fuchsia-400" />
        <div>
          <div className="font-display text-xl font-black">Parler à l'équipe</div>
          <div className="text-[11px] text-slate-400">
            Routé vers {customer.preferred_store_id ? "ton magasin préféré" : "l'équipe Cha Va'Pote"}
          </div>
        </div>
      </div>

      <Card className="flex-1 p-3 bg-slate-900/70 border-violet-500/20 min-h-[400px] max-h-[60vh] overflow-y-auto scroll-thin space-y-2">
        {msgs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-xs text-slate-500 py-10">
            Dis-nous ce qu'on peut faire pour toi 💜<br />
            L'équipe te répond directement ici.
          </div>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className={`flex ${m.from_type === "customer" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.from_type === "customer"
                    ? "bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white rounded-br-sm"
                    : "bg-slate-800 text-slate-100 rounded-bl-sm"
                }`}
              >
                {m.from_type === "staff" && m.from_name && (
                  <div className="text-[10px] font-bold text-fuchsia-300 mb-0.5">{m.from_name}</div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`text-[9px] mt-0.5 ${m.from_type === "customer" ? "text-fuchsia-100/70" : "text-slate-400"}`}>
                  {new Date(m.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </Card>

      <form onSubmit={send} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ton message…"
          className="flex-1 h-11 rounded-xl bg-slate-900/70 border border-violet-500/20 px-3 text-sm outline-none focus:border-fuchsia-500/40"
          data-testid="msg-input"
          maxLength={4000}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white flex items-center justify-center disabled:opacity-40"
          data-testid="msg-send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      <div className="text-[10px] text-slate-500 text-center">
        Réponses humaines par l'équipe. Pas d'IA, pas de bot.
      </div>
    </div>
  );
}
