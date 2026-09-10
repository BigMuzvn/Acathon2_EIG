import { useEffect, useReducer, useState, lazy, Suspense } from 'react';
import { useRef } from 'react';
import { ArrowLeftRight, ArrowRight, ArrowUpRight, Check, CircleHelp, Download, FileText, Leaf, LoaderCircle, LockKeyhole, RefreshCw, X } from 'lucide-react';
import Navbar from './components/Navbar';
import HeroBanner from './components/HeroBanner';
import VehicleSelector from './components/VehicleSelector';
import SimulationControls from './components/SimulationControls';
import RecommendationCard from './components/RecommendationCard';
import ComparisonTable from './components/ComparisonTable';
import ErrorAlert from './components/ErrorAlert';
import A11yView from './components/A11yView';
import CalculationAssumptions from './components/CalculationAssumptions';
import SelectionManager from './components/SelectionManager';
import EstimationEditor from './components/EstimationEditor';
import { validateAdjustments } from '../shared/tco.js';
import { getVehicules, getVehiculeById, runSimulation } from './services/api';

const CostCharts = lazy(() => import('./components/CostCharts'));
const STORAGE_KEY = 'autocompare_tco_state';
const DEFAULT_PARAMS = { kilometrage_annuel: 15000, duree_annees: 5, region: 'FR' };
const AUTO_RECONNECT_INTERVAL = 30_000;
const pendingSimulation = ids => ({ status: ids?.length ? 'pending' : 'idle', results: [], isMock: false });
const savedIds = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string' && id.trim()))].slice(0, 50) : null;

async function loadCatalogue({ signal, query, allowFallback, snapshot }) {
  const response = await getVehicules({ signal, query, allowFallback });
  response.pageIds = response.data.map(vehicle => vehicle.id);
  if (!response.meta) return response;
  const restoreIds = (snapshot.catalogMock ? snapshot.apiSelectedIds : snapshot.selectedIds) || [];
  const missing = restoreIds.filter(id => id.startsWith('carapi_') && !response.data.some(v => v.id === id));
  response.removedIds = [];
  response.selectionUnavailable = [];
  for (let offset = 0; offset < missing.length; offset += 4) {
    const restored = await Promise.all(missing.slice(offset, offset + 4).map(async id => {
      try { return await getVehiculeById(id, { signal }); }
      catch (err) {
        if (signal.aborted) throw err;
        if (err.status === 404) { response.removedIds.push(id); return null; }
        response.selectionUnavailable.push(id);
        const previous = snapshot.vehicles?.find(vehicle => vehicle.id === id);
        return { ...(previous || { id, marque: 'Véhicule sélectionné', modele: 'Fiche à recharger', source: 'carapi', prix_achat: null, consommation_moyenne: null }),
          simulable: false, load_error: true, indisponibilite: 'Fiche temporairement inaccessible. Votre sélection est conservée.' };
      }
    }));
    response.data.push(...restored.filter(Boolean));
  }
  return response;
}

function initialState() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { /* A new session also works when storage is unavailable. */ }
  const storedParams = saved?.params;
  const params = {
    kilometrage_annuel: Number.isInteger(storedParams?.kilometrage_annuel) && storedParams.kilometrage_annuel >= 2000 && storedParams.kilometrage_annuel <= 60000 ? storedParams.kilometrage_annuel : DEFAULT_PARAMS.kilometrage_annuel,
    duree_annees: Number.isInteger(storedParams?.duree_annees) && storedParams.duree_annees >= 1 && storedParams.duree_annees <= 15 ? storedParams.duree_annees : DEFAULT_PARAMS.duree_annees,
    region: ['FR', 'BE', 'DE', 'CH', 'ES'].includes(storedParams?.region) ? storedParams.region : DEFAULT_PARAMS.region,
  };
  const selectedIds = savedIds(saved?.selectedIds);
  try {
    const ajustements = validateAdjustments(storedParams?.ajustements);
    if (Object.keys(ajustements).length) params.ajustements = ajustements;
  } catch { /* Ignore invalid saved adjustments, keeping the usage profile. */ }
  const catalogMock = saved?.source === 'local';
  const apiSelectedIds = catalogMock ? savedIds(saved?.apiSelectedIds) : selectedIds;
  return { vehicles: [], selectedIds, apiSelectedIds, params, catalogStatus: 'loading', catalogVersion: 0, catalogMock, catalogMeta: null, catalogQuery: null, simulation: pendingSimulation([]), simulationVersion: 0, error: null, notice: null };
}

