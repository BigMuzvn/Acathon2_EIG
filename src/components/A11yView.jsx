import { FileText } from 'lucide-react';
import './results.css';
import { vehicleLabel } from '../../shared/vehicleLabel.js';

const number = (value, digits = 0) => value == null ? 'Non disponible' : Number(value).toLocaleString('fr-FR', { maximumFractionDigits: digits });
const REGIONS = { FR: 'France', DE: 'Allemagne', CH: 'Suisse' };
const ENGINES = { electrique: 'électrique', essence: 'essence', diesel: 'diesel', hybride: 'hybride' };
const DETAILS = [['carburant', 'Énergie'], ['entretien', 'Entretien'], ['assurance', 'Assurance'], ['decote_estimee', 'Décote estimée'], ['autres', 'Autres frais']];

export default function A11yView({ results, vehicles, params }) {
  if (!results?.length) return null;

  return (
    <section className="result-card result-text-report" aria-labelledby="text-report-heading" tabIndex={0}>
      <div className="result-card-header">
        <div>
          <span className="result-eyebrow"><FileText size={14} aria-hidden="true" />RAPPORT TEXTUEL</span>
          <h3 id="text-report-heading">Votre simulation, en toutes lettres</h3>
          <p>Les mêmes résultats, dans un format de lecture sans graphiques.</p>
        </div>
      </div>

      <div className="result-text-content">
        <section className="result-text-parameters" aria-labelledby="text-parameters-heading">
          <h4 id="text-parameters-heading">Les paramètres de votre simulation</h4>
          <dl>
            <div><dt>Kilométrage annuel</dt><dd>{number(params.kilometrage_annuel)} km</dd></div>
            <div><dt>Durée de possession</dt><dd>{params.duree_annees} {params.duree_annees === 1 ? 'an' : 'ans'} ({params.duree_annees * 12} mois)</dd></div>
            <div><dt>Distance totale</dt><dd>{number(params.kilometrage_annuel * params.duree_annees)} km</dd></div>
            <div><dt>Pays de référence</dt><dd>{REGIONS[params.region] || params.region}</dd></div>
          </dl>
        </section>

        {results.map((result, index) => {
          const vehicle = vehicles.find(item => String(item.id) === String(result.vehicule_id));
          const name = vehicle ? vehicleLabel(vehicle) : `Véhicule ${result.vehicule_id}`;
          return (
            <article key={result.vehicule_id} className="result-text-vehicle">
              <span className="result-eyebrow">VÉHICULE {String(index + 1).padStart(2, '0')} · {ENGINES[vehicle?.motorisation] || vehicle?.motorisation || 'Motorisation non précisée'}</span>
              <h4>{name}</h4>
              <p>Sur {params.duree_annees} {params.duree_annees === 1 ? 'an' : 'ans'}, le coût de possession de ce véhicule est estimé à <strong>{number(result.cout_total)} €</strong>. Cela représente en moyenne <strong>{number(result.cout_mensuel_moyen)} € par mois</strong> et <strong>{number(result.cout_par_km, 2)} € par kilomètre</strong>.</p>
              <dl className="result-text-costs">
                {DETAILS.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{result.detail?.[key] == null ? 'Non disponible' : `${number(result.detail[key])} €`}</dd></div>)}
              </dl>
              {!!result.evolution_annuelle?.length && (
                <details className="result-text-evolution">
                  <summary>Coût cumulé année par année</summary>
                  <ol>{[...result.evolution_annuelle].sort((a, b) => a.annee - b.annee).map(item => <li key={item.annee}>Année {item.annee} : <strong>{number(item.cout_cumule)} €</strong></li>)}</ol>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
