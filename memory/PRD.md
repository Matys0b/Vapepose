# VapePOS — PRD & Living Backlog

## Original Problem Statement
VapePOS — Caisse professionnelle pour boutiques de vape. Priorité absolue : la caisse et l'encaissement client. Mode paysage tablette. Parcours : SCAN/CHERCHER → PANIER → CLIENT FACULTATIF → PAIEMENT → TICKET → FIN. Le reste (stock, fournisseurs, compta, stats, fidélité) est secondaire, accessible depuis un menu. Multi-magasins, multi-caisses, rôles admin/responsable/vendeur.

## User Choices (Feb 2026 — session unifiée)
- MVP unifié Cha Va'Pote : une seule app pour clients + personnel avec routage par rôle
- Inscription publique CLIENT avec date de naissance et 18+ bloquant
- Rôles : CLIENT (public), SELLER, ADMIN. Pas de MANAGER dans ce MVP
- QR opaque, révocable, sans donnée personnelle
- Notifications in-app (cloche), pas d'email pour l'instant
- Mode bloqué caisse avec sortie via PIN admin
- Publication mobile Android d'abord, iOS ensuite
- Abonnements en lecture seule (Basique/Plus/Premium/Gold)

## Comptes actifs
- **Mathis** – PIN 1111 (violet) – admin
- **Emma** – PIN 2222 (rose) – admin
- **Jessica** – PIN 3333 (cyan) – admin
- Login staff : email + mot de passe `vapepos` ou PIN + choix magasin

## Isolation multi-magasin
- **Pouzauges (POU)** et **Chantonnay (CHA)** : catalogues séparés, ventes séparées.
- Endpoints scopés par `user.store_id` : `/products`, `/products/lookup`, `/sales`, `/dashboard/stats`.
- Comptabilité multi-store filtrable.

## Architecture
- Backend : FastAPI + Motor (MongoDB `vapepos_database`) — tout sous `/api`
- Frontend : React 19 + Tailwind + shadcn/ui, routing React Router
- Auth staff : JWT HS256 cookies + Bearer, /auth/login + /auth/pin-login + /auth/universal-login
- Auth client : JWT séparé `customer_token`, /customer/register + /customer/login
- Login unifié `/auth/universal-login` (essaie staff puis customer)
- PWA installable, Service Worker v6, mode kiosque

## Collections MongoDB
users · stores · categories · products · customers · sales · cash_sessions · stock_movements · suppliers · suspended_carts · loyalty_transactions · **notifications** · audit_logs · app_settings · counters

## Implémenté — Phase 1 MVP unifié (Sept 2026)
- **Login unifié** `/login` : toggle Client ↔ Personnel, sous-onglets Connexion/Inscription côté client, parcours PIN + magasin côté staff
- **Inscription CLIENT publique** avec date de naissance + 18+ **bloquant serveur** + CGU obligatoires
- **Portail client mobile** avec bottom-nav 4 tabs :
  - Accueil : fidélité, stats, dernier achat, aperçu abonnements
  - Mon QR : QR plein écran, régénération, astuce luminosité
  - Achats : historique 20 dernières ventes avec détail article + mouvements de points
  - Profil : édition prénom/nom/téléphone, changement mot de passe, lien confidentialité, suppression compte
- **Suppression de compte définitive** : anonymise les ventes, purge loyalty/notifications, supprime le client
- **Notifications in-app** : cloche dans header POS/Admin/Client, badge non-lu, marquage lu/tout marquer, auto-notification sur vente avec client + welcome à l'inscription
- **Mode bloqué caisse** (kiosque renforcé) : bouton "Mode bloqué" dans header POS, masque menu Gestion + Logout, ribbon rouge, sortie par PIN admin (endpoint `/auth/verify-pin`)
- **Page confidentialité** `/privacy` : politique complète 10 sections (responsable, données, 18+, conservation, sécurité, droits, cookies, contact)
- **PWA v6** : Service Worker bumpé pour forcer refresh chez utilisateurs existants

## Implémenté — Phases antérieures conservées
- Catalogue produits hiérarchique avec drag & drop, import/export CSV multi-magasins, images auto EAN
- PWA installable + mode kiosque (wake lock, fullscreen, trap back)
- Auth email + PIN quick-switch, /me via cookie ou Bearer
- Écran POS paysage 65/35 avec scanner HID/USB/caméra, panier, actions
- Paiement Espèces + CB + Autre + Mixte, calcul "à rendre"
- Ticket HTML + impression navigateur
- Sessions caisse ouverture/fermeture avec rapport Z
- Suspension/reprise paniers
- Clients : recherche, création, QR token, historique, fidélité auto
- Stock : ajustement, réception bulk, mouvements, motifs
- Fournisseurs, comptabilité complète, dépenses, statistiques
- Multi-magasins Pouzauges/Chantonnay avec stocks séparés

## Nouveaux endpoints (session unifiée)
- `POST /api/auth/universal-login` — essaie staff puis customer
- `POST /api/auth/verify-pin` — vérifie PIN sans switch (kiosque unlock)
- `PUT /api/customer/profile` — édition + changement mot de passe
- `DELETE /api/customer/account` — suppression définitive
- `GET /api/notifications` — auto-détecte staff vs client
- `POST /api/notifications/mark-read` — mark all ou par ids
- Auto-notification sur vente client + welcome inscription

## Backlog priorisé
### Phase 2 (à valider après MVP)
- Rôle MANAGER intermédiaire avec matrice permissions
- Notifications email (Resend)
- Écran "Commandes web" côté caisse (statuts Nouvelle/En prépa/Prête/Terminée/Annulée)
- Récompenses fidélité activables (coupons, paliers, échange)
- Publication Play Store puis App Store

### Phase 3 (plus tard)
- Intégration commandes web depuis site Lovable
- Paiement récurrent abonnements Basique/Plus/Premium/Gold
- Notifications push mobiles natives
- Conformité caisse française (intégrité, archivage, traçabilité, NF525)
- Intégration TPE réel (SumUp/Ingenico)
- Impression thermique ESC/POS

## Notes techniques
- CORS_ORIGINS explicite pour cookies SameSite=None
- Backend démarré via supervisor, hot-reload activé
- Service Worker bumpé à v6 — utilisateurs existants recevront la nouvelle version au prochain refresh
