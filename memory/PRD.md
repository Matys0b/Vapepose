# VapePOS — PRD & Living Backlog

## Original Problem Statement
VapePOS — Caisse professionnelle pour boutiques de vape. Priorité absolue : la caisse et l'encaissement client. Mode paysage tablette. Parcours : SCAN/CHERCHER → PANIER → CLIENT FACULTATIF → PAIEMENT → TICKET → FIN. Le reste (stock, fournisseurs, compta, stats, fidélité) est secondaire, accessible depuis un menu. Multi-magasins, multi-caisses, rôles admin/responsable/vendeur.

## User Choices (Feb 2026)
- Périmètre MVP : Phases 1 + 2 + 3 (caisse + clients/fidélité/QR + stock/fournisseurs)
- Auth : JWT email/mot de passe + PIN vendeur (quick-switch tablette)
- Scanner : caméra tablette + support scanner USB/Bluetooth (HID clavier)
- Ticket : HTML + impression navigateur + placeholder email (architecture prête ESC/POS)
- Seed : catalogue vape réaliste, 2 magasins, admin/manager/2 vendeurs, quelques clients

## Personas
- **Admin (owner)** – configure la SaaS, gère utilisateurs & catalogues
- **Responsable** – supervise magasin, remboursements, réceptions stock
- **Vendeur** – encaisse client, PIN quick-switch tablette

## Architecture
- Backend : FastAPI + Motor (MongoDB `vapepos_database`) — tout sous `/api`
- Frontend : React 19 + Tailwind + shadcn/ui, routing React Router
- Auth : JWT HS256, cookies httpOnly `access_token` + fallback Bearer via localStorage
- Multi-magasin : collection `stores` (2 : Pouzauges, Chantonnay)
- Rôles gardés côté serveur (`require_role` dep)

## Collections MongoDB
users · stores · categories · products · customers · sales · cash_sessions · stock_movements · suppliers · suspended_carts · loyalty_transactions · audit_logs · app_settings · counters

## Implémenté (25 Feb 2026)
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
