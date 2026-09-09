import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import VehicleSelector from './components/VehicleSelector';
import SimulationControls from './components/SimulationControls';
import RecommendationCard from './components/RecommendationCard';
import CostCharts from './components/CostCharts';
import ComparisonTable from './components/ComparisonTable';
import ErrorAlert from './components/ErrorAlert';
import A11yView from './components/A11yView';

import { getVehicules, runSimulation } from './services/api';
import { CarFront, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'autocompare_tco_state';

export default function App() {
  // Load saved state or default
  const savedState = (() => {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  })();

  const [vehicles, setVehicles] = useState([]);
  const [selectedIds, setSelectedIds] = useState(savedState?.selectedIds || ['veh_001', 'veh_002']);
  const [params, setParams] = useState(savedState?.params || {
    kilometrage_annuel: 15000,
    duree_annees: 5,
    region: 'FR'
  });

  const [simulationResults, setSimulationResults] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingSimulation, setLoadingSimulation] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [error, setError] = useState(null);
  const [a11yMode, setA11yMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const reportRef = useRef(null);

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedIds, params }));
    } catch (e) {
      console.warn("Impossible de sauvegarder l'état dans localStorage", e);
    }
  }, [selectedIds, params]);

  // Initial load of vehicles
  const loadVehiclesData = async () => {
    setLoadingVehicles(true);
    setError(null);
    try {
      const res = await getVehicules();
      setVehicles(res.data || []);
      setIsMock(res.isMock);

      if (res.data && res.data.length > 0 && selectedIds.length === 0) {
        setSelectedIds([res.data[0].id, res.data[1]?.id].filter(Boolean));
      }
    } catch (err) {
      console.error("Erreur chargement véhicules:", err);
      setError(err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  useEffect(() => {
    loadVehiclesData();
  }, []);

  // Run simulation whenever selectedIds or params change
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSimulationResults([]);
      setError({ status: 400, message: "Veuillez sélectionner au moins un véhicule pour lancer la simulation." });
      return;
    }

    const executeSimulation = async () => {
      setLoadingSimulation(true);
      setError(null);

      try {
        const res = await runSimulation({
          vehicule_ids: selectedIds,
          kilometrage_annuel: params.kilometrage_annuel,
          duree_annees: params.duree_annees,
          region: params.region
        });

        setSimulationResults(res.data?.resultats || []);
        
        if (res.data?.resultats?.length > 1) {
          confetti({
            particleCount: 30,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#0f172a', '#059669', '#c2410c']
          });
        }
      } catch (err) {
        console.error("Erreur lors de la simulation:", err);
        setError(err);
        setSimulationResults([]);
      } finally {
        setLoadingSimulation(false);
      }
    };

    const timer = setTimeout(executeSimulation, 250);
    return () => clearTimeout(timer);
  }, [selectedIds, params]);

  const handleToggleVehicle = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleApplyPreset = (km, years) => {
    setParams(prev => ({
      ...prev,
      kilometrage_annuel: km,
      duree_annees: years
    }));
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#f8fafc',
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`AutoCompare_TCO_Rapport_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("Erreur lors de la génération PDF:", err);
      alert("Erreur lors de la génération du document PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen pt-6 md:pt-10 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Navbar */}
      <Navbar
        onExport={handleExportPDF}
        isExporting={isExporting}
        a11yMode={a11yMode}
        setA11yMode={setA11yMode}
        isMock={isMock}
        onReloadVehicles={loadVehiclesData}
        vehicleCount={selectedIds.length}
      />

      {/* Hero Banner */}
      <HeroBanner
        vehicleCount={vehicles.length}
      />

      {/* Error Alert Display */}
      <ErrorAlert
        error={error}
        onDismiss={() => setError(null)}
        onRetry={loadVehiclesData}
      />

      {/* Main Content Area */}
      <main ref={reportRef} className="space-y-6">
        
        {/* Section 1: Vehicle Selection Grid */}
        <VehicleSelector
          vehicles={vehicles}
          selectedIds={selectedIds}
          onToggleVehicle={handleToggleVehicle}
          loading={loadingVehicles}
        />

        {/* Section 2: Input Sliders & Parameters */}
        <SimulationControls
          params={params}
          onChange={setParams}
          onApplyPreset={handleApplyPreset}
        />

        {/* Accessibility Mode View */}
        {a11yMode ? (
          <A11yView
            results={simulationResults}
            vehicles={vehicles}
            params={params}
          />
        ) : (
          <>
            {/* Loading Shimmer indicator */}
            {loadingSimulation && (
              <div className="glass-card p-6 text-center text-slate-700 text-sm flex items-center justify-center gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-800" />
                <span>Calcul de la simulation en cours...</span>
              </div>
            )}

            {simulationResults.length > 0 && (
              <>
                {/* Section 3: Recommendation Winner Card */}
                <RecommendationCard
                  results={simulationResults}
                  vehicles={vehicles}
                />

                {/* Section 4: Visual Charts (Stacked Bar & Evolution Line) */}
                <CostCharts
                  results={simulationResults}
                  vehicles={vehicles}
                />

                {/* Section 5: Comparative Table */}
                <ComparisonTable
                  results={simulationResults}
                  vehicles={vehicles}
                />
              </>
            )}
          </>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-slate-200 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          <CarFront className="w-4 h-4 text-slate-800" />
          <span className="font-semibold text-slate-700">AutoCompare TCO — Projet Hackathon 2025</span>
        </div>
        <p>API Endpoint: <code className="text-slate-700 font-mono">https://carapi.app/api</code></p>
      </footer>

    </div>
  );
}
