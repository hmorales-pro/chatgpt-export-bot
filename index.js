import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Utiliser le plugin stealth pour éviter la détection de bot
puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_DIR = path.join(__dirname, 'exports');
const SESSION_FILE = path.join(__dirname, 'session.json');
const TEMP_PROFILE_DIR = path.join(__dirname, 'chrome-profile');
const CHATGPT_URL = 'https://chatgpt.com';

// Chemin vers le profil Chrome de l'utilisateur
const USER_CHROME_PROFILE = process.env.CHROME_PROFILE_PATH ||
  (process.platform === 'darwin'
    ? path.join(process.env.HOME, 'Library/Application Support/Google/Chrome')
    : process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/User Data')
    : path.join(process.env.HOME, '.config/google-chrome'));

// Créer le dossier d'export s'il n'existe pas
await fs.mkdir(EXPORT_DIR, { recursive: true });

/**
 * Attendre que l'utilisateur se connecte manuellement
 */
async function waitForManualLogin(page) {
  console.log('\n🔐 Veuillez vous connecter à ChatGPT dans le navigateur qui vient de s\'ouvrir...');
  console.log('⏳ Le bot attendra que vous soyez connecté et sur la page principale.\n');

  // Attendre que l'URL contienne 'chat' ou que la page principale soit chargée
  await page.waitForFunction(() => {
    return window.location.href.includes('/c/') ||
           document.querySelector('[data-testid="conversation-turn"]') !== null ||
           document.querySelector('nav') !== null;
  }, { timeout: 300000 }); // 5 minutes max

  console.log('✅ Connexion détectée!\n');

  // Sauvegarder la session
  const cookies = await page.cookies();
  await fs.writeFile(SESSION_FILE, JSON.stringify(cookies, null, 2));
  console.log('💾 Session sauvegardée.\n');
}

/**
 * Charger une session existante
 */
async function loadSession(page) {
  try {
    const cookiesString = await fs.readFile(SESSION_FILE, 'utf-8');
    const cookies = JSON.parse(cookiesString);
    await page.setCookie(...cookies);
    console.log('✅ Session chargée depuis le fichier.\n');
    return true;
  } catch (error) {
    console.log('ℹ️  Aucune session trouvée, connexion manuelle requise.\n');
    return false;
  }
}

/**
 * Récupérer la liste de toutes les conversations
 */
async function getAllConversations(page) {
  console.log('📋 Récupération de la liste des conversations...\n');

  // Attendre que la navigation soit stable
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Attendre que la barre de navigation soit chargée
  try {
    await page.waitForSelector('nav', { timeout: 10000 });
    console.log('✅ Navigation détectée\n');
  } catch (error) {
    console.log('⚠️  Barre de navigation non détectée, tentative de récupération...\n');
  }

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Extraire les conversations de la barre latérale
  const convLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('nav a[href^="/c/"]'));
    return links.map(link => ({
      id: link.getAttribute('href').replace('/c/', ''),
      url: link.href,
      title: link.textContent.trim() || 'Sans titre'
    }));
  });

  console.log(`✅ ${convLinks.length} conversations trouvées.\n`);
  return convLinks;
}

/**
 * Exporter une conversation au format JSON
 */
