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
   * Utilitaire de log structuré : affiche dans la console ET dans le panneau de debug in-app.
   */
  debugLog(niveau, message, donnees = null) {
    const horodatage = new Date().toLocaleTimeString('fr-FR');
    const texte = donnees !== null
      ? `[${horodatage}] ${message}: ${JSON.stringify(donnees)}`
      : `[${horodatage}] ${message}`;

    if (niveau === 'erreur') console.error(texte);
    else if (niveau === 'avertissement') console.warn(texte);
    else console.log(texte);

    const panneau = document.getElementById('debug-log-corps');
    if (panneau) {
      const ligne = document.createElement('div');
      ligne.className = `debug-log-ligne debug-${niveau}`;
      ligne.textContent = texte;
      panneau.appendChild(ligne);
      panneau.scrollTop = panneau.scrollHeight;
    }
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
    this.debugLog('info', `🚀 Génération boucle`, { discipline, distanceKm, lat: lat.toFixed(4), lng: lng.toFixed(4), prefRoute, directionPref });

    // --- OPTIMISATION VENT (MÉTÉO) ---
    if (ventIntelligent) {
      try {
        const urlMeteo = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_direction_10m`;
        const reponseMeteo = await fetch(urlMeteo);
        if (reponseMeteo.ok) {
          const jsonMeteo = await reponseMeteo.json();
          const capVent = jsonMeteo.current.wind_direction_10m;
          if (capVent >= 315 || capVent < 45) directionPref = 'nord';
          else if (capVent >= 45 && capVent < 135) directionPref = 'est';
          else if (capVent >= 135 && capVent < 225) directionPref = 'sud';
          else directionPref = 'ouest';
          this.debugLog('info', `🌬️ Vent intelligent`, { capVent, directionForcée: directionPref });
        }
      } catch (e) {
        this.debugLog('avertissement', 'Météo vent indisponible', e.message);
      }
    }

    // 1. Géométrie
    const waypoints = this.genererWaypointsGeometriques(lat, lng, distanceKm, this.graineCourante, prefRoute, eviterNationales, directionPref);
    this.debugLog('info', `📍 Waypoints générés`, { nombre: waypoints.length, premier: waypoints[0], dernier: waypoints[waypoints.length - 1] });

    // 2. Routage via OpenRouteService (si clé API)
    if (CONFIG.orsApiKey) {
      this.debugLog('info', '🔑 Clé ORS détectée, appel API en cours...');
      try {
        const donneesOrs = await this.calculerViaOrsDirections(waypoints, profilInfo.codeOrs, prefRoute, eviterNationales, eviterDenivele);
        if (donneesOrs) {
          const feature = donneesOrs.features[0];
          let coords = feature.geometry.coordinates;
          const distMetres = feature.properties.summary.distance;
          this.debugLog('info', '✅ ORS Directions répondu', { pointsReturned: coords.length, distanceM: Math.round(distMetres), elevationInCoords: coords[0].length });

          const avantPurge = coords.length;
          // ORS suit déjà les chemins existants : la purge d'antennes n'est utile que pour
          // les profils cyclistes (OSRM peut générer des allers-retours sur axe principal).
          // Pour les profils piétons, elle crée des lignes droites à travers champs.
          const estPieton = profilInfo.codeOrs.includes('foot');
          if (!estPieton) {
            coords = this.purgerToutesLesAntennes(coords, false);
          }
          this.debugLog('info', `🧹 Purge antennes ORS`, { avant: avantPurge, après: coords.length, appliquée: !estPieton });

          if (coords.length > 0) {
            coords[0][0] = lng;
            coords[0][1] = lat;
            const ptExtremite = coords[coords.length - 1];
            if (ptExtremite[0] !== lng || ptExtremite[1] !== lat) {
              coords.push([...coords[0]]);
            }
          }

          this.debugLog('info', '🏔️ Enrichissement altitudes...');
          const coordsAvecAltitude = await this.enrichirAvecAltitudes(coords);
          this.debugLog('info', '✅ Altitudes enrichies', { pointsTotal: coordsAvecAltitude.length, alt0: coordsAvecAltitude[0]?.[2], altMax: Math.max(...coordsAvecAltitude.map(p => p[2])) });

          let metriques = this.traiterCoordonneesEtCalculerMetriques(coordsAvecAltitude, distMetres, profilInfo, vitessePerso);

          // Extraction des surfaces si disponibles (ORS uniquement)
          if (donneesOrs.features[0].properties?.extras?.surface) {
            const surfaceSummary = donneesOrs.features[0].properties.extras.surface.summary;
            let asphalte = 0, gravier = 0, terre = 0, totalAmount = 0;
            surfaceSummary.forEach(s => {
              const val = s.value;
              const amt = s.amount;
              totalAmount += amt;
              if ([1, 3, 4, 5, 6].includes(val)) asphalte += amt;
              else if ([2, 8, 9, 10].includes(val)) gravier += amt;
              else terre += amt;
            });
            if (totalAmount > 0) {
              metriques.surfaces = {
                asphalte: Math.round((asphalte / totalAmount) * 100),
                gravier: Math.round((gravier / totalAmount) * 100),
                terre: Math.round((terre / totalAmount) * 100)
              };
            }
          }

          this.debugLog('info', '🏁 Calcul terminé', { distanceKm: metriques.distanceKm, d_plus: metriques.denivelePositif, altMin: metriques.altitudeMin, altMax: metriques.altitudeMax });
          return metriques;
        }
      } catch (erreur) {
        this.debugLog('erreur', '❌ ORS Directions échoué, basculement OSRM', erreur.message);
      }
    } else {
      this.debugLog('avertissement', '⚠️ Pas de clé ORS, utilisation OSRM (sans altitude native)');
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

    // ORS rejette une requête où premier == dernier point (boucle fermée).
    // On retire le point de fermeture avant envoi ; on le rajoutera après sur la géométrie retournée.
    const waypointsOrs = (
      waypoints.length > 2 &&
      waypoints[0][0] === waypoints[waypoints.length - 1][0] &&
      waypoints[0][1] === waypoints[waypoints.length - 1][1]
    ) ? waypoints.slice(0, -1) : waypoints;

    this.debugLog('info', '📤 Waypoints envoyés à ORS', { nombre: waypointsOrs.length });

    const optionsOrs = {};
    const estProfliCycliste = codeOrs.includes('cycling');
    const estProfilPieton = codeOrs.includes('foot');

    // avoid_features 'highways'/'tollways' n'est valide que pour les profils cyclistes (pas foot-*)
    if ((eviterNationales || prefRoute === 'tranquille') && estProfliCycliste) {
      optionsOrs.avoid_features = ['highways', 'tollways'];
    }
    if (eviterDenivele && estProfliCycliste) {
      optionsOrs.profile_params = {
        weightings: { steepness_difficulty: 3 }
      };
    }

    const corps = {
      coordinates: waypointsOrs,
      extra_info: ['surface'],
      elevation: true
    };

    // N'ajouter 'options' que s'il est non vide (un objet vide peut déclencher un 400)
    if (Object.keys(optionsOrs).length > 0) {
      corps.options = optionsOrs;
    }

    const reponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': CONFIG.orsApiKey
      },
      body: JSON.stringify(corps)
    });

    if (!reponse.ok) {
      const erreurTexte = await reponse.text();
      this.debugLog('erreur', `ORS HTTP ${reponse.status}`, erreurTexte.substring(0, 200));
      throw new Error(`Erreur HTTP ORS : ${reponse.status}`);
    }
    return await reponse.json();
  }

  /**
   * Routage via le moteur OSRM (Mode Hybride autonome de secours).
   */
  async calculerViaOsrmDirections(waypoints, distanceKm, profilInfo, latDepart, lngDepart, vitessePerso = null) {
    const coordsString = waypoints.map(wp => `${wp[0]},${wp[1]}`).join(';');
    const radiuses = waypoints.map(() => '400').join(';');
    const codeOsrm = profilInfo.codeOsrm || 'cycling';
    const osrmUrl = `https://router.project-osrm.org/route/v1/${codeOsrm}/${coordsString}?overview=full&geometries=geojson&steps=true&radiuses=${radiuses}`;
    this.debugLog('info', `🔀 Appel OSRM (fallback)`, { profil: codeOsrm });

    let coordsGeojson = [];
    let distanceMetres = 0;

    try {
      const reponseOsrm = await fetch(osrmUrl);
      if (reponseOsrm.ok) {
        const jsonOsrm = await reponseOsrm.json();
        if (jsonOsrm.routes && jsonOsrm.routes.length > 0) {
          coordsGeojson = jsonOsrm.routes[0].geometry.coordinates;
          distanceMetres = jsonOsrm.routes[0].distance;
          this.debugLog('info', '✅ OSRM répondu', { points: coordsGeojson.length, distanceM: Math.round(distanceMetres) });
        }
      }
    } catch (e) {
      this.debugLog('erreur', 'OSRM échoué', e.message);
    }

    if (coordsGeojson.length === 0 || distanceMetres < (distanceKm * 100)) {
      this.debugLog('avertissement', 'OSRM insuffisant, utilisation des waypoints géométriques bruts');
      coordsGeojson = waypoints;
      distanceMetres = distanceKm * 1000;
    }

    const avantPurge = coordsGeojson.length;
    // Seuil réduit pour les profils piétons : 15m au lieu de 40m.
    // Les sentiers de randonnée font des zigzags serrés — un seuil trop élevé crée
    // des lignes droites qui traversent des propriétés privées.
    const estPieton = profilInfo.codeOrs.includes('foot');
    coordsGeojson = this.purgerToutesLesAntennes(coordsGeojson, estPieton);
    this.debugLog('info', `🧹 Purge antennes OSRM`, { avant: avantPurge, après: coordsGeojson.length, seuilM: estPieton ? 15 : 40 });

    if (coordsGeojson.length > 0) {
      coordsGeojson[0] = [lngDepart, latDepart];
      const dernierPt = coordsGeojson[coordsGeojson.length - 1];
      if (dernierPt[0] !== lngDepart || dernierPt[1] !== latDepart) {
        coordsGeojson.push([lngDepart, latDepart]);
      }
    }

    const coordsAvecAltitude = await this.enrichirAvecAltitudes(coordsGeojson);
    return this.traiterCoordonneesEtCalculerMetriques(coordsAvecAltitude, distanceMetres, profilInfo, vitessePerso);
  }

  /**
   * Enrichit un ensemble complet de coordonnées [lng, lat] avec les altitudes réelles.
   *
   * Stratégie par ordre de priorité :
   *   1. Bypass direct si ORS a déjà livré des coords 3D non nulles (elevation:true dans la requête de routage).
   *   2. ORS Elevation API (/elevation/line) — source SRTM fiable, pas de quota journalier séparé.
   *   3. Open-Meteo (GET, lots de 50 points, coordonnées tronquées à 5 décimales) — fallback sans clé.
   */
  async enrichirAvecAltitudes(coords2D) {
    // 1. Bypass strict : ORS a fourni de VRAIES altitudes 3D (au moins un point > 0)
    if (coords2D.length > 0 && coords2D[0].length > 2) {
      const aDeLAltitude = coords2D.some(p => p[2] !== 0 && p[2] !== null);
      if (aDeLAltitude) {
        return coords2D.map(p => [p[0], p[1], Math.round(p[2])]);
      }
    }

    // 2. ORS Elevation API : une seule requête pour toute la trace, pas de limite 414
    if (CONFIG.orsApiKey) {
      try {
        const urlElevationOrs = 'https://api.openrouteservice.org/elevation/line';
        const coordsTronquees = coords2D.map(p => [
          parseFloat(p[0].toFixed(6)),
          parseFloat(p[1].toFixed(6))
        ]);
        const reponseElev = await fetch(urlElevationOrs, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': CONFIG.orsApiKey
          },
          body: JSON.stringify({
            format_in: 'geojson',
            format_out: 'geojson',
            geometry: { type: 'LineString', coordinates: coordsTronquees }
          })
        });

        if (reponseElev.ok) {
          const jsonElev = await reponseElev.json();
          const coords3D_ORS = jsonElev.geometry && jsonElev.geometry.coordinates;
          if (coords3D_ORS && coords3D_ORS.length === coords2D.length) {
            const aDeLAltitude = coords3D_ORS.some(p => p[2] !== 0 && p[2] !== null);
            if (aDeLAltitude) {
              console.log('✅ Altitudes récupérées via ORS Elevation API.');
              return coords3D_ORS.map(p => [p[0], p[1], Math.round(p[2])]);
            }
          }
        } else {
          console.warn(`ORS Elevation API erreur ${reponseElev.status}, basculement sur Open-Meteo.`);
        }
      } catch (e) {
        console.warn('Erreur ORS Elevation API, basculement sur Open-Meteo :', e);
      }
    }

    // 3. Fallback Open-Meteo (séquentiel, lots de 50, toFixed(5) pour éviter erreur 414)
    const TAILLE_LOT = 50;
    const toutesAltitudes = [];

    for (let i = 0; i < coords2D.length; i += TAILLE_LOT) {
      const lot = coords2D.slice(i, i + TAILLE_LOT);
      const lats = lot.map(p => p[1].toFixed(5)).join(',');
      const lngs = lot.map(p => p[0].toFixed(5)).join(',');
      const urlElevation = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

      try {
        const reponse = await fetch(urlElevation);
        if (reponse.ok) {
          const json = await reponse.json();
          toutesAltitudes.push(...(json.elevation || new Array(lot.length).fill(null)));
        } else {
          console.warn(`Open-Meteo erreur ${reponse.status}`);
          toutesAltitudes.push(...new Array(lot.length).fill(null));
        }
      } catch (e) {
        console.warn('Erreur Open-Meteo lot :', e);
        toutesAltitudes.push(...new Array(lot.length).fill(null));
      }
    }

    // Association 1-pour-1 avec valeur de secours à 0 si tout a échoué
    return coords2D.map((coord, index) => {
      const alt = toutesAltitudes[index] ?? (coord.length > 2 ? coord[2] : 0);
      return [coord[0], coord[1], Math.round(alt)];
    });
  }



  /**
   * Calcule le profil d'élévation, D+, D-, altitudes min/max et temps estimé.
   */
  traiterCoordonneesEtCalculerMetriques(coords3D, distanceMetres, profilInfo, vitessePerso = null) {
    let denivelePositif = 0;
    let deniveleNegatif = 0;
    let altMin = Infinity;
    let altMax = -Infinity;

    // 1. Extraction et Lissage (Moyenne glissante sur 7 points)
    // ORS fournit des points denses (~5-10m d'intervalle), le bruit de quantification SRTM est ±1-2m.
    // Une fenêtre de 7 points filtre les oscillations sans écraser les vraies côtes.
    const altitudesBrutes = coords3D.map(p => p.length > 2 ? p[2] : 0);
    const altitudesLissees = [];
    const fenetre = 3; // i-3 à i+3 = 7 points
    
    for (let i = 0; i < altitudesBrutes.length; i++) {
      let somme = 0;
      let count = 0;
      for (let j = Math.max(0, i - fenetre); j <= Math.min(altitudesBrutes.length - 1, i + fenetre); j++) {
        somme += altitudesBrutes[j];
        count++;
      }
      const altLissee = somme / count;
      altitudesLissees.push(altLissee);
      
      if (altLissee < altMin) altMin = altLissee;
      if (altLissee > altMax) altMax = altLissee;
    }

    if (altMin === Infinity) altMin = 0;
    if (altMax === -Infinity) altMax = 0;

    // 2. Calcul du D+/D- avec Hystérésis (Seuil de 5m — standard GPS Garmin/Suunto)
    // L'algorithme ne comptabilise une montée ou descente que si elle dépasse 5m continus.
    // Cela élimine le bruit de quantification SRTM (±1-2m réels, amplifiés après lissage).
    if (altitudesLissees.length > 0) {
      let altRef = altitudesLissees[0];
      for (let i = 1; i < altitudesLissees.length; i++) {
        const diff = altitudesLissees[i] - altRef;
        if (Math.abs(diff) >= 5) {
          if (diff > 0) denivelePositif += diff;
          else deniveleNegatif += Math.abs(diff);
          altRef = altitudesLissees[i];
        }
      }
    }

    denivelePositif = Math.round(denivelePositif);
    deniveleNegatif = Math.round(deniveleNegatif);
    altMin = Math.round(altMin);
    altMax = Math.round(altMax);

    this.debugLog('info', '📊 Métriques altitude', { altMin, altMax, d_plus: denivelePositif, d_moins: deniveleNegatif, nbPoints: coords3D.length });

    // 3. Construction du profil altimétrique avec distances cumulées
    const profilAltimetrique = [];
    let distanceCumuleeKm = 0;

    for (let i = 0; i < coords3D.length; i++) {
      const lng = coords3D[i][0];
      const lat = coords3D[i][1];
      const alt = Math.round(altitudesLissees[i]);

      if (i > 0) {
        const p0 = coords3D[i - 1];
        distanceCumuleeKm += this.calculerDistanceHaversine(p0[1], p0[0], lat, lng);
      }

      profilAltimetrique.push({
        distanceKm: parseFloat(distanceCumuleeKm.toFixed(2)),
        altitude: alt,
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
   * Filtre de purge des antennes et impasses (cul-de-sac).
   * @param {boolean} profilPieton - Si true, seuil réduit à 15m pour ne pas couper les sentiers en zigzag.
   */
  purgerToutesLesAntennes(coords, profilPieton = false) {
    if (!coords || coords.length < 10) return coords;

    // Seuil de proximité : 40m pour les profils cyclistes, 15m pour les piétons
    const SEUIL_METRES = profilPieton ? 15 : 40;

    // Détection de boucle fermée
    const ptDebut = coords[0];
    const ptFin = coords[coords.length - 1];
    const distBoucle = this.calculerDistanceHaversine(ptDebut[1], ptDebut[0], ptFin[1], ptFin[0]) * 1000;
    const estUneBoucle = distBoucle < 50;

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

        let meilleurJ = -1;
        const limiteBasse = i + 6;

        if (limiteBasse < traceActuelle.length) {
          // Si boucle fermée : ne jamais sauter depuis le début jusqu'à près de la fin
          // pour ne pas court-circuiter l'intégralité du parcours.
          const margeFinBoucle = estUneBoucle ? Math.floor(traceActuelle.length * 0.1) : 0;
          const limiteHaute = Math.min(
            traceActuelle.length - 1 - margeFinBoucle,
            i + Math.floor(traceActuelle.length * 0.6) // Max 60% de saut
          );

          for (let j = Math.max(limiteBasse, limiteHaute); j >= limiteBasse; j--) {
            const ptB = traceActuelle[j];
            const distMetres = this.calculerDistanceHaversine(ptA[1], ptA[0], ptB[1], ptB[0]) * 1000;
            if (distMetres < SEUIL_METRES) {
              meilleurJ = j;
              break;
            }
          }
        }

        if (meilleurJ > 0) {
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
