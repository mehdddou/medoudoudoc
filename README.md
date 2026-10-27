# medoudoudoc

Skill pour **Claude Code** qui produit une documentation professionnelle et **illustrée** pour une application web :

- des guides **Markdown** rédigés en procédures pas à pas (installation, utilisation, administration,
  sécurité / conformité, développeur), dont chaque libellé et paramètre est vérifié dans le code ;
- des **captures d'écran annotées** de repères numérotés ❶ ❷ ❸, prises automatiquement avec Playwright et
  citées dans le texte ;
- des **documents Word** soignés générés à partir du Markdown : page de garde (logo, titre, résumé, public, date),
  sommaire cliquable, en-tête et pied de page numéroté, tableaux à en-tête coloré, blocs de commandes, encadrés,
  figures numérotées ;
- une **vérification** finale : validation des `.docx`, rendu des pages en images et relecture.

Le Markdown reste la source unique : captures et `.docx` se régénèrent par des scripts versionnés dans votre projet.

## Installation

### Comme plugin (recommandé)

Dans une session Claude Code :

```
/plugin marketplace add mehdddou/medoudoudoc
/plugin install medoudoudoc@medoudoudoc
```

ou depuis un terminal :

```
claude plugin marketplace add mehdddou/medoudoudoc
claude plugin install medoudoudoc@medoudoudoc --scope user
```

### À la main

Copier uniquement le dossier du skill dans vos skills personnels :

```
git clone https://github.com/mehdddou/medoudoudoc.git
mkdir -p ~/.claude/skills/medoudoudoc
cp -r medoudoudoc/skills/medoudoudoc/. ~/.claude/skills/medoudoudoc/
```

Ou dans un seul projet : `<projet>/.claude/skills/medoudoudoc/`.

## Utilisation

Le skill se déclenche tout seul quand vous demandez une documentation, par exemple :

> Fais-moi une documentation complète de cette appli avec des captures d'écran et une version Word.

> Écris le guide d'installation et le guide utilisateur, illustrés, au format Word.

On peut aussi l'appeler explicitement : `/medoudoudoc:medoudoudoc` (installé comme plugin) ou `/medoudoudoc`
(installé à la main).

## Contenu

| Fichier | Rôle |
|---|---|
| `skills/medoudoudoc/SKILL.md` | la méthode, étape par étape |
| `skills/medoudoudoc/scripts/annoter-captures.cjs` | captures Playwright avec cadres et pastilles numérotées ; code TOTP pour traverser une double authentification |
| `skills/medoudoudoc/assets/captures-modele.cjs` | modèle de script de captures à adapter |
| `skills/medoudoudoc/scripts/md-vers-word.mjs` | générateur Word paramétrable (nom, couleur, logo, liste des guides) |
| `skills/medoudoudoc/references/style-redaction.md` | style d'écriture, forme des procédures, plans types, liste de vérification |
| `skills/medoudoudoc/references/configuration.md` | format de `word.config.json` et conventions Markdown reconnues |

## Prérequis dans le projet documenté

- Node.js 18+ ;
- captures : `playwright` avec Chromium (`npm i -D playwright && npx playwright install chromium`) ;
- Word : `docx` et `marked` (`npm i -D docx marked`) ;
- vérification (facultatif) : LibreOffice (`soffice`) et Poppler (`pdftoppm`) pour rendre les pages en images.
