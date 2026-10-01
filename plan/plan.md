# Cha Va'Pote — Expérience Client V2

Transformation de l'espace client existant en une vraie application compagnon Cha Va'Pote (fidélité, QR, récompenses, achats, favoris, abonnements, événements, actualités, magasins, statistiques, messagerie, notifications, profil).
La caisse employé, l'authentification, les comptes existants, les points déjà acquis et toutes les fonctionnalités en place sont strictement conservés.

## Pour qui

- **Clients particuliers** sur smartphone — ouvrent l'app Cha Va'Pote régulièrement, pas seulement en magasin, pour suivre leur fidélité, leurs récompenses, leurs achats, et pour communiquer avec l'équipe.
- **Vendeurs et admins** — rien ne change dans leur parcours caisse. Ils reçoivent seulement, en plus, les conversations clients routées vers le staff de leur magasin et peuvent appliquer les récompenses débloquées quand ils scannent un QR client.

## Core features and experience

**Accueil client immersif**
Carte de fidélité en gros, barre de progression animée vers la prochaine récompense, niveau actuel + badge, raccourci QR, dernier achat, visites totales, total dépensé. Design violet / fuchsia / rose fidèle à l'identité actuelle, cartes glassmorphism, animations douces, sans surcharge.

**Fidélité × niveaux × récompenses**
Barème fixé à **1 € = 2 points** pour les futures ventes uniquement (les soldes acquis restent intouchés). Progression claire visible côté client. Quatre niveaux : Nouveau, Habitué, Fidèle, VIP — seuils et avantages paramétrables côté admin. Récompenses entièrement configurables depuis l'admin : seuil en points, type (remise %, remise €, produit offert, avantage libre), date d'expiration, actif/inactif.

**Déblocage de récompenses animé**
Quand un seuil est franchi au moment d'une vente, animation « Bravo, nouvelle récompense ! » à la prochaine ouverture de l'app et notification in-app. La récompense passe en statut *disponible* dans l'app.

**Application automatique en caisse**
Quand le vendeur scanne le QR client en caisse, la caisse détecte automatiquement les récompenses disponibles et propose de les appliquer au ticket (coche à cocher avant paiement : *–10 % · Récompense fidélité*). Le vendeur peut décocher si le client préfère la garder pour plus tard. Une fois appliquée au paiement, la récompense passe en *utilisée*. Aucun code à taper manuellement, aucune saisie côté vendeur en dehors de la case à cocher.

**QR code dédié**
Page plein écran avec QR grand, luminosité recommandée, instruction *Présente-le en caisse*. Le QR ne contient qu'un token opaque — aucune donnée personnelle n'y figure.

**Mes achats, détail et racheter**
Liste des achats passés avec date, magasin, montant, nombre d'articles, points gagnés. Ouverture d'un ticket pour voir les lignes produit. Bouton *Ajouter aux favoris* sur chaque produit du ticket. Bouton *Racheter* qui pré-remplit un panier d'intention affichable au vendeur à la prochaine visite — simple raccourci, sans paiement en ligne.

**Mes favoris & mes produits habituels**
Rubrique Favoris où le client gère sa liste. Section *Tes produits habituels* calculée uniquement à partir des produits qu'il a réellement rachetés plusieurs fois — aucune donnée inventée.

**Mon activité**
Tableau synthèse ludique mais non culpabilisant : visites, total dépensé, points cumulés, récompenses obtenues, produits différents, magasin le plus fréquenté, première visite, dernière visite.

**Mon année Cha Va'Pote**
Récapitulatif annuel façon rétrospective, généré à partir des vraies données. Accessible toute l'année, mis en avant en décembre.

**Mes magasins**
Fiches Pouzauges et Chantonnay avec adresse, horaires, infos pratiques, événements liés. Le client choisit son magasin préféré (modifiable à tout moment). Les fiches sont administrables côté staff.

**Événements**
Rubrique dédiée alimentée par l'admin (Halloween, Octobre Rose, anniversaires de magasin, animations). Chaque événement a image, titre, description, date, lieu, magasin concerné, bouton d'action éventuel.

**Actualités**
Flux de cartes publiées par l'admin : nouveaux produits, nouveautés fidélité, annonces. Création/modification depuis l'admin.

**Mes abonnements**
Vue dédiée affichant l'abonnement actuel du client (formule, statut, prochaine échéance, contenu) et l'historique. En lecture seule tant qu'il n'y a pas de paiement récurrent — formules administrables.

