# Style de rédaction et plans types

## Sommaire
1. Principes
2. Écrire une procédure
3. Repères numérotés et captures
4. Tableaux, encadrés, blocs de commandes
5. Plans types des guides
6. Liste de vérification avant livraison

## 1. Principes

- **Écrire pour le lecteur du guide, pas pour le développeur.** Un administrateur système veut des commandes et des
  paramètres ; un utilisateur métier veut savoir où cliquer et ce qu'il va voir ; un RSSI veut savoir ce qui est
  protégé et ce qui reste à sa charge. Un guide par public.
- **Langue de l'utilisateur** (souvent le français) : phrases courtes, vocabulaire de l'interface tel qu'il est
  affiché, typographie française (espace avant « : ; ? ! », guillemets « », apostrophe ’ ou ').
- **Exact avant tout.** Chaque libellé de bouton, nom de menu, paramètre, valeur par défaut, délai ou chiffre cité
  doit être vérifié dans le code (grep du texte du bouton, lecture de la configuration). Un guide qui annonce un
  bouton qui n'existe pas ou une durée fausse perd immédiatement la confiance du lecteur. Si une affirmation ne peut
  pas être vérifiée, la retirer plutôt que la deviner.
- **Montrer, puis expliquer.** Une capture annotée vaut un paragraphe ; le texte dit l'ordre des actions et
  pourquoi.
- **Pas de remplissage** : ni « Dans ce chapitre, nous allons voir… », ni conclusion qui répète. Une phrase
  d'introduction utile par chapitre suffit.

## 2. Écrire une procédure

Forme recommandée :

```markdown
### 2.3 Importer un inventaire Excel

C'est la méthode la plus rapide pour démarrer : chaque équipe remplit un classeur, puis vous l'importez.

![Page Données](images/donnees.png)

1. Ouvrez **Données** et cliquez sur ❷ **Modèle vierge** : un classeur avec une feuille par type est téléchargé.
2. Faites-le compléter par les équipes.
3. Cliquez sur ❸ **Importer un inventaire Excel…** et choisissez le fichier.
4. Lisez l'**aperçu**, puis cliquez sur **Appliquer**.

> Si deux objets portent le même nom, l'export les écrit `nom [identifiant]` : gardez cette forme.
```

- Titre = l'objectif de l'utilisateur, à l'infinitif (« Importer un inventaire », pas « Import »).
- Étapes numérotées, une action par étape, à l'impératif ; le libellé exact en **gras** ; le résultat attendu
  quand il n'est pas évident (« un classeur est téléchargé »).
- Les pièges et prérequis en encadré (`>`), juste à l'endroit où ils servent.
- Une liste numérotée peut reprendre après une capture : écrire `4.` à la reprise, le générateur Word respecte le
  numéro de départ.

## 3. Repères numérotés et captures

- Utiliser les caractères ❶ ❷ ❸ ❹ ❺ ❻ ❼ ❽ ❾ ❿ dans le texte ; la capture porte les mêmes numéros (pastilles
  rouges posées par `annoter-captures.cjs`).
- 2 à 5 repères par capture ; au-delà, faire deux captures.
- La légende (texte alternatif de l'image) devient « Figure n — légende » dans Word : l'écrire comme un titre
  court (« Formulaire de création »).
- Captures en 1440×900, thème clair, données de démonstration réalistes (jamais de données réelles ni de secrets).
- Après chaque capture, la **regarder** : repère au mauvais endroit, page encore en chargement, défilement hérité
  de la page précédente, fenêtre modale qui masque l'élément… sont fréquents.
- Un tableau « Repère / Élément / À quoi il sert » sous une capture d'écran principal aide à la prise en main.

## 4. Tableaux, encadrés, blocs de commandes

- **Tableaux** pour les paramètres (Paramètre | Défaut | Description), les rôles (Rôle | Ce qu'il permet),
  le dépannage (Symptôme | Cause probable | Solution), les correspondances (exigence → mesure).
- **Encadrés** (`> …`) : en orange dans Word s'ils commencent par ⚠️ ou 🔑 ou contiennent « Attention » /
  « Important » ; sinon en bleu (information).
- **Blocs de commandes** (```` ``` ````) : commandes réelles, copiables telles quelles ; commentaires `#` pour
  expliquer ; valeurs à remplacer écrites `<comme-ceci>`.
- Liens : les liens web restent cliquables dans Word ; les liens entre guides (`[…](AUTRE.md)`) deviennent du texte :
  écrire aussi le nom du guide en clair (« voir le *Guide d'administration* »).

## 5. Plans types des guides

Adapter à l'application ; ne garder que les guides utiles.

**Installation** (administrateurs système) : prérequis (tableau) · essai rapide / démonstration · installation de
production pas à pas · publication HTTPS · authentification (SSO, annuaire, double authentification) · composants
annexes (agents, sondes) · mise à jour · sauvegarde et restauration · supervision · dépannage (tableau) · référence
complète des paramètres (tableaux par thème).

**Utilisation** (utilisateurs) : premiers pas (connexion, repères de l'écran principal, recherche, compte) · rôles ·
concepts clés · un chapitre par grande tâche, avec captures annotées · récapitulatif des exports · parcours type
(« une première … en une semaine ») · questions fréquentes.

**Administration** (administrateurs fonctionnels) : comptes et rôles · sécurité (MFA, journal, revue des accès) ·
intégrations · tâches périodiques (tableau fréquence / action) · rapports.

**Sécurité / conformité** (RSSI, auditeurs) : liste de contrôle de mise en production (cases à cocher) · mesures
mises en œuvre · données traitées (tableau) · flux réseau (tableau source / destination / port / usage) ·
correspondance avec un référentiel (NIS2, ISO 27001, ANSSI) en séparant « ce que fait l'application » et « ce qui
reste à la charge de l'organisation » · limites connues · signalement des vulnérabilités.

**Développeur** : démarrage en développement · organisation du code (arborescence commentée) · circulation des
données · recettes pas à pas (« ajouter un champ / une page / une route / un test ») · conventions · régénérer la
documentation et les captures.

## 6. Liste de vérification avant livraison

- [ ] Chaque libellé, paramètre, défaut, délai cité est vérifié dans le code.
- [ ] Chaque image référencée existe ; chaque repère cité dans le texte existe sur la capture.
- [ ] Les captures ont été regardées une à une (pas de page en chargement, de repère décalé, de donnée sensible).
- [ ] Les documents Word passent la validation et ont été rendus en images puis relus (page de garde, sommaire,
      tableaux lisibles, images entières, numérotation des listes).
- [ ] Le README renvoie vers chaque guide (Markdown et Word).
- [ ] Les commandes de régénération (captures, Word) sont documentées pour les développeurs.
