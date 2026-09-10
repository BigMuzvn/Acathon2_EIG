import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ADJUSTMENT_LIMITS, resolveAssumptions, validateAdjustments } from '../../shared/tco.js';
import { vehicleLabel } from '../../shared/vehicleLabel.js';

const digits = key => ['prix_energie', 'consommation'].includes(key) ? 4 : 2;
const amount = (value, key) => value.toLocaleString('fr-FR', { maximumFractionDigits: digits(key) });

function VehicleCosts({ vehicle, params, onSave }) {
  const saved = params.ajustements?.[vehicle.id] || {};
  const [draft, setDraft] = useState(() => Object.fromEntries(Object.entries(saved).map(([key, value]) => [key, String(value)])));
  const [error, setError] = useState('');
  const defaults = resolveAssumptions(vehicle, { ...params, ajustements: {} });
  // Preview the default resale against the entered purchase price, not the old MSRP.
  const purchase = draft.prix_achat?.trim() ? Number(draft.prix_achat) : defaults.prix_achat;
  defaults.valeur_revente = Number.isFinite(purchase) ? purchase * 0.9 ** params.duree_annees : defaults.valeur_revente;
  const electric = vehicle.motorisation === 'electrique';
  const fields = [
    ['prix_achat', 'Prix d’achat envisagé', '€', vehicle.source === 'carapi' ? 'Indiquez le prix de l’annonce ou du devis. La référence est un ancien prix catalogue américain converti.' : 'Indiquez le prix proposé pour ce véhicule.'],
    ['valeur_revente', `Revente estimée après ${params.duree_annees} ans`, '€', 'Votre hypothèse à la fin de la possession. À défaut : décote annuelle de 10 %.'],
    ['consommation', 'Consommation en usage réel', electric ? 'kWh/100 km' : 'L/100 km', electric ? 'Utilisez si possible la consommation à la prise, pertes de recharge comprises.' : 'Préférez une moyenne représentative de vos trajets.'],
    ['prix_energie', 'Prix de l’énergie', electric ? '€/kWh' : '€/L', electric ? 'Moyenne de vos recharges à domicile et sur bornes. Aucun coefficient pays ajouté.' : 'Prix moyen payé à la pompe. Aucun coefficient pays ajouté.'],
    ['assurance_annuelle', 'Assurance par an', '€/an', 'Utilisez le montant de votre devis annuel.'],
    ['entretien_annuel', 'Entretien par an', '€/an', 'Budget annuel moyen : révisions, pneus et réparations.'],
    ['autres_annuels', 'Autres frais par an', '€/an', 'Stationnement, péages et frais récurrents, sans recompter les postes ci-dessus.'],
  ];
  const dirty = Object.keys(ADJUSTMENT_LIMITS).some(key => (draft[key] || '') !== (saved[key] === undefined ? '' : String(saved[key])));
  function submit(event) {
    event.preventDefault();
    try {
      const values = Object.fromEntries(Object.entries(draft).filter(([, value]) => value.trim() !== '').map(([key, value]) => [key, Number(value)]));
      const checked = validateAdjustments({ [vehicle.id]: values });
      resolveAssumptions(vehicle, { ...params, ajustements: checked });
      onSave(checked[vehicle.id] || {});
    } catch (err) { setError(err.message); }
  }
  return <form className="estimation-form" onSubmit={submit} aria-label="Hypothèses du véhicule">
    <p className="estimation-help">Renseignez les valeurs que vous connaissez. Un champ vide conserve la référence affichée ; 0 signifie un coût nul. Tous les montants sont en euros.</p>
    <div className="estimation-fields">{fields.map(([key, label, unit, hint]) => <div className="estimation-field" key={key}>
      <label htmlFor={`estimate-${key}`}>{label}</label>
      <div className="estimation-input"><input id={`estimate-${key}`} type="number" inputMode="decimal" step="any" min={ADJUSTMENT_LIMITS[key][0]} max={ADJUSTMENT_LIMITS[key][1]} value={draft[key] ?? ''} placeholder={String(Number(defaults[key].toFixed(digits(key))))} aria-describedby={`estimate-${key}-hint`} onChange={event => { setDraft({ ...draft, [key]: event.target.value }); setError(''); }} /><span>{unit}</span></div>
      <small id={`estimate-${key}-hint`}>Référence : {amount(defaults[key], key)} {unit}. {hint}</small>
    </div>)}</div>
    {error && <p className="estimation-error" role="alert">{error}</p>}
    <div className="estimation-actions"><button className="button button-dark" type="submit" disabled={!dirty}>Appliquer au comparatif</button><button className="button button-outline" type="button" disabled={!Object.keys(saved).length && !dirty} onClick={() => { setDraft({}); setError(''); onSave({}); }}>Revenir aux références</button><span role="status">{dirty ? 'Modifications non appliquées.' : Object.keys(saved).length ? 'Hypothèses personnalisées enregistrées.' : 'Références par défaut utilisées.'}</span></div>
  </form>;
}

export default function EstimationEditor({ vehicles, selectedIds, params, onChange }) {
  const [chosenId, setChosenId] = useState('');
  const candidates = selectedIds.map(id => vehicles.find(vehicle => vehicle.id === id)).filter(vehicle => vehicle && vehicle.simulable !== false);
  const vehicle = candidates.find(item => item.id === chosenId) || candidates[0];
  if (!vehicle) return null;
  function save(fields) {
    // Always retain the current selection; only older unselected settings can expire.
    const others = Object.entries(params.ajustements || {}).filter(([id]) => id !== vehicle.id);
    const active = others.filter(([id]) => selectedIds.includes(id));
    const inactive = others.filter(([id]) => !selectedIds.includes(id));
    const hasValues = Object.keys(fields).length > 0;
    const entries = [...inactive.slice(-(100 - active.length - Number(hasValues))), ...active];
    if (hasValues) entries.push([vehicle.id, fields]);
    const { ajustements: _previous, ...base } = params;
    onChange({ ...base, ...(entries.length ? { ajustements: Object.fromEntries(entries) } : {}) });
  }
  return <details className="estimation-editor">
    <summary><SlidersHorizontal size={19} /><span>Affiner mon estimation<small>Prix réel, revente et frais propres à chaque véhicule</small></span></summary>
    <div className="estimation-content">
      <label className="estimation-vehicle-label" htmlFor="estimate-vehicle">Véhicule à personnaliser</label>
      <select id="estimate-vehicle" value={vehicle.id} onChange={event => setChosenId(event.target.value)}>{candidates.map(item => <option key={item.id} value={item.id}>{vehicleLabel(item)}{Object.keys(params.ajustements?.[item.id] || {}).length ? ' · personnalisé' : ''}</option>)}</select>
      <VehicleCosts key={`${vehicle.id}:${params.duree_annees}:${params.region}:${JSON.stringify(params.ajustements?.[vehicle.id])}`} vehicle={vehicle} params={params} onSave={save} />
    </div>
  </details>;
}
