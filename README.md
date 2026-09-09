# 🚗 AutoCompare TCO — Simulateur & Comparateur de Coût de Possession (Hackathon)

> Application web React moderne consommant l'API `https://carapi.app/api` pour simuler, comparer et analyser le coût total de possession (TCO) de véhicules électriques, thermiques et hybrides.

---

## 📌 Présentation du Projet

Cette application a été développée dans le cadre du **Hackathon Développeurs (API & Simulateur)**. Elle permet aux utilisateurs de :
- Sélectionner plusieurs véhicules et comparer leurs coûts d'utilisation.
- Renseigner leurs critères de conduite (kilométrage annuel, durée de possession en années, région).
- Visualiser la répartition des dépenses (carburant/électricité, entretien, assurance, décote, frais annexes) via des graphiques interactifs.
- Découvrir la **recommandation automatique du choix le plus économique**.
- Exporter les résultats en **PDF** et conserver leurs préférences grâce à la **persistance locale (`localStorage`)**.
- Bénéficier d'un mode **Accessibilité (A11y)** dédié aux lecteurs d'écran.

---

## 🛠️ Tech Stack & Bibliothèques

- **Framework Front-End** : React 19 (avec Vite 8)
- **Data Visualization** : Recharts (Barres empilées & Courbes d'évolution)
- **Design & UI System** : CSS Vanilla sur-mesure (Dark Glassmorphism, Responsive design)
- **Icons** : Lucide React
- **Export PDF** : jsPDF + html2canvas
- **Animations** : Canvas Confetti

---

## 🌐 Spécifications & Endpoints API Consommés

L'application consomme l'API via le fichier de configuration `.env` (`VITE_API_BASE_URL=https://carapi.app/api`) :

- **`GET /vehicules`** : Récupère la catalogue des véhicules disponibles.
- **`GET /vehicules/:id`** : Détail d'un véhicule spécifique.
- **`POST /simulation`** : Calcule le coût total, mensuel, au km, la répartition détaillée et l'évolution sur $N$ années.

### 🛡️ Gestion des Erreurs (Robustesse)
- **Code 400** : Intercepté et affiché avec un message clair si les paramètres utilisateur sont invalides.
- **Code 404** : Notification et retrait propre de la sélection si un véhicule est introuvable.
- **Code 500** : Message générique avec option de réessai.
- **Fallback Mode** : En cas de coupure réseau ou de blocage CORS de l'API externe, un moteur de simulation local prend le relais de manière fluide.

---

## 🚀 Installation & Lancement

### 1. Cloner le dépôt et installer les dépendances
```bash
git clone <VOTRE_DEPOT_GIT>
cd Acathon2
npm install
```

### 2. Variable d'environnement
Le fichier `.env` est déjà configuré :
```env
VITE_API_BASE_URL=https://carapi.app/api
```

### 3. Lancer le serveur de développement
```bash
npm run dev
```
L'application sera accessible sur `http://localhost:5173`.

### 4. Compiler pour la production
```bash
npm run build
```

---

## 🌟 Fonctionnalités Incluses

| Catégorie | Fonctionnalité | Description |
| :--- | :--- | :--- |
| **MVP** | Sélection multi-véhicules | Recherche, filtres par motorisation (Électrique, Essence, Hybride, Diesel) |
| **MVP** | Formulaire dynamique | Sliders kilométrage (2k-60k km) et durée (1-12 ans) + Presets rapides |
| **MVP** | Visualisation de données | Barres empilées par poste de coût & Courbes d'évolution cumulée |
| **MVP** | Tableau récapitulatif | Vue tabulaire avec surbrillance des meilleures valeurs (TCO min, €/km min) |
| **Bonus** | Recommandation IA | Détection automatique et calcul des économies réalisées |
| **Bonus** | Export PDF | Téléchargement du rapport comparatif en un clic |
| **Bonus** | Persistance Locale | Sauvegarde automatique de la sélection dans le navigateur (`localStorage`) |
| **Bonus** | Accessibilité (A11y) | Alternative textuelle et structure conforme pour lecteurs d'écran |

---

## 📄 Documentation & Choix Techniques

1. **Architecture modulaire (`src/`)** :
   - `services/api.js` : Client API centralisé gérant les appels asynchrones, la validation et les fallbacks.
   - `components/` : Composants autonomes et réutilisables (`Navbar`, `VehicleSelector`, `SimulationControls`, `CostCharts`, `ComparisonTable`, `RecommendationCard`, `ErrorAlert`, `A11yView`).
2. **Performance** : Mise à jour en temps réel sans rechargement de page (*debounce* léger pour la fluidité des sliders).

---
*Projet réalisé pour le Hackathon API & Simulateur Automobile.*
