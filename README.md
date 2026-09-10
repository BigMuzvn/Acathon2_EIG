# AutoCompare

Comparateur automobile réalisé pour le hackathon : sélectionner des véhicules, adapter son usage et comparer leur coût total de possession (TCO).

## Démarrer

```bash
npm install
npm run dev
```

Vite affiche l’adresse locale dans le terminal, généralement http://localhost:5173.

Le navigateur appelle le serveur du projet sur la même origine. Configuration `.env` (voir `.env.example`) :

```env
VITE_API_BASE_URL=/api
```

Vite démarre aussi les routes serveur en développement et en prévisualisation : une seule commande suffit. Node.js 24 LTS est recommandé (`.nvmrc`, identique à la CI) ; le minimum compatible est 22.12. Le fichier `.env` est facultatif : `/api` est la valeur par défaut.

## Connexion à la véritable CarAPI

La documentation officielle est utilisée : [Trims v2](https://carapi.app/docs/api/trims/) et [authentification](https://carapi.app/docs/api/auth/). CarAPI ne propose pas les routes `/vehicules` et `/simulation` du cahier des charges, et ne prend pas en charge CORS pour des appels directs depuis un navigateur.

```text
Navigateur → /api/vehicules → serveur AutoCompare → CarAPI GET /api/trims/v2
                                               → CarAPI GET /api/trims/v2/{id}
Navigateur → /api/simulation → serveur AutoCompare → calcul TCO propre au projet
```

`GET /api/vehicules?year=2020&make=Toyota&model=Camry&page=1` renvoie `{ data, meta }`. Les fiches normalisées utilisent les identifiants `carapi_<id>`. Les routes `/api/vehicules/:id` et `POST /api/simulation` appartiennent à **AutoCompare**, pas à CarAPI. Les appels sortants utilisent uniquement les routes CarAPI documentées ci-dessus, ainsi que `/api/auth/login` si un compte est configuré.

Sans identifiants, l’application utilise le jeu public CarAPI des millésimes **2015 à 2020**, composé de vraies fiches automobiles. Le catalogue affiche au maximum 12 véhicules par page : les boutons Précédent/Suivant remplacent les fiches et ramènent au début du catalogue. Marque, modèle et millésime se recherchent sur le serveur. Jusqu’à 50 véhicules peuvent être comparés simultanément. Les filtres par motorisation et le tri portent uniquement sur la page affichée. Les véhicules sélectionnés restent dans le comparatif à travers les pages, recherches et rechargements, sans être ajoutés aux cartes de la page courante.

Avec un abonnement adapté, configurer côté serveur uniquement, dans `.env.local` en développement :

```env
CARAPI_API_TOKEN=...
CARAPI_API_SECRET=...
```

Ces variables restent hors du bundle du navigateur ; ne jamais les préfixer avec `VITE_`. `.env` et `.env.local` ne sont pas suivis par Git et sont exclus des envois Vercel. Seul `.env.example`, sans identifiants, est versionné. Le serveur obtient un JWT, le renouvelle avant sept jours ou après une réponse 401. Les résultats sont mis en cache cinq minutes (500 entrées maximum) ; les demandes identiques en cours sont regroupées, les fiches chargées par lots de quatre. Chaque appel CarAPI dispose d’un délai limite de 15 secondes. Aucun proxy vers une URL fournie par le client n’est exposé.

## Données et hypothèses de coût

CarAPI fournit les caractéristiques, **pas le coût de possession**. `shared/tco.js` calcule le même scénario pour les données connectées et les six véhicules de secours hors ligne.

- Le prix MSRP est un tarif catalogue américain historique en USD, converti avec l’hypothèse fixe **1 USD = 0,92 EUR**. Ce n’est ni un cours de change en temps réel ni un prix actuel d’achat en Europe.
- La consommation EPA américaine est convertie : `L/100 km = 235,214583 / MPG US` ; `kWh/100 km = kWh/100 miles / 1,609344`. Ne pas l’assimiler au WLTP.
- Prix d’énergie hypothétiques : essence/hybride 1,85 €/L, diesel 1,70 €/L, électricité 0,25 €/kWh. Facteur énergie Allemagne 1,15, Suisse 1,25, autres pays proposés 1. Tous les résultats sont en EUR, y compris le scénario Suisse.
- Par an : entretien 450 € en électrique ou 700 € ; assurance 850 € en électrique ou 980 € ; autres frais 300 €.
- Décote cumulée : `prix × (1 − 0,9^années)`. Le total additionne les dépenses d’usage et cette perte de valeur, sans ajouter à nouveau le prix d’achat. L’évolution annuelle recalcule les postes à chaque horizon ; le dernier point concorde avec le total.
- Tarifs constants, sans financement, taxes d’importation ou prise en compte de l’âge/état réel. Il s’agit d’un scénario pédagogique. Les hypothèses figurent dans l’interface et dans le PDF.
- Les fiches sans prix/consommation exploitable et les motorisations non prises en charge (dont hybrides rechargeables, sans répartition des usages thermique/électrique) sont affichées mais non sélectionnables. Aucune consommation ni photo n’est inventée pour ces fiches.

## Personnaliser les estimations

Dans **Affiner mon estimation**, choisir un véhicule sélectionné puis saisir les valeurs connues : prix d’achat envisagé en euros, revente estimée à la fin de la possession, consommation réelle, prix moyen de l’énergie, assurance, entretien et autres frais annuels. Cliquer sur **Appliquer au comparatif** pour recalculer. Un champ vide conserve la référence ; `0` est un montant nul explicite. Les saisies sont mémorisées par véhicule, y compris entre les pages du catalogue et après actualisation.

Un prix d’énergie saisi est appliqué directement, sans coefficient pays supplémentaire. Pour un véhicule électrique, utiliser la moyenne des prix des recharges et, si disponible, la consommation à la prise incluant les pertes. Une revente saisie remplace la décote par défaut : `perte de valeur = achat − revente`, répartie linéairement sur les années dans le graphique. Sans revente saisie, la décote de 10 % par an s’applique au prix d’achat choisi. Une modification de durée réinitialise les reventes personnalisées avec un message ; les autres réglages sont conservés. **Revenir aux références** réinitialise uniquement le véhicule affiché.

Le tableau montre la base d’achat et la revente. **Comprendre les hypothèses du calcul** et le PDF détaillent les valeurs effectivement appliquées, avec leur origine. Les résultats restent des scénarios à tarifs constants, pas des prix de marché ni des prévisions garanties. L’âge et l’état du véhicule n’interviennent qu’à travers vos propres hypothèses.

Le contrat `POST /api/simulation` accepte un objet facultatif `ajustements`, indexé par les identifiants sélectionnés :

```json
{
  "vehicule_ids": ["carapi_8860"],
  "kilometrage_annuel": 15000,
  "duree_annees": 5,
  "region": "FR",
  "ajustements": {
    "carapi_8860": {
      "prix_achat": 18000,
      "valeur_revente": 9000,
      "consommation": 6,
      "prix_energie": 2,
      "assurance_annuelle": 600,
      "entretien_annuel": 500,
      "autres_annuels": 0
    }
  }
}
```

Chaque champ est facultatif et doit être un nombre fini : achat/revente de 0 à 2 000 000 €, consommation de 0,1 à 200 L ou kWh/100 km, énergie de 0 à 20 €/unité, chaque frais annuel de 0 à 100 000 €. La revente ne peut pas dépasser l’achat. Les clés inconnues et les ajustements hors sélection sont refusés. Chaque résultat inclut `hypotheses_appliquees` ; l’objet global `hypotheses` conserve les références par défaut. Le contrat sans ajustements reste compatible.

## Parcours

Le catalogue distingue deux zones : **Tout le catalogue** interroge CarAPI par millésime, marque et modèle ; **Sur cette page uniquement** filtre et trie les 12 fiches déjà chargées. Une nouvelle recherche générale réinitialise le texte et la motorisation des filtres locaux. Les filtres restent actifs lors d’un simple changement de page.

**Aller à la page** permet de saisir directement un numéro entre 1 et le nombre de pages de la recherche. Le changement conserve la recherche et la sélection, remplace les cartes et ramène immédiatement au titre du catalogue. Une page hors limites n’est pas envoyée au serveur.

Les suggestions de marques et modèles proviennent de `GET /api/catalogue-options?year=2020&make=Toyota`, qui réutilise le cache et la protection CarAPI pour les routes documentées `/makes/v2` et `/models/v2`. Les modèles dépendent du millésime et de la marque exacte. Les champs acceptent aussi la saisie libre ; une panne des suggestions ne bloque pas la recherche. Navigation clavier : flèches pour parcourir, Entrée pour choisir, Échap pour fermer. Les requêtes de suggestions sont temporisées et annulées si le contexte change.

Une documentation courte des choix, difficultés et erreurs est disponible dans [docs/TECHNIQUE.md](docs/TECHNIQUE.md). La préparation et les contrôles de la future démonstration Vercel sont décrits dans [docs/VERCEL.md](docs/VERCEL.md).

1. Rechercher, filtrer par motorisation et sélectionner les véhicules. Le catalogue propose aussi un tri par prix ou par marque.
2. Définir son profil : 2 000 à 60 000 km/an, 1 à 15 ans et pays. Trois profils rapides et une réinitialisation sont disponibles.
3. Consulter le véhicule au coût le plus faible, la répartition des cinq postes, l’évolution cumulée et le tableau détaillé.
4. Afficher une restitution textuelle ou télécharger un rapport PDF paginé avec du texte sélectionnable.

« Ma sélection » permet de consulter et retirer tous les véhicules choisis, y compris ceux des autres pages, sur ordinateur et mobile. Les résultats et le PDF identifient chaque finition avec sa description et son millésime. Une fiche CarAPI défaillante ne bloque plus les autres cartes : elle reste affichée comme indisponible avec possibilité de réessayer.

Le navigateur mémorise la sélection et les paramètres. Une sélection volontairement vide reste vide au prochain chargement.

## Interface

Identité blanc, vert profond et citron ; police Manrope hébergée localement ; catalogue illustré, panneau de profil et résultats séparés. La mise en page s’adapte au mobile. Les cartes sont des boutons utilisables au clavier, les champs ont des labels associés et les graphiques disposent d’une alternative textuelle. Les préférences de réduction des animations sont respectées.

Les images de démonstration sont des illustrations générées non contractuelles, réservées aux six véhicules locaux. CarAPI ne fournit pas de photos : une sélection progressive de photos documentées est associée aux modèles exacts via `shared/vehiclePhotos.js`. Première couverture : Toyota Camry et Tesla Model 3, millésimes 2018–2020, illustrés par des clichés de 2018. Les photos n’identifient pas la finition ou la couleur choisie. Sources, auteurs et licences sont consultables dans l’interface et dans [les crédits](public/images/catalogue/CREDITS.md). Les JPEG de 960 px sont locaux et pèsent moins de 200 Ko chacun ; un modèle non documenté ou une image en erreur conserve le pictogramme neutre. Images de démonstration et provenance : `public/images/`. Police et licence OFL : `public/fonts/`.

## Appels réseau et erreurs

- Les requêtes précédentes sont annulées lors d’un changement de sélection ou de paramètres. Une réponse ancienne ne peut pas remplacer le comparatif courant.
- Le calcul attend 250 ms après la dernière modification des paramètres.
- Les réponses et les paramètres sont validés dans le service front.
- Une erreur 400 affiche un message explicite. Une erreur 404 retire les véhicules identifiés comme indisponibles, avec information ; si le backend ne précise pas les identifiants, leurs fiches sont vérifiées individuellement.
- Le bouton de réessai relance l’action en échec : catalogue, calcul ou export.
- Une nouvelle tentative automatique du catalogue intervient toutes les 30 secondes en mode hors ligne ou après une erreur temporaire 502/503/504, ainsi qu’au retour de la connexion ou de l’onglet. Les refus d’accès et de quota restent explicites.
- Une erreur réseau lors du chargement du catalogue active le catalogue local, clairement indiqué comme démonstration. Les simulations utilisent alors exclusivement ces mêmes données locales. Une erreur HTTP reste visible ; une simulation du catalogue connecté ne remplace jamais silencieusement les données API par des valeurs de démonstration.
- L’export est disponible uniquement pour un résultat à jour. Il contient une synthèse et les coûts et évolutions annuelles des véhicules sélectionnés, avec pagination.

Les hypothèses du moteur local sont illustratives. Les estimations ne sont pas des devis ; le badge et le PDF indiquent leur provenance.

## Structure

```text
src/
  App.jsx                    État, persistance, requêtes et parcours
  index.css                  Identité visuelle et responsive
  components/
    Navbar.jsx               Navigation et export
    HeroBanner.jsx           Présentation
    VehicleSelector.jsx      Recherche, filtres, tri et sélection
    SimulationControls.jsx   Profil de conduite
    EstimationEditor.jsx     Prix et frais personnalisés par véhicule
    CalculationAssumptions.jsx Références et valeurs réellement appliquées
    RecommendationCard.jsx   Synthèse du coût le plus faible
    CostCharts.jsx           Graphiques chargés à la demande
    ComparisonTable.jsx      Tableau complet des coûts
    A11yView.jsx              Restitution textuelle
    ErrorAlert.jsx            Erreurs et réessai
    results.css              Styles des résultats
  services/
    api.js                   Contrats API et simulation de secours
    api.test.js              Tests du service
  utils/
    exportReport.js          PDF natif chargé à la demande
public/
  images/                    Visuels WebP et provenance
  fonts/                     Manrope et licence
tests/
  carapi.test.js             Adaptation CarAPI, authentification, calcul et serveur HTTP
  exportReport.test.js       Tests de pagination et de contenu PDF
  fixtures/backend.mjs       API simulée pour les tests navigateur
  browser-smoke.mjs          Parcours Playwright
```

## Vérifier

`npm run check` vérifie l’absence de fichiers `.env` privés dans l’index Git, analyse le code, lance les tests puis compile l’application. `.github/workflows/ci.yml` exécute ces contrôles et les parcours Chromium à chaque push et pull request, sous Node.js 24. Les tests automatiques utilisent des réponses simulées pour rester indépendants de CarAPI et ne nécessitent aucun secret. Les captures sont conservées sept jours en cas d’échec. Les contrôles CarAPI réelle restent des tests de mise en ligne séparés.

```bash
npm run lint
npm test
npm run build
```

Pour les parcours navigateur :

```bash
npx playwright install chromium
npm run test:e2e
```

Pour vérifier aussi la connexion réelle (réseau requis), laisser `npm run dev` ouvert et lancer `npm run test:carapi`. Ce parcours vérifie le catalogue, la pagination, la recherche Tesla, la restauration d’une sélection hors de la première page, la simulation, le PDF et la mise en page mobile. Aucun abonnement n’est nécessaire.

Le runner démarre Vite si nécessaire et utilise une API simulée déterministe. Il vérifie notamment la sélection clavier, les filtres, la persistance, les requêtes concurrentes, les erreurs, l’export et les débordements sur mobile. Les tests du serveur vérifient les véritables formats CarAPI et l’absence d’appels vers ses anciennes routes inexistantes. Les captures et le PDF de contrôle sont enregistrés dans `output/`, ignoré par Git.

```bash
npm run preview
```

Affiche la compilation de production avec les mêmes routes serveur. Pour Vercel : framework Vite, commande `npm run build`, dossier de sortie `dist`, `VITE_API_BASE_URL=/api`. La fonction `api/[...path].js` réutilise `server/api.js` et `server/carapi.js`. Les identifiants facultatifs `CARAPI_API_TOKEN` et `CARAPI_API_SECRET` sont à définir dans l’environnement serveur. Un hébergement purement statique de `dist` ne suffit pas : il faut conserver ces routes serveur. Aucun déploiement n’est effectué par les tests locaux.

Stack : React 19, Vite 8, Tailwind CSS 3, CSS, Recharts, Lucide, jsPDF et Playwright.
