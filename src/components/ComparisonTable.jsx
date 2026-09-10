import { BadgeCheck, ArrowLeftRight } from 'lucide-react';
import './results.css';
import { vehicleLabel } from '../../shared/vehicleLabel.js';

const formatCost = (value, digits = 0) => value == null ? '—' : `${Number(value).toLocaleString('fr-FR', { maximumFractionDigits: digits })} €`;
const ENGINES = { essence: 'Essence', electrique: 'Électrique', hybride: 'Hybride', diesel: 'Diesel' };
const DETAILS = [
  ['carburant', 'Énergie', 'Carburant ou électricité'],
  ['entretien', 'Entretien', 'Révisions et maintenance'],
  ['assurance', 'Assurance', 'Couverture du véhicule'],
  ['decote_estimee', 'Décote estimée', 'Perte de valeur du véhicule'],
  ['autres', 'Autres frais', 'Dépenses annexes'],
];

export default function ComparisonTable({ results, vehicles, params }) {
  if (!results?.length) return null;
  const minimum = Math.min(...results.map(result => Number(result.cout_total)));

  return (
    <section className="result-card comparison-card" aria-labelledby="comparison-heading">
      <div className="result-card-header">
        <div>
          <span className="result-eyebrow">TOUS LES CHIFFRES</span>
          <h3 id="comparison-heading">Le comparatif en détail</h3>
          <p>Une même base de calcul, pour un choix éclairé.</p>
        </div>
        <span className="comparison-highlight-key"><span />Coût total le plus faible</span>
      </div>

      <div className="comparison-scroll" tabIndex={0} role="region" aria-label="Tableau des coûts par véhicule, défilement horizontal disponible">
        <table className="comparison-table">
          <caption className="result-sr-only">Comparaison des coûts de possession{params?.duree_annees ? ` sur ${params.duree_annees} ans` : ''}. Les dépenses par poste sont comprises dans le coût total.</caption>
          <thead>
            <tr>
              <th scope="col" className="comparison-label-heading">
                <span>Votre sélection</span>
                <small>{results.length} véhicule{results.length > 1 ? 's' : ''} comparé{results.length > 1 ? 's' : ''}</small>
              </th>
              {results.map(result => {
                const vehicle = vehicles.find(item => String(item.id) === String(result.vehicule_id));
                const isBest = Number(result.cout_total) === minimum;
                return (
                  <th key={result.vehicule_id} scope="col" className={isBest ? 'comparison-best' : ''}>
                    <span className="comparison-brand">{vehicle?.marque || 'Véhicule'}</span>
                    <span className="comparison-model">{vehicle?.modele || result.vehicule_id}{vehicle?.source === 'carapi' && ` · ${vehicle.annee}`}</span>
                    {vehicle?.description && <span className="comparison-variant" title={vehicleLabel(vehicle)}>{vehicle.description}</span>}
                    <span className="comparison-engine">{ENGINES[vehicle?.motorisation] || vehicle?.motorisation || 'Motorisation non précisée'}</span>
                    {isBest && <span className="comparison-best-badge"><BadgeCheck size={12} aria-hidden="true" />Coût le plus bas</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {results.some(result => result.hypotheses_appliquees) && <>
              <tr><th scope="row">Base d’achat<small>Prix saisi ou référence indicative</small></th>{results.map(result => <td key={result.vehicule_id}>{formatCost(result.hypotheses_appliquees?.prix_achat)}<small>{result.hypotheses_appliquees?.personnalises.includes('prix_achat') ? 'Prix personnalisé' : 'Référence'}</small></td>)}</tr>
              <tr><th scope="row">Revente estimée<small>En fin de possession ; déduite de l’achat pour calculer la décote</small></th>{results.map(result => <td key={result.vehicule_id}>{formatCost(result.hypotheses_appliquees?.valeur_revente)}<small>{result.hypotheses_appliquees?.personnalises.includes('valeur_revente') ? 'Valeur personnalisée' : 'Décote de 10 % par an'}</small></td>)}</tr>
            </>}
            <tr className="comparison-total-row">
              <th scope="row">Coût total estimé<small>{params?.duree_annees ? `Sur ${params.duree_annees} ${params.duree_annees === 1 ? 'an' : 'ans'} de possession` : 'Sur toute la période'}</small></th>
              {results.map(result => <td key={result.vehicule_id} className={Number(result.cout_total) === minimum ? 'comparison-best' : ''}>{formatCost(result.cout_total)}</td>)}
            </tr>
            <tr className="comparison-summary-row">
              <th scope="row">Budget mensuel<small>Moyenne sur la période</small></th>
              {results.map(result => <td key={result.vehicule_id} className={Number(result.cout_total) === minimum ? 'comparison-best' : ''}>{formatCost(result.cout_mensuel_moyen)}<small> / mois</small></td>)}
            </tr>
            <tr className="comparison-summary-row">
              <th scope="row">Coût au kilomètre</th>
              {results.map(result => <td key={result.vehicule_id} className={Number(result.cout_total) === minimum ? 'comparison-best' : ''}>{formatCost(result.cout_par_km, 2)}<small> / km</small></td>)}
            </tr>
            <tr className="comparison-divider"><th colSpan={results.length + 1} scope="colgroup">Détail des dépenses sur la période</th></tr>
            {DETAILS.map(([key, label, description]) => (
              <tr key={key}>
                <th scope="row">{label}<small>{description}</small></th>
                {results.map(result => <td key={result.vehicule_id} className={Number(result.cout_total) === minimum ? 'comparison-best' : ''}>{formatCost(result.detail?.[key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="comparison-footer">
        <p>Le coût total intègre l’énergie, l’entretien, l’assurance, la décote et les autres frais.</p>
        <span className="comparison-scroll-hint"><ArrowLeftRight size={14} aria-hidden="true" />Faites défiler pour comparer</span>
      </div>
    </section>
  );
}
