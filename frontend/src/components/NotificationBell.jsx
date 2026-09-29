import { useEffect, useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import { api } from "../lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export default function NotificationBell({ variant = "default" }) {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setData(data);
    } catch { /* ignore anonymous */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const markAllRead = async () => {
    try {
      await api.post("/notifications/mark-read", {});
      await load();
    } catch { /* ignore */ }
  };

  const markOne = async (id) => {
    try {
      await api.post("/notifications/mark-read", { ids: [id] });
      await load();
    } catch { /* ignore */ }
  };

  const size = variant === "compact" ? "w-4 h-4" : "w-5 h-5";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-lg hover:bg-slate-800/60 text-slate-300 hover:text-fuchsia-300 transition"
          data-testid="btn-notifications"
        >
          <Bell className={size} />
          {data.unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-fuchsia-500 text-[9px] font-bold text-white flex items-center justify-center"
              data-testid="notif-badge"
            >
              {data.unread > 9 ? "9+" : data.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 bg-slate-950 border-violet-500/25">
        <div className="p-3 border-b border-violet-500/15 flex items-center justify-between">
          <div className="font-display font-bold text-sm">Notifications</div>
          {data.unread > 0 && (
            <button onClick={markAllRead} className="text-[11px] text-fuchsia-300 hover:underline" data-testid="btn-mark-all-read">
              Tout marquer lu
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-auto scroll-thin">
          {data.items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">Aucune notification</div>
          ) : (
            data.items.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.read && markOne(n.id)}
                className={`w-full text-left p-3 border-b border-violet-500/10 hover:bg-slate-900/60 transition ${!n.read ? "bg-fuchsia-500/5" : ""}`}
                data-testid={`notif-${n.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-fuchsia-400" />}
                      {n.title}
                    </div>
                    {n.body && <div className="text-xs text-slate-400 mt-0.5">{n.body}</div>}
                    <div className="text-[10px] text-slate-500 mt-1">{new Date(n.at).toLocaleString("fr-FR")}</div>
                  </div>
                  {n.read && <Check className="w-3 h-3 text-slate-600 shrink-0 mt-1" />}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
