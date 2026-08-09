/**
 * Module de calcul de route et de génération de boucles (Mode Hybride).
 * Supporte OpenRouteService API (round_trip) et un algorithme géométrique de secours.
 * 
 * @author Fabrice Faucheux (https://faucheux.bzh)
 */

class GenerateurDeParcours {
  constructor() {
    this.graineCourante = Math.floor(Math.random() * 100);
  }

  /**
   * Génère une boucle d'entraînement selon les paramètres spécifiés.
   * 
   * @param {number} lat - Latitude du point de départ
   * @param {number} lng - Longitude du point de départ
   * @param {number} distanceKm - Distance cible souhaitée en km
   * @param {string} discipline - 'vtt' | 'gravel' | 'route'
   * @param {boolean} nouvelleGraine - Si true, force la modification de la direction
   * @returns {Promise<Object>} Données de la route calculée avec métriques et altitudes
   */
  /**
   * Génère une boucle d'entraînement selon les paramètres spécifiés.
   * 
   * @param {number} lat - Latitude du point de départ
   * @param {number} lng - Longitude du point de départ
   * @param {number} distanceKm - Distance cible souhaitée en km
   * @param {string} discipline - 'vtt' | 'gravel' | 'route'
   * @param {boolean} nouvelleGraine - Si true, force la modification de la direction
   * @param {string} prefRoute - 'tranquille' | 'equilibre' | 'rapide'
   * @param {boolean} eviterNationales - Si true, force l'évitement des axes majeurs
   * @returns {Promise<Object>} Données de la route calculée avec métriques et altitudes
   */
  /**
   * Génère une boucle d'entraînement selon les paramètres spécifiés.
   * 
   * @param {number} lat - Latitude du point de départ
   * @param {number} lng - Longitude du point de départ
   * @param {number} distanceKm - Distance cible souhaitée en km
   * @param {string} discipline - 'vtt' | 'gravel' | 'route'
   * @param {boolean} nouvelleGraine - Si true, force la modification de la direction
   * @param {string} prefRoute - 'tranquille' | 'equilibre' | 'rapide'
   * @param {boolean} eviterNationales - Si true, force l'évitement des axes majeurs
   * @param {string} directionPref - 'aleatoire' | 'nord' | 'est' | 'sud' | 'ouest'
   * @param {boolean} ventIntelligent - Si true, optimise le sens selon la météo
   * @param {number|null} vitessePerso - Vitesse personnalisée sur le plat (km/h)
   * @param {boolean} eviterDenivele - Si true, optimise pour éviter les pentes fortes (ORS)
   * @returns {Promise<Object>} Données de la route calculée avec métriques et altitudes
   */
  async genererBoucle(lat, lng, distanceKm, discipline, nouvelleGraine = false, prefRoute = 'equilibre', eviterNationales = false, directionPref = 'aleatoire', ventIntelligent = false, vitessePerso = null, eviterDenivele = false) {
    if (nouvelleGraine) {
      this.graineCourante = Math.floor(Math.random() * 100);
    }

    const profilInfo = CONFIG.profils[discipline] || CONFIG.profils.gravel;

    // --- OPTIMISATION VENT (MÉTÉO) ---
    if (ventIntelligent) {
      try {
        const urlMeteo = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_direction_10m`;
        const reponseMeteo = await fetch(urlMeteo);
        if (reponseMeteo.ok) {
          const jsonMeteo = await reponseMeteo.json();
          const capVent = jsonMeteo.current.wind_direction_10m; // 0=Nord, 90=Est, 180=Sud, 270=Ouest
          
          // Le vent vient de 'capVent'. 
          // Si le vent vient de l'Ouest (270°), il souffle vers l'Est.
          // Pour l'avoir de face à l'aller, il faut partir vers l'Ouest (270°).
          // On va convertir le cap en direction cardinale privilégiée.
          if (capVent >= 315 || capVent < 45) directionPref = 'nord';
          else if (capVent >= 45 && capVent < 135) directionPref = 'est';
          else if (capVent >= 135 && capVent < 225) directionPref = 'sud';
          else directionPref = 'ouest';
          
          console.log(`🌬️ Vent intelligent activé : vent venant de ${capVent}°. Cap initial forcé vers le ${directionPref}.`);
        }
      } catch (e) {
        console.warn("Impossible de récupérer la météo pour le vent :", e);
      }
    }

    // 1. Géométrie : on génère les waypoints mathématiques qui forcent la forme et la direction
    const waypoints = this.genererWaypointsGeometriques(lat, lng, distanceKm, this.graineCourante, prefRoute, eviterNationales, directionPref);

    // 2. Routage via OpenRouteService (si clé API)
    if (CONFIG.orsApiKey) {
      try {
        const donneesOrs = await this.calculerViaOrsDirections(waypoints, profilInfo.codeOrs, prefRoute, eviterNationales, eviterDenivele);
        if (donneesOrs) {
          const feature = donneesOrs.features[0];
          let coords = feature.geometry.coordinates;
          const distMetres = feature.properties.summary.distance;
          
          coords = this.purgerToutesLesAntennes(coords);
          
          // S'assurer que le premier et le dernier point sont strictly identiques au point de départ (fermeture de boucle)
          if (coords.length > 0) {
            // ORS inclut parfois des altitudes (3D) dès le départ, il faut conserver l'altitude s'il y en a une, sinon juste écraser X/Y
            coords[0][0] = lng;
            coords[0][1] = lat;
            
            const ptExtremite = coords[coords.length - 1];
            if (ptExtremite[0] !== lng || ptExtremite[1] !== lat) {
              coords.push([...coords[0]]); // duplique le point de départ exact
            }
          }

          const coordsAvecAltitude = await this.enrichirAvecAltitudes(coords);
          let metriques = this.traiterCoordonneesEtCalculerMetriques(coordsAvecAltitude, distMetres, profilInfo, vitessePerso);

          // Extraction des surfaces si disponibles (ORS uniquement)
          if (donneesOrs.features[0].properties && donneesOrs.features[0].properties.extras && donneesOrs.features[0].properties.extras.surface) {
            const surfaceSummary = donneesOrs.features[0].properties.extras.surface.summary;
            let asphalte = 0, gravier = 0, terre = 0;
            let totalAmount = 0;
            
            surfaceSummary.forEach(s => {
              const val = s.value;
              const amt = s.amount;
              totalAmount += amt;
              // Classification simplifiée selon ORS surface values
              if ([1, 3, 4, 5, 6].includes(val)) asphalte += amt;
              else if ([2, 8, 9, 10].includes(val)) gravier += amt;
              else terre += amt; // 7, 11, 12, 13, 14, etc.
            });
            
            if (totalAmount > 0) {
              metriques.surfaces = {
                asphalte: Math.round((asphalte / totalAmount) * 100),
                gravier: Math.round((gravier / totalAmount) * 100),
                terre: Math.round((terre / totalAmount) * 100)
              };
            }
          }
          
          return metriques;
        }
      } catch (erreur) {
        console.warn("Échec OpenRouteService Directions, basculement vers OSRM...", erreur);
      }
    }

    // 3. Fallback géométrique OSRM
    return await this.calculerViaOsrmDirections(waypoints, distanceKm, profilInfo, lat, lng, vitessePerso);
  }

  /**
   * Génère le polygone de waypoints directifs (Cercle décentré).
   */
  genererWaypointsGeometriques(latDepart, lngDepart, distanceKm, graine, prefRoute, eviterNationales, directionPref) {
    let facteurSinuosite = 0.68;
    if (prefRoute === 'tranquille' || eviterNationales) {
      facteurSinuosite = 0.58;
    } else if (prefRoute === 'rapide') {
      facteurSinuosite = 0.78;
    }

    const rayonKm = (distanceKm / (2 * Math.PI)) * facteurSinuosite;
    let angleCentreRad;
    switch (directionPref) {
      case 'nord': angleCentreRad = Math.PI / 2; break;
      case 'est': angleCentreRad = 0; break;
      case 'sud': angleCentreRad = (3 * Math.PI) / 2; break;
      case 'ouest': angleCentreRad = Math.PI; break;
      case 'aleatoire':
      default:
        angleCentreRad = ((graine * 3.6) * Math.PI) / 180;
        break;
    }

    const latCentre = latDepart + (rayonKm / 111.32) * Math.sin(angleCentreRad);
    const lngCentre = lngDepart + (rayonKm / (111.32 * Math.cos((latDepart * Math.PI) / 180))) * Math.cos(angleCentreRad);
    const angleDepartDepuisCentre = angleCentreRad + Math.PI;
    
    const nbEtapesIntermediaires = (prefRoute === 'tranquille' || eviterNationales) ? 4 : 3;
    const totalPoints = nbEtapesIntermediaires + 1;
    const waypoints = [[lngDepart, latDepart]];

    for (let k = 1; k <= nbEtapesIntermediaires; k++) {
      const angleEtape = angleDepartDepuisCentre + (k * 2 * Math.PI / totalPoints);
      const perturbation = 1.0 + 0.15 * Math.sin(k * 2.3 + graine);
      const rP = rayonKm * perturbation;
      const latWp = latCentre + (rP / 111.32) * Math.sin(angleEtape);
      const lngWp = lngCentre + (rP / (111.32 * Math.cos((latCentre * Math.PI) / 180))) * Math.cos(angleEtape);
      waypoints.push([lngWp, latWp]);
    }

    waypoints.push([lngDepart, latDepart]);
    return waypoints;
  }

  /**
   * Routage via l'API standard OpenRouteService Directions.
   */
  async calculerViaOrsDirections(waypoints, codeOrs, prefRoute, eviterNationales, eviterDenivele = false) {
    const url = `${CONFIG.orsApiUrl}/${codeOrs}/geojson`;
    const optionsOrs = {};
    if (eviterNationales || prefRoute === 'tranquille') {
      optionsOrs.avoid_features = ['highways', 'tollways'];
    }
    
    // Évitement de la pente si option cochée et profil adapté
    if (eviterDenivele && codeOrs.includes('cycling')) {
      optionsOrs.profile_params = {
        weightings: { steepness_difficulty: 3 }
      };
    }

    const corps = {
      coordinates: waypoints,
      options: optionsOrs,
      extra_info: ["surface"],
      elevation: false // L'élévation est gérée par Open-Meteo (ORS renvoie souvent 0 ou null par défaut)
    };

    const reponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CONFIG.orsApiKey
      },
      body: JSON.stringify(corps)
    });

    if (!reponse.ok) throw new Error(`Erreur HTTP ORS : ${reponse.status}`);
    return await reponse.json();
  }

  /**
   * Routage via le moteur OSRM (Mode Hybride autonome de secours).
   */
  async calculerViaOsrmDirections(waypoints, distanceKm, profilInfo, latDepart, lngDepart, vitessePerso = null) {
    // Requête OSRM (Profil dynamique avec radiuses de tolérance et continue_straight)
    const coordsString = waypoints.map(wp => `${wp[0]},${wp[1]}`).join(';');
    const radiuses = waypoints.map(() => '400').join(';');
    const codeOsrm = profilInfo.codeOsrm || 'cycling';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${codeOsrm}/${coordsString}?overview=full&geometries=geojson&steps=true&radiuses=${radiuses}`;

    let coordsGeojson = [];
    let distanceMetres = 0;

    try {
      const reponseOsrm = await fetch(osrmUrl);
      if (reponseOsrm.ok) {
        const jsonOsrm = await reponseOsrm.json();
        if (jsonOsrm.routes && jsonOsrm.routes.length > 0) {
          coordsGeojson = jsonOsrm.routes[0].geometry.coordinates; // [[lng, lat], ...]
          distanceMetres = jsonOsrm.routes[0].distance;
        }
      }
    } catch (e) {
      console.warn("Erreur OSRM fallback:", e);
    }

    // Si OSRM n'a pas pu renvoyer la géométrie ou si la route est anormalement courte (< 10% de la distance demandée)
    if (coordsGeojson.length === 0 || distanceMetres < (distanceKm * 100)) {
      coordsGeojson = waypoints;
      distanceMetres = distanceKm * 1000;
    }

    // Purge drastique de toutes les antennes, détours en cul-de-sac et impasses parasites
    coordsGeojson = this.purgerToutesLesAntennes(coordsGeojson);

    // S'assurer que le premier et le dernier point de la géométrie sont strictly identiques au point de départ
    if (coordsGeojson.length > 0) {
      coordsGeojson[0] = [lngDepart, latDepart];
      const dernierPt = coordsGeojson[coordsGeojson.length - 1];
      if (dernierPt[0] !== lngDepart || dernierPt[1] !== latDepart) {
        coordsGeojson.push([lngDepart, latDepart]);
      }
    }

    // Enrichissement en altitudes via Open-Meteo Elevation API
    const coordsAvecAltitude = await this.enrichirAvecAltitudes(coordsGeojson);

    return this.traiterCoordonneesEtCalculerMetriques(coordsAvecAltitude, distanceMetres, profilInfo, vitessePerso);
  }

  /**
   * Enrichit un ensemble complet de coordonnées [lng, lat] avec les altitudes réelles via Open-Meteo.
   */
  async enrichirAvecAltitudes(coords2D) {
    const TAILLE_LOT = 80;
    const lots = [];
    
    // 1. Découpage en lots
    for (let i = 0; i < coords2D.length; i += TAILLE_LOT) {
      lots.push(coords2D.slice(i, i + TAILLE_LOT));
    }

    // 2. Préparation des requêtes asynchrones parallèles
    const requetes = lots.map(async (lot) => {
      const lats = lot.map(p => p[1]).join(',');
      const lngs = lot.map(p => p[0]).join(',');
      const urlElevation = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;
      
      try {
        const reponse = await fetch(urlElevation);
        if (reponse.ok) {
          const json = await reponse.json();
          return json.elevation || new Array(lot.length).fill(null);
        }
      } catch (e) {
        console.warn("Erreur de récupération des altitudes pour un lot:", e);
      }
      return new Array(lot.length).fill(null); // Fallback silencieux sur null
    });

    // 3. Exécution parallèle
    const resultatsLots = await Promise.all(requetes);
    const toutesAltitudes = resultatsLots.flat();

    // 4. Association 1-pour-1 (sans altérer si l'API a échoué)
    const coords3D = coords2D.map((coord, index) => {
      let alt = toutesAltitudes[index];
      if (alt === null || alt === undefined) {
        alt = coord.length > 2 ? coord[2] : 0; // On garde l'altitude existante, ou 0 par défaut
      }
      return [coord[0], coord[1], Math.round(alt)];
    });

    return coords3D;
  }



  /**
   * Calcule le profil d'élévation, D+, D-, altitudes min/max et temps estimé.
   */
  traiterCoordonneesEtCalculerMetriques(coords3D, distanceMetres, profilInfo, vitessePerso = null) {
    let denivelePositif = 0;
    let deniveleNegatif = 0;
    let altMin = Infinity;
    let altMax = -Infinity;

    const profilAltimetrique = [];
    let distanceCumuleeKm = 0;

    for (let i = 0; i < coords3D.length; i++) {
      const p1 = coords3D[i];
      const lng = p1[0];
      const lat = p1[1];
      const alt = p1.length > 2 ? p1[2] : 0;

      if (alt < altMin) altMin = alt;
      if (alt > altMax) altMax = alt;

      if (i > 0) {
        const p0 = coords3D[i - 1];
        const distSegment = this.calculerDistanceHaversine(p0[1], p0[0], lat, lng);
        distanceCumuleeKm += distSegment;

        const altDiff = alt - (p0.length > 2 ? p0[2] : 0);
        if (altDiff > 0) {
          denivelePositif += altDiff;
        } else {
          deniveleNegatif += Math.abs(altDiff);
        }
      }

      profilAltimetrique.push({
        distanceKm: parseFloat(distanceCumuleeKm.toFixed(2)),
        altitude: Math.round(alt),
        lat: lat,
        lng: lng
      });
    }

    const distanceTotaleKm = parseFloat((distanceMetres / 1000).toFixed(1));
    
    // 4. Calcul du temps estimé : Temps plat + Temps d'ascension (VAM)
    const vitesseBasePlat = vitessePerso || profilInfo.vitesseMoyenne;
    const tempsPlat = distanceTotaleKm / vitesseBasePlat;
    const tempsAscension = denivelePositif / profilInfo.vam;
    const heuresEstimees = tempsPlat + tempsAscension;
    
    const heures = Math.floor(heuresEstimees);
    const minutes = Math.round((heuresEstimees - heures) * 60);

    // Calcul de l'Indice de difficulté (IBP simplifié)
    const ratioDiff = distanceTotaleKm + (denivelePositif / 10);
    const isPedestre = profilInfo.codeOrs.includes('foot');
    const seuilBleu = isPedestre ? 15 : 50;
    const seuilRouge = isPedestre ? 25 : 80;
    const seuilNoir = isPedestre ? 40 : 120;

    let difficulte = { nom: 'Vert (Facile)', couleur: '#10b981', ibp: Math.round(ratioDiff) };
    if (ratioDiff >= seuilBleu) difficulte = { nom: 'Bleu (Modéré)', couleur: '#3b82f6', ibp: Math.round(ratioDiff) };
    if (ratioDiff >= seuilRouge) difficulte = { nom: 'Rouge (Difficile)', couleur: '#f59e0b', ibp: Math.round(ratioDiff) };
    if (ratioDiff >= seuilNoir) difficulte = { nom: 'Noir (Expert)', couleur: '#ef4444', ibp: Math.round(ratioDiff) };

    // Optimisation UI : sous-échantillonnage du profil pour le composant Chart.js (max 250 points)
    const MAX_POINTS_CHART = 250;
    const pasEchantillon = Math.max(1, Math.floor(profilAltimetrique.length / MAX_POINTS_CHART));
    const profilAltimetriqueChart = [];
    for (let i = 0; i < profilAltimetrique.length; i += pasEchantillon) {
      profilAltimetriqueChart.push(profilAltimetrique[i]);
    }
    if (profilAltimetriqueChart[profilAltimetriqueChart.length - 1] !== profilAltimetrique[profilAltimetrique.length - 1]) {
      profilAltimetriqueChart.push(profilAltimetrique[profilAltimetrique.length - 1]);
    }

    return {
      distanceKm: distanceTotaleKm,
      denivelePositif: Math.round(denivelePositif),
      deniveleNegatif: Math.round(deniveleNegatif),
      altitudeMin: isFinite(altMin) ? Math.round(altMin) : 0,
      altitudeMax: isFinite(altMax) ? Math.round(altMax) : 0,
      tempsEstimeFormate: `${heures}h${minutes < 10 ? '0' : ''}${minutes}`,
      vitesseMoyenne: vitesseBasePlat,
      difficulte: difficulte,
      discipline: profilInfo,
      coordonnees: coords3D, // Trace HD complète
      profilAltimetrique: profilAltimetriqueChart // Trace allégée pour Chart.js
    };
  }

  /**
   * Filtre de purge drastique des antennes et impasses (cul-de-sac) :
   * Détecte les nœuds où la trace repasse au même endroit géologique et supprime
   * intégralement les sous-boucles parasites (antennes) pour ne conserver que la boucle principale.
   */
  purgerToutesLesAntennes(coords) {
    if (!coords || coords.length < 10) return coords;

    let modification = true;
    let traceActuelle = [...coords];
    let tours = 0;

    while (modification && tours < 6) {
      modification = false;
      tours++;
      const nouvelleTrace = [];
      let i = 0;

      while (i < traceActuelle.length) {
        const ptA = traceActuelle[i];
        nouvelleTrace.push(ptA);

        // Chercher l'indice j le plus éloigné dans l'ordre chronologique qui repasse quasiment au même endroit (< 40m)
        let meilleurJ = -1;
        const limiteBasse = i + 6;
        
        // On ne cherche que si on peut faire un saut d'au moins 6 points vers l'avant
        if (limiteBasse < traceActuelle.length) {
          // Sécurité : on empêche j d'atteindre la toute fin de la boucle si i est au début.
          // Cela évite de tronquer le corps complet de la boucle (qui est physiquement refermée).
          const limiteHaute = Math.min(traceActuelle.length - 1, i + Math.floor(traceActuelle.length * 0.75));

          for (let j = limiteHaute; j >= limiteBasse; j--) {
            const ptB = traceActuelle[j];
            const distMetres = this.calculerDistanceHaversine(ptA[1], ptA[0], ptB[1], ptB[0]) * 1000;

            if (distMetres < 40) {
              meilleurJ = j;
              break; // Premier trouvé depuis la fin = le plus grand saut/raccourci d'antenne
            }
          }
        }

        if (meilleurJ > 0) {
          // Sauter l'antenne / cul-de-sac directement vers le point de jonction
          i = meilleurJ;
          modification = true;
        } else {
          i++;
        }
      }

      traceActuelle = nouvelleTrace;
    }

    return traceActuelle;
  }

  /**
   * Calcul de la distance entre 2 points géographiques (Formule d'Haversine).
   */
  calculerDistanceHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
