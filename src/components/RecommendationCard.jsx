import { ArrowDownRight, BadgeCheck } from 'lucide-react';
import './results.css';
import { vehicleLabel } from '../../shared/vehicleLabel.js';

const amount = (value, digits = 0) => Number(value || 0).toLocaleString('fr-FR', {
  maximumFractionDigits: digits,
});

export default function RecommendationCard({ results, vehicles, params }) {
  if (!results?.length) return null;

  const sorted = [...results].sort((a, b) => a.cout_total - b.cout_total);
  const best = sorted[0];
  const highest = sorted[sorted.length - 1];
  const getVehicle = (id) => vehicles.find(vehicle => String(vehicle.id) === String(id));
  const bestVehicle = getVehicle(best.vehicule_id);
  const highestVehicle = getVehicle(highest.vehicule_id);
  const name = bestVehicle ? vehicleLabel(bestVehicle) : `Véhicule ${best.vehicule_id}`;
  const highestName = highestVehicle ? vehicleLabel(highestVehicle) : `le véhicule ${highest.vehicule_id}`;
  const savings = Number(highest.cout_total) - Number(best.cout_total);
  const percentage = highest.cout_total > 0 ? Math.round(savings / highest.cout_total * 100) : 0;
  const hasComparison = results.length > 1;
  const isTie = hasComparison && sorted.filter(result => result.cout_total === best.cout_total).length > 1;

  return (
    <section className="recommendation-card" aria-label="Synthèse de votre simulation">
      <div className="recommendation-main">
        <span className="recommendation-eyebrow">
          <BadgeCheck size={16} aria-hidden="true" />
          {hasComparison ? (isTie ? 'Coût le plus bas · ex æquo' : 'Le meilleur choix pour votre budget') : 'Votre estimation'}
        </span>
        <h3>{name}</h3>
        <p>
          {hasComparison ? 'Le coût de possession le plus faible de votre sélection' : 'Le coût de possession estimé de ce véhicule'}
          {params?.duree_annees ? ` sur ${params.duree_annees} ${params.duree_annees === 1 ? 'an' : 'ans'}.` : '.'}
        </p>
      </div>

      <div className="recommendation-monthly">
        <span className="recommendation-stat-label">Budget mensuel estimé</span>
        <div className="recommendation-price">{amount(best.cout_mensuel_moyen)} <span>€<small>/ mois</small></span></div>
        <span className="recommendation-km">Soit {amount(best.cout_par_km, 2)} € par kilomètre</span>
      </div>

      {hasComparison && savings > 0 && (
        <div className="recommendation-savings">
          <span className="recommendation-stat-label">Économie estimée sur la période</span>
          <div className="recommendation-savings-number">
            {amount(savings)} €
            <span className="recommendation-percent"><ArrowDownRight size={14} aria-hidden="true" />{percentage} %</span>
          </div>
          <p>Par rapport à {highestName}, le plus coûteux de votre sélection.</p>
        </div>
      )}
    </section>
  );
}
