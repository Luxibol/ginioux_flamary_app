# Front-end (React)

Interface web (Bureau / Production / Admin) connectée à l’API Express.

## Installation

```bash
cd frontend
npm install
```

## Configuration (.env)

Créer `frontend/.env` (ne pas commiter) :

```ini
VITE_API_BASE_URL=http://localhost:4000
```

## Lancer l’application

```bash
npm run dev
```

Vite démarre par défaut sur `http://localhost:5173`.

## Build (optionnel)

```bash
npm run build
npm run preview
```

## Connexion (démo)

- Compte de démo : `admina` / `mdp12345`

## Notes

- L’auth utilise un **refresh token en cookie** : les appels API doivent envoyer les cookies (déjà géré par le client HTTP du projet).
- Si tu changes le port de l’API, mets à jour `VITE_API_BASE_URL`.
- En production : vérifier HTTPS + CORS (`CORS_ORIGINS` côté API).
