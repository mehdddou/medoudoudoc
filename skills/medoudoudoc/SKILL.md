---
name: medoudoudoc
description: >-
  Produit une documentation professionnelle et illustrée pour une application : guides d'installation,
  d'utilisation, d'administration, de sécurité / conformité et développeur, rédigés en procédures pas à pas,
  avec des captures d'écran annotées de repères numérotés (❶ ❷ ❸) prises automatiquement avec Playwright,
  puis convertis en documents Word soignés (page de garde, sommaire cliquable, en-têtes, figures numérotées).
  Utiliser ce skill dès que l'utilisateur demande une documentation, des procédures, un mode d'emploi, un guide
  utilisateur ou d'installation, un manuel, une notice, « des docs avec des photos / captures », une version Word
  des procédures, ou veut documenter / rendre présentable une application web, même s'il ne précise pas le format.
---

# medoudoudoc — documentation illustrée (Markdown → captures annotées → Word)

Le résultat attendu : des guides **exacts**, **illustrés** et **beaux**, que l'on peut lire sur GitHub (Markdown)
et diffuser ou imprimer (Word). Le Markdown est la **source unique** : les captures et les `.docx` sont régénérés
par des scripts versionnés dans le projet, pour que la documentation reste à jour quand l'application évolue.

Ressources du skill (chemins relatifs au dossier de ce skill) :

| Fichier | Usage |
|---|---|
| `scripts/annoter-captures.cjs` | bibliothèque Playwright : capture + cadres rouges et pastilles numérotées ; code TOTP pour traverser une MFA |
| `assets/captures-modele.cjs` | modèle de script de captures à copier et adapter |
| `scripts/md-vers-word.mjs` | générateur Word à partir des `.md` (paramétré par un JSON) |
| `references/style-redaction.md` | style d'écriture, forme des procédures, plans types des guides, liste de vérification — **à lire avant de rédiger** |
| `references/configuration.md` | format du fichier `word.config.json` et conventions Markdown reconnues |

## Déroulé

### 1. Comprendre l'application et les publics

Avant d'écrire, faire l'inventaire : pages / écrans, rôles et droits, modes d'installation (démo, production,
Docker…), paramètres de configuration (lire le chargeur de configuration et le `.env.example`), intégrations,
mesures de sécurité. Déterminer les publics et donc les guides (voir les plans types dans
`references/style-redaction.md`). Si l'utilisateur ne précise rien : installation, utilisation, administration,
sécurité, développeur — en sautant ceux qui n'ont pas de sens pour l'application.

### 2. Rédiger les guides Markdown (`docs/*.md`)

Suivre `references/style-redaction.md`. Les points qui font la différence :

- procédures numérotées, une action par étape, libellés exacts en **gras**, repères ❶ ❷ cités dans le texte ;
- **vérifier chaque libellé, paramètre, valeur par défaut et chiffre dans le code** (grep) avant de l'écrire —
  une documentation fausse est pire qu'absente ;
- tableaux pour paramètres, rôles, dépannage ; encadrés `>` pour les pièges ; blocs de commandes copiables ;
- images référencées `![Légende courte](images/nom.png)`, au plus près de la procédure qu'elles illustrent.

Écrire d'abord le texte avec les noms d'images prévus, puis produire les captures correspondantes (étape 3) :
c'est le texte qui décide de ce qu'il faut montrer.

### 3. Produire les captures annotées

1. Lancer l'application avec des **données de démonstration** réalistes (jamais de données réelles).
2. Vérifier Playwright : `node -e "require('playwright')"` ; sinon `npm i -D playwright && npx playwright install chromium`
   (si un Chromium est déjà installé ailleurs, ne pas en télécharger un autre).
3. Copier `scripts/annoter-captures.cjs` et `assets/captures-modele.cjs` dans le projet, par exemple
   `scripts/docs/annoter-captures.cjs` et `scripts/docs/captures.cjs`, puis écrire une capture par image du texte :

   ```js
   await atelier.capture('inventaire', {
     chemin: '/inventaire', attendre: 'table',
     reperes: [{ n: 1, cible: 'nav.types' }, { n: 2, cible: 'button:has-text("Ajouter")', cote: 'droite' }],
   });
   ```

   `avant: async (page) => {…}` sert à ouvrir un formulaire, faire défiler (`scrollIntoViewIfNeeded` puis
   `window.scrollBy(0, -90)` pour ne pas passer sous une barre fixe), saisir une recherche, etc. Un repère
   hors de l'écran est signalé par un avertissement « hors de l'écran » : ajouter `defiler: true` sur ce repère
   (ou réduire le nombre de repères de la capture) plutôt que livrer une image où il manque. Pour une
   application protégée par une double authentification TOTP, `codeTotp(secret)` calcule le code.
4. Lancer le script, puis **regarder chaque image** (ou une planche contact) : corriger repères décalés, pages en
   chargement, défilement hérité, éléments masqués, puis relancer. Les sélecteurs fragiles sont la première cause
   d'échec : préférer `button:has-text("…")`, `[aria-label=…]`, des classes stables.
5. Rendre le script **relançable** (idempotent) : une capture qui crée des données doit d'abord vérifier
   qu'elles n'existent pas déjà, ou nettoyer les doublons.

### 4. Générer les documents Word

1. Copier `scripts/md-vers-word.mjs` dans le projet (ex. `scripts/docs/md-vers-word.mjs`) et installer ses
   dépendances : `npm i -D docx marked`. (Il doit vivre dans le projet pour trouver ces modules.)
2. Créer `docs/word.config.json` d'après `references/configuration.md` : nom, couleur, logo PNG, et une entrée par
   guide avec titre, public et résumé de page de garde.
3. Ajouter les scripts npm : `"docs:captures": "node scripts/docs/captures.cjs"`,
   `"docs:word": "node scripts/docs/md-vers-word.mjs docs/word.config.json"`, puis `npm run docs:word`.

### 5. Vérifier comme un relecteur

- Valider chaque `.docx` (si le skill `docx` est disponible : `scripts/office/validate.py fichier.docx`).
- **Rendre et regarder** : `soffice --headless --convert-to pdf --outdir <dossier> fichier.docx` puis
  `pdftoppm -jpeg -r 50 fichier.pdf page` ; assembler les pages en planche contact (Pillow) et vérifier page de
  garde, sommaire, images entières (pas tronquées), tableaux lisibles, numérotation des listes.
- Relire la liste de vérification de `references/style-redaction.md` (§ 6).

### 6. Raccorder au projet

- README : tableau des guides avec liens vers le `.md` **et** le `.docx`.
- Guide développeur : comment régénérer captures et Word, et rappel « ne pas modifier les `.docx` à la main ».
- Remettre les `.docx` à l'utilisateur et lui dire ce qui n'a pas pu être vérifié (écran inaccessible sans
  matériel réel, fonctionnalité non testée…).

## Points d'attention

- **Une capture par intention** : mieux vaut trois captures ciblées qu'une page entière illisible réduite à 17 cm.
- **Cohérence texte / image** : si un repère change de numéro dans le script, changer le texte, et inversement.
- **Pas de secrets** dans les captures (jetons, mots de passe, adresses internes réelles) : données de démonstration.
- **Dates** : les captures et la page de garde portent la date du jour ; régénérer tout ensemble avant diffusion.
- Si l'application change d'apparence, régénérer les captures **avant** les `.docx`.
