# Configuration de md-vers-word.mjs

Fichier JSON (par défaut `docs/word.config.json`, ou chemin passé en argument). Les chemins sont relatifs au
fichier de configuration.

```json
{
  "docsDir": ".",
  "outDir": "word",
  "regenerateCommand": "npm run docs:word",
  "brand": {
    "name": "MonAppli",
    "tagline": "Gestion des interventions techniques",
    "color": "#4F46E5",
    "colorDark": "#312E81",
    "logo": "images/logo.png",
    "font": "Calibri"
  },
  "guides": [
    {
      "src": "INSTALLATION.md",
      "out": "MonAppli - Guide d installation.docx",
      "title": "Guide d'installation",
      "audience": "Administrateurs système",
      "summary": "Installation de démonstration et de production, HTTPS, sauvegardes, mise à jour et dépannage."
    },
    {
      "src": "SECURITE.md",
      "out": "MonAppli - Dossier de securite.docx",
      "title": "Dossier de sécurité",
      "audience": "RSSI, auditeurs",
      "summary": "Mesures de sécurité, données traitées et flux réseau.",
      "breakSections": false
    }
  ]
}
```

| Clé | Rôle |
|---|---|
| `docsDir` | dossier des `.md` ; les images `![…](images/x.png)` sont résolues depuis ce dossier |
| `outDir` | dossier des `.docx` produits |
| `regenerateCommand` | commande rappelée sur la page de garde (« ne pas modifier ce fichier… ») |
| `brand.name` / `tagline` | nom et sous-titre sur la page de garde ; nom dans l'en-tête de chaque page |
| `brand.color` / `colorDark` | couleur des titres, en-têtes de tableaux, puces (hexadécimal) |
| `brand.logo` | PNG carré (≈ 256 px) affiché sur la page de garde ; facultatif |
| `brand.font` | police du corps (Calibri par défaut, présente partout avec Office) |
| `guides[].src` / `out` | source Markdown et nom du fichier Word (éviter accents et apostrophes dans les noms de fichiers) |
| `guides[].title` / `audience` / `summary` | page de garde |
| `guides[].breakSections` | `false` : pas de saut de page avant chaque titre `##` (guides courts) |

Conventions Markdown reconnues :

- `# Titre` (un seul, en tête) : ignoré dans le corps (le titre est sur la page de garde) ;
- `##` → Titre 1 (nouvelle page sauf `breakSections: false`), `###` → Titre 2, `####` → Titre 3 ; `##` et `###`
  alimentent le sommaire cliquable ;
- paragraphe ne contenant qu'une image → image centrée, largeur ≤ 17 cm, légende « Figure n — texte alternatif » ;
- `> …` → encadré (orange si ⚠ / 🔑 / « Attention » / « Important », sinon bleu) ;
- blocs ```` ``` ```` → fond sombre, police à chasse fixe, lignes `#` en gris ;
- tableaux → en-tête coloré, lignes alternées, largeurs de colonnes calculées d'après le contenu ;
- listes numérotées → le numéro de départ est respecté (reprise après une image) ;
- HTML brut → ignoré.

Logo : s'il n'existe qu'en SVG, le convertir une fois en PNG (par exemple avec Playwright :
`page.setContent('<svg …>')` puis `locator('svg').screenshot({ omitBackground: true })`).
