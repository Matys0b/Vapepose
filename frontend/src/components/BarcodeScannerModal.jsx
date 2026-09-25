import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ScanLine, X } from "lucide-react";

export default function BarcodeScannerModal({ onClose, onCode }) {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const [manual, setManual] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const streamRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraOn(true);
      setCameraError("");
    } catch (e) {
      setCameraError("Caméra indisponible. Utilisez la saisie ou un scanner USB/Bluetooth.");
      void e;
    }
  };

  const submitManual = (e) => {
    e.preventDefault();
    if (manual.trim().length >= 3) onCode(manual.trim());
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-slate-950 border-violet-500/30">
        <DialogTitle className="font-display text-xl font-black flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-fuchsia-400" /> Scanner un produit
        </DialogTitle>

        {cameraOn ? (
          <div className="rounded-xl overflow-hidden bg-black relative aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <div className="absolute inset-8 border-2 border-fuchsia-400 rounded-lg pointer-events-none" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-fuchsia-200 bg-slate-950/70 px-2 py-1 rounded">
              Utilisez un scanner USB/BT pour lire automatiquement le code
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={startCamera} className="h-12 w-full" data-testid="btn-start-camera">
            Activer la caméra
          </Button>
        )}
        {cameraError && <div className="text-xs text-rose-300">{cameraError}</div>}

        <form onSubmit={submitManual} className="space-y-2 mt-3">
          <label className="text-xs uppercase tracking-widest text-slate-400">Code-barres / SKU / EAN</label>
          <input
            ref={inputRef}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Scannez ou saisissez le code puis Entrée"
            className="w-full h-12 rounded-lg bg-slate-900 border border-violet-500/20 px-3 font-mono-num"
            data-testid="input-manual-barcode"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} data-testid="btn-scanner-cancel">
              <X className="w-4 h-4 mr-1" /> Fermer
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-violet-600 to-fuchsia-600" data-testid="btn-scanner-submit">
              Valider
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
