import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORT_DIR = path.join(__dirname, 'exports');

// Configuration Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyser une conversation avec Claude pour extraire des tags
 */
async function analyzeConversation(conversation) {
  try {
    // Préparer un résumé de la conversation (max 10 premiers messages)
    const messageSample = conversation.messages
      .slice(0, 10)
      .map(m => `${m.role}: ${m.content.substring(0, 200)}`)
      .join('\n\n');

    const prompt = `Analyse cette conversation ChatGPT et fournis 3-5 tags courts (1-2 mots) décrivant les sujets principaux abordés.

Conversation:
Titre: ${conversation.title}
Messages (extrait):
${messageSample}

Réponds UNIQUEMENT avec les tags séparés par des virgules, sans explication.
Exemples de tags: "JavaScript", "React", "Debug", "API REST", "Base de données", "Design UI", etc.

Tags:`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Extraire les tags de la réponse
    const tagsText = message.content[0].text.trim();
    const tags = tagsText
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    return tags;

  } catch (error) {
    console.error(`  ❌ Erreur lors de l'analyse: ${error.message}`);
    return [];
  }
}

/**
 * Ajouter des tags à tous les exports
 */
async function tagAllConversations() {
  console.log('🏷️  Ajout de tags aux conversations exportées...\n');

  // Vérifier la clé API
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ Variable d\'environnement ANTHROPIC_API_KEY manquante!\n');
    console.log('📝 Pour utiliser cette fonctionnalité:\n');
    console.log('   1. Créez un compte sur https://console.anthropic.com/');
    console.log('   2. Générez une clé API');
    console.log('   3. Ajoutez-la dans un fichier .env:');
    console.log('      ANTHROPIC_API_KEY=votre_clé_ici\n');
    console.log('   4. Ou exportez-la: export ANTHROPIC_API_KEY=votre_clé_ici\n');
    process.exit(1);
  }

  // Lire tous les fichiers JSON dans exports/
  const files = await fs.readdir(EXPORT_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`📊 ${jsonFiles.length} conversations à analyser\n`);

  let taggedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < jsonFiles.length; i++) {
    const file = jsonFiles[i];
    const filepath = path.join(EXPORT_DIR, file);

    try {
      // Lire le fichier
      const content = await fs.readFile(filepath, 'utf-8');
      const conversation = JSON.parse(content);

      // Vérifier si des tags existent déjà
      if (conversation.tags && conversation.tags.length > 0) {
        console.log(`[${i + 1}/${jsonFiles.length}] ⏭️  ${conversation.title} (déjà taggé)`);
        skippedCount++;
        continue;
      }

      console.log(`[${i + 1}/${jsonFiles.length}] 🔍 Analyse: ${conversation.title}`);

      // Analyser avec Claude
      const tags = await analyzeConversation(conversation);

      if (tags.length > 0) {
        // Ajouter les tags
        conversation.tags = tags;
        conversation.taggedDate = new Date().toISOString();

        // Sauvegarder
        await fs.writeFile(filepath, JSON.stringify(conversation, null, 2));
        console.log(`  ✅ Tags ajoutés: ${tags.join(', ')}\n`);
        taggedCount++;
      } else {
        console.log(`  ⚠️  Aucun tag généré\n`);
      }

      // Pause pour éviter de dépasser les rate limits
      if (i < jsonFiles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error(`  ❌ Erreur: ${error.message}\n`);
    }
  }

  console.log('\n📊 Résumé:');
  console.log(`   ✅ ${taggedCount} conversations taggées`);
  console.log(`   ⏭️  ${skippedCount} conversations déjà taggées`);
  console.log(`   ❌ ${jsonFiles.length - taggedCount - skippedCount} erreurs\n`);

  // Mettre à jour l'archive finale
  await updateFinalArchive();
}

/**
 * Mettre à jour l'archive finale avec les tags
 */
async function updateFinalArchive() {
  console.log('📦 Mise à jour de l\'archive finale...\n');

  const files = await fs.readdir(EXPORT_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const allConversations = [];

  for (const file of jsonFiles) {
    const content = await fs.readFile(path.join(EXPORT_DIR, file), 'utf-8');
    allConversations.push(JSON.parse(content));
  }

  // Statistiques sur les tags
  const allTags = {};
  allConversations.forEach(conv => {
    if (conv.tags) {
      conv.tags.forEach(tag => {
        allTags[tag] = (allTags[tag] || 0) + 1;
      });
    }
  });

  const archive = {
    exportDate: new Date().toISOString(),
    totalConversations: allConversations.length,
    taggedConversations: allConversations.filter(c => c.tags && c.tags.length > 0).length,
    topTags: Object.entries(allTags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count })),
    conversations: allConversations
  };

  const archivePath = path.join(__dirname, `chatgpt-export-tagged-${Date.now()}.json`);
  await fs.writeFile(archivePath, JSON.stringify(archive, null, 2));

  console.log(`✅ Archive créée: ${path.basename(archivePath)}\n`);
  console.log(`📊 Statistiques des tags:\n`);

  archive.topTags.slice(0, 10).forEach(({ tag, count }) => {
    console.log(`   ${tag}: ${count} conversations`);
  });
  console.log('');
}

tagAllConversations().catch(console.error);
