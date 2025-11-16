#!/bin/bash

# Script pour lancer Chrome en mode debug sur macOS avec votre profil habituel

echo "🚀 Lancement de Chrome en mode debug avec votre profil..."
echo ""

# Fermer tous les Chrome existants
echo "⏳ Fermeture de tous les Chrome ouverts..."
killall "Google Chrome" 2>/dev/null
sleep 2

# Chemin vers votre profil Chrome par défaut
USER_DATA_DIR="$HOME/Library/Application Support/Google/Chrome"

# Lancer Chrome en mode debug avec votre profil
echo "🔧 Lancement de Chrome en mode debug..."
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$USER_DATA_DIR" \
  --no-first-run \
  --no-default-browser-check \
  > /dev/null 2>&1 &

sleep 2

echo ""
echo "✅ Chrome lancé en mode debug sur le port 9222"
echo "✅ Utilisation de votre profil habituel (vous êtes déjà connecté!)"
echo ""
echo "ℹ️  Vous pouvez maintenant:"
echo "   1. Vérifier que vous êtes connecté à ChatGPT"
echo "   2. Dans un NOUVEAU terminal, lancer: npm start"
echo ""
echo "💡 Laissez ce Chrome ouvert pendant l'export!"
echo ""
