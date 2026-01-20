# Back-end (API)

API Node/Express : authentification, commandes, production, expéditions, historique, catalogue produits, gestion des utilisateurs.

## Installation

```bash
cd backend
npm install
```

## Configuration (.env)

Créer `backend/.env` (ne pas commiter) :

```ini
PORT=4000

DB_HOST=localhost
DB_PORT=3307
DB_USER=ginioux_flamary_app
DB_PASSWORD=TestPwd123!
DB_NAME=ginioux_flamary

JWT_SECRET=change_me

# Optionnel (prod) : origines autorisées séparées par des virgules
# Exemple : CORS_ORIGINS=http://localhost:5173
CORS_ORIGINS=
NODE_ENV=development
```

## Base de données

Scripts SQL : `backend/db/`

- `ginioux_flamary.sql` : **structure** (tables + contraintes)
- `donnes_ginioux_flamary.sql` : **données de démo** (utilisateurs + catalogue produits)

Import (exemples) :

```bash
# structure
mysql -h localhost -P 3307 -u root -p < backend/db/ginioux_flamary.sql

# données (dans la base)
mysql -h localhost -P 3307 -u root -p ginioux_flamary < backend/db/donnes_ginioux_flamary.sql
```

> Si ton environnement MySQL n’autorise pas `CREATE USER` / `GRANT`, il peut être nécessaire de commenter/supprimer ces lignes dans le script.

## Lancer l’API

```bash
npm run dev
```

L’API écoute par défaut sur `http://localhost:4000`.

## Endpoints principaux

### Santé

- `GET /health`

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

### Commandes / Production / Expéditions

- `GET /orders` (connecté)
- `GET /orders/:id` (connecté)
- `PATCH /orders/:id/meta` (BUREAU/ADMIN)
- `PATCH /orders/:id/production` (PRODUCTION)
- `GET /shipments/pending` (BUREAU/ADMIN)
- `POST /shipments/ack` (BUREAU/ADMIN)
- `GET /history` (BUREAU/ADMIN)

### Produits

- Recherche (connecté) : `GET /products/search?q=...`
- CRUD (ADMIN/BUREAU) : `GET/POST/PATCH/DELETE /products`

### Admin utilisateurs (ADMIN)

Préfixe : `/admin/users`

- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `POST /admin/users/:id/reset-password`

## Notes sécurité

- Le refresh token est stocké en **cookie httpOnly** : côté front, les appels API doivent envoyer les cookies.
- En production : définir `CORS_ORIGINS`, passer en HTTPS, et ajuster la politique cookie/CORS.
