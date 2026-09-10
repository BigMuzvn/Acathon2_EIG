import { ASSUMPTIONS } from '../../shared/tco.js';
import { vehicleLabel } from '../../shared/vehicleLabel.js';

export default function CalculationAssumptions({ results = [], vehicles = [], isMock = false }) {
  const number = (value, key) => value.toLocaleString('fr-FR', { maximumFractionDigits: ['prix_energie', 'consommation'].includes(key) ? 4 : 2 });
  return <details className="calculation-assumptions"><summary>Comprendre les hypothèses du calcul</summary><div>
    <p>{isMock ? 'Le coût est estimé localement à partir des véhicules de démonstration.' : 'Le coût est estimé par AutoCompare à partir des caractéristiques CarAPI. CarAPI ne fournit ni simulation de coût ni devis.'} Vos valeurs personnalisées remplacent les références ci-dessous, uniquement pour le véhicule concerné.</p>
    <p>Sans prix personnalisé, la base d’achat CarAPI est le prix catalogue américain du millésime, converti à {ASSUMPTIONS.usd_to_eur.toLocaleString('fr-FR')} € pour 1 $. Ce taux est une hypothèse fixe, pas un cours du jour ni un prix d’occasion. La consommation EPA américaine est convertie en L/100 km ou kWh/100 km ; ce n’est pas une mesure WLTP. En démonstration, les références proviennent du catalogue local.</p>
    <ul><li>Énergie : essence et hybride 1,85 €/L, diesel 1,70 €/L, électrique 0,25 €/kWh.</li><li>Scénarios par pays : énergie × 1,15 en Allemagne, × 1,25 en Suisse, × 1 ailleurs. Tous les résultats restent en euros.</li><li>Par an : entretien 450 € en électrique ou 700 € ; assurance 850 € en électrique ou 980 € ; autres frais 300 €.</li><li>Décote : 10 % de la valeur restante par an. Total = énergie + entretien + assurance + autres frais + perte de valeur, sans compter deux fois le prix d’achat.</li></ul>
    <p>Avec une revente personnalisée, la perte de valeur correspond au prix d’achat moins cette revente ; elle est répartie linéairement dans le graphique annuel. Une nouvelle durée nécessite une nouvelle estimation de revente. Un prix d’énergie personnalisé remplace aussi le coefficient pays.</p>
    <p>Scénario à tarifs constants, sans financement ni fiscalité d’importation. L’âge, l’état, la recharge et vos contrats ne sont pris en compte qu’à travers les valeurs que vous renseignez. Les références seules ne constituent pas une estimation du marché actuel. Les hybrides rechargeables et les fiches sans prix ou consommation exploitable ne sont pas comparables.</p>
    {results.some(result => result.hypotheses_appliquees) && <div className="applied-assumptions">
      <h3>Valeurs utilisées dans ce comparatif</h3><p>« Saisi » indique une valeur personnalisée. La revente « Calculée » applique une décote annuelle de 10 %. Les références restent indicatives.</p>
      {results.map(result => {
        const applied = result.hypotheses_appliquees;
        if (!applied) return null;
        const vehicle = vehicles.find(item => item.id === result.vehicule_id);
        const electric = vehicle?.motorisation === 'electrique';
        const fields = [['prix_achat', 'Achat', '€'], ['valeur_revente', 'Revente en fin de période', '€'], ['consommation', 'Consommation', electric ? 'kWh/100 km' : 'L/100 km'], ['prix_energie', 'Énergie', electric ? '€/kWh' : '€/L'], ['assurance_annuelle', 'Assurance', '€/an'], ['entretien_annuel', 'Entretien', '€/an'], ['autres_annuels', 'Autres frais', '€/an']];
        return <section key={result.vehicule_id}><h4>{vehicleLabel(vehicle)}</h4><dl>{fields.map(([key, label, unit]) => <div key={key}><dt>{label}</dt><dd>{number(applied[key], key)} {unit}<small>{applied.personnalises.includes(key) ? 'Saisi' : key === 'valeur_revente' ? 'Calculée' : 'Référence'}</small></dd></div>)}</dl></section>;
      })}
    </div>}
  </div></details>;
}