async function exportConversation(page, conversation, index, total) {
  console.log(`[${index}/${total}] Export: ${conversation.title}`);

  try {
    // Aller sur la conversation
    await page.goto(conversation.url, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Extraire le contenu de la conversation
    const conversationData = await page.evaluate(() => {
      const messages = [];
      const turns = document.querySelectorAll('[data-testid^="conversation-turn"]');

      turns.forEach((turn) => {
        const role = turn.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role') || 'unknown';
        const content = turn.querySelector('.whitespace-pre-wrap')?.textContent || '';

        messages.push({
          role: role,
          content: content.trim(),
          timestamp: new Date().toISOString()
        });
      });

      return {
        title: document.title,
        messages: messages
      };
    });

    // Sauvegarder dans un fichier JSON
    const filename = `${conversation.id}.json`;
    const filepath = path.join(EXPORT_DIR, filename);

    const exportData = {
      id: conversation.id,
      title: conversation.title,
      url: conversation.url,
      exportDate: new Date().toISOString(),
      ...conversationData
    };

    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
    console.log(`  ✅ Exporté: ${filename}\n`);

    return true;
  } catch (error) {
    console.error(`  ❌ Erreur lors de l'export: ${error.message}\n`);
    return false;
  }
}

/**
 * Créer une archive finale
 */
async function createArchive() {
  console.log('📦 Création de l\'archive finale...\n');

  const files = await fs.readdir(EXPORT_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const allConversations = [];

  for (const file of jsonFiles) {
    const content = await fs.readFile(path.join(EXPORT_DIR, file), 'utf-8');
    allConversations.push(JSON.parse(content));
  }

  const archive = {
    exportDate: new Date().toISOString(),
    totalConversations: allConversations.length,
    conversations: allConversations
  };

  const archivePath = path.join(__dirname, `chatgpt-export-${Date.now()}.json`);
  await fs.writeFile(archivePath, JSON.stringify(archive, null, 2));

  console.log(`✅ Archive créée: ${path.basename(archivePath)}\n`);
  console.log(`📊 Total: ${allConversations.length} conversations exportées.\n`);
}

/**
 * Fonction principale
 */
async function main() {
  console.log('🤖 ChatGPT Export Bot - Démarrage...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: TEMP_PROFILE_DIR,
    args: [
      '--start-maximized',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  try {
    // Charger les cookies sauvegardés
    const sessionLoaded = await loadSession(page);

    if (!sessionLoaded) {
      console.log('❌ Aucune session trouvée!\n');
      console.log('📝 Vous devez d\'abord importer vos cookies:\n');
      console.log('   1. Installez l\'extension Cookie-Editor dans Chrome: https://cookie-editor.com/');
      console.log('   2. Allez sur https://chatgpt.com et connectez-vous');
      console.log('   3. Cliquez sur Cookie-Editor et exportez les cookies');
      console.log('   4. Sauvegardez-les dans cookies-export.json');
      console.log('   5. Lancez: npm run import-cookies');
      console.log('   6. Relancez: npm start\n');
      console.log('⏸️  OU si vous voulez vous connecter manuellement maintenant:\n');
      console.log('   Le bot attendra 2 minutes que vous vous connectiez...\n');

      await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });
      await waitForManualLogin(page);
    } else {
      console.log('🌐 Accès à ChatGPT avec votre session...\n');
      await page.goto(CHATGPT_URL, { waitUntil: 'domcontentloaded' });
      console.log('✅ Page chargée\n');
      console.log('⏳ Attendez 30 secondes pour:\n');
      console.log('   1. Vérifier que vous êtes connecté');
      console.log('   2. Sélectionner votre workspace "Eziom" si nécessaire');
      console.log('   3. Laisser la page se charger complètement\n');
      console.log('⏰ Démarrage de l\'export dans 30 secondes...\n');

      // Attendre 30 secondes pour laisser le temps de charger le workspace
      await new Promise(resolve => setTimeout(resolve, 30000));
    }

    // Récupérer toutes les conversations (inclut son propre délai)
    const conversations = await getAllConversations(page);

    if (conversations.length === 0) {
      console.log('⚠️  Aucune conversation trouvée.\n');
      return;
    }

    // Exporter chaque conversation
    let successCount = 0;
    for (let i = 0; i < conversations.length; i++) {
      const success = await exportConversation(page, conversations[i], i + 1, conversations.length);
      if (success) successCount++;

      // Petite pause entre chaque export
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✅ Export terminé: ${successCount}/${conversations.length} conversations exportées.\n`);

    // Créer l'archive finale
    await createArchive();

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
    console.log('🏁 Bot terminé.\n');
  }
}

main().catch(console.error);
