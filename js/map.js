/**
 * Module de gestion de la carte Leaflet et des couches géographiques.
 * 
 * @author Fabrice Faucheux (https://faucheux.bzh)
 */

class GestionnaireCarte {
  constructor(elementId, centreInitial) {
    this.elementId = elementId;
    this.carte = null;
    this.calqueRoute = null;
    this.marqueurDepart = null;
    this.marqueurSurvol = null;
    this.groupePOIs = null;
    this.fondCarteActuel = null;
    this.positionDepart = centreInitial;
    this.callbackChangementDepart = null;

    this.initialiserCarte();
  }

  /**
   * Initialise la carte Leaflet avec les options responsive.
   */
  initialiserCarte() {
    this.carte = L.map(this.elementId, {
      zoomControl: false,
      attributionControl: true
    }).setView(this.positionDepart, 13);

    // Bouton zoom repositionné en haut à droite
    L.control.zoom({ position: 'topright' }).addTo(this.carte);

    // Couche de fond par défaut (CyclOSM pour le vélo)
    this.changerFondDeCarte('cyclosm');

    // Icône personnalisée pour le point de départ
    const iconeDepart = L.divIcon({
      className: 'icone-marqueur-depart',
      html: `<div class="marqueur-ping"><div class="marqueur-point"></div></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    this.marqueurDepart = L.marker(this.positionDepart, {
      icon: iconeDepart,
      draggable: true
    }).addTo(this.carte);

    // Événement déplacement du marqueur
    this.marqueurDepart.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      this.positionDepart = [pos.lat, pos.lng];
      if (this.callbackChangementDepart) {
        this.callbackChangementDepart(this.positionDepart);
      }
    });

    // Événement clic sur la carte
    this.carte.on('click', (e) => {
      this.positionDepart = [e.latlng.lat, e.latlng.lng];
      this.marqueurDepart.setLatLng(e.latlng);
      if (this.callbackChangementDepart) {
        this.callbackChangementDepart(this.positionDepart);
      }
    });
  }

  /**
   * Change la couche de fond de carte.
   */
  changerFondDeCarte(cleFond) {
    const configFond = CONFIG.fondsDeCarte[cleFond] || CONFIG.fondsDeCarte.cyclosm;
    if (this.fondCarteActuel) {
      this.carte.removeLayer(this.fondCarteActuel);
    }
    this.fondCarteActuel = L.tileLayer(configFond.url, {
      attribution: configFond.attribution,
      maxZoom: configFond.maxZoom
    }).addTo(this.carte);
  }

  /**
   * Modifie la position de départ et centre la carte.
   */
  definirPositionDepart(lat, lng, centrer = true) {
    this.positionDepart = [lat, lng];
    this.marqueurDepart.setLatLng(this.positionDepart);
    if (centrer) {
      this.carte.flyTo(this.positionDepart, 13, { duration: 1.2 });
    }
    if (this.callbackChangementDepart) {
      this.callbackChangementDepart(this.positionDepart);
    }
  }

  /**
   * Retourne la couleur en fonction du pourcentage de pente.
   */
  obtenirCouleurPente(pentePourcentage) {
    if (pentePourcentage < -2) return '#3b82f6'; // Descente (Bleu)
    if (pentePourcentage <= 2) return '#10b981'; // Plat (Vert)
    if (pentePourcentage <= 5) return '#facc15'; // Faux-plat (Jaune)
    if (pentePourcentage <= 9) return '#ef4444'; // Montée (Rouge)
    return '#6b21a8'; // Mur (Violet)
  }

  /**
   * Calcul précis de la distance entre deux points pour évaluer la pente locale.
   */
  calculerDistanceHaversineMap(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // mètres
    const p1 = lat1 * Math.PI/180, p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180, dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /**
   * Affiche la trace du parcours calculé sur la carte (Gradient Track dynamique coloré).
   */
  afficherTraceParcours(coordonnees3D) {
    // Suppression de l'ancienne trace si présente
    if (this.calqueRoute) {
      this.carte.removeLayer(this.calqueRoute);
    }
    
    // Feature group pour stocker tous les segments colorés
    this.calqueRoute = L.featureGroup().addTo(this.carte);

    let segmentCourantCoords = [];
    let couleurCourante = null;

    for (let i = 0; i < coordonnees3D.length - 1; i++) {
      const p1 = coordonnees3D[i];
      const p2 = coordonnees3D[i + 1];
      
      const dist = Math.max(1, this.calculerDistanceHaversineMap(p1[1], p1[0], p2[1], p2[0]));
      const altDiff = (p2.length > 2 && p1.length > 2) ? (p2[2] - p1[2]) : 0;
      const pente = (altDiff / dist) * 100;
      
      const couleurSeg = this.obtenirCouleurPente(pente);

      if (couleurCourante === null) {
        couleurCourante = couleurSeg;
        segmentCourantCoords = [[p1[1], p1[0]], [p2[1], p2[0]]];
      } else if (couleurSeg === couleurCourante) {
        segmentCourantCoords.push([p2[1], p2[0]]);
      } else {
        // Changement de pente, on dessine le segment courant
        L.polyline(segmentCourantCoords, {
          color: couleurCourante,
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(this.calqueRoute);
        
        // On démarre un nouveau segment avec le dernier point pour la continuité
        couleurCourante = couleurSeg;
        segmentCourantCoords = [[p1[1], p1[0]], [p2[1], p2[0]]];
      }
    }

    // Dessiner le tout dernier segment
    if (segmentCourantCoords.length > 1) {
      L.polyline(segmentCourantCoords, {
        color: couleurCourante,
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.calqueRoute);
    }

    // Ajouter des flèches directionnelles sur l'ensemble du parcours
    const toutesCoords = coordonnees3D.map(p => [p[1], p[0]]);
    const traceCompleteInvisble = L.polyline(toutesCoords, { opacity: 0 }).addTo(this.calqueRoute);
    
    if (typeof L.polylineDecorator !== 'undefined') {
      L.polylineDecorator(traceCompleteInvisble, {
        patterns: [
          {
            offset: '5%', 
            repeat: '10%', // Une flèche tous les 10% du trajet
            symbol: L.Symbol.arrowHead({
              pixelSize: 12,
              polygon: false,
              pathOptions: { stroke: true, color: '#ffffff', weight: 3, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }
            })
          }
        ]
      }).addTo(this.calqueRoute);
    }

    this.carte.fitBounds(this.calqueRoute.getBounds(), {
      padding: [40, 40],
      maxZoom: 15
    });

    this.afficherLegendePente();
  }

  /**
   * Affiche la légende explicative des couleurs de pente.
   */
  afficherLegendePente() {
    if (this.controleLegende) return;
    
    this.controleLegende = L.control({ position: 'bottomright' });
    this.controleLegende.onAdd = function () {
      const div = L.DomUtil.create('div', 'legende-pente-carte');
      div.innerHTML = `
        <div style="background: rgba(20,25,35,0.85); backdrop-filter: blur(10px); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem; color: #fff;">
          <div style="font-weight: 600; margin-bottom: 5px; opacity: 0.9;">Déclivité</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span style="width: 14px; height: 4px; background: #6b21a8; border-radius: 2px; box-shadow: 0 0 5px #6b21a8;"></span> > 9% (Mur)</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span style="width: 14px; height: 4px; background: #ef4444; border-radius: 2px; box-shadow: 0 0 5px #ef4444;"></span> 5-9% (Montée)</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span style="width: 14px; height: 4px; background: #facc15; border-radius: 2px; box-shadow: 0 0 5px #facc15;"></span> 2-5% (Faux-plat)</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;"><span style="width: 14px; height: 4px; background: #10b981; border-radius: 2px; box-shadow: 0 0 5px #10b981;"></span> Plat</div>
          <div style="display: flex; align-items: center; gap: 6px;"><span style="width: 14px; height: 4px; background: #3b82f6; border-radius: 2px; box-shadow: 0 0 5px #3b82f6;"></span> Descente</div>
        </div>
      `;
      return div;
    };
    this.controleLegende.addTo(this.carte);
  }

  /**
   * Positionne ou déplace le marqueur de survol interactif (lié au profil altimétrique).
   */
  afficherMarqueurSurvol(lat, lng) {
    if (!this.marqueurSurvol) {
      const iconeSurvol = L.divIcon({
        className: 'icone-survol-profil',
        html: `<div class="point-survol-halo"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      this.marqueurSurvol = L.marker([lat, lng], { icon: iconeSurvol }).addTo(this.carte);
    } else {
      this.marqueurSurvol.setLatLng([lat, lng]);
    }
  }

  /**
   * Masque le marqueur de survol.
   */
  masquerMarqueurSurvol() {
    if (this.marqueurSurvol) {
      this.carte.removeLayer(this.marqueurSurvol);
      this.marqueurSurvol = null;
    }
  }

  /**
   * Recherche un lieu par texte via le service Geocoding Nominatim.
   */
  async rechercherLieu(query) {
    if (!query || query.trim().length < 2) return null;
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    
    try {
      const reponse = await fetch(url, {
        headers: { 'Accept-Language': 'fr' }
      });
      if (reponse.ok) {
        const resultats = await reponse.json();
        if (resultats && resultats.length > 0) {
          const lat = parseFloat(resultats[0].lat);
          const lon = parseFloat(resultats[0].lon);
          return { lat, lon, nom: resultats[0].display_name };
        }
      }
    } catch (e) {
      console.error("Erreur de recherche d'adresse :", e);
    }
    return null;
  }

  /**
   * Récupère et affiche les points d'eau et toilettes via Overpass API dans la BBox de la route.
   */
  async chargerPOIs(coordsGeojson) {
    if (!coordsGeojson || coordsGeojson.length === 0) return;
    
    // Calcul Bounding Box
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    coordsGeojson.forEach(p => {
      if (p[1] < minLat) minLat = p[1];
      if (p[1] > maxLat) maxLat = p[1];
      if (p[0] < minLon) minLon = p[0];
      if (p[0] > maxLon) maxLon = p[0];
    });

    const requete = `[out:json][timeout:25];(node["amenity"~"drinking_water|toilets"](${minLat},${minLon},${maxLat},${maxLon}););out body;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(requete)}`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.afficherPOIs(data.elements);
      }
    } catch (e) {
      console.warn("Impossible de charger les POIs :", e);
    }
  }

  /**
   * Affiche les POIs récupérés sur la carte.
   */
  afficherPOIs(elements) {
    this.masquerPOIs();
    this.groupePOIs = L.layerGroup().addTo(this.carte);
    
    elements.forEach(el => {
      const isWater = el.tags.amenity === 'drinking_water';
      const iconText = isWater ? '🚰' : '🚻';
      const tooltip = isWater ? "Point d'eau" : "Toilettes";
      
      const icon = L.divIcon({
        className: 'icone-poi',
        html: `<div style="font-size: 14px; background: rgba(15,23,42,0.85); border-radius: 50%; padding: 3px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 5px rgba(0,0,0,0.5);">${iconText}</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      
      L.marker([el.lat, el.lon], { icon }).bindTooltip(tooltip).addTo(this.groupePOIs);
    });
  }

  /**
   * Masque les POIs.
   */
  masquerPOIs() {
    if (this.groupePOIs) {
      this.carte.removeLayer(this.groupePOIs);
      this.groupePOIs = null;
    }
  }
}
