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

  // Instances des modules
  let carteMgr = null;
  let generateurRoute = new GenerateurDeParcours();
  let graphiqueAlti = new GraphiqueAltimetrique('canvas-altitude');
  let donneesRouteCourante = null;

  // -------------------------------------------------------------
  // 1. Initialisation de la carte & géolocalisation
  // -------------------------------------------------------------
  const posInitiale = CONFIG.parcoursDefaut.centreInitial;
  carteMgr = new GestionnaireCarte('carte', posInitiale);

  // Synchroniser le survol du graphique altimétrique avec la carte
  graphiqueAlti.callbackSurvolPoint = (lat, lng) => {
    carteMgr.afficherMarqueurSurvol(lat, lng);
  };

  // -------------------------------------------------------------
  // 2. Gestion de la géolocalisation navigateur
  // -------------------------------------------------------------
  const geolocaliserUtilisateur = () => {
    if ('geolocation' in navigator) {
      afficherChargement(TRADUCTIONS[langueActuelle].rechercheEnCours);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          carteMgr.definirPositionDepart(lat, lng, true);
          masquerChargement();
        },
        (erreur) => {
          console.warn("Géolocalisation bloquée ou indisponible :", erreur);
          alert(TRADUCTIONS[langueActuelle].erreurGeoloc);
          masquerChargement();
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      alert(TRADUCTIONS[langueActuelle].erreurGeoloc);
    }
  };

  btnGeoloc.addEventListener('click', geolocaliserUtilisateur);

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
    if (e.key === 'Enter') effectuerRechercheLieu();
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
  // 5. Génération du parcours
  // -------------------------------------------------------------
  const lancerCalculParcours = async (nouvelleVariante = false) => {
    const latLng = carteMgr.positionDepart;
    const dist = parseInt(inputDistance.value, 10) || 30;
    const disc = selectDiscipline.value || 'gravel';
    const prefRoute = selectTypeRoutes ? selectTypeRoutes.value : 'equilibre';
    const eviterNat = checkEviterNationales ? checkEviterNationales.checked : false;
    const directionPref = selectDirection ? selectDirection.value : 'aleatoire';

    afficherChargement(TRADUCTIONS[langueActuelle].generationEnCours);

    try {
      donneesRouteCourante = await generateurRoute.genererBoucle(
        latLng[0],
        latLng[1],
        dist,
        disc,
        nouvelleVariante,
        prefRoute,
        eviterNat,
        directionPref
      );

      // Mise à jour de l'affichage
      if (donneesRouteCourante) {
        afficherStatistiques(donneesRouteCourante);
        carteMgr.afficherTraceParcours(donneesRouteCourante.coordonnees);
        graphiqueAlti.afficherProfil(donneesRouteCourante.profilAltimetrique, donneesRouteCourante.discipline.couleur);
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
  
  btnPartager.addEventListener('click', () => {
    const pos = carteMgr.positionDepart;
    const dist = inputDistance.value;
    const disc = selectDiscipline.value;
    const dir = selectDirection ? selectDirection.value : 'aleatoire';
    const lien = ExportateurDeParcours.genererLienPartage(pos[0], pos[1], dist, disc, dir);
    navigator.clipboard.writeText(lien);
    alert(TRADUCTIONS[langueActuelle].lienCopie);
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

  const themeSauvegarde = localStorage.getItem('theme_app') || 'dark';
  appliquerTheme(themeSauvegarde);

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
          elem.textContent = t[cle];
        }
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

  // Tenter de géolocaliser automatiquement au premier lancement
  setTimeout(() => {
    geolocaliserUtilisateur();
  }, 600);
});
