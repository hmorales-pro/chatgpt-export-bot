import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_FILE = path.join(__dirname, 'session.json');

/**
 * Script pour importer manuellement vos cookies ChatGPT
 *
 * COMMENT EXPORTER VOS COOKIES DEPUIS CHROME:
 *
 * 1. Installez l'extension "EditThisCookie" ou "Cookie-Editor"
 *    - EditThisCookie: https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg
 *    - Cookie-Editor: https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm
 *
 * 2. Allez sur https://chatgpt.com et connectez-vous
 *
 * 3. Cliquez sur l'icône de l'extension dans la barre d'outils
 *
 * 4. Exportez tous les cookies (généralement un bouton "Export" ou icône de téléchargement)
 *
 * 5. Copiez le JSON exporté dans un fichier nommé "cookies-export.json" dans ce dossier
 *
 * 6. Lancez ce script: node import-cookies.js
 */

async function importCookies() {
  try {
    console.log('🍪 Import des cookies ChatGPT...\n');

    // Lire le fichier de cookies exporté
    const cookiesExportPath = path.join(__dirname, 'cookies-export.json');

    try {
      const cookiesData = await fs.readFile(cookiesExportPath, 'utf-8');
      let cookies = JSON.parse(cookiesData);

      // Certaines extensions exportent un tableau, d'autres un objet
      if (!Array.isArray(cookies)) {
        console.log('⚠️  Format de cookies détecté: objet au lieu de tableau');
        console.log('   Tentative de conversion...\n');

        // Si c'est un objet avec des cookies, on les extrait
        if (cookies.cookies) {
          cookies = cookies.cookies;
        } else {
          // Sinon on convertit l'objet en tableau
          cookies = Object.entries(cookies).map(([name, value]) => ({
            name,
            value: typeof value === 'object' ? value.value : value,
            domain: '.chatgpt.com',
            path: '/',
            secure: true,
            httpOnly: false
          }));
        }
      }

      // Normaliser le format des cookies pour Puppeteer
      const normalizedCookies = cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain || '.chatgpt.com',
        path: cookie.path || '/',
        expires: cookie.expirationDate || cookie.expires || -1,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure !== false,
        sameSite: cookie.sameSite || 'Lax'
      }));

      // Sauvegarder dans session.json
      await fs.writeFile(SESSION_FILE, JSON.stringify(normalizedCookies, null, 2));

      console.log(`✅ ${normalizedCookies.length} cookies importés avec succès!\n`);
      console.log(`💾 Sauvegardés dans: ${SESSION_FILE}\n`);
      console.log('🚀 Vous pouvez maintenant lancer le bot: npm start\n');

      // Afficher quelques cookies importés (sans les valeurs sensibles)
      console.log('📋 Cookies importés:');
      normalizedCookies.forEach(c => {
        console.log(`   - ${c.name} (${c.domain})`);
      });

    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error('❌ Fichier "cookies-export.json" non trouvé!\n');
        console.log('📝 Instructions:\n');
        console.log('1. Installez une extension de gestion de cookies dans Chrome:');
        console.log('   - EditThisCookie: https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg');
        console.log('   - Cookie-Editor: https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm\n');
        console.log('2. Allez sur https://chatgpt.com et connectez-vous\n');
        console.log('3. Cliquez sur l\'icône de l\'extension et exportez les cookies\n');
        console.log('4. Sauvegardez le JSON exporté dans un fichier nommé "cookies-export.json"');
        console.log('   dans ce dossier: ' + __dirname + '\n');
        console.log('5. Relancez ce script: node import-cookies.js\n');
      } else {
        throw error;
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

importCookies();
