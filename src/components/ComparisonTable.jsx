import React from 'react';

export default function ComparisonTable({ results, vehicles }) {
  if (!results || results.length === 0) return null;

  // Find min values for highlighting
  const minTotal = Math.min(...results.map(r => r.cout_total));
  const minMonthly = Math.min(...results.map(r => r.cout_mensuel_moyen));
  const minKm = Math.min(...results.map(r => r.cout_par_km));

  return (
    <section className="glass-card p-6 md:p-8 mb-8 border-slate-200 shadow-xs overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white text-sm font-black flex items-center justify-center shrink-0 font-mono shadow-xs">
            4
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Tableau Récapitulatif
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5">
              Comparatif complet des coûts globaux, mensuels et au kilomètre.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600 bg-slate-50">
              <th className="py-4 px-4 rounded-tl-xl">Véhicule</th>
              <th className="py-4 px-4">Motorisation</th>
              <th className="py-4 px-4 text-right">Coût Total (TCO)</th>
              <th className="py-4 px-4 text-right">Coût Mensuel</th>
              <th className="py-4 px-4 text-right">Coût au km</th>
              <th className="py-4 px-4 text-right">Énergie</th>
              <th className="py-4 px-4 text-right">Entretien</th>
              <th className="py-4 px-4 text-right rounded-tr-xl">Décote Est.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-sans">
            {results.map(res => {
              const veh = vehicles.find(v => v.id === res.vehicule_id) || {
                marque: 'Inconnu',
                modele: res.vehicule_id,
                motorisation: 'inconnu'
              };

              const isBestTotal = res.cout_total === minTotal;
              const isBestMonthly = res.cout_mensuel_moyen === minMonthly;
              const isBestKm = res.cout_par_km === minKm;

              return (
                <tr
                  key={res.vehicule_id}
                  className={`hover:bg-slate-50 transition-colors ${
                    isBestTotal ? 'bg-emerald-50/70' : ''
                  }`}
                >
                  {/* Vehicle info */}
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{veh.marque} {veh.modele}</span>
                        {isBestTotal && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-300 font-bold">
                            Meilleur TCO
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 block mt-0.5 font-mono">
                        Prix : {veh.prix_achat ? veh.prix_achat.toLocaleString('fr-FR') + ' €' : 'N/A'}
                      </span>
                    </div>
                  </td>

                  {/* Motorisation */}
                  <td className="py-4 px-4 capitalize text-xs">
                    <span className={`px-3 py-1 rounded-lg border font-bold ${
                      veh.motorisation === 'electrique'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {veh.motorisation}
                    </span>
                  </td>

                  {/* Total Cost */}
                  <td className="py-4 px-4 text-right">
                    <span className={`font-mono font-extrabold text-base ${isBestTotal ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {res.cout_total.toLocaleString('fr-FR')} €
                    </span>
                  </td>

                  {/* Monthly Cost */}
                  <td className="py-4 px-4 text-right">
                    <span className={`font-mono font-bold ${isBestMonthly ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {res.cout_mensuel_moyen.toLocaleString('fr-FR')} € / mois
                    </span>
                  </td>

                  {/* Cost per KM */}
                  <td className="py-4 px-4 text-right">
                    <span className={`font-mono font-bold ${isBestKm ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {res.cout_par_km} € / km
                    </span>
                  </td>

                  {/* Energy */}
                  <td className="py-4 px-4 text-right font-mono text-slate-600 text-xs">
                    {res.detail?.carburant?.toLocaleString('fr-FR')} €
                  </td>

                  {/* Maintenance */}
                  <td className="py-4 px-4 text-right font-mono text-slate-600 text-xs">
                    {res.detail?.entretien?.toLocaleString('fr-FR')} €
                  </td>

                  {/* Depreciation */}
                  <td className="py-4 px-4 text-right font-mono text-slate-600 text-xs">
                    {res.detail?.decote_estimee?.toLocaleString('fr-FR')} €
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
