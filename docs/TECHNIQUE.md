# AutoCompare — documentation technique courte

## Choix techniques et structure

React et Vite portent l’interface. Les composants présentent le catalogue, le profil, la sélection complète, les graphiques Recharts, le tableau et sa version textuelle. jsPDF produit un rapport paginé avec du texte sélectionnable. Les images et la police sont hébergées localement.

- `src/App.jsx` : état du parcours, persistance et annulation des requêtes obsolètes.
- `src/components/` : interface responsive et accessible au clavier.
- `src/services/api.js` : validation du contrat interne et repli réseau explicite.
- `server/api.js` : routes HTTP propres au projet, validation et journalisation.
- `server/carapi.js` : accès à CarAPI, authentification facultative, cache et adaptation des unités.
- `server/protection.js` : limitation des appels et identification des clients.
- `shared/tco.js` : hypothèses et calcul du coût de possession.
- `shared/vehicleLabel.js` : identité du véhicule, finition et millésime, commune aux résultats et au PDF.
- `api/[...path].js` : entrée Vercel réutilisant le serveur de l’application.

## Difficultés rencontrées

Les routes `/vehicules` et `/simulation` du cahier des charges n’existent pas dans CarAPI. Après confirmation du professeur, l’intégration utilise les routes documentées `/api/trims/v2` et `/api/trims/v2/{id}`. Un serveur intermédiaire est nécessaire pour les appels du navigateur. Les routes françaises sont donc celles d’AutoCompare.

CarAPI fournit des caractéristiques américaines et des MSRP historiques, pas une simulation financière. Le moteur du projet applique des hypothèses pédagogiques explicites, visibles dans l’application et le PDF. Les conversions MPG US → L/100 km et kWh/100 miles → kWh/100 km sont réalisées sans inventer les consommations manquantes.

Plusieurs finitions partagent un même nom : leur description et leur millésime sont conservés dans les résultats, le PDF et « Ma sélection ». Le catalogue affiche uniquement la page courante, même si des véhicules d’autres pages restent sélectionnés. Lors d’une navigation, les anciennes cartes restent en place et désactivées pendant le chargement ; le retour en haut intervient dès le clic. Un rechargement complet repart en haut de la page sans effacer les préférences.

## Gestion des erreurs

La personnalisation des estimations utilise le même moteur et la même validation (`shared/tco.js`) sur le serveur et en mode démonstration. Les paramètres facultatifs `ajustements` remplacent les valeurs de référence par véhicule ; la réponse conserve les hypothèses effectivement appliquées, reprises dans le tableau, le détail et le PDF. La décote est soit de 10 % de la valeur restante par an, soit linéaire jusqu’à la revente saisie. Le prix d’achat n’est jamais ajouté une seconde fois à cette perte de valeur. Les postes sont arrondis à l’euro avant sommation, et le dernier cumul annuel concorde avec le total.

Le formulaire distingue brouillon et valeurs appliquées : seuls les réglages validés et confirmés par « Appliquer au comparatif » déclenchent une simulation. Les champs vides utilisent les références, les zéros restent explicites. Le navigateur ne transmet que les ajustements des véhicules sélectionnés. Les montants négatifs, non finis, hors limites et la revente supérieure à l’achat sont refusés. Un changement de durée retire les reventes personnalisées devenues inadaptées et affiche un message. Les paramètres sont conservés localement ; les ajustements sauvegardés invalides sont ignorés au chargement. Le corps JSON est limité à 32 000 caractères pour permettre jusqu’à 50 véhicules personnalisés.

- Une erreur sur la liste CarAPI reste une erreur de catalogue explicite. Un refus d’accès ou de quota n’est pas masqué par des données fictives.
- Une erreur isolée de fiche produit une carte non comparable accompagnée d’un message. Le reste de la page demeure consultable. « Réessayer les fiches » recharge la page ; les fiches déjà obtenues profitent du cache.
- Une fiche sélectionnée temporairement inaccessible reste dans la sélection. Une absence confirmée par un 404 retire le véhicule avec information. Les coûts ne sont jamais inventés pour compenser une fiche inaccessible.
- Les réponses 400, 404, 422, 429 et les erreurs serveur sont distinguées. Les erreurs 429 incluent `Retry-After` et un délai visible dans l’interface.
- Le catalogue local de six véhicules n’est utilisé qu’en cas d’échec réseau entre navigateur et serveur, avec un affichage explicite du mode démonstration.
- Les requêtes précédentes du navigateur sont annulées. Une réponse ancienne ne peut pas écraser le comparatif courant. L’export attend un résultat à jour.

## Protection et diagnostic

Par instance serveur : 120 points par client et par minute (catalogue 10, simulation 3, autre route 1), 240 appels CarAPI par minute et au plus 16 appels sortants en phase de connexion/attente des en-têtes. Les réponses en cache ne consomment pas d’appel CarAPI. Un 429 CarAPI suspend les nouveaux appels sortants pendant le délai demandé (borné à une heure). Ces limites restent configurables avec les variables `CARAPI_*` de `.env.example`.

L’adresse réseau directe est utilisée localement ; les en-têtes d’adresse transmis sont pris en compte uniquement dans l’environnement Vercel. Le compteur et le cache sont en mémoire : ils ne forment pas un quota partagé entre toutes les instances Vercel. Une règle de limitation au niveau du pare-feu Vercel sera à configurer lors de la mise en ligne si nécessaire pour le trafic prévu.

Chaque réponse API comporte `X-Request-Id`. Les journaux JSON contiennent le type de route, le statut et la durée. Les secrets, adresses IP, corps des requêtes et chaînes de recherche ne sont pas journalisés. `/api/health` vérifie uniquement le fonctionnement du serveur ; il ne prétend pas contrôler la disponibilité de CarAPI.

## Catalogue, suggestions et photos

La recherche générale et les filtres locaux ont des zones distinctes. La pagination accepte un accès direct borné, avec conservation des critères et de la sélection. Elle utilise le même chemin de navigation que Précédent/Suivant pour éviter les régressions de défilement.

`GET /api/catalogue-options` relaie exclusivement les routes documentées `/makes/v2` et `/models/v2`, avec millésime validé et marque canonique. Le cache partagé, la déduplication et les quotas existants s’appliquent. Le navigateur temporise les demandes de 350 ms, ignore les réponses obsolètes et conserve la saisie libre lors d’une erreur. `CatalogueAutocomplete.jsx` expose les rôles combobox/listbox et la navigation clavier.

`modele_base` conserve le nom exact CarAPI avant ajout de la finition. `shared/vehiclePhotos.js` associe les photos uniquement à ce nom, à la marque et à une plage d’années vérifiée. Les fichiers locaux, leurs auteurs et licences sont décrits dans `public/images/catalogue/CREDITS.md`. Aucun appel à Wikimedia ni recherche d’image automatique n’est effectué pendant la consultation. Une photo en erreur revient au pictogramme sans bloquer la sélection.

## Validation des parcours

`npm test`, `npm run lint`, `npm run build` et `npm run test:e2e` vérifient les calculs, conversions, erreurs, limites, rapports, sélection et navigation. `npm run test:deployment` et `npm run test:carapi` interrogent les données réelles sur une URL locale ou une future URL Vercel. Ils ne déploient rien.
