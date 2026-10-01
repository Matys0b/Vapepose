# Cha Va Pote — Mobile native build & release

L'application web React est empaquetée en app native via **Capacitor 8**. Elle est publiable sur **Google Play Store** (priorité Android) et **Apple App Store** sous le nom **Cha Va Pote** avec l'identifiant unique **`fr.chavapote.app`**.

Aucune ligne de code React n'est touchée : la coque native charge directement le build CRA. Toute évolution du contenu web (catalogue, prix, règles de fidélité, textes, UI) est servie côté serveur et visible instantanément sans republier sur les stores.

---

## Prérequis dev machine

- **Node 20+** et **Yarn**
- **Android Studio** (pour la build `.aab`) + Android SDK + JDK 17
- **macOS avec Xcode 15+** + CocoaPods (pour la build `.ipa`)
- Compte **Google Play Console** (25 $ une fois) et **Apple Developer Program** (99 $/an)

> La boutique fournit les comptes développeurs et les justificatifs d'entreprise. Les keystores et certificats sont générés et conservés en coffre-fort documenté lors de la première soumission.

---

## 1. Build web

```bash
cd /app/frontend
yarn build
```

Produit `/app/frontend/build/` chargé par Capacitor.

---

## 2. Projets natifs (première fois seulement)

```bash
cd /app/frontend
npx cap add android
npx cap add ios
```

Crée les dossiers `android/` et `ios/`. **À commiter dans Git** avec `capacitor.config.json`.

---

## 3. Générer icône et splash

Les sources sont dans `/app/frontend/assets/icon-only.svg` et `/app/frontend/assets/splash.svg`.

1. Convertir en PNG (sur machine dev) :
   ```bash
   # icon-only.png : 1024x1024
   # splash.png    : 2732x2732
   # splash-dark.png (optionnel) : 2732x2732
   ```
   via Figma, Inkscape, ou `rsvg-convert`.

2. Générer tous les formats :
   ```bash
   npx capacitor-assets generate
   npx cap sync
   ```

Pour remplacer le logo plus tard, écraser `icon-only.png` + relancer `capacitor-assets generate`.

---

## 4. Synchroniser après chaque changement web

```bash
yarn build
npx cap sync
npx cap open android   # ouvre Android Studio
npx cap open ios       # ouvre Xcode
```

---

## 5. Deep links universels

Fichiers déjà présents sous `/app/frontend/public/.well-known/` :

- `assetlinks.json` → remplacer `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT` par l'empreinte **Play App Signing** (visible dans Play Console → Signing).
- `apple-app-site-association` → remplacer `REPLACE_WITH_APPLE_TEAM_ID` par le Team ID Apple (visible dans Apple Developer → Membership).

Ces fichiers doivent être servis en HTTPS sans redirection, directement depuis le domaine configuré en Associated Domain / App Links.

Dans `AndroidManifest.xml` (ajouter dans l'`<activity>` principale) :
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="chavapote.app" />
</intent-filter>
```

Dans Xcode : target `App` → Signing & Capabilities → + Associated Domains → `applinks:chavapote.app`.

---

## 6. Build release Android (.aab)

1. Générer un keystore d'upload (**à conserver précieusement**) :
   ```bash
   keytool -genkey -v -keystore chavapote-upload.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
2. Dans `android/app/build.gradle`, configurer `signingConfigs.release` avec les chemins et mots de passe.
3. Bump `versionCode` (int, +1 à chaque upload) et `versionName`.
4. Build :
   ```bash
   npx cap sync android
   cd android && ./gradlew bundleRelease
   ```
5. L'`.aab` sort dans `android/app/build/outputs/bundle/release/app-release.aab`.
6. Upload sur Play Console → piste **Internal testing** d'abord, puis **Production**.

---

## 7. Build release iOS (.ipa)

1. Dans Xcode : sélectionner **Any iOS Device (arm64)**.
2. Target `App` → Signing & Capabilities → Team + bundle `fr.chavapote.app`.
3. Bump build number.
4. `Product → Archive`.
5. Organizer → `Distribute App` → `App Store Connect` → Upload.
6. Dans App Store Connect → ajouter la build à TestFlight, puis soumettre à App Review.

---

## 8. Fiches store à préparer

**Google Play Console :**
- Nom affiché : `Cha Va Pote`
- Description courte (80 car.) + longue (4000 car.)
- Captures 1080x1920 (téléphone) + 1920x1080 (tablette) — au moins 2 par format
- Icône 512x512
- Image mise en avant 1024x500
- Classification contenu PEGI 18 (produits liés à la vape)
- URL politique de confidentialité : `https://chavapote.app/privacy`
- URL publique de suppression de compte : `https://chavapote.app/privacy#suppression`
- Data safety : collecte email + prénom + date naissance (identifiants compte), aucune donnée vendue
- Catégorie : Achats / Shopping

**App Store Connect :**
- Nom : `Cha Va Pote`
- Sous-titre : `Fidélité & commande en boutique`
- Mots-clés
- Description
- Captures iPhone 6.7" + iPad 12.9" obligatoires
- Classement contenu 17+ (produits liés à la vape)
- URL support + URL marketing + URL privacy
- Compte test de review (email + mot de passe) à fournir

---

## 9. Soumission : workflow boutique

1. Dev builde `.aab` + `.ipa` et les transmet.
2. Boutique crée les comptes développeurs si pas déjà faits.
3. Dev upload sur piste interne (TestFlight / Internal testing) → la boutique teste depuis son téléphone/tablette via un lien d'invitation.
4. Une fois validé par la boutique, soumission en production.
5. Délais typiques : Play Store 1 à 3 jours, App Store 1 à 7 jours.

---

## 10. Mises à jour

- **Changements web uniquement** (textes, prix, fidélité, catalogue, produits, UI) → aucune nouvelle soumission : le serveur sert la nouvelle version instantanément.
- **Changements natifs** (nouveau plugin, nouvelle permission, nouvelle icône) → `yarn build` + `npx cap sync` + rebuild `.aab`/`.ipa` + republier sur les stores (version code à incrémenter).

---

## Conformité stores — ce qui est déjà en place

- ✅ **Suppression de compte in-app** : `/client/me/profil` → section Zone dangereuse. Supprime customer + loyalty + notifications, anonymise les ventes.
- ✅ **Suppression de compte web public** : `/privacy` liste les étapes depuis la section « Vos droits ».
- ✅ **Politique de confidentialité** : `/privacy` (10 sections, FR, à jour).
- ✅ **Contrôle d'âge 18+ bloquant** à l'inscription (côté serveur).
- ✅ **HTTPS end-to-end** (préview + prod).
- ✅ **Mots de passe hachés bcrypt**.
- ✅ **Aucune permission caméra** demandée (scan HID uniquement).
- ✅ **Aucun tracking tiers / cookie publicitaire**.

---

## Phase 2 (après MVP natif validé)

- Notifications push FCM / APNs
- Mode hors-connexion caisse renforcé
- Impression Bluetooth thermique
- Récompenses fidélité activables
- Analytics mobile + crash reporting
