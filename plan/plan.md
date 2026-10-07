# VapePOS — Conversion en application native unique (Expo / React Native)

Une application mobile native unique Android puis iOS, qui héberge à la fois l'espace client fidélité et la caisse POS, avec détection automatique du profil à la connexion.
Le projet web actuel (PWA + back-office) reste en ligne et intact : la version native s'ajoute en parallèle sans supprimer l'existant.

## Pour qui

- **Clients** de la boutique (Cha Va'Pote et autres boutiques du SaaS) : app téléchargée sur Play Store puis App Store, avec QR fidélité, récompenses, messagerie, événements.
- **Vendeurs et responsables** en magasin (Pouzauges, Chantonnay, extensions futures) : même app installée sur les tablettes du comptoir, qui bascule en mode caisse POS après authentification staff.
- **Administrateur / gérant** : continue d'utiliser le back-office web (produits, stock, statistiques, comptabilité). Pas de conversion back-office en natif.

## Éligibilité et choix de technologie

Le projet est **éligible** à une conversion native. Il remplit les trois conditions nécessaires :
- Toute la logique métier (ventes, fidélité, stock, auth, messagerie) vit déjà côté serveur FastAPI, pas dans le front.
- L'authentification est basée sur un token JWT retourné par `/api/auth/login`, utilisable à l'identique depuis une app native.
- Les fichiers React actuels sont des composants fonctionnels standard : la logique métier (appels API, gestion de panier, formatage fidélité) est portable. Les feuilles de style Tailwind et les composants shadcn/ui, eux, ne sont pas réutilisables tels quels et doivent être réécrits avec les primitives React Native.

Il faut donc trancher entre deux chemins. Voici la comparaison honnête, parce que la question a été posée.

### Capacitor (chemin actuel) vs Expo / React Native (chemin proposé)

| Critère | Capacitor (actuel) | Expo / React Native |
|---|---|---|
| **Nature** | Enveloppe WebView autour du site React existant. Le JS tourne dans un navigateur embarqué. | Vraie app native. Le JS pilote des composants natifs Android/iOS via le bridge RN. |
| **Code à écrire** | ~0 — le site web actuel est embarqué tel quel. | Réécriture de **toute la couche UI** (écrans, navigation, styles). La logique API est portable. |
| **Perf perçue** | Correcte sur tablette récente. Latence visible au scroll long et aux transitions. | Native, fluide même sur appareils d'entrée de gamme. |
| **Scanner caméra QR/code-barres** | Via plugin Capacitor Camera, acceptable mais lent au focus. | `expo-camera` + `expo-barcode-scanner`, latence quasi nulle, décode EAN-13 au vol. |
| **Impression Bluetooth thermique (ESC/POS)** | Plugin tiers peu maintenu, support Android partiel, iOS très limité. | Modules natifs React Native éprouvés, support Android complet. |
| **Biométrie Face ID / empreinte** | Plugin tiers, APIs limitées. | `expo-local-authentication`, API unifiée Android/iOS, stable. |
| **Notifications push** | Plugin push Capacitor fonctionnel. | `expo-notifications` + Expo Push Service : une seule API, pas besoin de gérer FCM et APNs séparément. |
| **Stockage local chiffré hors ligne** | `@capacitor/preferences` non chiffré, à combiner avec un plugin tiers. | `expo-secure-store` (Keychain iOS / Keystore Android) + `expo-sqlite` chiffré. Standard. |
| **Mises à jour sans passer par le store** | Rechargement du bundle web possible mais règles store ambiguës. | **EAS Update** officiel : correctifs JS publiés en quelques minutes, conformes aux règles Apple/Google. |
| **Builds et publication store** | Nécessite Xcode local (Mac) + Android Studio. | **EAS Build** dans le cloud : builds Android et iOS depuis n'importe quelle machine, pas de Mac requis. |
| **Mode kiosque tablette (POS)** | WebView plein écran, basique. | Modules RN dédiés (immersive mode Android, guided access iOS). |
| **Risque de régression du web existant** | Nul, c'est le même code. | Nul : le web n'est pas touché. L'app Expo est un deuxième client qui tape sur le même backend. |

**Verdict proposé.** Expo apporte des gains concrets sur les cinq fonctionnalités natives demandées (caméra, push, chiffrement, Bluetooth imprimante, biométrie) et simplifie les builds et correctifs. Le coût réel est la réécriture de l'UI mobile. Pour la caisse POS, c'est un vrai bénéfice en vitesse perçue au comptoir. Pour l'app client, c'est quasi obligatoire si l'objectif est une présence sérieuse sur les stores.

**Recommandation.** Basculer sur Expo pour les deux rôles, dans une même app. Garder Capacitor en plan B jusqu'à la publication du premier build Android, puis le retirer. Le web PWA reste la cible officielle pour le back-office et comme fallback de dépannage.

## Expérience et fonctions principales

L'app couvre **deux expériences dans un même binaire**, choisies automatiquement selon le compte connecté.

### Expérience client (visible par défaut au premier lancement)
- Écran d'accueil fidélité avec niveau (Nouveau / Habitué / Fidèle / VIP) et progression.
- Mon QR en plein écran, lisible depuis le lecteur de la caisse même sous un éclairage médiocre.
- Récompenses disponibles / utilisées / expirées avec libellé `-X %`, `-X €`, Offert.
- Messagerie avec le magasin préféré, notifications push pour chaque réponse de l'équipe.
- Boutique : choix du magasin préféré, horaires, événements, actualités.
- Profil : coordonnées, préférences, suppression de compte, déconnexion.
- Favoris et historique d'achats.

### Expérience staff / caisse (après login staff)
- Écran de caisse en mode paysage, verrouillé en orientation horizontale sur tablette.
- Catalogue par catégories drill-down, panier permanent à droite, bouton Paiement très visible.
- Scanner code-barres caméra, scanner QR client, suspension et reprise de panier.
- Paiement espèces / carte / mixte, calcul automatique du rendu.
- Ouverture et clôture de caisse, rapport Z simplifié.
- Impression du ticket via imprimante Bluetooth thermique (ESC/POS).
- Login staff par email + PIN, avec option Face ID / empreinte sur les sessions suivantes.
- Mode hors ligne : panier et dernière vente conservés en stockage chiffré, synchro à la reconnexion.

### Fonctions natives communes activées dès la MVP
- Scanner caméra QR + code-barres EAN-13 / EAN-8 / Code128.
- Notifications push via Expo Push.
- Stockage local chiffré (clés, tokens, panier en cours, cache produits).
- Biométrie Face ID / empreinte digitale pour le profil staff uniquement.
- Impression Bluetooth ESC/POS pour le profil staff uniquement.

## Parcours utilisateur

**Premier lancement.**
1. Écran d'accueil app → bouton Se connecter ou Créer un compte.
2. Création rapide client (email, mot de passe, prénom) ou saisie identifiants staff.
3. L'API `/auth/login` renvoie le rôle. L'app route automatiquement : `type: customer` → onglets client, `type: staff` → écran de caisse.
4. Permission notifications demandée après connexion.
5. Permission caméra demandée au premier scan.

**Vie quotidienne client.**
1. Ouvre l'app, Face ID / empreinte débloque la session (optionnel).
2. Arrive sur l'onglet Accueil fidélité.
3. Appuie sur l'onglet QR central pour présenter son code au comptoir.
4. Reçoit une notification push « +42 points » juste après le paiement.

**Vie quotidienne vendeur.**
1. Ouvre l'app sur la tablette comptoir, s'authentifie par PIN ou biométrie.
2. Atterrit directement sur l'écran caisse paysage.
3. Scanne les produits, scanne le QR client, encaisse, imprime le ticket Bluetooth.
4. Fin de journée : clôture de caisse, rapport affiché, déconnexion.

## Rendu visuel

- Charte Cha Va'Pote conservée : violet, fuchsia, accents clairs, glassmorphisme.
- Chaque magasin SaaS pourra à terme surcharger logo et couleurs.
- Mode clair et mode sombre, basculé selon réglage système par défaut.
- Typographie et icônes natives Android (Material) et iOS (SF Symbols) via Expo pour que l'app se fonde dans chaque plateforme.
- Composants shadcn/ui du web **non repris** : remplacés par des équivalents React Native stylés dans la même palette.
- Mode caisse verrouillé en paysage, mode client libre en portrait.

## Phases d'implémentation

### Phase 1 — MVP natif Android (construite maintenant)

Objectif : avoir un APK installable et un build Play Store interne qui couvre l'expérience client complète et la caisse POS en version essentielle, en tapant sur le backend FastAPI existant sans aucune modification serveur bloquante.

Contenu livré :
- Projet Expo créé sous `/app/mobile/` (nouveau dossier, le web n'est pas touché).
- Login unifié auto-détection staff / client sur le même endpoint que le web.
- **Côté client** : accueil fidélité, QR plein écran, récompenses, messagerie, boutique, profil, favoris, historique.
- **Côté staff** : écran caisse paysage, catalogue drill-down, panier, scan code-barres caméra, scan QR client, paiement espèces + carte + mixte, ticket d'écran (impression Bluetooth branchée mais marquée *bêta*).
- Notifications push Expo configurées, token enregistré côté backend.
- Biométrie staff (opt-in).
- Stockage chiffré pour token, panier en cours, dernière session caisse.
- Build Android produit via EAS Build, livré en APK + bundle AAB prêt pour Play Store interne.
- Capacitor laissé en place sans modification pendant toute la Phase 1 ; retrait proposé à la fin, après validation du build Expo.

### Phase 2 — iOS App Store + impression Bluetooth validée + hors ligne robuste

- Build iOS via EAS, soumission App Store Connect.
- Impression ESC/POS validée sur deux modèles d'imprimante physiques.
- Mode hors ligne complet : file d'attente des ventes, dédoublonnage à la synchro, panier et clôture caisse résilients à une coupure réseau.
- EAS Update branché : correctifs sans resoumission au store.
- Retrait de Capacitor du dépôt.

### Phase 3 — Finitions SaaS, kiosque et conformité

- Mode kiosque tablette (immersive Android, guided access iOS) pour empêcher le vendeur de sortir de l'app.
- Thème par entreprise (logo, couleurs) chargé dynamiquement selon le compte.
- Signature électronique du ticket, archivage, intégrité (préparation NF525 — jamais annoncée comme certifiée tant qu'un audit réel n'est pas fait).
- Analytics d'usage, crash reporting, A/B testing EAS.
- Publication publique Play Store + App Store (grand public) après revue d'un échantillon de testeurs internes.

## Hypothèses retenues sans redemander

- Le backend FastAPI actuel reste la source unique de vérité. Aucune duplication de base. L'app native tape exactement les mêmes endpoints `/api/*` que le web.
- Les 2 411 produits et les comptes existants sont conservés tels quels, aucun reset de base.
- Une seule app native, un seul store listing, avec routage interne staff/client. Pas de double publication.
- Phase 1 cible **Android uniquement**. iOS déplacé en Phase 2 comme demandé.
- Impression Bluetooth ESC/POS livrée en MVP mais marquée **bêta** tant qu'elle n'a pas été testée sur votre imprimante réelle au comptoir.
- Biométrie activée **uniquement pour le profil staff** ; les clients gardent email + mot de passe standard.
- Notifications push via **Expo Push Service** (couche gratuite au-dessus de FCM / APNs), pas d'intégration FCM nue en MVP.
- Nom de l'app sur les stores : **« VapePOS »** côté staff, mais si vous préférez séparer la marque client (par exemple « Cha Va'Pote »), ce sera un seul binaire avec un nom de store personnalisable par entreprise en Phase 3.
- Compte développeur Google Play (25 $ une fois) et compte Apple Developer (99 $/an) **à votre charge et à votre nom**. Nécessaires pour publier, pas pour builder en interne.
- Capacitor conservé intact pendant toute la Phase 1 pour ne rien casser. Retrait proposé seulement en fin de Phase 2, après validation du build Expo en production.
- Le back-office administrateur (gestion produits, stock, stats, compta) **reste exclusivement web**. Non converti en natif.
- UI mobile entièrement réécrite en composants React Native + bibliothèque de style compatible (NativeWind) ; les composants shadcn/ui du web ne sont pas réutilisés tels quels.
- Déploiement des builds via **EAS Build** cloud, pas besoin d'un Mac pour iOS.
- Correctifs JS post-publication via **EAS Update** à partir de la Phase 2.
