# VapePOS — Prompt de passation pour nouveau projet 100 % natif mobile

> Document à copier-coller tel quel au prochain agent. Il décrit **ce qui a déjà été construit, ce qui marche, ce qui a bloqué**, et **ce que le nouveau projet doit faire différemment** : partir d'emblée sur une app mobile native unique (Android + iOS) téléchargeable depuis les stores, sans PWA ni back-office web intermédiaire comme interface principale.

---

## 🎯 Objectif du prochain agent

Rebâtir **VapePOS** comme une **application mobile native unique** (Expo React Native) qui :

1. **S'installe depuis le Play Store (puis l'App Store)** — pas de PWA
2. **Héberge DEUX expériences dans le même binaire**, routage automatique selon le compte connecté :
   - **Expérience staff / caisse** (vendeur comptoir) → écran POS tablette paysage
   - **Expérience client fidélité** (consommateur) → bottom-tabs loyalty / QR / récompenses
3. **Back-office administrateur = module secondaire** accessible depuis la même app pour les comptes admin/manager (produits, stock, stats). **Ne pas** livrer de back-office web séparé en Phase 1.

Le back-end existant FastAPI + MongoDB sous `/app/backend/` est **à conserver tel quel** et sert de source unique de vérité. L'app native tape sur `/api/*`.

---

## 📦 Ce qui existe déjà dans ce dépôt (`/app`)

### Backend (`/app/backend/`) — à GARDER
- `server.py` (~2 420 lignes) : FastAPI complet avec tous les endpoints nécessaires. Détail dans la section « API disponible ».
- Base MongoDB `vapepos_database` déjà peuplée : **2 411 produits** réels importés depuis les fichiers Excel du client, 2 magasins (Pouzauges / Chantonnay), 4 comptes staff seed.
- `.env` : `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

### Frontend web (`/app/frontend/`) — à SUPPRIMER ou IGNORER
C'est la version PWA + Capacitor construite au départ. Le user a dit explicitement : **« je veux que ça soit à 100% une application téléchargeable sur mobile »**. Donc **ne pas remettre d'énergie dedans**. Soit supprimer purement le dossier, soit le laisser en archive sans l'exposer. Le back-office doit être reconstruit dans l'app native (section admin accessible seulement aux comptes admin/manager).

### Mobile natif Expo (`/app/mobile/`) — à REPRENDRE comme base
C'est **la bonne direction**. Déjà en place :
- **Expo SDK 52 + expo-router v4 + NativeWind v4**
- 34 fichiers JS/JSX structurés sous `app/` (routes) et `src/` (lib, api, contexts, components, theme)
- Validation Metro bundle réussie : **1 910 modules compilent sans erreur**, bundle iOS/Android ~12 MB
- Dépendances natives câblées : `expo-camera` (scan EAN-13 + QR), `expo-notifications` (Expo Push), `expo-local-authentication` (biométrie), `expo-secure-store` (token chiffré), `react-native-qrcode-svg`, `expo-screen-orientation` (verrouillage paysage staff), `expo-haptics`

**Fichiers clés à relire :**
```
/app/mobile/package.json           ← versions pinées, 25 deps productrices
/app/mobile/app.json               ← bundleId iOS/Android, permissions, splash, icon
/app/mobile/eas.json               ← profils dev / preview / production
/app/mobile/babel.config.js        ← preset expo + nativewind + reanimated
/app/mobile/metro.config.js        ← withNativeWind
/app/mobile/tailwind.config.js     ← preset nativewind, palette violet/fuchsia
/app/mobile/global.css             ← @tailwind directives
/app/mobile/scripts/validate-syntax.js  ← linter babel pour catch typos avant metro
/app/mobile/README.md              ← guide EAS build Android step-by-step
```

**Arborescence des écrans mobiles déjà implémentés :**
```
/app/mobile/app/
├── _layout.jsx                    ← Providers Auth + Cart, Stack root
├── index.jsx                      ← Redirect auth-aware (staff → pos, client → home)
├── login.jsx                      ← Login unifié email + password
├── register.jsx                   ← Inscription client (18+ obligatoire)
├── (client)/
│   ├── _layout.jsx                ← Bottom tabs 5 onglets avec QR surélevé au centre
│   ├── home.jsx                   ← Accueil fidélité, raccourcis
│   ├── loyalty.jsx                ← Niveaux Nouveau/Habitué/Fidèle/VIP + récompenses
│   ├── qr.jsx                     ← QR plein écran react-native-qrcode-svg
│   ├── store.jsx                  ← Choix magasin préféré, events, news
│   ├── profile.jsx                ← Profil, biométrie opt-in, suppression compte
│   ├── messaging.jsx              ← Chat avec l'équipe (polling 30s)
│   ├── history.jsx                ← Historique achats détaillé
│   └── year-recap.jsx             ← « Mon année Vape » : top produits, stats, podium
└── (staff)/
    ├── _layout.jsx                ← Verrouillage paysage + Stack
    ├── pos.jsx                    ← ÉCRAN PRINCIPAL CAISSE : drill-down catégories, panier, actions
    ├── store-pick.jsx             ← Choix magasin après login staff
    ├── cash-open.jsx              ← Ouverture caisse avec clavier numérique
    ├── cash-close.jsx             ← Clôture Z avec comptage et écart
    ├── scan-barcode.jsx           ← Caméra EAN-13 + QR (expo-camera)
    ├── scan-customer.jsx          ← Redirect vers scan-barcode?mode=customer
    ├── payment.jsx                ← Espèces/Carte/Autre, mixte, clavier numérique
    └── receipt.jsx                ← Confirmation vente + impression BT (BÊTA)
