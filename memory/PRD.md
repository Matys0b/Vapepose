# VapePOS — PRD & Living Backlog

## Original Problem Statement
VapePOS — Caisse professionnelle pour boutiques de vape. Priorité absolue : la caisse et l'encaissement client. Mode paysage tablette. Parcours : SCAN/CHERCHER → PANIER → CLIENT FACULTATIF → PAIEMENT → TICKET → FIN. Le reste (stock, fournisseurs, compta, stats, fidélité) est secondaire, accessible depuis un menu. Multi-magasins, multi-caisses, rôles admin/responsable/vendeur.

## User Choices (Feb 2026)
- Périmètre MVP : Phases 1 + 2 + 3 (caisse + clients/fidélité/QR + stock/fournisseurs)
- Auth : JWT email/mot de passe + PIN vendeur (quick-switch tablette)
- Scanner : caméra tablette + support scanner USB/Bluetooth (HID clavier)
- Ticket : HTML + impression navigateur + placeholder email (architecture prête ESC/POS)
- Seed : catalogue vape réaliste, 2 magasins, admin/manager/2 vendeurs, quelques clients

## Comptes actifs (Phase 3 pivot)
Trois profils administrateurs — sélection par cartes au login puis PIN 4 chiffres, puis choix de magasin obligatoire à chaque session.
- **Mathis** – PIN 1111 (violet)
- **Emma** – PIN 2222 (rose)
- **Jessica** – PIN 3333 (cyan)

## Isolation multi-magasin
- **Pouzauges (POU)** et **Chantonnay (CHA)** : catalogues **strictement séparés** (stocks indépendants, ventes indépendantes, CA indépendants). Produit dupliqué par magasin (17 × 2 = 34 fiches).
- Endpoints scopés par `user.store_id` : `/products`, `/products/lookup`, `/sales`, `/dashboard/stats`.
- Comptabilité (`/accounting/summary`, `/accounting/timeseries`, `/accounting/export.csv`) accepte `?store_id=all|<id>` — la vue est **par défaut sur tous les magasins** avec filtre.
- Sale creation décrémente uniquement le stock du magasin en cours ; stock/bulk/adjust idem.
- `POST /auth/pin-login` force `store_id=null` pour obliger la sélection du magasin à chaque session.

## Personas
- **Admin (owner)** – 3 comptes Mathis/Emma/Jessica

## Architecture
- Backend : FastAPI + Motor (MongoDB `vapepos_database`) — tout sous `/api`
- Frontend : React 19 + Tailwind + shadcn/ui, routing React Router
- Auth : JWT HS256, cookies httpOnly `access_token` + fallback Bearer via localStorage
- Multi-magasin : collection `stores` (2 : Pouzauges, Chantonnay)
- Rôles gardés côté serveur (`require_role` dep)

## Collections MongoDB
users · stores · categories · products · customers · sales · cash_sessions · stock_movements · suppliers · suspended_carts · loyalty_transactions · audit_logs · app_settings · counters

## Implémenté (25 Feb 2026)
- **Catalogue produits hiérarchique** : catégories arborescentes (parent/enfant illimité), navigation par tuiles + breadcrumb, création de sous-catégories et de produits contextuelle, suppression sécurisée (bloquée si enfants ou produits actifs)
- **Import CSV en masse** : collage direct ou upload fichier, aperçu 8 lignes, upsert par EAN/SKU/Nom, création automatique des sous-catégories manquantes via `category_path` (ex "E-liquides/50ml"), rapport créés/mis-à-jour/erreurs, modèle CSV téléchargeable
- **PWA installable** : manifest, service worker, icônes 192/256/384/512 + apple-touch-icon 180, splash iPad landscape 3 tailles + Android 1920×1080, meta iOS, thème #0F0B1E
- **Mode kiosque** (actif automatiquement en display=standalone) : trap back-button, blocage context menu + zoom double-tap, fullscreen au 1er tap, Wake Lock pour empêcher la mise en veille
- **Bannière d'installation** discrète (chip violet) + dialog iPad "Partager → Sur l'écran d'accueil"
- **Bannière hors-ligne** (pill rose top) sur `navigator.onLine`
- Auth email + PIN quick-switch, /me via cookie ou Bearer, logout
- Users CRUD avec gardes de rôle (admin only pour créer)
- Catalogue produits + catégories + recherche + lookup EAN
- Écran POS paysage 65/35 : catégories, favoris, grille tactile, panier collant à droite, action bar
- Store switcher dans le top bar POS (change de magasin sans se relogguer)
- Panier : ajout, +/-, remise ligne, remise globale, suppression, TVA 20% TTC
- Scanner : modal caméra + saisie manuelle + listener HID global (scanner USB/BT clavier)
- Modal paiement : Espèces (numpad + quick 5/10/20/50/exact), CB (TPE simulé), Autre, Mixte, calcul "à rendre"
- Ticket : ventilation, impression navigateur, placeholder email/QR
- Sessions caisse : ouverture (fond) + fermeture (comptage) + rapport Z avec écart
- Suspension / reprise paniers
- Clients : recherche, création, QR token, historique, fidélité auto (1€ = 1 pt)
- Stock : ajustement +/-, motifs (réception/casse/inventaire/transfert), mouvements
- **Réception rapide de stock (bulk)** : scan HID + ajout multi-produits en un tap, motif configurable
- Fournisseurs : liste + création
- Back-office étendu : Dashboard, Ventes + remboursement, Produits, Stock, Fournisseurs, Clients, Utilisateurs
- **Comptabilité complète** : CA TTC/HT/TVA, ventilation TVA par taux, moyens de paiement (pie chart), CA par vendeur, CA par catégorie, timeseries (jour/semaine/mois), export CSV, KPI marge brute estimée, TVA due
- **Dépenses** : CRUD avec catégories (Loyer, Marchandises, Salaires, Fournitures, Marketing…), TVA déductible auto, mode de paiement, filtres date
- **Statistiques** : graphiques 7j / 30j / 90j / 1 an, top catégories, répartition paiements, marge estimée
- Audit logs sur actions sensibles
- Seed : 2 magasins, 4 utilisateurs, 10 catégories, 17 produits vape, 2 clients

## Backlog priorisé
### P0 (à valider après démo)
- Intégration TPE réel (SumUp / Ingenico / Verifone) sur écran paiement
- Impression thermique ESC/POS (via passerelle locale ou app native)
- Envoi email réel du ticket (Resend recommandé)

### P1
- Application mobile client (Android/iOS) : compte, QR, points, historique
- Rapports comptables : CA, TVA, export CSV/FEC
- Statistiques avancées (graphiques par période, vendeur, catégorie)
- Multi-magasins : switcher réel + isolation stock/ventes par magasin
- Commandes fournisseurs + réceptions liées au stock

### P2
- Abonnements SaaS multi-entreprises
- Mode hors-ligne avec queue de synchronisation
- Conformité "logiciel de caisse" France (traçabilité, intégrité, archivage) – dossier à monter avant toute annonce NF525
- Notifications push
- Personnalisation branding par entreprise (couleurs, logo, informations)

## Notes techniques
- CORS_ORIGINS explicite pour cookies SameSite=None
- Backend démarré via supervisor, hot-reload activé
- 33/33 tests backend au vert (iteration_1)
