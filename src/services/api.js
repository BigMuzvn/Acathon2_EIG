const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://carapi.app/api';

// Mock catalog for offline/fallback mode if real API is down or CORS blocked
const MOCK_VEHICLES = [
  {
    id: "veh_001",
    marque: "Renault",
    modele: "Clio V 1.0 TCe",
    motorisation: "essence",
    prix_achat: 21000,
    consommation_moyenne: 5.5,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_002",
    marque: "Renault",
    modele: "Megane E-Tech",
    motorisation: "electrique",
    prix_achat: 35000,
    consommation_moyenne: 16.5,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_003",
    marque: "Peugeot",
    modele: "e-208 GT",
    motorisation: "electrique",
    prix_achat: 33800,
    consommation_moyenne: 15.2,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_004",
    marque: "Toyota",
    modele: "Yaris Hybrid 116",
    motorisation: "hybride",
    prix_achat: 24500,
    consommation_moyenne: 4.2,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_005",
    marque: "Tesla",
    modele: "Model 3 Prop",
    motorisation: "electrique",
    prix_achat: 39990,
    consommation_moyenne: 14.4,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1536700503339-1e4b06520771?w=500&auto=format&fit=crop&q=80"
  },
  {
    id: "veh_006",
    marque: "Volkswagen",
    modele: "Golf 8 2.0 TDI",
    motorisation: "diesel",
    prix_achat: 32000,
    consommation_moyenne: 4.6,
    annee: 2025,
    image_url: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=500&auto=format&fit=crop&q=80"
  }
];

/**
 * Fetch available vehicles list
 */
export async function getVehicules() {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicules`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      if (res.status === 500) {
        throw { status: 500, message: "Erreur serveur API. Impossible de charger la liste des véhicules." };
      }
      throw { status: res.status, message: `Erreur API (${res.status}) lors du chargement des véhicules.` };
    }

    const data = await res.json();
    return { data, isMock: false };
  } catch (err) {
    console.warn("API CarAPI non disponible ou bloquée CORS, bascule sur les données locales:", err);
    // Return mock with fallback indicator
    return { data: MOCK_VEHICLES, isMock: true, warning: err.message || "Mode hors-ligne / fallback actif" };
  }
}

/**
 * Fetch single vehicle by ID
 */
export async function getVehiculeById(id) {
  try {
    const res = await fetch(`${API_BASE_URL}/vehicules/${id}`);
    if (res.status === 404) {
      throw { status: 404, message: `Le véhicule avec l'ID ${id} est introuvable.` };
    }
    if (!res.ok) {
      throw { status: res.status, message: "Impossible de récupérer les détails du véhicule." };
    }
    return await res.json();
  } catch (err) {
    if (err.status === 404) throw err;
    const mock = MOCK_VEHICLES.find(v => v.id === id);
    if (!mock) throw { status: 404, message: `Le véhicule ${id} n'existe pas.` };
    return mock;
  }
}

/**
 * Run simulation with parameters validation & calculation
 */
