// Curated photographs, matched to an exact base model and a reviewed year range.
// Never match a trim's text by substring or reuse a photo across generations.
export const VEHICLE_PHOTOS = [
  {
    make: 'Toyota', model: 'Camry', from: 2018, to: 2020,
    title: 'Toyota Camry 2018 (marché américain)',
    src: '/images/catalogue/toyota-camry-2018.jpg',
    author: 'Bull-Doser', license: 'Domaine public',
    source: 'https://commons.wikimedia.org/wiki/File:2018_Toyota_Camry.jpg',
    licenseUrl: 'https://commons.wikimedia.org/wiki/File:2018_Toyota_Camry.jpg#Licensing',
  },
  {
    make: 'Tesla', model: '3', from: 2018, to: 2020,
    title: 'Tesla Model 3 Long Range 2018',
    src: '/images/catalogue/tesla-model-3-2018.jpg',
    author: 'jerjozwik', license: 'CC BY-SA 4.0',
    source: 'https://commons.wikimedia.org/wiki/File:2018_tesla_mode_3_long_range_1.jpg',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
];

export function vehiclePhoto(vehicle) {
  if (vehicle?.source !== 'carapi' || !Number.isInteger(vehicle.annee)) return null;
  return VEHICLE_PHOTOS.find(photo => photo.make === vehicle.marque && photo.model === vehicle.modele_base && vehicle.annee >= photo.from && vehicle.annee <= photo.to) || null;
}
