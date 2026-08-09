# DC Plaza — Stripe Ebook Store

## Ce qui est inclus
- `public/index.html` — landing page dark/glassmorphism.
- `success.html` — page après paiement.
- `server.js` — création du Checkout Stripe + vérification du paiement avant téléchargement.
- `ebook.pdf` — PDF fourni pour cette version.
- `.env.example` — variables à configurer.

## Installation
1. Installe Node.js.
2. Dans ce dossier :
   `npm install`
3. Copie `.env.example` vers `.env`.
4. Dans Stripe Dashboard, crée un produit pour l’ebook et un **Price** unique.
5. Mets son identifiant dans `STRIPE_PRICE_ID`.
6. Mets ta clé secrète Stripe dans `STRIPE_SECRET_KEY`.
7. Pour les tests, utilise une clé `sk_test_...`.
8. Lance :
   `npm start`
9. Ouvre `http://localhost:3000`.

## En production
- Déploie ce dossier sur un hébergeur Node (Render, Railway, Fly.io, etc.).
- Mets `PUBLIC_BASE_URL` sur l’URL HTTPS réelle.
- Utilise une clé Stripe live uniquement après avoir testé le parcours complet.
- Ne mets JAMAIS `STRIPE_SECRET_KEY` dans le HTML ou dans JavaScript côté navigateur.

## Important
Le PDF inclus est le fichier fourni dans la conversation. Il est identifié dans son contenu comme un premier bouillon éditorial et non comme la version finale. Vérifie donc que c’est bien le fichier que tu veux vendre avant de passer en production.