```

**Lib / contexts / composants partagés :**
```
/app/mobile/src/
├── api/
│   ├── client.js                  ← fetch wrapper avec Bearer token
│   └── endpoints.js               ← Tous les endpoints `/api/*` typés
├── contexts/
│   ├── AuthContext.jsx            ← login unifié, persistance SecureStore
│   └── CartContext.jsx            ← panier, totaux, récompenses appliquées
├── components/
│   ├── Screen.jsx                 ← wrapper SafeArea + gradient fond
│   ├── Card.jsx                   ← card glassmorphism
│   ├── Button.jsx                 ← gradient violet/fuchsia + variants
│   └── Loader.jsx                 ← ActivityIndicator + Empty state
├── lib/
│   ├── storage.js                 ← SecureStore (sensible) + AsyncStorage
│   ├── format.js                  ← fmtEUR, loyaltyTier, dates
│   ├── haptics.js                 ← vibrations tactiles
│   └── notifications.js           ← inscription Expo Push
└── theme/colors.js                ← palette violet/fuchsia/pink + gradients
```

---

## 🧰 API disponible côté backend (ne pas réimplémenter)

**Auth** :
- `POST /api/auth/universal-login` { email, password } → `{ type: 'staff'|'customer', role, token, ... }`
- `POST /api/auth/pin-login` { pin } → login staff par PIN
- `POST /api/auth/switch-store` { store_id } → changement de magasin
- `POST /api/customer/register` { first_name, email, password, birth_date, accept_terms } → 18+ bloquant serveur
- `GET /api/auth/me` ou `/api/customer/me`
- `POST /api/customer/qr-refresh`, `PUT /api/customer/profile`, `DELETE /api/customer/account`

**Catalogue** :
- `GET /api/stores` / `/stores/public` / `/stores/public-full`
- `GET /api/categories?parent_id=root|<id>` + `/api/categories/tree`
- `GET /api/products?q=&category_id=&favorite=&limit=&offset=`
- `GET /api/products/lookup?code=<EAN>` → scan code-barres
- CRUD complet produits + import CSV + lookup image Open Food Facts

**Caisse** :
- `GET /api/cash-sessions/current`, `POST /api/cash-sessions/open` { opening_amount }, `POST /api/cash-sessions/close` { counted_amount }
- `POST /api/sales` { items, payments, global_discount, customer_id, applied_reward_id, store_id }
- `GET /api/sales?customer_id=&store_id=&limit=`
- `GET /api/suspended-carts`, `POST /api/suspended-carts`, `DELETE /api/suspended-carts/{id}`

**Fidélité client** (V2) :
- `GET /api/customer/rewards` (statuts available/used/expired)
- `GET /api/customers/{id}/available-rewards` (depuis POS après scan QR)
- `GET /api/customer/stats`, `GET /api/customer/year-recap?year=`
- `GET /api/customer/favorites`, `POST`, `DELETE`
- CRUD admin reward-templates sous `/api/admin/reward-templates`

**Messagerie boutique** :
- `GET /api/customer/conversation`, `POST /api/customer/messages`
- `GET /api/staff/conversations`, `GET /api/staff/conversations/{cid}`, `POST .../{cid}/messages`

**Contenu** :
- `GET /api/events`, `/api/news`
- CRUD admin sous `/api/admin/events`, `/api/admin/news`
- `GET /api/notifications`, `POST /api/notifications/mark-read`

**Stock** : `POST /api/stock/adjust`, `GET /api/stock/movements`, `POST /api/stock/bulk`

**Stats / Compta** : `GET /api/dashboard/stats`, `/api/accounting/summary`, `/api/accounting/timeseries`, `/api/accounting/export.csv`, dépenses

---

## 🔑 Comptes de test déjà seedés en base

| Rôle | Email | Mot de passe | PIN |
|------|-------|--------------|-----|
| admin | `mathis@vapepos.local` | `vapepos` | 1111 |
| admin | `emma@vapepos.local` | `vapepos` | 2222 |
| admin | `jessica@vapepos.local` | `vapepos` | 3333 |
| admin | `rautureau.m85@gmail.com` | `Freddy030884!` | — |

Clients → à créer via écran d'inscription (18+ requis).

---

## ✅ Ce qui marche

- Backend FastAPI 100 % opérationnel, tous endpoints testés par curl + testing_agent
- 2 411 produits + 114 catégories + 2 magasins + stock séparé par magasin **déjà en base**
- App Expo compile et bundle sans erreur (Metro OK, 1 910 modules)
- Toutes les routes mobiles existent (34 fichiers), parsage AST Babel validé
- Icônes + splash screen générés sous `/app/mobile/assets/`

## 🚫 Ce qui a bloqué dans cette session

- **Impossible de livrer un APK/binaire téléchargeable depuis l'environnement sandbox** : `hermesc` crash (binaire Linux incompatible avec ce conteneur). → Le build EAS **doit** être lancé par **le user depuis sa machine** avec son compte Expo (`npx eas init && npx eas build --profile preview --platform android`).
- **Expo Go + tunnel anonyme `.exp.direct`** → l'app Expo Go iOS récente **exige un compte Expo** pour scanner un QR anonyme. Erreur « need to login » à la lecture du QR.
- Tentative de contournement avec **tunnel Cloudflare** (`cloudflared --url http://localhost:19000`) : le manifest se sert bien depuis `*.trycloudflare.com` et `REACT_NATIVE_PACKAGER_HOSTNAME` fait pointer les `launchAsset.url` au bon endroit — fonctionne pour un dev session mais est éphémère (URL aléatoire au redémarrage).
- Le user a demandé l'arrêt et un restart propre du projet avec **100 % natif dès le départ**.

