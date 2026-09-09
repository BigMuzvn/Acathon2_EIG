import React from 'react';
import { CarFront, FileDown, Eye, RefreshCw, Radio } from 'lucide-react';

export default function Navbar({ onExport, isExporting, a11yMode, setA11yMode, isMock, onReloadVehicles, vehicleCount }) {
  return (
    <header className="glass-card mb-8 p-4 md:p-6 no-print border-slate-200">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-sm border border-slate-800 text-white">
            <CarFront className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900">
                AutoCompare <span className="text-amber-700 text-base font-mono font-bold">TCO</span>
              </h1>
              <span className="badge bg-slate-100 text-slate-700 border border-slate-300 text-xs px-2.5 py-0.5 rounded-full font-mono">
                Projet 2025
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-600">
              Estimez et comparez le coût de possession réel de votre voiture
            </p>
          </div>
        </div>

        {/* Right Controls & Actions */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
          
          {/* API Status Badge */}
          <div className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full border ${
            isMock 
              ? 'bg-amber-50 text-amber-800 border-amber-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}>
            <Radio className={`w-3.5 h-3.5 ${isMock ? 'text-amber-600' : 'text-emerald-600'}`} />
            <span className="font-semibold">
              {isMock ? 'Mode Fallback (API local)' : 'API Live (carapi.app)'}
            </span>
            <button 
              onClick={onReloadVehicles}
              className="hover:rotate-180 transition-transform duration-300 text-slate-500 hover:text-slate-900 p-0.5"
              title="Rafraîchir les données API"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Accessibility Mode Toggle */}
          <button
            onClick={() => setA11yMode(!a11yMode)}
            className={`btn btn-secondary text-xs py-2 px-3.5 ${a11yMode ? 'bg-slate-200 border-slate-400 text-slate-900' : ''}`}
            title="Basculer en mode accessibilité (Lecteur d'écran)"
            aria-label="Mode Accessibilité"
          >
            <Eye className="w-4 h-4 text-slate-700" />
            <span className="hidden sm:inline">{a11yMode ? 'Mode Graphique' : 'Mode Accessibilité (A11y)'}</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={onExport}
            disabled={isExporting || vehicleCount === 0}
            className="btn btn-primary text-xs py-2 px-4"
          >
            <FileDown className="w-4 h-4" />
            <span>{isExporting ? 'Génération...' : 'Exporter PDF'}</span>
          </button>

        </div>

      </div>
    </header>
  );
}
