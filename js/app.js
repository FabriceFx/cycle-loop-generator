/**
 * Application principale et contrôleur d'interface utilisateur.
 * Orchestration globale : carte, routage, profil altimétrique, thèmes et bilinguisme.
 * 
 * @author Fabrice Faucheux (https://faucheux.bzh)
 */

document.addEventListener('DOMContentLoaded', () => {
  // Langue courante ('fr' par défaut)
  let langueActuelle = localStorage.getItem('langue_app') || 'fr';
  
  // Éléments du DOM
  const selectDiscipline = document.getElementById('select-discipline');
  const selectTypeRoutes = document.getElementById('select-type-routes');
  const checkEviterNationales = document.getElementById('check-eviter-nationales');
  const selectDirection = document.getElementById('select-direction');
  const sliderDistance = document.getElementById('slider-distance');
  const inputDistance = document.getElementById('input-distance');
  const inputRecherche = document.getElementById('input-recherche');
  const btnRechercher = document.getElementById('btn-rechercher');
  const btnGeoloc = document.getElementById('btn-geoloc');
  const btnGenerer = document.getElementById('btn-generer');
  const btnVariante = document.getElementById('btn-variante');
  const selectFondCarte = document.getElementById('select-fond-carte');

  // Actions & Export
  const btnExportGpx = document.getElementById('btn-export-gpx');
  const btnGoogleMaps = document.getElementById('btn-google-maps');
  const btnKomoot = document.getElementById('btn-komoot');
  const btnStrava = document.getElementById('btn-strava');
  const btnPartager = document.getElementById('btn-partager');
  const btnIframe = document.getElementById('btn-iframe');

  // Modales & Divers
  const btnAPropos = document.getElementById('btn-a-propos');
  const btnConfigApi = document.getElementById('btn-config-api');
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
  const btnToggleLang = document.getElementById('btn-toggle-lang');
  const overlayIndicateur = document.getElementById('indicateur-chargement');
  const messageChargement = document.getElementById('texte-chargement');
  
  // Menu Mobile
  const btnMenuMobile = document.getElementById('btn-menu-mobile');
  const menuActions = document.getElementById('menu-actions');

  if (btnMenuMobile && menuActions) {
    btnMenuMobile.addEventListener('click', (e) => {
      e.stopPropagation();
      menuActions.classList.toggle('menu-ouvert');
    });

    document.addEventListener('click', (e) => {
      if (!menuActions.contains(e.target) && !btnMenuMobile.contains(e.target)) {
        menuActions.classList.remove('menu-ouvert');
      }
    });
  }

  // Instances des modules
  let carteMgr = null;
  let generateurRoute = new GenerateurDeParcours();
  let graphiqueAlti = new GraphiqueAltimetrique('canvas-altitude');
  let donneesRouteCourante = null;
  let derniersParametres = null;

  // -------------------------------------------------------------
  // 1. Initialisation de la carte & géolocalisation
  // -------------------------------------------------------------
  const posInitiale = CONFIG.parcoursDefaut.centreInitial;
  carteMgr = new GestionnaireCarte('carte', posInitiale);

  // Synchroniser le survol du graphique altimétrique avec la carte
  graphiqueAlti.callbackSurvolPoint = (lat, lng) => {
    if (lat === null) carteMgr.masquerMarqueurSurvol();
    else carteMgr.afficherMarqueurSurvol(lat, lng);
  };

  // Météo en direct
  const majMeteo = async (lat, lng) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
      if (res.ok) {
        const data = await res.json();
        const t = Math.round(data.current_weather.temperature);
        const w = data.current_weather.weathercode;
        let icone = '⛅';
        if (w === 0) icone = '☀️';
        else if (w >= 1 && w <= 3) icone = '⛅';
        else if (w >= 45 && w <= 48) icone = '🌫️';
        else if (w >= 51 && w <= 67) icone = '🌧️';
        else if (w >= 71 && w <= 77) icone = '❄️';
        else if (w >= 80 && w <= 82) icone = '🌦️';
        else if (w >= 95) icone = '⛈️';
        const badge = document.getElementById('meteo-badge');
        if (badge) {
          badge.innerHTML = `${icone} ${t}°C`;
          badge.style.display = 'flex';
        }
      }
    } catch(e) {
      console.warn('Météo indisponible');
    }
  };
  carteMgr.callbackChangementDepart = (pos) => majMeteo(pos[0], pos[1]);
  // Initial meteo fetch
  majMeteo(posInitiale[0], posInitiale[1]);

  // -------------------------------------------------------------
  // 2. Gestion de la géolocalisation navigateur
  // -------------------------------------------------------------
  const geolocaliserUtilisateur = (silencieux = false) => {
    if ('geolocation' in navigator) {
      if (!silencieux) afficherChargement(TRADUCTIONS[langueActuelle].rechercheEnCours);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          carteMgr.definirPositionDepart(lat, lng, true);
          if (!silencieux) masquerChargement();
        },
        (erreur) => {
          console.warn("Géolocalisation bloquée ou indisponible :", erreur);
          if (!silencieux) {
            alert(TRADUCTIONS[langueActuelle].erreurGeoloc);
            masquerChargement();
          }
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      if (!silencieux) alert(TRADUCTIONS[langueActuelle].erreurGeoloc);
    }
  };

  btnGeoloc.addEventListener('click', () => geolocaliserUtilisateur(false));

  // -------------------------------------------------------------
  // 3. Recherche d'adresse via Nominatim
  // -------------------------------------------------------------
  const effectuerRechercheLieu = async () => {
    const query = inputRecherche.value;
    if (!query) return;
    afficherChargement(TRADUCTIONS[langueActuelle].rechercheEnCours);
    const res = await carteMgr.rechercherLieu(query);
    masquerChargement();
    if (res) {
      carteMgr.definirPositionDepart(res.lat, res.lon, true);
    } else {
      alert(TRADUCTIONS[langueActuelle].erreurGpsInconnu);
    }
  };

  btnRechercher.addEventListener('click', effectuerRechercheLieu);
  inputRecherche.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      effectuerRechercheLieu();
    }
  });

  // -------------------------------------------------------------
  // 4. Synchronisation Slider / Input Distance & Pills
  // -------------------------------------------------------------
  sliderDistance.addEventListener('input', (e) => {
    inputDistance.value = e.target.value;
  });
  inputDistance.addEventListener('change', (e) => {
    let v = parseInt(e.target.value, 10);
    if (isNaN(v)) v = 30;
    v = Math.max(CONFIG.parcoursDefaut.minKm, Math.min(CONFIG.parcoursDefaut.maxKm, v));
    inputDistance.value = v;
    sliderDistance.value = v;
  });

  document.querySelectorAll('.pill-km').forEach(pill => {
    pill.addEventListener('click', () => {
      const dist = pill.getAttribute('data-km');
      sliderDistance.value = dist;
      inputDistance.value = dist;
    });
  });

  // -------------------------------------------------------------
  // 4b. Ajustements automatiques selon la discipline
  // -------------------------------------------------------------
  selectDiscipline.addEventListener('change', (e) => {
    const discipline = e.target.value;
    if (discipline === 'marche' || discipline === 'running') {
      selectTypeRoutes.value = 'tranquille';
    }
  });

  // -------------------------------------------------------------
  // 4c. Désactiver direction si vent intelligent coché
  // -------------------------------------------------------------
  const checkVentIntelligent = document.getElementById('check-vent-intelligent');
  if (checkVentIntelligent && selectDirection) {
    checkVentIntelligent.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectDirection.disabled = true;
        selectDirection.title = TRADUCTIONS[langueActuelle].directionDesactiveeVent;
        selectDirection.style.opacity = '0.5';
      } else {
        selectDirection.disabled = false;
        selectDirection.title = '';
        selectDirection.style.opacity = '1';
      }
    });
  }

  // -------------------------------------------------------------
  // 5. Génération du parcours
  // -------------------------------------------------------------
  const lancerCalculParcours = async (nouvelleVariante = false) => {
    const latLng = carteMgr.positionDepart;
    const dist = parseInt(inputDistance.value, 10) || 30;
    const disc = selectDiscipline.value || 'gravel';
    const prefRoute = selectTypeRoutes ? selectTypeRoutes.value : 'equilibre';
    const eviterNat = checkEviterNationales ? checkEviterNationales.checked : false;
    const directionPref = selectDirection ? selectDirection.value : 'aleatoire';
    const checkEviterDenivele = document.getElementById('check-eviter-denivele');
    const eviterDenivele = checkEviterDenivele ? checkEviterDenivele.checked : false;

    const paramString = `${latLng[0]}_${latLng[1]}_${dist}_${disc}_${prefRoute}_${eviterNat}_${eviterDenivele}_${directionPref}`;
    if (!nouvelleVariante && derniersParametres === paramString) {
      nouvelleVariante = true;
    }
    derniersParametres = paramString;

    afficherChargement(TRADUCTIONS[langueActuelle].generationEnCours);

    try {
      const ventIntelligent = document.getElementById('check-vent-intelligent') ? document.getElementById('check-vent-intelligent').checked : false;
      const inputVitesse = document.getElementById('input-vitesse-perso');
      const vitessePerso = inputVitesse && inputVitesse.value ? parseFloat(inputVitesse.value) : null;

      donneesRouteCourante = await generateurRoute.genererBoucle(
        latLng[0],
        latLng[1],
        dist,
        disc,
        nouvelleVariante,
        prefRoute,
        eviterNat,
        directionPref,
        ventIntelligent,
        vitessePerso,
        eviterDenivele
      );

      // Mise à jour de l'affichage avec View Transitions API
      if (donneesRouteCourante) {
        const updateUI = () => {
          afficherStatistiques(donneesRouteCourante);
          carteMgr.afficherTraceParcours(donneesRouteCourante.coordonnees);
          graphiqueAlti.afficherProfil(donneesRouteCourante.profilAltimetrique, donneesRouteCourante.discipline.couleur);
          
          const checkPois = document.getElementById('check-afficher-pois');
          if (checkPois && checkPois.checked) {
            carteMgr.chargerPOIs(donneesRouteCourante.coordonnees);
          } else {
            carteMgr.masquerPOIs();
          }
        };

        if (document.startViewTransition) {
          document.startViewTransition(() => updateUI());
        } else {
          updateUI();
        }
      }
    } catch (e) {
      console.error("Erreur lors de la génération du parcours :", e);
      alert(TRADUCTIONS[langueActuelle].erreurCalcul);
    } finally {
      masquerChargement();
    }
  };

  btnGenerer.addEventListener('click', () => lancerCalculParcours(false));
  btnVariante.addEventListener('click', () => lancerCalculParcours(true));

  // -------------------------------------------------------------
  // 6. Changement de fond de carte
  // -------------------------------------------------------------
  selectFondCarte.addEventListener('change', (e) => {
    carteMgr.changerFondDeCarte(e.target.value);
  });

  // -------------------------------------------------------------
  // 7. Mise à jour des statistiques sur le tableau de bord
  // -------------------------------------------------------------
  const afficherStatistiques = (donnees) => {
    document.getElementById('stat-distance').textContent = `${donnees.distanceKm} km`;
    document.getElementById('stat-denivele').textContent = `+${donnees.denivelePositif} m`;
    document.getElementById('stat-temps').textContent = donnees.tempsEstimeFormate;
    document.getElementById('stat-vitesse').textContent = `${donnees.vitesseMoyenne} km/h`;
    document.getElementById('stat-alt-min').textContent = `${donnees.altitudeMin} m`;
    document.getElementById('stat-alt-max').textContent = `${donnees.altitudeMax} m`;
    
    // Difficulté
    const statDiff = document.getElementById('stat-difficulte');
    if (statDiff && donnees.difficulte) {
      statDiff.textContent = donnees.difficulte.nom;
      statDiff.style.color = donnees.difficulte.couleur;
      statDiff.style.fontWeight = 'bold';
    }

    // Surfaces
    const conteneurSurfaces = document.getElementById('conteneur-surfaces');
    if (conteneurSurfaces) {
      if (donnees.surfaces) {
        conteneurSurfaces.style.display = 'block';
        document.getElementById('barre-asphalte').style.width = `${donnees.surfaces.asphalte}%`;
        document.getElementById('barre-gravier').style.width = `${donnees.surfaces.gravier}%`;
        document.getElementById('barre-terre').style.width = `${donnees.surfaces.terre}%`;
        
        document.getElementById('txt-asphalte').textContent = `Asphalte ${donnees.surfaces.asphalte}%`;
        document.getElementById('txt-gravier').textContent = `Gravier ${donnees.surfaces.gravier}%`;
        document.getElementById('txt-terre').textContent = `Terre ${donnees.surfaces.terre}%`;
      } else {
        conteneurSurfaces.style.display = 'none';
      }
    }

    const panneauExplications = document.getElementById('panneau-explications');
    if (panneauExplications) panneauExplications.style.display = 'none';

    document.getElementById('panneau-resultats').classList.remove('masque');
  };

  // -------------------------------------------------------------
  // 8. Exports & Liens sociaux
  // -------------------------------------------------------------
  btnExportGpx.addEventListener('click', () => {
    if (donneesRouteCourante) ExportateurDeParcours.telechargerGpx(donneesRouteCourante);
  });
  btnGoogleMaps.addEventListener('click', () => {
    if (donneesRouteCourante) ExportateurDeParcours.ouvrirGoogleMaps(donneesRouteCourante);
  });
  btnKomoot.addEventListener('click', () => ExportateurDeParcours.ouvrirKomoot());
  btnStrava.addEventListener('click', () => ExportateurDeParcours.ouvrirStrava());
  
  btnPartager.addEventListener('click', async () => {
    const pos = carteMgr.positionDepart;
    if (!pos || pos.length < 2) {
      alert(TRADUCTIONS[langueActuelle].erreurCalcul);
      return;
    }
    const dist = inputDistance.value;
    const disc = selectDiscipline.value;
    const dir = selectDirection ? selectDirection.value : 'aleatoire';
    
    // Tente de partager nativement, ou renvoie le lien en fallback
    const resultat = await ExportateurDeParcours.declencherPartage(donneesRouteCourante, pos[0], pos[1], dist, disc, dir);

    if (resultat !== 'partage-natif-ok') {
      // Afficher la modale avec le lien de fallback
      const textareaLien = document.getElementById('textarea-lien-partage');
      const msgOk = document.getElementById('msg-copie-ok');
      textareaLien.value = resultat;
      msgOk.style.display = 'none';
      ouvrirModale('modal-partager');
      // Sélectionner automatiquement le texte pour faciliter la copie manuelle
      setTimeout(() => textareaLien.select(), 100);
    }
  });

  document.getElementById('btn-copier-lien').addEventListener('click', async () => {
    const textareaLien = document.getElementById('textarea-lien-partage');
    const msgOk = document.getElementById('msg-copie-ok');
    const lien = textareaLien.value;

    let copiOk = false;
    // Tentative 1 : API Clipboard moderne
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(lien);
        copiOk = true;
      } catch (e) {
        // On passe au fallback
      }
    }
    // Tentative 2 : execCommand (fallback HTTP / anciens navigateurs)
    if (!copiOk) {
      textareaLien.select();
      copiOk = document.execCommand('copy');
    }

    if (copiOk) {
      msgOk.style.display = 'block';
      msgOk.textContent = TRADUCTIONS[langueActuelle].lienCopie;
    }
  });

  btnIframe.addEventListener('click', () => {
    const code = ExportateurDeParcours.genererCodeIframe();
    document.getElementById('textarea-iframe').value = code;
    ouvrirModale('modal-iframe');
  });

  // -------------------------------------------------------------
  // 9. Thème clair / sombre
  // -------------------------------------------------------------
  const appliquerTheme = (theme) => {
    if (theme === 'dark') {
      document.body.classList.add('theme-sombre');
      btnToggleTheme.textContent = '☀️';
    } else {
      document.body.classList.remove('theme-sombre');
      btnToggleTheme.textContent = '🌙';
    }
    localStorage.setItem('theme_app', theme);
  };

  const themeStocke = localStorage.getItem('theme_app');
  let themeInit = themeStocke;
  if (!themeInit) {
    themeInit = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  appliquerTheme(themeInit);

  btnToggleTheme.addEventListener('click', () => {
    const nouveauTheme = document.body.classList.contains('theme-sombre') ? 'light' : 'dark';
    appliquerTheme(nouveauTheme);
  });

  // -------------------------------------------------------------
  // 10. Traduction bilingue dynamique (FR / EN)
  // -------------------------------------------------------------
  const appliquerLangue = (lang) => {
    langueActuelle = lang;
    localStorage.setItem('langue_app', lang);
    btnToggleLang.textContent = lang.toUpperCase();

    const t = TRADUCTIONS[lang];
    document.querySelectorAll('[data-i18n]').forEach(elem => {
      const cle = elem.getAttribute('data-i18n');
      if (t[cle]) {
        if (elem.tagName === 'INPUT' && elem.hasAttribute('placeholder')) {
          elem.placeholder = t[cle];
        } else {
          elem.innerHTML = t[cle];
        }
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach(elem => {
      const cle = elem.getAttribute('data-i18n-title');
      if (t[cle]) {
        elem.title = t[cle];
      }
    });
  };

  appliquerLangue(langueActuelle);

  btnToggleLang.addEventListener('click', () => {
    const nouvelleLangue = langueActuelle === 'fr' ? 'en' : 'fr';
    appliquerLangue(nouvelleLangue);
  });

  // -------------------------------------------------------------
  // 11. Gestion des Modales (À propos, Iframe, Config API)
  // -------------------------------------------------------------
  btnAPropos.addEventListener('click', () => ouvrirModale('modal-a-propos'));
  btnConfigApi.addEventListener('click', () => {
    document.getElementById('input-ors-key').value = CONFIG.orsApiKey;
    ouvrirModale('modal-config-api');
  });

  document.getElementById('btn-sauvegarder-api').addEventListener('click', () => {
    const cle = document.getElementById('input-ors-key').value.trim();
    CONFIG.orsApiKey = cle;
    localStorage.setItem('ors_api_key', cle);
    fermerToutesModales();
  });

  document.querySelectorAll('.btn-fermer-modal, .overlay-modal').forEach(btn => {
    btn.addEventListener('click', fermerToutesModales);
  });

  function ouvrirModale(idModal) {
    document.getElementById(idModal).classList.add('active');
  }

  function fermerToutesModales() {
    document.querySelectorAll('.fenetre-modale').forEach(m => m.classList.remove('active'));
  }

  // Fonctions de chargement overlay
  function afficherChargement(msg) {
    messageChargement.textContent = msg;
    overlayIndicateur.classList.add('active');
  }

  function masquerChargement() {
    overlayIndicateur.classList.remove('active');
  }

  // Gestion affichage POIs manuel
  const checkPois = document.getElementById('check-afficher-pois');
  if (checkPois) {
    checkPois.addEventListener('change', (e) => {
      if (e.target.checked && donneesRouteCourante) {
        carteMgr.chargerPOIs(donneesRouteCourante.coordonnees);
      } else {
        carteMgr.masquerPOIs();
      }
    });
  }

  // Enregistrement Service Worker (PWA)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('Erreur SW:', err);
      });
    });
  }

  // Tenter de géolocaliser automatiquement au premier lancement (silencieusement)
  setTimeout(() => {
    geolocaliserUtilisateur(true);
  }, 600);
});
