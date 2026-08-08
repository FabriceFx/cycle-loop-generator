/**
 * Module d'exportation GPX, partage et liens d'intégration externe.
 * 
 * @author Fabrice Faucheux (https://faucheux.bzh)
 */

class ExportateurDeParcours {
  /**
   * Génère et déclenche le téléchargement d'un fichier .gpx standard 1.1.
   * 
   * @param {Object} donneesRoute - Données du parcours retournées par GenerateurDeParcours
   */
  static telechargerGpx(donneesRoute) {
    if (!donneesRoute || !donneesRoute.coordonnees) return;

    const nomParcours = `Parcours_${donneesRoute.discipline.nom}_${donneesRoute.distanceKm}km`;
    const horodatage = new Date().toISOString();

    let xmlGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Parcours Sportif - faucheux.bzh" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${nomParcours}</name>
    <desc>Boucle ${donneesRoute.discipline.nom} de ${donneesRoute.distanceKm} km générée via https://faucheux.bzh</desc>
    <author>
      <name>Fabrice Faucheux</name>
      <link href="https://faucheux.bzh"/>
    </author>
    <time>${horodatage}</time>
  </metadata>
  <trk>
    <name>${nomParcours}</name>
    <type>${donneesRoute.discipline.nom}</type>
    <trkseg>
`;

    // Ajout de chaque point de trace [lng, lat, ele]
    donneesRoute.coordonnees.forEach(coord => {
      const lng = coord[0];
      const lat = coord[1];
      const ele = coord.length > 2 ? coord[2] : 0;

      xmlGpx += `      <trkpt lat="${lat}" lon="${lng}">\n        <ele>${ele}</ele>\n      </trkpt>\n`;
    });

    xmlGpx += `    </trkseg>\n  </trk>\n</gpx>`;

    // Téléchargement du fichier
    const blob = new Blob([xmlGpx], { type: 'application/gpx+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `${nomParcours.toLowerCase().replace(/[^a-z0-9]/g, '_')}.gpx`;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
  }

  /**
   * Ouvre l'itinéraire calculé dans Google Maps en transmettant la série d'étapes (waypoints) de la boucle.
   */
  static ouvrirGoogleMaps(donneesRoute) {
    if (!donneesRoute || !donneesRoute.coordonnees || donneesRoute.coordonnees.length === 0) return;
    const coords = donneesRoute.coordonnees; // [[lng, lat, ele], ...]

    const ptDepart = coords[0]; // [lng, lat]
    
    // Échantillonnage de 6 à 8 waypoints régulièrement répartis le long de la boucle
    const nbWaypoints = Math.min(8, Math.max(4, Math.floor(coords.length / 15)));
    const pas = Math.floor((coords.length - 1) / (nbWaypoints + 1));
    const waypointsIntermediaires = [];

    for (let i = 1; i <= nbWaypoints; i++) {
      const idx = Math.min(i * pas, coords.length - 2);
      const pt = coords[idx];
      waypointsIntermediaires.push(`${pt[1].toFixed(5)},${pt[0].toFixed(5)}`);
    }

    const waypointsStr = waypointsIntermediaires.join('|');
    const url = `https://www.google.com/maps/dir/?api=1&origin=${ptDepart[1].toFixed(5)},${ptDepart[0].toFixed(5)}&destination=${ptDepart[1].toFixed(5)},${ptDepart[0].toFixed(5)}&waypoints=${encodeURIComponent(waypointsStr)}&travelmode=bicycling`;
    
    window.open(url, '_blank');
  }

  /**
   * Ouvre la page de création d'itinéraire Komoot.
   */
  static ouvrirKomoot() {
    window.open('https://www.komoot.com/plan', '_blank');
  }

  /**
   * Ouvre la page de téléchargement d'activité / itinéraire Strava.
   */
  static ouvrirStrava() {
    window.open('https://www.strava.com/routes/new', '_blank');
  }

  /**
   * Génère le lien URL de partage unique du parcours.
   */
  static genererLienPartage(lat, lng, distanceKm, discipline, direction = 'aleatoire') {
    const urlBase = window.location.origin + window.location.pathname;
    return `${urlBase}#lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}&dist=${distanceKm}&disc=${discipline}&dir=${direction}`;
  }

  /**
   * Code d'intégration iframe HTML pour intégrer l'application sur faucheux.bzh / WordPress.
   */
  static genererCodeIframe() {
    const urlBase = window.location.origin + window.location.pathname;
    return `<iframe src="${urlBase}" width="100%" height="650px" style="border: none; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);" title="Générateur de Parcours Sportif - faucheux.bzh" allow="geolocation"></iframe>`;
  }
}
