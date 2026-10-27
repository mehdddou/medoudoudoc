/**
 * annoter-captures : petites fonctions Playwright pour produire des captures d'écran de documentation
 * avec des repères numérotés (cadre rouge + pastille ❶ ❷ ❸…), cités ensuite dans le texte des guides.
 *
 *   const { creerAtelier } = require('./annoter-captures.cjs');
 *   const atelier = await creerAtelier({ base: 'http://localhost:3000', sortie: 'docs/images' });
 *   await atelier.capture('tableau-de-bord', { hash: 'dashboard', attendre: '.kpis',
 *     reperes: [{ n: 1, cible: 'nav' }, { n: 2, cible: 'button:has-text("Ajouter")', cote: 'droite' }] });
 *   await atelier.fermer();
 *
 * Nécessite Playwright avec Chromium dans le projet (npm i -D playwright && npx playwright install chromium),
 * ou le Playwright installé globalement.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function chargerPlaywright() {
  for (const from of [process.cwd(), __dirname]) {
    try {
      return require(require.resolve('playwright', { paths: [from] }));
    } catch { /* essai suivant */ }
  }
  return require('playwright'); // NODE_PATH ou installation globale
}

/** Pose un cadre et une pastille numérotée sur chaque élément (sélecteur Playwright, ou fonction (page) => locator). */
async function poserReperes(page, reperes) {
  // 1er temps : attendre chaque élément et faire les défilements demandés (ils déplacent les autres éléments)
  const elements = [];
  for (const r of reperes) {
    const loc = typeof r.cible === 'string' ? page.locator(r.cible).first() : r.cible(page);
    // échec rapide et lisible plutôt que l'attente de 30 s de Playwright
    const visible = await loc.waitFor({ state: 'visible', timeout: r.delai ?? 5000 }).then(() => true, () => false);
    if (!visible) throw new Error(`Repère ${r.n} : élément introuvable ou invisible après ${(r.delai ?? 5000) / 1000} s (${r.cible}). Vérifier le sélecteur ou attendre l'élément avec « attendre » / « avant ».`);
    if (r.defiler) await loc.scrollIntoViewIfNeeded();
    elements.push({ r, loc });
  }
  // 2e temps : mesurer toutes les positions, une fois la page immobile
  const boites = [];
  for (const { r, loc } of elements) {
    const b = await loc.boundingBox();
    if (!b) throw new Error(`Repère ${r.n} : élément sans position mesurable (${r.cible}).`);
    const vue = page.viewportSize();
    if (vue && (b.y + b.height < 0 || b.y > vue.height || b.x + b.width < 0 || b.x > vue.width)) {
      // la capture ne montre que l'écran : un repère hors champ serait absent de l'image
      console.warn(`ATTENTION repère ${r.n} hors de l'écran (${r.cible}) : ajouter « defiler: true » ou faire défiler dans « avant ».`);
    }
    boites.push({ ...b, n: r.n, marge: r.marge ?? 4, cote: r.cote === 'droite' ? 'droite' : 'gauche' });
  }
  await page.evaluate((boites) => {
    const calque = document.createElement('div');
    calque.id = 'reperes-doc';
    calque.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    for (const b of boites) {
      const cadre = document.createElement('div');
      cadre.style.cssText = `position:fixed;left:${b.x - b.marge}px;top:${b.y - b.marge}px;width:${b.width + 2 * b.marge}px;height:${b.height + 2 * b.marge}px;`
        + 'border:2.5px solid #e11d48;border-radius:9px;box-shadow:0 0 0 4px rgba(225,29,72,.15)';
      const pastille = document.createElement('div');
      const gauche = b.cote === 'droite' ? b.x + b.width + b.marge - 13 : b.x - b.marge - 13;
      pastille.textContent = String(b.n);
      pastille.style.cssText = `position:fixed;left:${Math.max(2, gauche)}px;top:${Math.max(2, b.y - b.marge - 13)}px;width:26px;height:26px;border-radius:50%;`
        + 'background:#e11d48;color:#fff;font:700 14px/26px system-ui,sans-serif;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.35);border:2px solid #fff';
      calque.append(cadre, pastille);
    }
    document.body.append(calque);
  }, boites);
}

async function retirerReperes(page) {
  await page.evaluate(() => document.getElementById('reperes-doc')?.remove());
}

/** Code TOTP courant (RFC 6238), pour traverser une double authentification par application pendant les captures. */
function codeTotp(secretBase32, decalage = 0) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let v = 0;
  const cle = [];
  for (const c of secretBase32.replace(/\s/g, '').toUpperCase()) {
    v = (v << 5) | A.indexOf(c);
    bits += 5;
    if (bits >= 8) { cle.push((v >>> (bits - 8)) & 255); bits -= 8; }
  }
  const compteur = Buffer.alloc(8);
  compteur.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + decalage));
  const h = crypto.createHmac('sha1', Buffer.from(cle)).update(compteur).digest();
  const o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
}

/**
 * Ouvre un navigateur et renvoie un « atelier » de capture.
 * options : base (URL de l'application), sortie (dossier des PNG), largeur/hauteur (1440×900 par défaut),
 * theme ('light' | 'dark'), locale ('fr-FR').
 */
async function creerAtelier({ base, sortie, largeur = 1440, hauteur = 900, theme = 'light', locale = 'fr-FR' }) {
  const { chromium } = chargerPlaywright();
  fs.mkdirSync(sortie, { recursive: true });
  const navigateur = await chromium.launch();
  const contexte = await navigateur.newContext({ viewport: { width: largeur, height: hauteur }, colorScheme: theme, locale });
  const page = await contexte.newPage();
  page.on('dialog', (d) => d.accept());

  /**
   * Capture une page. options :
   * - chemin : chemin à ouvrir (« /inventaire »), ou hash : route après « #/ » (applications à routage par hash) ;
   * - attendre : sélecteur à attendre avant la capture (null pour ne rien attendre) ;
   * - avant : async () => {…} actions préalables (ouvrir un formulaire, faire défiler, saisir…) ;
   * - reperes : [{ n, cible, cote?, marge?, defiler?, delai? }] — defiler : amène l'élément à l'écran avant la mesure ;
   * - pleinePage : capture de toute la hauteur.
   */
  async function capture(nom, { chemin, hash, attendre = 'body', avant, reperes = [], pleinePage = false, pause = 700 } = {}) {
    if (chemin !== undefined || hash !== undefined) {
      await page.goto(hash !== undefined ? `${base}/#/${hash}` : `${base}${chemin}`);
      await page.evaluate(() => window.scrollTo(0, 0)); // une navigation par # conserve le défilement précédent
    }
    if (attendre) await page.waitForSelector(attendre);
    await page.waitForTimeout(pause); // animations, polices, graphiques
    if (avant) await avant(page);
    if (reperes.length) await poserReperes(page, reperes);
    const fichier = path.join(sortie, `${nom}.png`);
    await page.screenshot({ path: fichier, fullPage: pleinePage });
    await retirerReperes(page);
    console.log('capture', fichier);
    return fichier;
  }

  return { page, contexte, navigateur, capture, poserReperes: (r) => poserReperes(page, r), retirerReperes: () => retirerReperes(page), fermer: () => navigateur.close() };
}

module.exports = { creerAtelier, poserReperes, retirerReperes, codeTotp };
