# Photographies du catalogue

Photos consultées et miniatures téléchargées le 10 septembre 2026 depuis Wikimedia Commons. Elles sont hébergées localement. Les fichiers sont les miniatures Wikimedia de 960 px, sans retouche supplémentaire ni recadrage dans l’interface (`object-fit: contain`). Aucun lien entre les auteurs et AutoCompare n’est suggéré.

| Fichier | Photo / auteur | Licence | Source originale |
| --- | --- | --- | --- |
| `toyota-camry-2018.jpg` | Toyota Camry 2018, Miami Beach, États-Unis — Bull-Doser | Domaine public, publié par l’auteur | [Description et licence](https://commons.wikimedia.org/wiki/File:2018_Toyota_Camry.jpg) |
| `tesla-model-3-2018.jpg` | Tesla Model 3 Long Range 2018 — jerjozwik | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) ; cette copie de l’image conserve cette licence | [Description et licence](https://commons.wikimedia.org/wiki/File:2018_tesla_mode_3_long_range_1.jpg) |

Miniatures sources :

- [Camry, 960 px](https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/2018_Toyota_Camry.jpg/960px-2018_Toyota_Camry.jpg)
- [Model 3, 960 px](https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/2018_tesla_mode_3_long_range_1.jpg/960px-2018_tesla_mode_3_long_range_1.jpg)

## Correspondances

`shared/vehiclePhotos.js` associe chaque photo à la marque, au nom de modèle CarAPI exact et aux millésimes 2018–2020. Camry : génération XV70, marché nord-américain. Model 3 : carrosserie initiale, avant les évolutions visuelles de 2021 et la refonte de 2024. Le libellé visible précise que la photo date de 2018 et que finition, équipements et couleur peuvent différer. L’image ne sert pas à identifier une finition particulière.

La correspondance exige `modele_base` : aucune recherche approximative dans les noms de finitions. Une année hors plage ou un modèle non documenté conserve le pictogramme. Pour ajouter une photo, vérifier son modèle, sa carrosserie, son marché, son millésime et sa licence ; ajouter le fichier local et son crédit ici, puis l’entrée dans `shared/vehiclePhotos.js`. Ne pas élargir une plage d’années sans vérifier les changements de génération/carrosserie.