---

## 🎬 Prompt précis à donner au prochain agent

> Copie-colle le bloc ci-dessous.

```
Je repars sur VapePOS — logiciel de caisse pour boutiques de vape + app fidélité client.
Ancien projet archivé sous /app. Le backend FastAPI (/app/backend) et la base MongoDB
(2 411 produits déjà importés) sont PRÊTS et DOIVENT ÊTRE CONSERVÉS tels quels.

Je veux UNE SEULE application 100 % native, téléchargeable depuis le Play Store puis
l'App Store, pas de PWA, pas de site web principal. Deux expériences dans le même
binaire, routage automatique selon le compte :
  • Staff caisse : écran POS tablette paysage avec drill-down catégories, panier,
    scan code-barres caméra, scan QR client, paiements espèces/carte/mixte, impression
    ticket (impression BT marquée BÊTA en Phase 1).
  • Client fidélité : bottom-tabs 5 onglets dont QR surélevé au centre, loyalty
    tiers, récompenses, messagerie boutique, événements, « Mon année Vape ».
  • Les écrans admin (produits, stock, stats, fidélité, événements) sont accessibles
    DANS LA MÊME APP pour les comptes admin/manager, pas sur un site web séparé.

Techno : Expo SDK 52 + expo-router v4 + NativeWind v4 + EAS Build cloud.
Le squelette existe déjà sous /app/mobile — reprends-le, ne refais pas de zéro.
Dépendances natives à conserver : expo-camera, expo-notifications, expo-secure-store,
expo-local-authentication, expo-screen-orientation, react-native-qrcode-svg,
expo-haptics.

Backend : /app/backend/server.py avec tous les endpoints /api/* nécessaires.
NE PAS le reconstruire. Juste tape dessus depuis l'app Expo via
EXPO_PUBLIC_BACKEND_URL (déjà configuré dans /app/mobile/.env et /app/mobile/eas.json).

Comptes de test seedés (voir /app/memory/test_credentials.md) :
  - staff admin : mathis@vapepos.local / vapepos (PIN 1111)
  - client : à créer via inscription dans l'app

Priorités de ta session :
  1. Ajoute un onglet « Admin » visible seulement pour role in [admin, manager]
     dans l'app native, qui regroupe : gestion produits (avec upload photo),
     gestion fidélité (paliers de récompenses), gestion événements/actualités,
     gestion messagerie staff, dashboard stats et comptabilité. Toutes ces
     fonctions existent déjà côté backend (voir /app/HANDOVER_NEXT_PROJECT.md
     pour la liste exhaustive des endpoints).
  2. Supprime /app/frontend (ancienne PWA) ou laisse-le mais ne l'expose plus.
     Le nouveau projet ne doit avoir qu'un seul client : /app/mobile.
  3. Prépare un build EAS Android installable : documente dans
     /app/mobile/README.md les commandes exactes que je dois lancer DEPUIS
     MON ORDI pour obtenir un APK (eas init puis eas build --profile preview
     --platform android). Je lancerai ces commandes moi-même avec mon
     compte Expo gratuit — tu ne peux pas te connecter à ma place.
  4. Prépare aussi le build iOS en Phase 2 (dépend de compte Apple Developer
     à 99 $/an que je paierai).

Référence complète du travail déjà fait (fichiers, endpoints, arbo, blocages
rencontrés) : /app/HANDOVER_NEXT_PROJECT.md. Lis-le AVANT toute autre action.

Ne redemande pas mes préférences de design — on garde la charte Cha Va'Pote
violet/fuchsia glassmorphisme déjà appliquée dans /app/mobile/src/theme/colors.js.

Commence par explorer /app/mobile avec view_bulk pour comprendre l'existant,
puis propose un plan court avant de coder.
```

