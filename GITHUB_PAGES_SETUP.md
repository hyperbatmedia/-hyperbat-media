# Guide de déploiement sur GitHub Pages avec Google Drive

Ce guide explique comment déployer le site sur GitHub Pages et configurer le stockage des données JSON sur Google Drive.

## 📋 Prérequis

1. Un compte GitHub
2. Un compte Google Drive
3. Une clé API Google Drive (optionnelle, pour la sauvegarde automatique)

## 🚀 Étape 1 : Préparer Google Drive

### 1.1 Créer le dossier "admin"

1. Allez sur [Google Drive](https://drive.google.com)
2. Créez un nouveau dossier nommé `admin`
3. Clic droit sur le dossier → **Partager** → **Modifier l'accès**
4. Sélectionnez **"Toute personne disposant du lien"** avec le rôle **"Lecteur"**
5. Copiez le lien de partage

### 1.2 Créer les fichiers JSON

Dans le dossier `admin`, créez deux fichiers :

#### `themes.json`
```json
[]
```
Ce fichier contiendra tous les thèmes de la vitrine.

#### `links.json`
```json
[
  { "id": "discord", "name": "Discord", "url": "https://discord.gg/votre-serveur", "location": "header", "position": 1 },
  { "id": "arrm", "name": "ARRM", "url": "https://www.arrm-reborn.fr", "location": "header", "position": 2 },
  { "id": "tutoriel", "name": "Tutoriel", "url": "https://example.com/tutoriel", "location": "header", "position": 3 },
  { "id": "outil", "name": "Outil", "url": "https://example.com/outil", "location": "header", "position": 4 },
  { "id": "theme", "name": "THEME HYPERBAT", "url": "https://example.com/theme", "location": "header", "position": 5 }
]
```

### 1.3 Partager les fichiers publiquement

Pour chaque fichier (`themes.json` et `links.json`) :

1. Clic droit → **Partager** → **Modifier l'accès**
2. Sélectionnez **"Toute personne disposant du lien"** avec le rôle **"Lecteur"**
3. Copiez le lien de partage

### 1.4 Extraire les IDs

Depuis les liens de partage, extrayez les IDs :

**Format du lien :**
```
https://drive.google.com/file/d/1ABC...XYZ/view?usp=sharing
```

**L'ID est :** `1ABC...XYZ` (la partie entre `/d/` et `/view`)

Vous aurez besoin de :
- ID du dossier `admin`
- ID du fichier `themes.json`
- ID du fichier `links.json`

## 🔑 Étape 2 : Créer une clé API Google Drive (optionnel)

La clé API est nécessaire uniquement si vous voulez que les modifications soient sauvegardées automatiquement sur Drive.

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Allez dans **APIs & Services** → **Library**
4. Recherchez "Google Drive API" et activez-la
5. Allez dans **APIs & Services** → **Credentials**
6. Cliquez sur **Create Credentials** → **API Key**
7. Copiez la clé API générée
8. (Recommandé) Restreignez la clé API à "Google Drive API" uniquement

## ⚙️ Étape 3 : Configurer le site

1. Ouvrez le site en local
2. Connectez-vous au panneau admin (recherchez "canafloche")
3. Allez dans l'onglet **"Config Drive"**
4. Entrez les IDs que vous avez copiés :
   - ID du dossier admin (optionnel)
   - ID du fichier themes.json
   - ID du fichier links.json
   - Clé API (optionnel)
5. Cliquez sur **"Sauvegarder la configuration"**

## 📦 Étape 4 : Déployer sur GitHub Pages

### 4.1 Préparer le dépôt

```bash
# Si vous n'avez pas encore de dépôt Git
git init
git add .
git commit -m "Initial commit"

# Créez un dépôt sur GitHub, puis :
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
git branch -M main
git push -u origin main
```

### 4.2 Configurer GitHub Pages

1. Allez sur votre dépôt GitHub
2. Cliquez sur **Settings** → **Pages**
3. Sous **Source**, sélectionnez **"Deploy from a branch"**
4. Choisissez la branche `main` et le dossier `/ (root)`
5. Cliquez sur **Save**

### 4.3 Configurer le build (si nécessaire)

Si vous utilisez Vite/React, ajoutez un fichier `.github/workflows/deploy.yml` :

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## ✅ Vérification

1. Attendez quelques minutes que GitHub Pages déploie votre site
2. Visitez `https://VOTRE_USERNAME.github.io/VOTRE_REPO`
3. Le site devrait charger les données depuis Google Drive automatiquement

## 🔄 Mise à jour des données

### Méthode 1 : Via le panneau admin (si clé API configurée)

1. Connectez-vous au panneau admin
2. Modifiez les thèmes ou liens
3. Les modifications sont automatiquement sauvegardées sur Drive

### Méthode 2 : Manuellement sur Google Drive

1. Allez sur Google Drive
2. Ouvrez le fichier `themes.json` ou `links.json`
3. Modifiez le contenu JSON
4. Enregistrez
5. Le site chargera automatiquement les nouvelles données au prochain chargement

## 🛠️ Dépannage

### Les données ne se chargent pas

- Vérifiez que les fichiers sont bien partagés publiquement
- Vérifiez que les IDs sont corrects dans la configuration
- Ouvrez la console du navigateur (F12) pour voir les erreurs

### La sauvegarde ne fonctionne pas

- Vérifiez que la clé API est correcte
- Vérifiez que la clé API a accès à "Google Drive API"
- Vérifiez que les fichiers ont les bonnes permissions (lecture/écriture)

### Le site ne se déploie pas

- Vérifiez que le build fonctionne en local : `npm run build`
- Vérifiez les logs GitHub Actions
- Assurez-vous que le dossier `dist` contient les fichiers compilés

## 📝 Notes importantes

- ⚠️ Les fichiers JSON doivent être partagés **publiquement** pour être accessibles
- 🔒 La clé API est stockée dans le localStorage du navigateur (pas sur GitHub)
- 💾 Les données sont mises en cache dans localStorage pour un chargement plus rapide
- 🔄 Le site charge depuis Drive en priorité, puis utilise localStorage en fallback