**Parler à l'équipe (messagerie)**
Fil de discussion entre le client et le staff. **Routage automatique vers le staff du magasin préféré du client** (Pouzauges ou Chantonnay). Un vendeur ou un admin du magasin concerné voit la conversation dans l'interface staff, répond, suit le statut lu/non-lu. Compteur de messages non lus côté client et côté staff. Horodatage, historique conservé, possibilité de fermer une conversation et d'en ouvrir une nouvelle. Les réponses sont explicitement humaines — aucune IA présentée comme un humain.

**Centre de notifications enrichi**
La cloche existante devient un vrai centre : récompense débloquée, points gagnés, nouveau message staff, info abonnement, nouvel événement, nouvelle actualité, info magasin. Marquage lu / tout marquer lu / supprimer. Architecture prête pour push mobile ultérieur (le système reste fonctionnel sans push).

**Mon profil & paramètres**
Prénom, nom, email, téléphone, magasin préféré, niveau, date d'inscription. Modification des infos autorisées. Paramètres : notifications (toggles par type), confidentialité (lien politique + suppression de compte conservée), déconnexion.

**Navigation client**
Barre bas 5 onglets : **Accueil · Fidélité · QR · Boutique · Profil**. QR en bouton central mis en avant pour un accès instantané en caisse. Favoris, achats, événements, actualités, messagerie accessibles depuis Accueil et Profil.

**Côté caisse / admin — ce qui est ajouté sans toucher l'existant**
- Un onglet *Messagerie* dans l'admin filtré par magasin où le vendeur ou l'admin répond aux clients de son magasin.
- Un onglet *Fidélité* dans l'admin pour configurer règles de points, niveaux, récompenses.
- Un onglet *Contenu* dans l'admin pour gérer événements, actualités, fiches magasins, formules d'abonnement.
- En caisse, un bandeau discret apparaît quand un client scanné a des récompenses disponibles, avec case à cocher dans le panier.

## User flow

**Client — ouverture quotidienne**
Ouvre l'app → arrive sur l'accueil déjà connecté → voit son niveau et sa progression → scrolle sur dernier achat, raccourcis favoris / achats / messagerie → consulte éventuellement actualités ou événements → ferme.

**Client — passage en caisse**
Appuie sur QR dans la barre bas → QR plein écran → vendeur scanne → à la prochaine ouverture, voit ses nouveaux points, voit si une récompense a été débloquée (animation), voit l'achat détaillé dans Mes achats.

**Client — récompense disponible**
Reçoit notif *Nouvelle récompense disponible* → ouvre l'app → voit la récompense dans Fidélité → va en caisse → présente son QR → le vendeur voit la récompense proposée, la coche, le ticket est réduit automatiquement.

**Client — conversation**
Ouvre *Parler à l'équipe* → tape sa question → envoyée au staff du magasin préféré → reçoit une notification quand le staff répond → relit le fil, répond.

**Vendeur — journée normale**
Connexion → magasin → carte → caisse comme aujourd'hui, inchangée. En plus, s'il y a un message client en attente pour son magasin, une pastille apparaît sur l'icône messagerie. Pendant un encaissement avec QR scanné, si une récompense est disponible une ligne apparaît dans le panier avec la case à cocher.

**Admin — configurer la fidélité**
Admin → Fidélité → édite les paliers de récompenses (points, type, montant, expiration) → active/désactive une récompense → sauvegarde. Les changements prennent effet immédiatement côté client.

## UI/UX feel

- Design actuel conservé : violet / fuchsia / rose, mode clair-sombre selon préférence système, cartes glassmorphism, dégradés subtils, grain discret, animations douces (240–320 ms).
- Mobile portrait prioritaire pour toute l'expérience client. Caisse paysage inchangée. Admin desktop + tablette.
- Micro-interactions ciblées : barre de progression qui remplit après un achat, animation célébration au déblocage de récompense, pulsation subtile du QR, badge niveau coloré selon le palier (Nouveau argent, Habitué violet clair, Fidèle fuchsia, VIP dégradé or-rose).
- Zéro animation gratuite. Rapidité, lisibilité et fluidité priment.
- Icône QR en bouton central de la barre bas, légèrement surélevé — c'est le geste principal du client.
- Visuels événements et actualités en cartes 16:9 avec image, titre fort, 1-2 lignes de teaser.

## Implementation phases

### Phase 1 — MVP V2 construit maintenant

