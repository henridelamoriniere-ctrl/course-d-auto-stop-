# 🚗 HitchRace — Guide de déploiement
### Application 100% gratuite · Zéro compétence technique requise

---

## Ce dont tu as besoin
- Un ordinateur avec accès internet
- 30 minutes environ

---

## ÉTAPE 1 — Créer un compte Supabase (la base de données)

1. Va sur **https://supabase.com** et clique sur "Start your project"
2. Inscris-toi avec ton email Google ou GitHub
3. Clique **"New project"**
4. Remplis :
   - **Name** : `hitchrace`
   - **Database Password** : choisis un mot de passe (note-le)
   - **Region** : `West EU (Ireland)` (le plus proche de la France)
5. Clique **"Create new project"** — attends 2 minutes que ça se crée

---

## ÉTAPE 2 — Configurer la base de données

1. Dans Supabase, clique sur **"SQL Editor"** dans le menu de gauche
2. Clique **"New query"**
3. Ouvre le fichier `supabase_schema.sql` de ce dossier, copie tout son contenu et colle-le dans l'éditeur
4. Clique **"Run"** (bouton vert)  
   ✅ Tu dois voir "Success" en bas

5. Refais la même chose avec `supabase_challenges.sql` pour ajouter les défis

---

## ÉTAPE 3 — Récupérer tes clés Supabase

1. Dans Supabase, clique sur **"Settings"** (icône engrenage) → **"API"**
2. Copie ces deux valeurs (tu en auras besoin à l'étape 5) :
   - **Project URL** → ressemble à `https://abcdefgh.supabase.co`
   - **anon public** (dans "Project API keys") → longue chaîne de caractères

---

## ÉTAPE 4 — Mettre le code sur GitHub

1. Va sur **https://github.com** et crée un compte (gratuit)
2. Clique **"New repository"**, nomme-le `hitchrace`, laisse tout par défaut, clique **"Create repository"**
3. Sur la page GitHub vide, clique **"uploading an existing file"**
4. Glisse-dépose **tout le contenu** du dossier `hitchrace` (pas le dossier lui-même, son contenu)
5. Clique **"Commit changes"**

---

## ÉTAPE 5 — Déployer sur Vercel

1. Va sur **https://vercel.com** et inscris-toi avec ton compte GitHub
2. Clique **"Add New Project"**
3. Sélectionne ton repo `hitchrace`
4. Avant de cliquer "Deploy", clique sur **"Environment Variables"** et ajoute :
   - `VITE_SUPABASE_URL` → colle le **Project URL** de l'étape 3
   - `VITE_SUPABASE_ANON_KEY` → colle la clé **anon public** de l'étape 3
5. Clique **"Deploy"** — attends 2 minutes

✅ Ton app est en ligne ! Tu reçois une URL du type `hitchrace-xxx.vercel.app`

---

## ÉTAPE 6 — Configurer ta course

1. Ouvre ton app sur `hitchrace-xxx.vercel.app`
2. Sur l'écran de login, **tape 5 fois** sur le titre "HitchRace"
3. Un panneau admin apparaît → entre le mot de passe par défaut : **`hitchrace2025`**
4. Configure :
   - **Ville de départ et d'arrivée** (nom + coordonnées GPS)
   - **Mot de passe admin** (change-le !)
   - **Défis** : active/désactive ceux que tu veux, modifie les points
5. Le jour J, clique **"Lancer la course"** et envoie le lien WhatsApp !

---

## ÉTAPE 7 — Partager avec les participants

Envoie simplement le lien `hitchrace-xxx.vercel.app` dans ton groupe WhatsApp.

Les participants :
- Cliquent sur le lien → ça s'ouvre dans leur navigateur comme une app
- Tapent leur nom d'équipe et choisissent une couleur
- C'est tout ! Pas d'installation nécessaire.

**Conseil** : dis-leur de garder l'app ouverte à l'écran pour que le GPS fonctionne en continu.

---

## Trouver les coordonnées GPS de tes villes

Va sur **https://maps.google.com**, cherche ta ville, fais clic droit → les coordonnées s'affichent.
Ex: Paris → `48.8566, 2.3522` | Lyon → `45.7640, 4.8357` | Bordeaux → `44.8378, -0.5792`

---

## Personnaliser le nom de l'app

Dans le fichier `index.html`, change "HitchRace 🚗" par le nom de ta course.
Dans `src/screens/LoginScreen.jsx`, change "HitchRace" et "Édition 2025" par tes textes.

---

## En cas de problème

- **L'app ne se charge pas** : vérifie que les variables d'environnement sont bien renseignées sur Vercel
- **Le GPS ne fonctionne pas** : l'app doit être en HTTPS (c'est le cas sur Vercel) et les participants doivent autoriser la géolocalisation
- **Supabase "project paused"** : connecte-toi au dashboard Supabase et clique "Restore project"

---

*Développé avec Claude · 100% gratuit · OpenStreetMap*
