# Cha Va'Pote — Application unifiée (évolution)

Une seule application Cha Va'Pote pour les clients particuliers et le personnel de boutique, avec une connexion unique qui oriente chacun vers son expérience.
La caisse existante reste intacte ; l'évolution ajoute autour d'elle un vrai espace client avec fidélité et QR code, sans jamais dégrader le parcours d'encaissement.

## Pour qui

- **Clients particuliers** — utilisent l'app sur smartphone pour leur compte, leur QR fidélité et leur historique d'achats.
- **Vendeurs (SELLER)** — utilisent la caisse sur tablette en paysage, comme aujourd'hui, avec en plus le scan du QR client.
- **Administrateurs (ADMIN)** — gèrent produits, stocks, utilisateurs, magasins, clients et paramètres.

Le rôle MANAGER intermédiaire n'est pas ajouté maintenant (reporté à une phase ultérieure).

## Fonctionnalités et expérience

**Connexion unique**
Une seule page d'accueil « Connexion / Inscription » remplace les deux logins actuels. Le backend renvoie le rôle et l'app oriente automatiquement :
- CLIENT → espace personnel mobile
- SELLER → caisse tablette (écran actuel, inchangé)
- ADMIN → gestion + accès caisse

**Inscription publique = CLIENT uniquement**
Les particuliers peuvent créer un compte librement. Champs demandés : prénom, nom, email, téléphone, mot de passe, **date de naissance (contrôle 18+ bloquant)**, acceptation des CGU. Les comptes SELLER et ADMIN restent créés par un administrateur (comme aujourd'hui).

**Espace client (mobile)**
- Accueil : bonjour prénom, points de fidélité, dernière commande, bouton QR bien visible.
- Mon QR : QR code plein écran, luminosité recommandée max, régénérable.
- Fidélité : solde de points, récompenses disponibles, historique des gains.
- Mes achats : liste des ventes en boutique associées au compte, détail article par article.
- Mes abonnements : lecture seule pour l'instant (Basique / Plus / Premium / Gold), sans paiement récurrent — architecture préparée pour plus tard.
- Mon profil : édition des infos, mot de passe, suppression de compte, déconnexion.

**QR client sécurisé**
Chaque client reçoit un QR généré à la création du compte. Le QR ne contient qu'un token opaque (aucune donnée personnelle). Le token peut être révoqué et régénéré depuis le profil.

**Caisse — évolution minimale**
- Le bouton « QR CLIENT » de la caisse scanne le QR du client : l'app affiche prénom + points + nb d'achats, puis associe le client au panier en un clic.
- Un client reste **facultatif** pour toute vente : le parcours anonyme est préservé.
- À la validation d'une vente avec client associé : historique + points fidélité mis à jour automatiquement, visibles côté client à la prochaine ouverture.

**Notifications in-app**
Une cloche dans l'en-tête avec liste des notifications, marquage lu/non-lu. Côté client : commande confirmée, points gagnés, récompense disponible. Côté staff : stock faible, événements importants. Pas d'email ni de push dans cette phase.

**Mode bloqué (kiosque renforcé)**
Un interrupteur dans les paramètres caisse verrouille la tablette sur l'écran d'encaissement : plein écran forcé, wake-lock, retour caisse automatique, menus secondaires masqués, sortie par code PIN administrateur uniquement. Utile pour laisser une tablette en libre-service sur le comptoir sans qu'un client puisse en sortir.

**Publication mobile (App Store + Play Store)**
L'app est packagée pour être publiée comme application native sur iOS et Android tout en gardant une base unique. Icône, splash screen, nom, version, politique de confidentialité, gestion et suppression de compte sont préparés pour respecter les exigences des stores. Priorité de publication : Android d'abord, iOS ensuite.

**Séparation stricte des données**
Un CLIENT ne voit que ses propres données. Toutes les vérifications de rôle et d'appartenance sont refaites côté serveur sur chaque endpoint sensible.

## Parcours utilisateur

**Client — première fois**
Ouvre l'app → « Créer un compte » → renseigne infos + date de naissance → confirmation 18+ → compte créé → arrive sur son accueil → affiche son QR → passe en boutique → le vendeur scanne le QR → gagne des points → à la prochaine ouverture, l'historique et les points sont à jour.

**Vendeur**
Ouvre l'app → connexion → arrive directement sur la caisse (aucun changement) → encaisse comme aujourd'hui → scanne le QR d'un client quand il y en a un → valide la vente.

**Admin**
Ouvre l'app → connexion → arrive sur le tableau de bord de gestion → accède à toutes les fonctions actuelles + gestion des comptes clients et attribution des rôles staff.

## UI / UX

- Identité conservée : palette **violet / rose**, moderne, lumineuse, jeune, sans virer ERP froid.
- Espace client : **mobile portrait prioritaire**, cartes arrondies, grand QR, gros points de fidélité.
- Caisse : **tablette paysage inchangée**, zones produits / panier / actions comme actuellement.
- Admin : desktop + tablette, dense mais lisible.
- Layouts responsive dédiés par rôle : jamais de compromis qui dégrade la caisse pour améliorer le mobile.

## Phases

### Phase 1 — MVP (construit maintenant)

1. Fusion des deux pages de connexion en une seule page unifiée avec bascule « Connexion / Inscription ».
2. Inscription publique CLIENT avec date de naissance et contrôle 18+ bloquant.
3. Redirection par rôle après login (CLIENT → espace perso, SELLER → caisse, ADMIN → gestion).
4. Espace client mobile : Accueil, Mon QR, Fidélité, Mes achats, Mon profil.
5. Génération et affichage du QR client avec token opaque, révocation possible.
6. Scan du QR client depuis la caisse existante + association au panier + mise à jour auto de l'historique et des points à la validation.
7. Notifications in-app (cloche + liste) côté client et côté staff.
8. Mode bloqué caisse (kiosque renforcé, sortie par PIN admin).
9. Packaging application mobile Android + iOS : manifest, icônes, splash, politique de confidentialité, écran suppression de compte — prêt à soumettre au Play Store en priorité, App Store ensuite.
10. Vérifications de rôle et d'appartenance renforcées côté serveur sur toutes les routes clients et staff.

### Phase 2 — Après validation du MVP

- Rôle MANAGER intermédiaire avec matrice de permissions dédiée.
- Notifications par email (via Resend) en plus des notifications in-app.
- Écran « Commandes web » côté caisse avec statuts (Nouvelle / En préparation / Prête / Terminée / Annulée), sans encore de connexion externe.
- Récompenses de fidélité activables (coupons, paliers, échange de points).
- Publication effective sur le Play Store puis l'App Store.

### Phase 3 — Plus tard

- Intégration réelle des commandes web depuis le site Lovable (dès que les informations techniques du site sont fournies).
- Paiement récurrent pour les abonnements Basique / Plus / Premium / Gold.
- Notifications push mobiles natives.
- Conformité caisse française à valider (intégrité, archivage, traçabilité).

## Hypothèses

- La caisse actuelle et ses fonctionnalités (produits, catégories hiérarchiques, scan, panier, remises, paiement espèces/carte/mixte, tickets, sessions, multi-magasins Pouzauges/Chantonnay, import CSV, images auto EAN) sont conservées telles quelles ; seule l'intégration du QR client y est ajoutée.
- Le système d'authentification existant (email + mot de passe pour staff, email + QR pour client) est fusionné en une seule route avec routage par rôle ; les comptes staff existants continuent de fonctionner sans re-création.
- Le contrôle 18+ à l'inscription est bloquant et non contournable côté serveur ; aucun compte CLIENT de moins de 18 ans n'est créé.
- Le QR client contient uniquement un token opaque aléatoire long ; nom, email, téléphone, adresse n'y figurent jamais.
- Un client reste facultatif pour toute vente en caisse : la vitesse d'encaissement anonyme reste prioritaire.
- Le mode bloqué se désactive uniquement avec le PIN d'un compte ADMIN ; un SELLER ne peut pas en sortir.
- Aucune connexion réelle avec le site Lovable n'est mise en place dans cette phase — reporté totalement.
- Les abonnements clients sont affichés en lecture seule ; aucun prélèvement récurrent n'est déclenché.
- L'application est packagée pour être publiée sur les stores mobiles, avec Android en priorité de publication et iOS ensuite ; la version web reste utilisable en parallèle pour la caisse tablette et l'admin desktop.
- Toutes les vérifications de rôle sont refaites côté serveur ; l'interface ne fait jamais foi seule.