export async function runSimulation(payload) {
  const { vehicule_ids, kilometrage_annuel, duree_annees, region } = payload;

  // Frontend validation for code 400
  if (!vehicule_ids || vehicule_ids.length === 0) {
    throw { status: 400, message: "Veuillez sélectionner au moins un véhicule." };
  }

  if (kilometrage_annuel <= 0 || isNaN(kilometrage_annuel)) {
    throw { status: 400, message: "Le kilométrage annuel doit être supérieur à 0." };
  }

  if (duree_annees <= 0 || duree_annees > 15 || isNaN(duree_annees)) {
    throw { status: 400, message: "La durée de possession doit être comprise entre 1 et 15 ans." };
  }

  try {
    const res = await fetch(`${API_BASE_URL}/simulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ vehicule_ids, kilometrage_annuel, duree_annees, region })
    });

    if (res.status === 400) {
      const errorBody = await res.json().catch(() => ({}));
      throw { status: 400, message: errorBody.message || "Paramètres de simulation invalides." };
    }

    if (res.status === 404) {
      throw { status: 404, message: "Un ou plusieurs véhicules de la sélection sont introuvables." };
    }

    if (res.status === 500) {
      throw { status: 500, message: "Erreur serveur lors du calcul de la simulation." };
    }

    if (!res.ok) {
      throw { status: res.status, message: "Erreur lors de l'exécution de la simulation." };
    }

    const data = await res.json();
    return { data, isMock: false };

  } catch (err) {
    if (err.status) throw err;

    // Fallback Mock simulation calculation according to realistic financial formulas
    console.warn("Calcul local de secours exécuté pour la simulation:", err);

    const resultats = vehicule_ids.map(id => {
      const veh = MOCK_VEHICLES.find(v => v.id === id) || {
        id,
        marque: "Véhicule",
        modele: id,
        motorisation: "essence",
        prix_achat: 25000,
        consommation_moyenne: 6.0
      };

      const totalKm = kilometrage_annuel * duree_annees;
      const isElectric = veh.motorisation === "electrique";
      const isHybrid = veh.motorisation === "hybride";
      const isDiesel = veh.motorisation === "diesel";

      // Price per L or kWh based on region multiplier
      const regionMultiplier = region === "CH" ? 1.25 : region === "DE" ? 1.15 : 1.0;

      let energyCostPer100 = 0;
      if (isElectric) {
        energyCostPer100 = veh.consommation_moyenne * 0.25 * regionMultiplier; // kWh * ~0.25€
      } else if (isHybrid) {
        energyCostPer100 = veh.consommation_moyenne * 1.75 * regionMultiplier;
      } else if (isDiesel) {
        energyCostPer100 = veh.consommation_moyenne * 1.70 * regionMultiplier;
      } else {
        energyCostPer100 = veh.consommation_moyenne * 1.85 * regionMultiplier;
      }

      const totalCarburant = Math.round((totalKm / 100) * energyCostPer100);
      const totalEntretien = Math.round(duree_annees * (isElectric ? 450 : 700));
      const totalAssurance = Math.round(duree_annees * (isElectric ? 850 : 980));
      
      // Depreciation (décote)
      const decotePercent = isElectric ? 0.45 : 0.40;
      const totalDecote = Math.round(veh.prix_achat * (1 - Math.pow(1 - decotePercent / duree_annees, duree_annees)));
      const totalAutres = Math.round(duree_annees * 300); // péages, entretien pneus...

      const coutTotal = totalCarburant + totalEntretien + totalAssurance + totalDecote + totalAutres;
      const coutMensuelMoyen = Math.round(coutTotal / (duree_annees * 12));
      const coutParKm = Number((coutTotal / totalKm).toFixed(2));

      // Evolution par année
      const evolution_annuelle = [];
      let cumul = 0;
      const annualBaseCost = (totalCarburant + totalEntretien + totalAssurance + totalAutres) / duree_annees;

      for (let y = 1; y <= duree_annees; y++) {
        const annualDecote = totalDecote * (1 / duree_annees);
        cumul += Math.round(annualBaseCost + annualDecote);
        evolution_annuelle.push({
          annee: y,
          cout_cumule: cumul
        });
      }

      return {
        vehicule_id: veh.id,
        cout_total: coutTotal,
        cout_mensuel_moyen: coutMensuelMoyen,
        cout_par_km: coutParKm,
        detail: {
          carburant: totalCarburant,
          entretien: totalEntretien,
          assurance: totalAssurance,
          decote_estimee: totalDecote,
          autres: totalAutres
        },
        evolution_annuelle
      };
    });

    return {
      data: { resultats },
      isMock: true,
      warning: "Résultats générés via l'algorithme de simulation local (API inaccessible)"
    };
  }
}
