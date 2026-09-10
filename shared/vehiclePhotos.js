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

// Generic local illustrations used when CarAPI has no verified model photo.
// These visuals are deliberately described as fictional category art in the UI.
export const VEHICLE_ILLUSTRATIONS = [
  { key: 'electric', label: 'électrique', src: '/images/megane.webp' },
  { key: 'crossover', label: 'SUV / crossover', src: '/images/hero-drive.webp' },
  { key: 'sedan', label: 'berline', src: '/images/model3.webp' },
  { key: 'hybrid', label: 'hybride', src: '/images/yaris.webp' },
  { key: 'diesel', label: 'diesel', src: '/images/golf.webp' },
  { key: 'compact', label: 'citadine / compacte', src: '/images/clio.webp' },
];

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function vehicleIllustration(vehicle) {
  if (vehicle?.source !== 'carapi') return null;
  const text = normalize(`${vehicle.marque} ${vehicle.modele_base} ${vehicle.modele} ${vehicle.description}`);
  let key = 'compact';
  if (vehicle.motorisation === 'electrique' || /\be[- ]?(208|2008|tron|niro|leaf)|tesla|model [3sy]|bolt|ioniq|electric/.test(text)) key = 'electric';
  else if (/suv|crossover|rav4|cr[- ]?v|tucson|sportage|tiguan|kuga|kona|captur|kadjar|duster|\bq[1-8]\b|\bx[1-7]\b|model y/.test(text)) key = 'crossover';
  else if (/sedan|saloon|camry|accord|corolla|passat|malibu|fusion|altima|sonata|impala|charger/.test(text)) key = 'sedan';
  else if (vehicle.motorisation === 'hybride' || /hybrid|prius|yaris/.test(text)) key = 'hybrid';
  else if (vehicle.motorisation === 'diesel' || /diesel|tdi|dci|hdi|bluehdi/.test(text)) key = 'diesel';
  return VEHICLE_ILLUSTRATIONS.find(illustration => illustration.key === key) || null;
}

export function vehiclePhoto(vehicle) {
  if (vehicle?.source !== 'carapi' || !Number.isInteger(vehicle.annee)) return null;
  return VEHICLE_PHOTOS.find(photo => photo.make === vehicle.marque && photo.model === vehicle.modele_base && vehicle.annee >= photo.from && vehicle.annee <= photo.to) || null;
}