- Nouveau tableau de bord client (hero fidélité animé, niveau, progression, dernier achat, raccourcis)
- Système de niveaux (4 paliers configurables, badges, avantages affichés)
- Récompenses configurables depuis l'admin + animation de déblocage + statuts disponible/utilisée/expirée
- Taux fidélité 1 € = 2 points pour les ventes à venir, soldes passés conservés
- Application automatique des récompenses en caisse via case à cocher au panier
- Favoris + section *Produits habituels* dérivée des rachats réels
- Mon activité (statistiques personnelles réelles)
- Mon année Cha Va'Pote (récapitulatif à partir des données existantes)
- Fiches Pouzauges / Chantonnay + choix du magasin préféré
- Événements et actualités, création depuis l'admin
- Abonnements en lecture seule, formules éditables côté admin
- Messagerie *Parler à l'équipe* avec routage par magasin préféré, statuts lu/non-lu, compteur non lu
- Centre de notifications enrichi (types multiples, marquage, suppression, préférences dans profil)
- Profil client complet + paramètres + lien privacy et suppression compte conservés
- Navigation bas 5 onglets avec QR central
- Côté caisse : bandeau récompense + case cochable automatique au panier quand QR scanné
- Côté admin : onglets Fidélité, Contenu (événements / actualités / magasins / abonnements), Messagerie
- Architecture pensée pour une future conversion mobile native (séparation logique métier / données / UI, aucune dépendance navigateur spécifique dans les composants client)

### Phase 2 — Après validation du MVP

- Notifications push natives via APNs / FCM — l'app continue de fonctionner si l'utilisateur refuse
- Récompenses sous forme de coupons scannables en caisse (en complément du mode case à cocher)
- Récap *Mon année* exportable en image partageable
- Programmation à l'avance d'événements et actualités (date de publication future)
- Pastilles de badges supplémentaires (anniversaire client, cap des X visites, etc.)
- Attribution d'une conversation à un employé précis dans la messagerie
- Préférences de notification plus fines (par magasin, par type, horaires de silence)

### Phase 3 — Plus tard

- Paiement récurrent intégré pour les abonnements (Basique / Plus / Premium / Gold)
- Bouton *Racheter* qui déclenche réellement une commande web depuis l'app (dépendant de l'intégration Lovable)
- Analytics client agrégés anonymisés pour l'admin
- Système de parrainage client → client avec bonus de points
- Conformité caisse française à valider (archivage, traçabilité)

## Assumptions

- **Taux 1 € = 2 points** s'applique uniquement aux nouvelles ventes. Aucun recalcul rétroactif, aucun ajustement sur les soldes actuels.
- **Récompenses** s'appliquent en caisse automatiquement quand le vendeur scanne le QR : une ligne récompense apparaît dans le panier avec case à cocher, le vendeur peut décocher. Pas de code à montrer, pas de saisie manuelle.
- **Messagerie** route par **magasin préféré** du client : si le client a choisi Pouzauges, le staff Pouzauges voit et répond. Si le client n'a jamais choisi de magasin préféré, la conversation est visible par les admins des deux magasins par défaut.
- Les **employés et admins** du magasin concerné peuvent tous voir et répondre aux conversations ; aucun système d'attribution exclusive à un employé en phase 1.
- Les **types de récompense** supportés en phase 1 sont : remise en %, remise en €, produit offert (sélectionné dans le catalogue), avantage libre texte. Expiration en jours configurable, défaut 30 jours après déblocage.
- Les **niveaux de fidélité** par défaut sont Nouveau (0 pt), Habitué (200 pt), Fidèle (500 pt), VIP (1500 pt) — modifiables depuis l'admin. Les points gagnés comptent pour la vie du compte, aucun reset annuel.
- Le QR client **reste le même** que celui qui existe aujourd'hui, aucune invalidation en masse. Il reste révocable individuellement par le client depuis sa page QR.
- Le bouton **Racheter** en phase 1 ouvre juste la liste des produits du ticket dans Favoris pour que le client les montre à sa prochaine visite — pas de commande en ligne, pas de paiement.
- Les **statistiques** sont calculées côté serveur à la demande, basées uniquement sur les ventes et notifications réelles du client. Aucune donnée fictive.
- La **messagerie** fonctionne en polling toutes les 30 s côté client et toutes les 20 s côté staff en phase 1. Pas de WebSocket, pas de push, pas d'IA. Réponses explicitement humaines.
- L'**app mobile native Capacitor** déjà intégrée reste la cible de distribution : toutes les nouvelles pages client sont pensées portrait mobile dès le premier jet et marchent dans le wrapper natif sans adaptation.
- Les **anciens parcours** caisse, admin, authentification, points existants, QR, scan, impression, exports, imports CSV, catalogue des 1218 produits, multi-magasins Pouzauges / Chantonnay, suppression de compte, politique de confidentialité, mode kiosque, mode clair-sombre, notifications in-app actuelles — **tout reste strictement intact**.
