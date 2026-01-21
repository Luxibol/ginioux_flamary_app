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

> Base URL (local) : `http://localhost:4000`

### Santé

- `GET /health`
- `GET /health/db`

### Auth

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/change-password`

### Import PDF (BUREAU/ADMIN)

- `POST /pdf/preview` (form-data : `file`)
- `POST /pdf/:importId/confirm` (body : `{ preview, internalComment }`)
- `DELETE /pdf/:importId`

### Commandes (BUREAU/ADMIN)

- `GET /orders/active` (liste des commandes actives + filtres)
- `GET /orders/:id` (détail commande + lignes)
- `PATCH /orders/:id` (mise à jour commande + synchronisation lignes)
- `DELETE /orders/:id`
- `GET /orders/archived` (liste commandes archivées)
- `GET /orders/:id/history` (détail “historique” d’une commande)

### Production / Expéditions (PRODUCTION/ADMIN)

- `GET /orders/production` (commandes à produire)
- `PATCH /orders/:orderId/lines/:lineId/ready` (déclarer une quantité prête)
- `POST /orders/:id/production-validate` (valider une production complète)

- `GET /orders/shipments` (expéditions à charger / préparation départ camion)
- `PATCH /orders/:orderId/lines/:lineId/loaded` (quantité chargée camion)
- `POST /orders/:orderId/shipments/depart` (départ camion)

- `GET /orders/shipments/stats` (stats expéditions – si activé)
- `GET /orders/produced` (ADMIN : indicateurs production – si activé)

### Expéditions côté Bureau (BUREAU/ADMIN)

- `GET /orders/bureau/shipments/pending` (expéditions à accuser réception)
- `POST /orders/:orderId/shipments/ack` (accusé de réception Bureau)

### Commentaires (connecté)

- `GET /orders/:id/comments`
- `POST /orders/:id/comments`

### Produits

- `GET /products/search?q=...` (connecté)
- CRUD (ADMIN/BUREAU) :
  - `GET /products`
  - `POST /products`
  - `PATCH /products/:id`
  - `DELETE /products/:id`

### Admin utilisateurs (ADMIN)

Préfixe : `/admin/users`

- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:id`
- `POST /admin/users/:id/reset-password`

## Notes sécurité

- Le refresh token est stocké en **cookie httpOnly** : côté front, les appels API doivent envoyer les cookies.
- En production : définir `CORS_ORIGINS`, passer en HTTPS, et ajuster la politique cookie/CORS.
