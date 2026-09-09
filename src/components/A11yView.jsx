import React from 'react';
import { Eye, FileText, CheckCircle2 } from 'lucide-react';

export default function A11yView({ results, vehicles, params }) {
  if (!results || results.length === 0) return null;

  return (
    <section 
      aria-label="Rapport d'accessibilité détaillé et restitution textuelle des données"
      tabIndex={0}
      className="glass-card p-6 mb-8 border border-indigo-500/30 bg-indigo-950/20 text-slate-200"
    >
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-indigo-500/20">
        <Eye className="w-6 h-6 text-indigo-400" />
        <div>
          <h2 className="text-xl font-bold text-white">Mode Alternative Textuelle / Accessibilité (A11y)</h2>
          <p className="text-xs text-indigo-200">
            Ce mode fournit une description textuelle complète des résultats de la simulation sans dépendre d'éléments visuels ou de graphiques.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 mb-2">1. Paramètres de la simulation actuelle</h3>
          <ul className="list-disc list-inside text-sm space-y-1 text-slate-300">
            <li>Kilométrage annuel simulé : <strong>{params.kilometrage_annuel.toLocaleString('fr-FR')} kilomètres</strong></li>
            <li>Durée de possession choisie : <strong>{params.duree_annees} ans</strong> (soit {params.duree_annees * 12} mois)</li>
            <li>Distance totale parcourue : <strong>{(params.kilometrage_annuel * params.duree_annees).toLocaleString('fr-FR')} km</strong></li>
            <li>Zone géographique / Tarif énergie : <strong>Région {params.region}</strong></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 mb-2">2. Restitution textuelle par véhicule</h3>
          <div className="space-y-4">
            {results.map((res, index) => {
              const veh = vehicles.find(v => v.id === res.vehicule_id) || { marque: '', modele: res.vehicule_id, motorisation: 'non précisée' };
              
              return (
                <div key={res.vehicule_id} className="p-4 bg-slate-900/80 rounded-xl border border-indigo-500/20">
                  <h4 className="text-base font-bold text-white mb-2">
                    {index + 1}. {veh.marque} {veh.modele} (Motorisation : {veh.motorisation})
                  </h4>
                  <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                    Le coût total estimé de possession (TCO) sur {params.duree_annees} ans s'élève à{' '}
                    <strong className="text-emerald-400">{res.cout_total.toLocaleString('fr-FR')} €</strong>. 
                    Cela équivaut à un coût moyen mensuel de <strong>{res.cout_mensuel_moyen} € par mois</strong>{' '}
                    et un coût au kilomètre de <strong>{res.cout_par_km} € par km</strong>.
                  </p>
                  
                  <div className="text-xs space-y-1 text-slate-400 pl-4 border-l-2 border-indigo-500/40">
                    <p>• Budget Énergie (Carburant / Électricité) : {res.detail?.carburant?.toLocaleString('fr-FR')} €</p>
                    <p>• Budget Entretien : {res.detail?.entretien?.toLocaleString('fr-FR')} €</p>
                    <p>• Budget Assurance : {res.detail?.assurance?.toLocaleString('fr-FR')} €</p>
                    <p>• Dépréciation / Décote estimée du véhicule : {res.detail?.decote_estimee?.toLocaleString('fr-FR')} €</p>
                    <p>• Autres dépenses annexes : {res.detail?.autres?.toLocaleString('fr-FR')} €</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
