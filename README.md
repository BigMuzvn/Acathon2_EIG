# 🚗 AutoCompare TCO — Simulateur & Comparateur de Coût de Possession (Hackathon 2025)

> Application web React épurée, humaine et éditoriale en **Thème Clair (Pierre & Blanc Cassé)** consommant l'API `https://carapi.app/api` pour simuler, comparer et analyser le coût total de possession (TCO) de véhicules électriques, thermiques et hybrides.

---

## 📌 Présentation du Projet

Cette application a été développée dans le cadre du **Hackathon Développeurs (API & Simulateur Automobile)**. Elle permet aux utilisateurs de :
- Sélectionner plusieurs véhicules et comparer leurs coûts d'utilisation au kilomètre près.
- Renseigner leurs critères de conduite (kilométrage annuel, durée de possession en années, zone géographique).
- Visualiser la ventilation complète des dépenses (carburant/électricité, entretien, assurance, décote, frais annexes) via des graphiques interactifs.
- Découvrir la **recommandation automatique du choix le plus économique**.
- Exporter les résultats en **document PDF** et conserver leurs préférences grâce à la **persistance locale (`localStorage`)**.
- Bénéficier d'un mode **Accessibilité (A11y)** dédié aux lecteurs d'écran.

---

## 🎨 Charte Visuelle & Principes de Design

- **Palette de Couleurs** :
  - Fond principal : Blanc Cassé Pierre (`#f8fafc`)
  - Cartes & Blocs : Blanc Pur (`#ffffff`) avec bordures fines neutres (`#e2e8f0`)
  - Textes : Bleu Marine Foncé (`#0f172a`) et Gris Ardoise (`#475569`)
  - Accents : Cuivre/Terre Cuite (`#c2410c`) et Émeraude (`#059669`)
- **Iconographie 100% Vectorielle** : Aucune présence d'émojis (Lucide Icons `lucide-react` exclusivement).
- **Motion UI & Polish (Principes Emil Kowalski)** :
  - Feedback tactile au clic (`:active { transform: scale(0.97); }`)
  - Transitions fluides (`150-180ms cubic-bezier(0.23, 1, 0.32, 1)`)
  - Design aéré avec marges supérieures et padding respirants

---

## 🛠️ Tech Stack & Bibliothèques

- **Framework Front-End** : React 19 (avec Vite 8)
- **Data Visualization** : Recharts (Barres empilées & Courbes d'évolution)
- **Styling** : Tailwind CSS v3 (PostCSS + Autoprefixer) & Design System CSS épuré
- **Icons** : Lucide React
- **Export PDF** : jsPDF + html2canvas
- **Animations** : Canvas Confetti

---

## 🌐 Spécifications & Endpoints API Consommés

L'application consomme l'API via la variable d'environnement `.env` (`VITE_API_BASE_URL=https://carapi.app/api`) :

- **`GET /vehicules`** : Récupère le catalogue des véhicules disponibles.
- **`GET /vehicules/:id`** : Détail d'un véhicule spécifique.
- **`POST /simulation`** : Calcule le coût total, mensuel, au km, la répartition détaillée et l'évolution sur $N$ années.

### 🛡️ Gestion des Erreurs & Robustesse (Section 4.2 Cahier des charges)
- **Code 400** : Intercepté et affiché avec un message d'erreur clair (paramètres invalides).
- **Code 404** : Notification et retrait du véhicule introuvable de la sélection.
- **Code 500** : Message générique d'erreur serveur avec bouton de réessai.
- **Fallback Mode** : En cas de coupure réseau ou de blocage CORS de l'API externe, un moteur de simulation local prend le relais de manière fluide.

---

## 🚀 Installation & Lancement

### 1. Cloner le dépôt et installer les dépendances
```bash
git clone https://github.com/BigMuzvn/Acathon2_EIG.git
cd Acathon2
npm install
```

### 2. Configuration Environnement
Le fichier `.env` est déjà prêt à l'emploi :
```env
VITE_API_BASE_URL=https://carapi.app/api
```

### 3. Lancer le serveur de développement
```bash
npm run dev
```
L'application s'ouvre sur `http://localhost:5173`.

### 4. Compiler pour la production
```bash
npm run build
```

---

## 📂 Architecture du Code (`src/`)

```
src/
├── assets/             # Visuels et ressources statiques
├── components/         # Composants autonomes React
│   ├── A11yView.jsx            # Mode alternative textuelle (Lecteurs d'écran)
│   ├── ComparisonTable.jsx     # Tableau synthétique comparatif
│   ├── CostCharts.jsx          # Graphiques Recharts (Barres empilées & Courbes)
│   ├── ErrorAlert.jsx          # Gestion des erreurs 400 / 404 / 500
│   ├── HeroBanner.jsx          # En-tête de présentation éditante
│   ├── Navbar.jsx              # Barre de navigation avec statut API & Export PDF
│   ├── RecommendationCard.jsx  # Carte du choix optimal le plus économique
│   ├── SimulationControls.jsx  # Sliders de kilométrage/durée & profils rapides
│   └── VehicleSelector.jsx     # Grille de sélection des véhicules avec filtres
├── services/
│   └── api.js          # Service d'appel API, validation et moteur fallback
├── App.jsx             # Composant racine avec gestion d'état centralisée
├── index.css           # Thème clair pierre, variables CSS & Tailwind directives
└── main.jsx            # Point d'entrée de l'application React
```

---

## 🔗 Dépôt Git
- Dépôt officiel : [`https://github.com/BigMuzvn/Acathon2_EIG.git`](https://github.com/BigMuzvn/Acathon2_EIG.git)

---
*Projet développé pour le Hackathon Développeurs (API & Simulateur Automobile).*
