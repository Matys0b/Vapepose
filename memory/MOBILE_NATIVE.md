## Mobile natif (Capacitor 8) — Phase 1 MVP (Sept 2026)

- **Capacitor 8** installé : `@capacitor/core` + `android` + `ios` + `app` + `status-bar` + `local-notifications`
- **CLI** : `@capacitor/cli@^7` + `@capacitor/assets@^3` (Node 20 compat)
- **App ID** : `fr.chavapote.app` · **Nom affiché** : `Cha Va Pote`
- **Config** : `/app/frontend/capacitor.config.json` — splash violet nuit, status bar overlay DARK, canal notif `general`
- **Shim natif** : `/app/frontend/src/lib/native.js` — initialise status bar + canal notifications + listener URL (no-op sur web)
- **Deep links** : `/app/frontend/src/components/AppUrlListener.jsx` monté dans `BrowserRouter`
- **Safe areas** : variables CSS `--safe-top/right/bottom/left` + padding body + classe `.bottom-safe`
- **Branding** : `/app/frontend/assets/icon-only.svg` + `splash.svg` (dégradé violet-fuchsia + éclair) prêts pour `capacitor-assets generate`
- **Deep link certs** : `/app/frontend/public/.well-known/assetlinks.json` + `apple-app-site-association` (placeholders à remplir au moment de la signature release)
- **Doc complète** : `/app/MOBILE.md` — build web, projets natifs, génération assets, deep links, release Android `.aab`, release iOS `.ipa`, fiches stores, workflow soumission, mises à jour

### Conformité stores (déjà en place)
- Suppression compte in-app depuis `/client/me/profil` (zone dangereuse)
- Suppression compte web public via `/privacy`
- Politique confidentialité `/privacy`
- Contrôle 18+ bloquant côté serveur
- HTTPS end-to-end
- Bcrypt pour mots de passe
- Aucune permission caméra (scan HID uniquement)
- Aucun cookie tiers / tracking