---

## 📍 Dernières commandes utiles pour toi (user)

**Pour obtenir le vrai APK depuis ta machine** une fois que le prochain agent aura fini :

```bash
cd /app/mobile          # ou dossier équivalent après le restart
npx expo login          # ton email Expo gratuit + mdp
npx eas init --force    # écrit un vrai projectId dans app.json
npx eas build --profile preview --platform android
# ~10 à 15 min dans le cloud EAS, lien de téléchargement APK à la fin
```

**Pour tester en live sans APK**, demande au prochain agent de relancer :

```bash
# Dans /app/mobile :
npx expo start --tunnel     # QR à scanner avec Expo Go (nécessite compte Expo gratuit en iOS récent)
# OU avec cloudflared (pas de compte requis) :
cloudflared tunnel --url http://localhost:19000 &
REACT_NATIVE_PACKAGER_HOSTNAME="<url-cloudflare>" npx expo start --port 19000 --go --host lan
```

---

## 🔒 Comptes et secrets à ne surtout pas perdre

- `JWT_SECRET` : `f28177a009932a5f07947877b6c09b5248337174b8a401ec8bcbdde0b6e55b7b` (dans `/app/backend/.env`)
- Backend URL preview : `https://vape-register-1.preview.emergentagent.com` (déjà dans `/app/mobile/.env` + `/app/mobile/eas.json`)
- Noms Bundle Store : `com.chavapote.vapepos` (iOS + Android), nom affiché `VapePOS`

---

*Document généré par l'agent E1 le 7 octobre 2026 à la demande du user Mathis Rautureau pour transition vers un nouveau projet 100 % natif mobile.*
