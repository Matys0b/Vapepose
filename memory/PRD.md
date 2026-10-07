# VapePOS — PRD (vivant)

> Document de pilotage, mis à jour à chaque itération. Les détails techniques précis vivent dans le code et les READMEs locaux.

## Problème (verbatim)

Caisse POS professionnelle pour boutiques de vape, principalement utilisée sur tablette horizontale. L'écran d'accueil d'un vendeur doit être la caisse elle-même, pas un back-office. Autour de la caisse : fidélité client (QR), gestion stock, fournisseurs, comptabilité, multi-magasins, multi-caisses, app mobile client dédiée. Priorité absolue : vitesse d'encaissement.

## Personas

- **Vendeur comptoir** — Caisse horizontale, scan, encaissement rapide, impression ticket.
- **Responsable magasin** — Ouverture/clôture caisse, retours, stats du jour.
- **Administrateur / gérant** — Back-office web (produits, stock, stats, compta).
- **Client fidélité** — App mobile : QR, points, récompenses, messagerie, événements.

## Ce qui est implémenté (chronologique)

### Fin 2025 — Web (/app/frontend) — PWA + Capacitor
- Caisse POS horizontale, drill-down catégories, panier, scan caméra via Capacitor
- Clients : auto-détection staff/client sur `/api/auth/universal-login`
- Multi-magasins Pouzauges / Chantonnay — stock séparé, catalogue partagé
- Import de 2 411 produits réels depuis fichiers Excel du client
- Portail client V2 : loyalty tiers, QR, récompenses, messagerie, événements, actualités
- Backend FastAPI complet (`/app/backend/server.py`) — unchanged
- Base MongoDB — unchanged

### Fév 2026 — Mobile natif Expo (/app/mobile) — **nouveau, livré ce jour**
- Projet Expo SDK 52 + expo-router v4 + NativeWind v4
- Login unifié auto-détection staff / client
- **Client** (bottom tabs 5 onglets avec QR surélevé) : accueil fidélité, loyalty tiers avec récompenses, QR plein écran, boutique (choix magasin préféré + events + actus), profil (biométrie + suppression compte), messagerie polling 30 s, historique achats
- **Staff** (verrouillé landscape) : choix magasin, ouverture/clôture caisse, écran POS avec drill-down catégories + recherche + favoris + grille produits, panier droite, scan code-barres caméra, scan QR client avec affichage récompenses disponibles, paiement espèces/carte/mixte avec clavier numérique + calcul rendu, écran ticket avec impression Bluetooth marquée BÊTA
- Notifications push Expo (token enregistré au login)
- Biométrie staff (Face ID / empreinte, opt-in)
- Stockage chiffré (`expo-secure-store`) pour token + panier en cours
- EAS Build cloud pour Android APK + bundle Google Play
- Bundle Metro validé : 1 765 modules compilent sans erreur (seule la compilation Hermes locale échoue à cause du binaire sandbox, OK en prod EAS)
- Web + Capacitor restent **intacts**

## Backlog priorisé

### P0 — bloquants validation Phase 1
- [ ] Faire tourner `eas init` + `eas build --profile preview --platform android` depuis le compte Expo du client → APK sur tablette comptoir
- [ ] Mettre un vrai `extra.eas.projectId` dans `app.json` après `eas init`
- [ ] Tester scan EAN-13 réel sur tablette avec un produit du catalogue
- [ ] Valider login staff + fin de vente end-to-end sur device physique

### P1 — Phase 2
- [ ] Build iOS via EAS + soumission App Store Connect
- [ ] Impression ESC/POS validée sur 2 modèles d'imprimante thermique physiques
- [ ] Mode hors ligne robuste (file d'attente des ventes + dédoublonnage à la synchro)
- [ ] EAS Update branché pour hotfix JS sans resoumission store
- [ ] Retrait de Capacitor du dépôt web

### P1 — Admin back-office web (hors scope mobile)
- [ ] Édition et création de produits + upload photos (demandé msg #101 non livré)
- [ ] Interface admin Fidélité (créer paliers de récompenses depuis UI)
- [ ] Interface admin Contenu (publier événements/actualités via UI)
- [ ] Interface admin Messagerie (répondre depuis le web)

### P2 — Phase 3
- [ ] Mode kiosque tablette (immersive Android, guided access iOS)
- [ ] Thème SaaS par entreprise (logo + couleurs chargés dynamiquement)
- [ ] Signature électronique du ticket + archivage (préparation NF525)
- [ ] Analytics d'usage + crash reporting
- [ ] Publication publique Play Store + App Store

## Points d'attention

- Le binaire mobile est unique : un seul store listing, un seul code, routage interne staff/client selon profil.
- Le back-office administrateur **reste exclusivement web**, pas de conversion native prévue.
- Impression Bluetooth est câblée côté UI mais marquée BÊTA — ne pas annoncer comme fonctionnelle tant qu'on n'a pas validé sur imprimante physique.
- Aucune revendication NF525 / certification tant qu'un audit officiel n'a pas été fait.
