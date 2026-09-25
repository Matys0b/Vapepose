# VapePOS – Mode Tablette (PWA + Kiosque)

Transformer VapePOS en application installable sur l'écran d'accueil des tablettes Android et iPad, avec un mode kiosque plein écran pour l'usage au comptoir.
Le lien actuel de preview reste l'URL d'accès ; l'app s'ouvre sans barre de navigateur, comme une vraie caisse.

## Pour qui
- Vendeurs qui posent la tablette horizontalement sur le comptoir toute la journée et veulent un lancement en un tap.
- Owner qui doit installer la caisse rapidement sur plusieurs tablettes (Android en boutique, iPad en test).

## Fonctionnalités clés et expérience
- **Installation "Ajouter à l'écran d'accueil"** sur Android (Chrome) et iPad (Safari) avec :
  - Icône VapePOS violet/rose dédiée (adaptive icon Android + apple-touch-icon iPad).
  - Nom "VapePOS".
  - Splash screen violet/rose au lancement (couleur, logo).
  - Lancement en plein écran, sans barre d'adresse, orientation paysage privilégiée.
- **Bannière d'installation** au premier lancement en navigateur : petit encart discret qui explique en une phrase comment ajouter la caisse à l'écran d'accueil, avec bouton "Installer" natif quand disponible (Android) et instructions visuelles pour iPad (Partager → Sur l'écran d'accueil).
- **Mode kiosque** activable :
  - Verrouillage du geste "retour" navigateur (empêche de sortir accidentellement du POS).
  - Blocage du menu contextuel long-press et du zoom double-tap.
  - Reprise automatique de la session vendeur si la tablette dort et se réveille (le PIN reste demandé après un délai d'inactivité configurable).
  - Écran plein-écran forcé via l'API Fullscreen quand disponible.
- **Wake lock** pour empêcher la tablette de se mettre en veille pendant qu'une session caisse est ouverte.
- **Fallback offline gracieux** : si le réseau tombe, l'écran POS reste lisible avec un bandeau "Hors ligne — vente désactivée" plutôt qu'une page blanche.

## Parcours utilisateur
1. Le vendeur ouvre le lien preview sur la tablette (Chrome Android ou Safari iPad).
2. Une bannière propose "Installer la caisse sur cet écran d'accueil".
3. En un tap (Android) ou 3 taps guidés (iPad), l'icône VapePOS apparaît sur l'écran d'accueil.
4. Il ferme le navigateur.
5. Il tape sur l'icône VapePOS : lancement plein écran, splash violet/rose, écran de choix du profil (Mathis / Emma / Jessica).
6. PIN → choix magasin → caisse.
7. Mode kiosque actif : impossible de sortir par erreur, la tablette ne s'endort pas pendant la session ouverte.

## UI/UX feel
- L'identité violet/rose Cha Va'Pote reste : icône, splash, thème du navigateur (barre système Android).
- La bannière d'installation reprend le langage visuel de la caisse (chip pill, gradient violet, coin arrondi) — pas de pop-up générique.
- Le mode kiosque est invisible pour le vendeur : rien à activer, il s'enclenche automatiquement quand l'app est lancée depuis l'écran d'accueil.
- Sur iPad, comme Safari refuse la vraie fenêtre PWA, on soigne l'expérience "quasi-native" : icône, splash, plein écran via `apple-mobile-web-app-capable`.

## Phases de mise en œuvre
- **Phase 1 – MVP (construit maintenant)**
  - Manifest PWA (nom, icônes multi-tailles, thème, orientation paysage).
  - Icônes VapePOS (192 / 512 / apple-touch).
  - Splash screens iPad (plusieurs tailles requises par Safari) + Android auto-généré.
  - Service Worker minimal (cache app-shell, permet l'installation ; pas de sync offline avancée).
  - Bannière d'installation dans l'app (Android natif + tutoriel iPad).
  - Mode kiosque : verrou back-button, fullscreen, no-zoom, wake lock, verrou du menu contextuel.
  - Instructions courtes affichées dans l'app pour "Comment installer sur ma tablette".
- **Phase 2 – Confort quotidien**
  - Verrouillage automatique après inactivité : ré-affichage de l'écran PIN sans perdre le panier en cours.
  - Détection réseau + bandeau "hors ligne" + désactivation propre du bouton PAIEMENT.
  - Mise à jour transparente de la PWA (bannière discrète "Nouvelle version, redémarrer").
  - Personnalisation par magasin de l'icône ou du nom (Pouzauges vs Chantonnay).
- **Phase 3 – App native store**
  - Wrapper Android (Google Play) et iOS (App Store) pour distribution officielle.
  - Support imprimante thermique Bluetooth au niveau natif.
  - Support scanner code-barres Bluetooth au niveau natif (hors HID clavier).

## Hypothèses
- Le lien à utiliser sur la tablette est le lien preview actuel : `https://vape-register-1.preview.emergentagent.com`. Aucun nouveau nom de domaine n'est mis en place.
- Chrome (Android) et Safari (iPad) sont les navigateurs de référence. Firefox et autres ne sont pas explicitement optimisés dans le MVP.
- Le mode kiosque de niveau OS (verrouillage Android Enterprise, Guided Access iPad) n'est PAS configuré à distance : ce sont des réglages système que l'owner activera manuellement s'il le souhaite. Le MVP fournit uniquement le kiosque logiciel côté app.
- Pas de QR code imprimable généré : l'installation se fait via saisie du lien ou partage direct.
- Le splash utilise les couleurs violet (#8B5CF6) et rose (#EC4899) déjà présentes dans l'identité.
- Aucune permission spéciale demandée (pas de caméra automatique, pas de notifications) au-delà de ce qui existe déjà pour le scanner produit.
- La PWA reste 100 % web : pas de génération d'APK ni de fichier IPA dans cette phase.
