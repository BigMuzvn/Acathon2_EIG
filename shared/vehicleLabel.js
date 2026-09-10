/** One identity across the catalogue, results, selection and exported report. */
export function vehicleLabel(vehicle, { details = true } = {}) {
  if (!vehicle) return 'Véhicule indisponible';
  const name = [vehicle.marque, vehicle.modele].filter(Boolean).join(' ') || 'Véhicule';
  if (vehicle.source !== 'carapi') return name;
  return [name, vehicle.annee, details && vehicle.description].filter(Boolean).join(' · ');
}
