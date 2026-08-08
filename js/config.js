/**
 * Configuration globale de l'application Parcours Sportif.
 * Définition des clés, des profils de routage et des cartes.
 * 
 * @author Fabrice Faucheux (https://faucheux.bzh)
 */

const CONFIG = {
  // Clé API OpenRouteService (Mode Hybride : fallback automatique si non définie ou quota dépassé)
  orsApiKey: localStorage.getItem('ors_api_key') || '',

  // Endpoints API OpenRouteService
  orsApiUrl: 'https://api.openrouteservice.org/v2/directions',

  // Profils de déplacement selon la discipline
  profils: {
    vtt: {
      nom: 'VTT / VTC',
      codeOrs: 'cycling-mountain',
      vitesseMoyenne: 16, // km/h
      icone: '🚵',
      couleur: '#10b981', // Vert émeraude
      description: 'Chemins non revêtus, sentiers, forêts et dénivelé'
    },
    gravel: {
      nom: 'Gravel',
      codeOrs: 'cycling-regular',
      vitesseMoyenne: 21, // km/h
      icone: '🚵‍♂️',
      couleur: '#f59e0b', // Amber / Orange
      description: 'Pistes, voies vertes, petites routes et chemins carrossables'
    },
    route: {
      nom: 'Route',
      codeOrs: 'cycling-road',
      vitesseMoyenne: 26, // km/h
      icone: '🚴',
      couleur: '#3b82f6', // Bleu
      description: 'Routes goudronnées, pistes cyclables et enrobé lisse'
    }
  },

  // Options de préférence du réseau routier
  preferencesRoutes: {
    tranquille: {
      nom: 'Petites routes & voies communales',
      eviterNationales: true,
      poidsOsrm: 'quiet',
      codeOrs: { avoid_features: ['highways', 'tollways'] }
    },
    equilibre: {
      nom: 'Équilibré (Départementales & communales)',
      eviterNationales: false,
      poidsOsrm: 'balanced',
      codeOrs: {}
    },
    rapide: {
      nom: 'Direct / Axes majeurs (Départementales & nationales)',
      eviterNationales: false,
      poidsOsrm: 'fastest',
      codeOrs: {}
    }
  },

  // Fournisseurs de fonds de carte (Leaflet)
  fondsDeCarte: {
    cyclosm: {
      nom: 'CyclOSM (Pistes cyclables)',
      url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="https://www.cyclosm.org">CyclOSM</a>',
      maxZoom: 18
    },
    opentopo: {
      nom: 'OpenTopoMap (Relief & Dénivelé)',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
      maxZoom: 17
    },
    osm: {
      nom: 'OpenStreetMap Standard',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }
  },

  // Paramètres par défaut du générateur de parcours
  parcoursDefaut: {
    distanceKm: 30,
    minKm: 5,
    maxKm: 200,
    discipline: 'gravel',
    centreInitial: [48.117266, -1.677794] // Rennes (Bretagne) par défaut
  }
};
