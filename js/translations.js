/**
 * Dictionnaire bilingue (Français / Anglais) pour l'interface de l'application.
 * 
 * @author Fabrice Faucheux (https://faucheux.bzh)
 */

const TRADUCTIONS = {
  fr: {
    titreApp: "Générateur de parcours sportif",
    sousTitreApp: "Créez vos boucles VTT, route & gravel sur-mesure",
    discipline: "Discipline",
    directionParcours: "Direction souhaitée",
    dirAleatoire: "🎲 Aléatoire (toutes directions)",
    dirNord: "⬆️ Nord (vers le nord)",
    dirEst: "➡️ Est (vers l'est)",
    dirSud: "⬇️ Sud (vers le sud)",
    dirOuest: "⬅️ Ouest (vers l'ouest)",
    typeRoutes: "Réseau routier souhaité",
    eviterGrandesRoutes: "Éviter les grandes routes & nationales",
    distanceSouhaitee: "Distance souhaitée",
    pointDepart: "Point de départ",
    maPosition: "Ma position actuelle",
    rechercherLieu: "Rechercher une ville, un lieu...",
    genererParcours: "Générer le parcours",
    autreVariante: "Autre variante",
    rechercheEnCours: "Recherche en cours...",
    generationEnCours: "Génération de la boucle en cours...",
    
    // Statistiques
    boucleFermee: "🔄 Boucle fermée (départ = arrivée)",
    distanceReelle: "Distance calculée",
    denivelePositif: "Dénivelé positif (+D)",
    deniveleNegatif: "Dénivelé négatif (-D)",
    tempsEstime: "Temps estimé",
    vitesseMoyenne: "Vitesse moy.",
    altitudeMin: "Alt. min",
    altitudeMax: "Alt. max",

    // Fonds de carte & Profil
    fondsDeCarte: "Fond de carte",
    profilAltimetrique: "Profil d'altitude",
    survolerCarte: "Survolez le graphique pour visualiser la position exacte sur la carte.",

    // Export & Partage
    exporterGpx: "Télécharger le GPX",
    ouvrirStrava: "Ouvrir Strava",
    ouvrirKomoot: "Ouvrir Komoot",
    ouvrirGoogleMaps: "Ouvrir Google Maps",
    partagerParcours: "Partager ce parcours",
    integrerIframe: "Intégrer sur mon site",
    lienCopie: "Lien copié dans le presse-papier !",

    // Modales & Navigation
    aPropos: "À propos",
    fermer: "Fermer",
    reglagesApi: "Clé API OpenRouteService",
    sauvegarder: "Sauvegarder",
    clePerso: "Votre clé API personnelle (optionnel) :",
    modeHybrideActif: "Mode hybride actif : calcul d'itinéraire optimisé avec fallback intelligent.",

    // Textes À Propos
    texteAProposTitre: "À propos du générateur de parcours",
    texteAPropos1: "Cet outil web a été conçu pour permettre aux cyclistes (VTT, Gravel, Route) de générer instantanément une boucle d'entraînement personnalisée à partir de leur position exacte.",
    texteAPropos2: "Développé par Fabrice Faucheux pour intégration sur faucheux.bzh.",
    texteDeveloppeur: "Développeur : Fabrice Faucheux",
    siteWeb: "Site web : https://faucheux.bzh",

    // Code iframe
    codeIframeTitre: "Code d'intégration iframe (WordPress & Web)",
    codeIframeExplication: "Copiez ce code HTML pour intégrer le générateur sur votre site web ou votre article WordPress :",
    copierCode: "Copier le code",
    codeCopie: "Code copié !",

    // Erreurs
    erreurGeoloc: "Impossible d'accéder à votre géolocalisation. Veuillez vérifier les permissions de votre navigateur.",
    erreurGpsInconnu: "Lieu introuvable. Veuillez essayer une autre recherche.",
    erreurCalcul: "Impossible de calculer un itinéraire exact. Essai avec l'algorithme de secours..."
  },

  en: {
    titreApp: "Cycling Route Generator",
    sousTitreApp: "Create custom MTB, Road & Gravel loops",
    discipline: "Discipline",
    directionParcours: "Route Direction",
    dirAleatoire: "🎲 Random (All directions)",
    dirNord: "⬆️ North (Towards North)",
    dirEst: "➡️ East (Towards East)",
    dirSud: "⬇️ South (Towards South)",
    dirOuest: "⬅️ West (Towards West)",
    typeRoutes: "Road Type Preference",
    eviterGrandesRoutes: "Avoid main highways & major roads",
    distanceSouhaitee: "Target Distance",
    pointDepart: "Starting Point",
    maPosition: "My Current Position",
    rechercherLieu: "Search city, address...",
    genererParcours: "Generate Route",
    autreVariante: "Another Variation",
    rechercheEnCours: "Searching...",
    generationEnCours: "Generating circular route...",

    // Statistics
    boucleFermee: "🔄 Closed Loop (Start = Finish)",
    distanceReelle: "Calculated Distance",
    denivelePositif: "Elevation Gain (+D)",
    deniveleNegatif: "Elevation Loss (-D)",
    tempsEstime: "Estimated Time",
    vitesseMoyenne: "Avg. Speed",
    altitudeMin: "Min Alt.",
    altitudeMax: "Max Alt.",

    // Map & Profile
    fondsDeCarte: "Map Layer",
    profilAltimetrique: "Elevation Profile",
    survolerCarte: "Hover over chart to pinpoint the location on the map.",

    // Export & Share
    exporterGpx: "Download GPX",
    ouvrirStrava: "Open Strava",
    ouvrirKomoot: "Open Komoot",
    ouvrirGoogleMaps: "Open Google Maps",
    partagerParcours: "Share Route",
    integrerIframe: "Embed on Website",
    lienCopie: "Link copied to clipboard!",

    // Modals & Nav
    aPropos: "About",
    fermer: "Close",
    reglagesApi: "OpenRouteService API Key",
    sauvegarder: "Save",
    clePerso: "Personal API Key (Optional):",
    modeHybrideActif: "Hybrid mode active: optimized routing with automatic fallback.",

    // About Texts
    texteAProposTitre: "About Route Generator",
    texteAPropos1: "This web tool allows cyclists (MTB, Gravel, Road) to instantly generate personalized loop workouts from their exact location.",
    texteAPropos2: "Developed by Fabrice Faucheux for integration on faucheux.bzh.",
    texteDeveloppeur: "Developer: Fabrice Faucheux",
    siteWeb: "Website: https://faucheux.bzh",

    // Code iframe
    codeIframeTitre: "Iframe Embedding Code (WordPress & Web)",
    codeIframeExplication: "Copy this HTML code to embed the generator into your website or WordPress post:",
    copierCode: "Copy Code",
    codeCopie: "Code copied!",

    // Errors
    erreurGeoloc: "Unable to access your location. Please check browser permissions.",
    erreurGpsInconnu: "Location not found. Please try another search term.",
    erreurCalcul: "Unable to calculate route. Falling back to geometric routing engine..."
  }
};