function reducer(state, action) {
  switch (action.type) {
    case 'catalog-loaded': {
      // Keep off-page selections for results, but display only the requested page.
      const vehicles = action.data;
      const available = new Set(vehicles.filter(v => v.simulable !== false || (v.load_error && !v.unavailable_permanent)).map(v => v.id));
      const enteringDemo = action.isMock && !state.catalogMock;
      const leavingDemo = !action.isMock && state.catalogMock;
      const previousIds = leavingDemo ? state.apiSelectedIds : state.selectedIds;
      let selectedIds = previousIds === null ? vehicles.filter(v => v.simulable !== false).slice(0, 2).map(v => v.id) : previousIds.filter(id => available.has(id));
      if (enteringDemo && previousIds?.length && !selectedIds.length) selectedIds = vehicles.slice(0, 2).map(v => v.id);
      const apiSelectedIds = action.isMock ? (enteringDemo ? state.selectedIds : state.apiSelectedIds) : selectedIds;
      const removed = !enteringDemo && previousIds?.some(id => !available.has(id));
      return { ...state, vehicles, catalogPageIds: action.pageIds || vehicles.map(v => v.id), selectedIds, apiSelectedIds, catalogMeta: action.meta || null, catalogStatus: 'ready', catalogMock: action.isMock, simulation: pendingSimulation(selectedIds), error: null, notice: removed ? 'Les véhicules qui ne figurent plus au catalogue ont été retirés de votre sélection.' : action.selectionUnavailable?.length ? 'Certaines fiches sélectionnées sont temporairement inaccessibles. Votre sélection est conservée ; vous pouvez réessayer ou les retirer dans « Ma sélection ».' : null };
    }
    case 'catalog-error': return { ...state, catalogStatus: 'error', error: { ...action.error, scope: 'catalog', message: action.error.message }, simulation: pendingSimulation([]) };
    case 'reload-catalog': return { ...state, catalogStatus: 'loading', catalogVersion: state.catalogVersion + 1, error: null, simulation: pendingSimulation([]) };
    case 'browse-catalog': return { ...state, catalogQuery: action.query, catalogStatus: 'loading', error: null, simulation: pendingSimulation([]) };
    case 'toggle': {
      if (!state.selectedIds?.includes(action.id) && state.selectedIds?.length >= 50) return { ...state, notice: 'Vous pouvez comparer jusqu’à 50 véhicules à la fois.' };
      const selectedIds = (state.selectedIds || []).includes(action.id) ? state.selectedIds.filter(id => id !== action.id) : [...(state.selectedIds || []), action.id];
      return { ...state, selectedIds, apiSelectedIds: state.catalogMock ? state.apiSelectedIds : selectedIds, simulation: pendingSimulation(state.catalogStatus === 'ready' ? selectedIds : []), error: state.error?.scope === 'catalog' ? state.error : null, notice: null };
    }
    case 'clear': return { ...state, selectedIds: [], apiSelectedIds: state.catalogMock ? state.apiSelectedIds : [], simulation: pendingSimulation([]), error: state.error?.scope === 'catalog' ? state.error : null, notice: null };
    case 'params': {
      if (JSON.stringify(state.params) === JSON.stringify(action.params)) return state;
      const params = { ...action.params };
      let notice = state.params.duree_annees !== params.duree_annees ? state.notice : null;
      if (state.params.duree_annees !== params.duree_annees && params.ajustements) {
        params.ajustements = Object.fromEntries(Object.entries(params.ajustements).map(([id, fields]) => {
          const { valeur_revente, ...remaining } = fields;
          if (valeur_revente !== undefined) notice = 'Durée modifiée : les valeurs de revente personnalisées ont été réinitialisées. Renseignez-les pour la nouvelle durée.';
          return [id, remaining];
        }).filter(([, fields]) => Object.keys(fields).length));
      }
      return { ...state, params, notice, simulation: pendingSimulation(state.catalogStatus === 'ready' ? state.selectedIds : []), error: state.error?.scope === 'catalog' ? state.error : null };
    }
    case 'simulation-loaded': return { ...state, simulation: { status: 'ready', results: action.results, isMock: action.isMock }, error: null };
    case 'simulation-error': return { ...state, simulation: { ...pendingSimulation([]), status: 'error' }, error: { ...action.error, scope: 'simulation', message: action.error.message } };
    case 'remove-unavailable': {
      const selectedIds = state.selectedIds.filter(id => !action.ids.includes(id));
      return { ...state, selectedIds, apiSelectedIds: state.catalogMock ? state.apiSelectedIds : selectedIds, simulation: pendingSimulation(selectedIds), error: null, notice: `${action.ids.length > 1 ? 'Les véhicules indisponibles ont été retirés' : 'Le véhicule indisponible a été retiré'} de votre sélection. ${selectedIds.length ? 'Le comparatif a été actualisé.' : 'Choisissez un autre modèle pour continuer.'}` };
    }
    case 'retry-simulation': return { ...state, simulationVersion: state.simulationVersion + 1, simulation: pendingSimulation(state.selectedIds), error: null };
    case 'export-error': return { ...state, error: { scope: 'export', message: 'Le PDF n’a pas pu être créé. Relancez l’export pour réessayer.' } };
    case 'export-success': return state.error?.scope === 'export' ? { ...state, error: null } : state;
    case 'dismiss-error': return { ...state, error: null };
    case 'dismiss-notice': return { ...state, notice: null };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [textMode, setTextMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { vehicles, selectedIds, apiSelectedIds, params, catalogStatus, catalogVersion, catalogMock, catalogMeta, catalogQuery, simulationVersion, simulation, error, notice } = state;
  const selected = selectedIds || [];
  const pageVehicles = vehicles.filter(vehicle => state.catalogPageIds?.includes(vehicle.id));
  const selectionSnapshot = useRef({ selectedIds, apiSelectedIds, catalogMock, vehicles });
  useEffect(() => { selectionSnapshot.current = { selectedIds, apiSelectedIds, catalogMock, vehicles }; }, [selectedIds, apiSelectedIds, catalogMock, vehicles]);
  const canExport = catalogStatus === 'ready' && simulation.status === 'ready' && simulation.results.length > 0;

  useEffect(() => {
    if (selectedIds === null) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedIds, params, source: catalogMock ? 'local' : 'api', apiSelectedIds })); } catch { /* Storage is optional. */ }
  }, [selectedIds, apiSelectedIds, params, catalogMock]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await loadCatalogue({ signal: controller.signal, query: catalogQuery, snapshot: selectionSnapshot.current });
        if (!controller.signal.aborted) dispatch({ type: 'catalog-loaded', ...response });
      } catch (err) {
        if (!controller.signal.aborted) dispatch({ type: 'catalog-error', error: err });
      }
    }
    load();
    return () => controller.abort();
  }, [catalogVersion, catalogQuery]);

  useEffect(() => {
    const shouldReconnect = (catalogMock && catalogStatus === 'ready')
      || (catalogStatus === 'error' && [0, 502, 503, 504].includes(error?.status));
    if (!shouldReconnect) return undefined;

    let checking = false;
    const controller = new AbortController();
    const checkConnection = async () => {
      if (checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const response = await loadCatalogue({ signal: controller.signal, allowFallback: false, query: catalogQuery, snapshot: selectionSnapshot.current });
        if (!controller.signal.aborted) dispatch({ type: 'catalog-loaded', ...response });
      } catch {
        // Keep the current state until the catalogue can be reached again.
      } finally {
        checking = false;
      }
    };
    const onOnline = () => checkConnection();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkConnection();
    };

    const interval = window.setInterval(checkConnection, AUTO_RECONNECT_INTERVAL);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [catalogMock, catalogStatus, catalogQuery, error?.status]);

  useEffect(() => {
    if (catalogStatus !== 'ready' || !selectedIds?.length) return;
    const controller = new AbortController();
    const source = catalogMock ? 'local' : 'api';
    const timer = setTimeout(async () => {
      try {
        const payload = { vehicule_ids: selectedIds, ...params };
        if (params.ajustements) payload.ajustements = Object.fromEntries(Object.entries(params.ajustements).filter(([id]) => selectedIds.includes(id)));
        const response = await runSimulation(payload, { signal: controller.signal, source });
        if (!controller.signal.aborted) dispatch({ type: 'simulation-loaded', results: response.data.resultats, isMock: response.isMock });
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err.status === 404) {
          let missing = (err.vehicleIds || []).filter(id => selectedIds.includes(id));
          if (!missing.length) {
            const details = await Promise.allSettled(selectedIds.map(id => getVehiculeById(id, { signal: controller.signal, source })));
            missing = selectedIds.filter((_, index) => details[index].status === 'rejected' && details[index].reason.status === 404);
          }
          if (controller.signal.aborted) return;
          if (missing.length) { dispatch({ type: 'remove-unavailable', ids: missing }); return; }
        }
        dispatch({ type: 'simulation-error', error: err });
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [catalogStatus, catalogVersion, selectedIds, params, catalogMock, simulationVersion]);

  async function handleExport() {
    if (!canExport || isExporting) return;
    setIsExporting(true);
    try {
      const { exportReport } = await import('./utils/exportReport');
      await exportReport({ results: simulation.results, vehicles, params, isMock: simulation.isMock });
      dispatch({ type: 'export-success' });
    } catch { dispatch({ type: 'export-error' }); }
    finally { setIsExporting(false); }
  }

  function retryError() {
    if (error?.scope === 'catalog') dispatch({ type: 'reload-catalog' });
    else if (error?.scope === 'export') handleExport();
    else dispatch({ type: 'retry-simulation' });
  }

  return <>
    <a href="#comparateur" className="skip-link">Aller au comparateur</a>
    <Navbar onExport={handleExport} isExporting={isExporting} canExport={canExport} />
    <main>
      <HeroBanner />
      <div className="comparison-area" id="comparateur">
        <div className="page-width">
          <div className="workspace-heading"><div><span className="eyebrow">VOTRE COMPARATEUR AUTOMOBILE</span><h2>Moins d’incertitudes.<br className="mobile-break" /> Plus de visibilité.</h2></div><div className="data-status" aria-live="polite"><span className={`status-dot ${catalogStatus === 'loading' ? 'is-loading' : catalogMock || catalogStatus === 'error' ? 'is-demo' : ''}`} /><span>{catalogStatus === 'loading' ? 'Chargement du catalogue' : catalogStatus === 'error' ? 'Catalogue indisponible' : catalogMock ? 'Mode démonstration' : 'Catalogue connecté'}</span><button className="icon-button" aria-label="Actualiser le catalogue" disabled={catalogStatus === 'loading'} onClick={() => dispatch({ type: 'reload-catalog' })}><RefreshCw size={13} /></button></div></div>
          {catalogMock && catalogStatus === 'ready' && <div className="demo-notice"><CircleHelp size={16} /><span>Le catalogue n’a pas pu être joint. Vous explorez des données de démonstration et des estimations locales. La connexion est vérifiée automatiquement toutes les 30 secondes.</span><button onClick={() => dispatch({ type: 'reload-catalog' })}>Reconnecter <ArrowUpRight size={13} /></button></div>}
          {error && <ErrorAlert error={error} onDismiss={() => dispatch({ type: 'dismiss-error' })} onRetry={retryError} />}
          {notice && <div className="inline-notice" role="status"><CircleHelp size={17} /><p>{notice}</p><button className="icon-button" onClick={() => dispatch({ type: 'dismiss-notice' })} aria-label="Fermer l’information"><X size={16} /></button></div>}
          <div className="configurator-grid"><VehicleSelector vehicles={pageVehicles} selectedIds={selected} onToggleVehicle={id => dispatch({ type: 'toggle', id })} loading={catalogStatus === 'loading'} isMock={catalogMock} meta={catalogMeta} catalogQuery={catalogQuery} onBrowse={query => dispatch({ type: 'browse-catalog', query })} /><SimulationControls params={params} onChange={value => dispatch({ type: 'params', params: value })} onApplyPreset={(km, years) => dispatch({ type: 'params', params: { ...params, kilometrage_annuel: km, duree_annees: years } })} /></div>
          <div className="selection-bar"><div className="selection-info"><span className="selection-icon"><ArrowLeftRight size={20} /></span><div><strong>{selected.length} véhicule{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}</strong><span>{selected.length ? 'Votre comparaison se met à jour automatiquement.' : 'Sélectionnez au moins un véhicule pour commencer.'}</span></div></div><div className="selection-chips">{selected.slice(0, 3).map(id => { const v = vehicles.find(vehicle => vehicle.id === id); return v && <button key={id} onClick={() => dispatch({ type: 'toggle', id })} aria-label={`Retirer ${v.marque} ${v.modele} de la sélection`}>{v.marque} {v.modele}<X size={13} /></button>; })}{selected.length > 3 && <span className="selection-extra">+{selected.length - 3}</span>}</div>{selected.length > 0 && <button className="clear-selection" onClick={() => dispatch({ type: 'clear' })}>Tout effacer</button>}<a className={`button button-lime ${!selected.length ? 'is-disabled' : ''}`} href={selected.length ? '#resultats' : undefined} aria-disabled={!selected.length}>Voir mon comparatif <ArrowRight size={17} /></a></div>
          <section className="results-section" id="resultats" aria-labelledby="results-title" aria-busy={simulation.status === 'pending'}>
            <SelectionManager vehicles={vehicles} selectedIds={selected} onRemove={id => dispatch({ type: 'toggle', id })} />
            <EstimationEditor vehicles={vehicles} selectedIds={selected} params={params} onChange={value => dispatch({ type: 'params', params: value })} />
            <CalculationAssumptions results={simulation.results} vehicles={vehicles} isMock={catalogMock} />
            <div className="results-heading"><div><div className="eyebrow"><span className="section-step">03</span> LES CHIFFRES QUI ÉCLAIRENT VOTRE CHOIX</div><h2 id="results-title">Votre route, votre budget.</h2><p>Une vision complète du coût de possession sur {params.duree_annees} ans.</p></div><button className={`button button-outline text-mode-button ${textMode ? 'is-active' : ''}`} onClick={() => setTextMode(v => !v)} aria-pressed={textMode}><FileText size={16} />{textMode ? 'Afficher les graphiques' : 'Version textuelle'}</button></div>
            <div className="sr-only" role="status" aria-live="polite">{simulation.status === 'pending' ? 'Calcul de votre comparatif en cours.' : simulation.status === 'ready' ? `Comparatif actualisé pour ${simulation.results.length} véhicules sur ${params.duree_annees} ans.` : ''}</div>
            {simulation.status === 'pending' && <div className="result-loading"><LoaderCircle className="spin" size={25} /><div><strong>On fait les comptes pour vous.</strong><p>Votre comparatif arrive dans un instant.</p></div></div>}
            {canExport ? <div className="results-content"><RecommendationCard results={simulation.results} vehicles={vehicles} params={params} />{textMode ? <A11yView results={simulation.results} vehicles={vehicles} params={params} /> : <><Suspense fallback={<div className="result-loading"><LoaderCircle className="spin" /> Chargement des graphiques…</div>}><CostCharts results={simulation.results} vehicles={vehicles} params={params} /></Suspense><ComparisonTable results={simulation.results} vehicles={vehicles} params={params} /></>}<div className="report-footer"><p><CircleHelp size={15} />{simulation.isMock ? 'Estimations de démonstration : les montants dépendent des hypothèses locales.' : 'Estimations AutoCompare · caractéristiques CarAPI · hypothèses détaillées ci-dessus.'}</p><button className="button button-dark" onClick={handleExport} disabled={isExporting}>{isExporting ? <LoaderCircle size={16} className="spin" /> : <Download size={16} />} Télécharger mon comparatif</button></div></div> : simulation.status !== 'pending' && <div className="results-empty"><span><ArrowLeftRight size={30} strokeWidth={1.5} /></span><h3>{simulation.status === 'error' ? 'Votre comparatif est en attente.' : 'Votre prochain choix commence ici.'}</h3><p>{simulation.status === 'error' ? 'Relancez le calcul pour retrouver votre comparaison.' : 'Choisissez vos véhicules, ajustez votre profil et laissez les chiffres vous guider.'}</p>{simulation.status === 'error' ? <button className="button button-outline" onClick={() => dispatch({ type: 'retry-simulation' })}><RefreshCw size={15} /> Relancer le calcul</button> : <a className="text-link" href="#catalog-title">Découvrir les véhicules <ArrowUpRight size={16} /></a>}</div>}
          </section>
        </div>
      </div>
      <section className="method-section page-width" id="methode" aria-labelledby="method-title"><div className="method-intro"><span className="eyebrow">COMPRENDRE AVANT DE CHOISIR</span><h2 id="method-title">Le prix d’achat<br />ne raconte pas tout.</h2><p>Le coût total de possession, ou TCO, rassemble les dépenses liées à votre voiture sur la durée choisie.</p><span className="method-note"><Leaf size={17} /> Toutes les motorisations, une même méthode.</span></div><div className="method-details"><div className="method-row"><span>01</span><div><h3>Choisissez vos véhicules</h3><p>Électrique, hybride, essence ou diesel : réunissez vos favoris dans un même comparatif.</p></div><ArrowUpRight size={19} /></div><div className="method-row"><span>02</span><div><h3>Partez de votre quotidien</h3><p>Distance annuelle, durée et pays : vos habitudes donnent du sens aux estimations.</p></div><ArrowUpRight size={19} /></div><div className="method-row"><span>03</span><div><h3>Regardez au-delà du prix affiché</h3><p>Énergie, entretien, assurance, décote et frais annexes. Retrouvez le total, le coût mensuel et le coût par kilomètre.</p></div><Check size={19} /></div><details className="method-faq"><summary>Qu’est-ce que la décote ?</summary><p>C’est la perte de valeur estimée entre l’achat et la revente du véhicule. Le calcul prend en compte cette perte de valeur, et non l’intégralité du prix d’achat en plus des dépenses d’usage.</p></details><details className="method-faq"><summary>Comment sont utilisées mes préférences ?</summary><p>Votre sélection et vos paramètres sont enregistrés dans ce navigateur. Le service de simulation reçoit les véhicules choisis, le kilométrage, la durée et le pays pour calculer votre comparatif.</p></details></div></section>
    </main>
    <footer className="site-footer page-width"><a href="#accueil" className="brand"><span className="brand-mark"><ArrowLeftRight size={18} /></span><span>auto<span className="brand-light">compare</span><span className="brand-dot">.</span></span></a><p>Le bon véhicule. Pour votre vie.</p><span><LockKeyhole size={13} /> Sans compte, sans engagement.</span><small>Projet Hackathon · {new Date().getFullYear()}</small></footer>
  </>;
}
