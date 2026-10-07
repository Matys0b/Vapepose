# VapePOS Mobile — Expo Native App

Application mobile native **unique** qui héberge à la fois l'espace client fidélité et la caisse POS staff, avec détection automatique du profil à la connexion. Elle tape sur le même backend FastAPI que le web (`/api/*`), sans duplication de base.

> Le projet web (`/app/frontend`) et son build Capacitor restent **intacts**. Cette app Expo est un deuxième client, pas un remplacement.

## Phase 1 — Android MVP (livré)

- Projet Expo SDK 52 + expo-router + NativeWind v4
- Login unifié auto-détection staff / client via `POST /api/auth/universal-login`
- **Client** : accueil fidélité, QR plein écran, récompenses, messagerie, boutique, profil, favoris, historique
- **Staff** : écran caisse paysage, catalogue drill-down, panier, scan code-barres caméra, scan QR client, paiement espèces/carte/mixte, calcul rendu, ticket écran
- Notifications push via Expo Push Service (token enregistré au login)
- Biométrie staff (Face ID / empreinte, opt-in)
- Stockage chiffré (`expo-secure-store`) pour token, panier en cours, dernière session caisse
- Impression Bluetooth ESC/POS : **branchée mais marquée BÊTA** (non testée sur imprimante physique)
- Build via EAS Build cloud (pas besoin de Mac pour iOS en Phase 2)

## Prérequis

- Node 20+
- Expo CLI (`npx expo` suffit, pas d'install globale)
- Compte Expo (gratuit) pour EAS Build
- Compte Google Play Developer (25 $ une fois) pour publier le binaire

## Installer les dépendances

```bash
cd /app/mobile
yarn install
```

Les 2 411 produits, utilisateurs, sessions caisse, etc. du backend existant sont consommés tels quels.

## Lancer en développement

### Avec Expo Go (iOS/Android) — pas de modules natifs custom
```bash
yarn start
```

> Note : certains modules (notifications push, biométrie, caméra sous Android récent) **ne fonctionnent pas** dans Expo Go. Pour un vrai test, builder un `dev-client` ci-dessous.

### Dev client (recommandé)
```bash
eas build --profile development --platform android
# installer l'APK généré sur le device, puis
yarn start
```

## Build production Android

### Pré-requis une seule fois

1. Créer un compte Expo (gratuit) : <https://expo.dev/signup>
2. Depuis `/app/mobile`, se connecter : `npx expo login`
3. Initialiser le projet EAS (crée un `projectId` et le met dans `app.json → extra.eas.projectId`) :
   ```bash
   npx eas init --non-interactive --force
   ```
   > ⚠️ Sans ça, la build échoue avec « Missing EAS projectId ».

### APK pour distribution interne / test (recommandé pour la tablette comptoir)
```bash
cd /app/mobile
npx eas build --profile preview --platform android
```
Le lien de téléchargement du `.apk` s'affiche à la fin (~10-15 min). Télécharge-le sur la tablette et installe (autoriser « sources inconnues »).

### AAB pour Google Play Store
```bash
npx eas build --profile production --platform android
npx eas submit --platform android --latest
```
Nécessite un compte Google Play Developer (25 $, une fois à vie) et une service-account JSON. `eas submit` guide la première fois.

### Mettre à jour l'URL du backend sans rebuilder

Les builds EAS récupèrent `EXPO_PUBLIC_BACKEND_URL` depuis le profil `eas.json` au moment du build. Pour changer d'URL (ex. passer du preview au domaine prod définitif), éditer `eas.json` puis relancer `eas build`.

## Variables d'environnement

Toutes les variables sont injectées à la build par EAS (voir `eas.json`). En dev local, elles sont lues depuis `/app/mobile/.env`.

| Variable | Rôle |
|---|---|
| `EXPO_PUBLIC_BACKEND_URL` | URL racine du backend (sans slash final, sans `/api`) |

## Compte admin

Les mêmes comptes que le web sont utilisables :

- Admin principal : `4gr7wkdgjn@privaterelay.appleid.com` / `ChangeMe2026!`
- Comptes staff seed : `mathis@vapepos.local` / `vapepos` (admin), etc. — voir `backend/server.py` `seed()`
- Côté client, créer un compte depuis l'app ou utiliser un compte existant du web.

## Phase 2 (à venir après validation Phase 1)

- Build iOS + soumission App Store
- Impression Bluetooth ESC/POS validée sur deux modèles d'imprimante physiques
- Mode hors ligne robuste (file d'attente + dédoublonnage)
- EAS Update pour correctifs sans resoumission
- Retrait complet de Capacitor du dépôt
