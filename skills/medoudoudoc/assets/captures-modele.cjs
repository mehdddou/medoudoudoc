/**
 * Captures d'écran annotées de la documentation (docs/images/*.png).
 * Modèle à copier dans le projet (scripts/docs/captures.cjs) puis à adapter : une ligne capture(...) par illustration.
 *
 * Prérequis : l'application lancée avec des données de démonstration, et Playwright + Chromium.
 *   APP_URL=http://localhost:3000 node scripts/docs/captures.cjs
 *
 * Chaque repère numéroté posé ici est cité dans le texte du guide (❶, ❷…) : garder les deux synchronisés.
 */
const path = require('path');
const { creerAtelier } = require('./annoter-captures.cjs');

const BASE = process.env.APP_URL || 'http://localhost:3000';
const SORTIE = path.resolve(__dirname, '../../docs/images');
const IDENTIFIANT = process.env.APP_USER || 'admin@exemple.local';
const MOT_DE_PASSE = process.env.APP_PASSWORD || 'mot-de-passe-de-demo';

(async () => {
  const a = await creerAtelier({ base: BASE, sortie: SORTIE });
  const p = a.page;

  // ── Connexion (capturée, puis effectuée) ─────────────────────────────────
  await a.capture('connexion', {
    chemin: '/', attendre: 'input[type=password]',
    reperes: [{ n: 1, cible: 'input[type=email], input[name=username]' }, { n: 2, cible: 'input[type=password]' }, { n: 3, cible: 'button[type=submit]' }],
  });
  await p.fill('input[type=email], input[name=username]', IDENTIFIANT);
  await p.fill('input[type=password]', MOT_DE_PASSE);
  await p.click('button[type=submit]');
  await p.waitForLoadState('networkidle');

  // ── Écran principal ───────────────────────────────────────────────────────
  await a.capture('ecran-principal', {
    chemin: '/', attendre: 'main',
    reperes: [{ n: 1, cible: 'nav' }, { n: 2, cible: 'main h1' }],
  });

  // ── Un formulaire ouvert ──────────────────────────────────────────────────
  // await a.capture('formulaire-creation', {
  //   chemin: '/elements', attendre: 'table',
  //   avant: async (page) => { await page.click('button:has-text("Ajouter")'); await page.waitForSelector('[role=dialog]'); },
  //   reperes: [{ n: 1, cible: '[role=dialog] input >> nth=0' }, { n: 2, cible: '[role=dialog] button:has-text("Enregistrer")', cote: 'droite' }],
  // });

  // ── Thème sombre (nouvelle page avec l'autre thème) ───────────────────────
  // const sombre = await creerAtelier({ base: BASE, sortie: SORTIE, theme: 'dark' }); …

  await a.fermer();
})().catch((e) => { console.error(e); process.exit(1); });
