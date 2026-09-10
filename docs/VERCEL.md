# Préparer la démonstration Vercel

La démonstration de production est publiée sur [autocompare-eig.vercel.app](https://autocompare-eig.vercel.app). Le projet Vercel `autocompare-eig` est connecté au dépôt GitHub : chaque push sur `main` déclenche un nouveau déploiement de production.

## Configuration préparée dans le dépôt

`vercel.json` déclare Vite, `npm ci`, `npm run build`, la sortie `dist` et une durée maximale de 60 secondes pour les fonctions. Les entrées `api/` importent les modules serveur ; une entrée spécifique traite les fiches véhicule. Les appels du navigateur utilisent `/api` sur la même origine : il faut déployer le dépôt complet, pas uniquement `dist`.

Variables : `VITE_API_BASE_URL=/api` (également la valeur par défaut). Les identifiants `CARAPI_API_TOKEN` et `CARAPI_API_SECRET` sont facultatifs pour le jeu public 2015–2020 et doivent rester dans l’environnement serveur. En local, les placer dans `.env.local`, jamais dans une variable `VITE_`.

Les limites applicatives sont actives par défaut et configurables. Elles sont locales à chaque instance. Une règle de limitation commune à toutes les instances peut être ajoutée aux routes `/api/*` dans le pare-feu du projet Vercel selon le trafic attendu.

## Vérifier localement la version compilée

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Dans un autre terminal PowerShell :

```powershell
$env:E2E_BASE_URL = 'http://127.0.0.1:4173'
npm run test:deployment
npm run test:carapi
```

Le premier contrôle teste la disponibilité du serveur, le catalogue réel, une fiche, une simulation, les erreurs HTTP et la page d’accueil. Le second vérifie le parcours navigateur, la pagination, la sélection entre pages, le PDF et le mobile. Les protections peuvent renvoyer 429 si les parcours réseau sont répétés trop vite : respecter le délai `Retry-After`.

## Mise en ligne

1. Après validation de `npm run check` et `npm run test:e2e`, importer le dépôt Git dans Vercel et créer un déploiement Preview ; utiliser Node.js 24, comme la CI.
2. Configurer les variables éventuelles et la protection du trafic. Ne pas transmettre de secrets dans une URL ou dans le navigateur.
3. Exécuter les deux mêmes contrôles en remplaçant `E2E_BASE_URL` par l’URL Preview réelle. Une Preview protégée doit être accessible au navigateur de test selon les réglages du projet.
4. Tester dans la Preview les déconnexions, les erreurs visibles et la reconnexion. Contrôler les journaux Vercel à l’aide des identifiants de requête.
5. Publier la démonstration lorsque la Preview est validée. Conserver l’URL dans le README pour la livraison.

Une validation locale ne vaut pas validation de Vercel : le routage, l’environnement, le pare-feu et les contraintes de l’hébergeur restent à contrôler sur cette Preview.

`.vercelignore` exclut les fichiers `.env*`, les dépendances locales et les résultats de test des envois. Les paramètres de production se définissent dans Vercel ; aucun secret n’est nécessaire pour le catalogue public. GitHub Actions (`.github/workflows/ci.yml`) vérifie chaque push et pull request, sans dépendre de CarAPI. Les déploiements doivent attendre la réussite de ces contrôles.

Références : [configuration Vercel](https://vercel.com/docs/project-configuration/vercel-json), [en-têtes réseau](https://vercel.com/docs/headers/request-headers), [limitation du pare-feu](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
