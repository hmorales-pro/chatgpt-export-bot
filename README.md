# ChatGPT Export Bot 🤖

Bot automatisé pour exporter toutes vos conversations ChatGPT Workspace au format JSON.

## 📋 Fonctionnalités

- ✅ Export automatique de toutes les conversations ChatGPT Workspace
- ✅ Sauvegarde au format JSON
- ✅ Gestion de session pour éviter de se reconnecter à chaque fois
- ✅ Suivi de progression en temps réel
- ✅ Création d'une archive finale consolidée
- ✅ Gestion des erreurs et retry

## 🚀 Installation

```bash
npm install
```

## 💻 Utilisation

### 🎯 Méthode recommandée: Utiliser votre Chrome existant

Le bot se connecte à votre Chrome déjà ouvert (où vous êtes connecté à ChatGPT). C'est la méthode la plus simple et la plus fiable!

#### Étape 1: Lancer Chrome en mode debug

**Sur macOS:**
```bash
./start-chrome-debug.sh
```

**Sur Windows:**
```powershell
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Sur Linux:**
```bash
google-chrome --remote-debugging-port=9222
```

💡 **Astuce**: Le script `start-chrome-debug.sh` fermera automatiquement tous vos Chrome et en lancera un nouveau en mode debug.

#### Étape 2: Se connecter à ChatGPT

Dans le Chrome qui vient de s'ouvrir:
1. Allez sur https://chatgpt.com
2. Connectez-vous normalement avec votre compte Workspace
3. Vérifiez que vous voyez vos conversations

#### Étape 3: Lancer le bot

Dans un nouveau terminal (gardez Chrome ouvert):

```bash
npm start
```

Le bot va:
- ✅ Se connecter à votre Chrome existant
- ✅ Utiliser votre session déjà authentifiée
- ✅ Exporter automatiquement toutes vos conversations
- ✅ Laisser Chrome ouvert à la fin

---

### 🍪 Méthode alternative: Import manuel des cookies

Si la méthode ci-dessus ne fonctionne pas, vous pouvez exporter manuellement vos cookies.

<details>
<summary>Cliquez pour voir les instructions détaillées</summary>

#### Étape 1: Installer une extension de gestion de cookies

Installez l'une de ces extensions dans Chrome:
- **Cookie-Editor** (recommandé): https://cookie-editor.com/
- **EditThisCookie**: https://chrome.google.com/webstore/detail/editthiscookie/fngmhnnpilhplaeedifhccceomclgfbg

#### Étape 2: Exporter vos cookies ChatGPT

1. Allez sur **https://chatgpt.com** et connectez-vous normalement
2. Cliquez sur l'icône de l'extension dans la barre d'outils Chrome
3. Cliquez sur **Export** (icône de téléchargement ou bouton "Export")
4. Le JSON sera copié dans votre presse-papiers

#### Étape 3: Sauvegarder les cookies

1. Créez un fichier nommé `cookies-export.json` dans le dossier du bot
2. Collez-y le JSON exporté
3. Sauvegardez le fichier

#### Étape 4: Importer les cookies dans le bot

```bash
npm run import-cookies
```

Vous devriez voir: `✅ X cookies importés avec succès!`

#### Étape 5: Lancer le bot

```bash
npm start
```

</details>

## 🏷️ Tagging automatique avec IA

Après l'export, vous pouvez analyser automatiquement toutes vos conversations avec Claude AI pour ajouter des tags thématiques.

### Configuration

1. **Créez un compte Anthropic** (gratuit): https://console.anthropic.com/
2. **Générez une clé API** dans le dashboard
3. **Créez un fichier `.env`** à la racine du projet:
   ```bash
   ANTHROPIC_API_KEY=votre_clé_api_ici
   ```

### Utilisation

```bash
npm run tag
```

Le script va:
- ✅ Analyser chaque conversation avec Claude
- ✅ Générer 3-5 tags pertinents par conversation
- ✅ Mettre à jour les fichiers JSON avec les tags
- ✅ Créer une archive finale avec statistiques des tags
- ✅ Afficher les tags les plus populaires

**Exemple de tags générés:**
- "JavaScript", "Debug"
- "React", "Hooks", "Performance"
- "Python", "API REST", "FastAPI"
- "Design UI", "CSS", "Responsive"

### Résultat

Chaque conversation aura maintenant:
```json
{
  "id": "abc123",
  "title": "Aide pour débugger React",
  "tags": ["React", "Debug", "Hooks"],
  "taggedDate": "2025-11-14T...",
  "messages": [...]
}
```

L'archive finale inclura des statistiques:
```json
{
  "topTags": [
    { "tag": "JavaScript", "count": 45 },
    { "tag": "Python", "count": 32 },
    { "tag": "React", "count": 28 }
  ]
}
```

**Note:** Le tagging saute les conversations déjà taggées. Vous pouvez relancer le script en toute sécurité!

---

## 📁 Structure des exports

### Dossier `exports/`
Contient un fichier JSON par conversation :
```json
{
  "id": "abc123",
  "title": "Titre de la conversation",
  "url": "https://chatgpt.com/c/abc123",
  "exportDate": "2025-11-14T...",
  "messages": [
    {
      "role": "user",
      "content": "Message de l'utilisateur",
      "timestamp": "..."
    },
    {
      "role": "assistant",
      "content": "Réponse de l'assistant",
      "timestamp": "..."
    }
  ]
}
```

### Archive finale
Un fichier `chatgpt-export-{timestamp}.json` est créé à la racine, contenant toutes les conversations dans un seul fichier.

## 🔧 Configuration

Le bot utilise les paramètres suivants (modifiables dans [index.js](index.js)) :

- `EXPORT_DIR` : Dossier de destination des exports (par défaut : `./exports`)
- `SESSION_FILE` : Fichier de sauvegarde de session (par défaut : `./session.json`)
- Timeout de connexion : 5 minutes

## ⚠️ Notes importantes

- Le bot utilise un profil Chrome temporaire séparé
- Les exports peuvent prendre du temps si vous avez beaucoup de conversations
- Une pause de 500ms est appliquée entre chaque export pour éviter de surcharger le serveur
- Le bot fonctionne en mode **visible** (vous verrez le navigateur s'ouvrir)
- Votre session est sauvegardée localement après la première connexion

## 🛡️ Sécurité

- Le bot utilise un profil Chrome isolé dans le dossier `chrome-profile/`
- Vos cookies de session sont sauvegardés dans `session.json` (dans le `.gitignore`)
- Les exports contiennent vos conversations - traitez-les de manière confidentielle
- Aucune donnée n'est envoyée à des serveurs tiers

## 🐛 Dépannage

### Le bot ne détecte pas ma connexion
- Assurez-vous d'être bien sur la page principale de ChatGPT après connexion
- Attendez quelques secondes que la page se charge complètement
- Vérifiez que vous voyez vos conversations dans la barre latérale

### Pas de conversations trouvées
- Vérifiez que vous êtes bien connecté à votre compte ChatGPT Workspace
- Attendez que la page se charge complètement
- Assurez-vous que vous avez bien des conversations dans votre compte

### Session expirée
- Supprimez le fichier `session.json`
- Supprimez le dossier `chrome-profile/`
- Relancez le bot et reconnectez-vous manuellement

### Erreurs d'export
- Vérifiez votre connexion Internet
- Certaines conversations très longues peuvent échouer - le bot continuera avec les suivantes

## 📝 Licence

MIT
