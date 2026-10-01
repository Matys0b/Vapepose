# Cha Va Pote — Application mobile native unifiée

Transformation de l'application web existante en une véritable application mobile téléchargeable sur Google Play Store et Apple App Store, sous le nom **Cha Va Pote** (identifiant unique `fr.chavapote.app`).
Tout ce qui a été construit à ce jour est conservé à l'identique — caisse tablette, portail client mobile, back-office admin, fidélité, QR code, multi-magasins, catalogue importé — et simplement empaqueté dans un conteneur natif iOS/Android via Capacitor, sans aucune réécriture.

## Pour qui

- **Vendeurs et administrateurs** installent l'app sur la tablette du comptoir (Android en priorité, iPad compatible) et retrouvent la caisse paysage avec le scan via douchette USB, exactement comme aujourd'hui.
- **Clients particuliers** installent la même app sur leur smartphone depuis le Play Store ou l'App Store et retrouvent leur espace fidélité, leur QR code et leur historique d'achats.
- Un seul code source, une seule app publiée sur chaque store — le routage par rôle gère automatiquement l'expérience affichée après connexion.

## Fonctionnalités et expérience

**Une seule et même app, deux expériences selon le rôle**
L'app affiche l'écran de connexion unifié existant. Après authentification, le backend renvoie le rôle (client, vendeur, admin) et l'app route automatiquement vers la caisse pour le staff ou vers le portail fidélité pour les clients. Rien ne change dans les parcours, seule l'enveloppe devient native.

**Scan par douchette USB uniquement**
Aucun scan natif via caméra n'est ajouté. L'app sait reconnaître la douchette branchée à la tablette comme un clavier physique (comportement HID), exactement comme la version web actuelle. Aucune permission caméra n'est demandée à l'installation, ce qui simplifie la validation sur les stores.

**Session vendeur temporaire, session client permanente**
Comportement conservé à l'identique : les vendeurs doivent se reconnecter à chaque ouverture de l'app (fermeture de session automatique à la fermeture), les clients restent connectés en permanence comme dans toute app mobile.

**Suppression de compte accessible dans l'app**
L'écran de suppression de compte existant est rendu accessible depuis l'espace Profil du client. Il est obligatoire pour la validation Play Store et App Store. Une page publique miroir reste accessible sur le web pour satisfaire l'exigence Google.

**Notifications in-app conservées**
La cloche de notifications in-app continue de fonctionner comme aujourd'hui (ventes, points gagnés, événements staff). Les notifications push système sont volontairement reportées à une phase ultérieure pour accélérer la mise en ligne.

**Icône et splash screen aux couleurs de Cha Va Pote**
Déclinaison du branding actuel (dégradé violet → fuchsia + éclair) adaptée automatiquement à tous les formats requis par les stores. Un logo personnalisé pourra remplacer cette version à n'importe quel moment.

**Lien direct depuis un lien web**
Si quelqu'un clique sur un lien `https://chavapote.app/...` depuis un mail ou un SMS, l'app s'ouvre directement sur la bonne page lorsque l'app est installée ; sinon le navigateur ouvre la version web, qui continue de fonctionner en parallèle.

## Parcours utilisateur

**Vendeur — ouverture d'une journée**
Allumer la tablette → ouvrir l'app Cha Va Pote depuis l'écran d'accueil → saisir email et mot de passe → choisir le magasin → choisir sa carte vendeur → encaisser normalement avec la douchette.

**Client — première installation**
Télécharger « Cha Va Pote » depuis le Play Store ou l'App Store → ouvrir l'app → créer son compte (prénom, date de naissance 18+, email, mot de passe, acceptation CGU) → arriver sur son espace fidélité → afficher son QR en boutique.

**Client — utilisation quotidienne**
Ouvrir l'app → arriver directement sur son accueil fidélité (déjà connecté) → présenter le QR au vendeur → repartir avec des points supplémentaires visibles instantanément.

**Admin — gestion depuis la tablette**
Même parcours qu'un vendeur, puis bouton Gestion depuis la caisse pour accéder au back-office (produits, stock, catégories, ventes, utilisateurs, comptabilité).

## UI/UX feel

- Design actuel conservé intégralement : palette violet / fuchsia / rose, mode clair/sombre détecté selon la préférence système, animations douces, cartes glassmorphism.
- Adaptation automatique aux encoches, barres de statut et safe areas iOS et Android — rien ne passe sous les éléments système.
- Caisse en paysage pour tablette, portail client en portrait pour smartphone, back-office en desktop/tablette — tous les layouts existants sont réutilisés sans compromis entre eux.
- Icône native lumineuse avec dégradé Cha Va Pote, splash screen court et clean à l'ouverture.
- Aucune bannière « installer l'app » puisque c'est désormais déjà une app installée.

