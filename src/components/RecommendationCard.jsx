import React from 'react';
import { Trophy, Sparkles, ArrowDownRight } from 'lucide-react';

export default function RecommendationCard({ results, vehicles }) {
  if (!results || results.length === 0) return null;

  // Find lowest cost vehicle
  const sorted = [...results].sort((a, b) => a.cout_total - b.cout_total);
  const bestResult = sorted[0];
  const worstResult = sorted[sorted.length - 1];

  const bestVeh = vehicles.find(v => v.id === bestResult.vehicule_id) || {
    marque: "Véhicule",
    modele: bestResult.vehicule_id
  };

  const savingsTotal = worstResult ? worstResult.cout_total - bestResult.cout_total : 0;
  const savingsPercent = worstResult && worstResult.cout_total > 0
    ? Math.round((savingsTotal / worstResult.cout_total) * 100)
    : 0;

  return (
    <div className="glass-card p-6 md:p-8 mb-8 border border-emerald-200 bg-emerald-50/50 relative overflow-hidden shadow-xs">
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        
        {/* Left Info */}
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-sm shrink-0">
            <Trophy className="w-7 h-7" />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="badge badge-electric text-xs py-1 px-3 border border-emerald-300 bg-emerald-100 text-emerald-900">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-emerald-700" /> Option la plus rentable
              </span>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              {bestVeh.marque} {bestVeh.modele}
            </h3>

            <p className="text-sm text-slate-700 mt-1.5 max-w-xl leading-relaxed">
              Pour votre profil, ce modèle affiche le coût le plus faible :{' '}
              <span className="text-emerald-800 font-mono font-extrabold text-base px-2 py-0.5 bg-white rounded-md border border-emerald-200">
                {bestResult.cout_mensuel_moyen} €/mois
              </span>{' '}
              ({bestResult.cout_par_km} €/km).
            </p>
          </div>
        </div>

        {/* Right Savings Stat */}
        {results.length > 1 && savingsTotal > 0 && (
          <div className="flex items-center gap-4 bg-white border border-emerald-200 p-4 md:p-5 rounded-2xl shrink-0 self-stretch md:self-auto justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-600 font-semibold block mb-0.5">Économie max estimée</span>
              <div className="text-2xl md:text-3xl font-black text-emerald-700 font-mono tracking-tight">
                -{savingsTotal.toLocaleString('fr-FR')} €
              </div>
            </div>

            <div className="px-3.5 py-1.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-extrabold font-mono flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4 text-emerald-700" />
              <span>{savingsPercent}%</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
