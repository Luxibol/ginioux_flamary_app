## Livrables

- Dossier de projet : docs/Dossier_ginioux_Flamary.pdf
- Support de présentation : docs/Presentation.pdf
- Dépôt : https://github.com/Luxibol/ginioux_flamary_app

# Application Ginioux Flamary

Application web interne avec 3 espaces :

- **Bureau** : suivi des commandes, informations clients, suivi expéditions
- **Production** : commandes à produire, suivi atelier, expéditions à charger
- **Admin** : pilotage + gestion du catalogue produits + gestion des utilisateurs

## Stack

- **Front-end** : React (Vite), Tailwind CSS, React Router
- **Back-end** : Node.js, Express, MySQL/MariaDB (`mysql2`)
- **Authentification** : JWT (access token) + refresh token en cookie httpOnly (rotation)

## Rôles

- **ADMIN** : accès complet + gestion des utilisateurs
- **BUREAU** : commandes (bureau), catalogue produits, accusés de réception expéditions
- **PRODUCTION** : production, expéditions à charger, accès atelier

## Pré-requis

- Node.js **18+**
- MySQL/MariaDB (ex : XAMPP/MariaDB) + (optionnel) phpMyAdmin

## Démarrage rapide (local)

### 1) Base de données

Les scripts SQL sont dans `backend/db/` :

- `ginioux_flamary.sql` : **structure** (tables + contraintes)
- `donnees_ginioux_flamary.sql` : **données de démo** (utilisateurs + catalogue)

Exemples d’import (MySQL CLI) :

```bash
# 1) structure
mysql -h localhost -P 3307 -u root -p < backend/db/ginioux_flamary.sql

# 2) données (dans la base déjà créée)
mysql -h localhost -P 3307 -u root -p ginioux_flamary < backend/db/donnees_ginioux_flamary.sql
```

> Remarque : `3307` est un exemple (fréquent avec certains setups). Adapte selon ton MySQL/MariaDB.

### 2) Variables d’environnement

Créer :

- `backend/.env`
- `frontend/.env`

Exemples :

**backend/.env**

```ini
PORT=4000

DB_HOST=localhost
DB_PORT=3307
DB_NAME=ginioux_flamary
DB_USER=ginioux_flamary_app
DB_PASSWORD=TestPwd123!

JWT_SECRET=change_me

# Optionnel (prod) : origines autorisées séparées par des virgules
# CORS_ORIGINS=http://localhost:5173
CORS_ORIGINS=
NODE_ENV=development
```

**frontend/.env**

```ini
VITE_API_BASE_URL=http://localhost:4000
```

### 3) Installer & lancer

Dans deux terminaux :

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

- Front : `http://localhost:5173`
- API : `http://localhost:4000`

### 4) Connexion (démo)

- Compte de démo : `admina` / `mdp12345`

## Jeu d’essai / Import PDF (démo)

- Pour tester l’import, utiliser un PDF de commande contenant un ARC “test”
  (ex : `ARC-TEST-0001`).  
  Si l’ARC existe déjà, l’import est ignoré (anti-doublon).

## Structure du dépôt

- `backend/` : API Express + accès DB
- `frontend/` : application React (Bureau / Production / Admin)
- `backend/db/` : scripts SQL (structure + données)

## Notes

- Le refresh token passe par un **cookie** : côté front, les appels API doivent envoyer les cookies.
- En production : configurer `CORS_ORIGINS`, passer en HTTPS et ajuster la politique cookie/CORS.
- Pour plus de détails : voir `backend/README.md` et `frontend/README.md`.