## Phases

### Phase 1 — MVP mobile natif (construit maintenant)

1. Intégration de Capacitor sur le projet React existant, sans toucher au code applicatif.
2. Création des projets natifs Android et iOS avec le nom `Cha Va Pote` et l'identifiant `fr.chavapote.app`.
3. Génération automatique de l'icône et du splash screen depuis le branding actuel pour toutes les tailles requises par les deux stores.
4. Configuration de la barre de statut, du safe area et du mode plein écran edge-to-edge pour qu'aucun contenu ne passe sous les éléments système.
5. Vérification de la douchette USB en mode HID clavier dans le conteneur natif.
6. Intégration propre de la suppression de compte dans le menu Profil du client, conforme aux exigences Play Store et App Store.
7. Ajout des liens profonds universels — un lien web ouvre l'app si installée, sinon le site.
8. Génération d'un `.aab` signé prêt pour une soumission Play Store (circuit interne puis production).
9. Génération d'un `.ipa` prêt pour une soumission TestFlight puis App Store.
10. Préparation des fiches stores : nom, description courte et longue, captures d'écran, URL politique de confidentialité, URL publique de suppression de compte, catégorie, classification de contenu.

À la fin de la phase 1, l'app est installable sur un téléphone/tablette de test via un lien d'installation. La soumission effective aux stores (comptes développeurs à activer, pièces d'identité, délais de validation Apple et Google) reste pilotée côté boutique une fois la build validée.

### Phase 2 — Après validation du MVP

- Notifications push système natives (ventes confirmées, promotions, réassort) avec provider à définir.
- Mode hors-connexion renforcé pour la caisse (ventes mises en file et resynchronisées au retour du réseau).
- Impression ticket native via imprimante thermique Bluetooth.
- Récompenses de fidélité activables côté client depuis l'app (coupons scannables en caisse).
- Publication effective sur le Play Store puis l'App Store, suivi des éventuels retours de review.

### Phase 3 — Plus tard

- Intégration du site Lovable pour les commandes web (dès que les informations techniques du site sont fournies).
- Paiement récurrent intégré pour les abonnements Basique / Plus / Premium / Gold.
- Intégration d'un TPE physique (lecteur CB Bluetooth) depuis l'app.
- Analytics mobile dédié et crash reporting.
- Conformité caisse française à valider (intégrité, archivage, traçabilité).

## Assumptions

- L'app mobile pointe vers l'URL preview actuelle du backend FastAPI tant qu'un domaine personnalisé n'est pas fourni. Un passage ultérieur à `api.chavapote.fr` ou équivalent se fait par simple changement de variable sans republier l'app, à condition d'anticiper la redirection pour les liens profonds.
- L'app est publiée sous un **compte développeur unique Cha Va Pote** côté Google (frais 25 $ une fois) et côté Apple (99 $/an). L'ouverture de ces comptes et la fourniture des justificatifs d'entreprise restent à la charge de la boutique.
- Le nom affiché sur les stores et sur l'écran d'accueil est `Cha Va Pote` sans apostrophe pour maximiser la compatibilité système. L'orthographe `Cha Va'Pote` reste utilisée partout dans l'interface interne.
- Aucun scan par caméra n'est intégré en phase 1 ; seule la douchette USB en mode HID est supportée. Cela évite une permission caméra sensible et accélère la review store.
- Les notifications push natives (via APNs/FCM) ne sont pas intégrées en phase 1. Seules les notifications in-app existantes restent actives. Aucun compte Firebase n'est créé.
- La suppression de compte supprime immédiatement les données personnelles du client et anonymise les ventes passées (conservées pour obligations comptables). Comportement déjà en place, simplement rendu plus visible dans le profil mobile.
- Aucun paiement d'abonnement n'est traité par l'app en phase 1 : les abonnements restent en lecture seule. Cela évite les frais de 15–30 % imposés par Apple et Google sur les paiements in-app tant que la stratégie commerciale n'est pas arrêtée.
- Le site web actuel reste accessible en parallèle à l'app, pour les clients qui préfèrent le navigateur et pour permettre à Google d'ouvrir une URL de suppression de compte publique.
- Les signatures Android (keystore de release) et iOS (certificats + profils de provisioning) sont générées et conservées côté développement, avec sauvegarde documentée transmise à la boutique à la fin de la phase 1.
- Les mises à jour futures de l'app ne nécessitent pas de republier à chaque changement : seule la coque native est publiée. Toutes les évolutions du contenu web (règles de fidélité, catalogue, prix, textes) continuent d'être poussées côté serveur et sont visibles immédiatement sans mise à jour store.
