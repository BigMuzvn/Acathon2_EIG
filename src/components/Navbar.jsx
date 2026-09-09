import React from 'react';
import { Car, FileDown, Eye, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

export default function Navbar({ onExport, isExporting, a11yMode, setA11yMode, isMock, onReloadVehicles, vehicleCount }) {
  return (
    <header className="glass-card mb-8 p-4 md:p-6 no-print border-b border-blue-500/20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30">
            <Car className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-300 bg-clip-text text-transparent">
                AutoCompare <span className="text-blue-500 text-lg font-bold">TCO</span>
              </h1>
              <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-mono">
                Hackathon 2025
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-400">
              Simulateur & comparateur du coût total de possession de véhicules
            </p>
          </div>
        </div>

        {/* Right Status & Action Controls */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-3">
          
          {/* API Status Badge */}
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
            isMock 
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
              : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isMock ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'}`}></span>
            <span className="font-medium">
              {isMock ? 'Mode Fallback (API local)' : 'API Live (carapi.app)'}
            </span>
            <button 
              onClick={onReloadVehicles}
              className="hover:rotate-180 transition-transform duration-300 text-slate-400 hover:text-white p-0.5"
              title="Rafraîchir les données API"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Accessibility Mode Toggle */}
          <button
            onClick={() => setA11yMode(!a11yMode)}
            className={`btn btn-secondary text-xs py-2 px-3 ${a11yMode ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200' : ''}`}
            title="Basculer en mode accessibilité (Lecteur d'écran)"
            aria-label="Mode Accessibilité"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{a11yMode ? 'Mode Graphique' : 'Mode Accessibilité (A11y)'}</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={onExport}
            disabled={isExporting || vehicleCount === 0}
            className="btn btn-emerald text-xs py-2 px-4 shadow-lg shadow-emerald-900/30"
          >
            <FileDown className="w-4 h-4" />
            <span>{isExporting ? 'Génération...' : 'Exporter PDF'}</span>
          </button>

        </div>

      </div>
    </header>
  );
}
