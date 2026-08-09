# 🚴 Générateur de Parcours Sportif (VTT, Route, Gravel) / Cycling Route Generator

**Version 2.0.0**  
Développé par **Fabrice Faucheux** — [https://faucheux.bzh](https://faucheux.bzh)

🚀 **Outil testable en direct ici / Live demo available here :** [https://faucheux.bzh/parcours/](https://faucheux.bzh/parcours/)

---

## 🇫🇷 Français

### 🌟 Quoi de neuf dans la V2 ? (La liberté au bout des doigts)
Imaginez : vous êtes sur votre lieu de vacances, le vélo est prêt, mais vous ne connaissez pas la région. Pas d'ordinateur à disposition. Jusqu'ici, tracer un parcours sur un petit écran était une corvée frustrante. 
Aujourd'hui, c'est l'inverse : vous ressentez cette liberté immédiate de pouvoir générer une boucle parfaite en 3 secondes depuis votre smartphone. Grâce au support **PWA (Application Mobile Installable)** et à la nouvelle interface tactile repensée pour vous laisser 100% de la carte, votre prochain parcours est littéralement dans votre poche. 

### Description
Le **Générateur de parcours sportif** est une application web moderne (PWA), réactive et autonome permettant de générer automatiquement des circuits en boucle (*round-trip*) parfaits grâce à l'algorithme intelligent d'OpenRouteService.
1. **Le point de départ** : Géolocalisation GPS, recherche Nominatim ou clic sur la carte.
2. **La distance souhaitée** : De 5 km à 200 km.
3. **La discipline** :
   - 🚵 **VTT / VTC** : Sentiers, forêts et chemins.
   - 🚵‍♂️ **Gravel** : Pistes, voies vertes et petites routes.
   - 🚴 **Route** : Asphalte et pistes cyclables.
   - 🏃 **Running / Rando** : Chemins pédestres.

### Fonctionnalités Clés
- 📱 **Progressive Web App (PWA)** : Installable sur iOS et Android pour une expérience d'application native. Interface mobile optimisée (Glassmorphism, panneau rétractable).
- 🔄 **Moteur de Routage (OpenRouteService)** : Utilisation native du mode `round_trip` d'ORS pour générer de véritables boucles imprévisibles et optimisées, avec un fallback de secours.
- 🔑 **Configuration API Personnalisée** : Les utilisateurs peuvent désormais renseigner leur propre clé API (Token) depuis l'interface pour éviter les limites de quota.
- ➡️ **Sens du parcours** : Affichage dynamique de flèches directionnelles sur la trace grâce à `leaflet-polylinedecorator`.
- 🚰 **Points d'Intérêts (POIs)** : Affichage optionnel des points d'eau et toilettes publiques via l'API Overpass.
- ⛰️ **Profil altimétrique HD** : Généré via Open-Meteo Elevation.
- 💾 **Exportation GPX 1.1** : Compatible Garmin, Wahoo, Strava, etc.
- 🌓 **Thème Sombre / Clair** & **Bilingue (FR/EN)** avec mémorisation des préférences.
- 🌐 **Code d'intégration Iframe** pour l'intégrer sur n'importe quel site web.

### Prérequis & Installation
Aucun backend requis. L'application est 100% statique (HTML, CSS, JS) et communique directement avec les API publiques.
1. Clonez ce dépôt.
2. Hébergez les fichiers sur n'importe quel serveur web (Apache, Nginx, GitHub Pages...).
3. Pour des performances optimales, il est recommandé que chaque utilisateur renseigne son propre Token gratuit via le menu **Paramètres API (⚙️)** en créant un compte sur [account.heigit.org](https://account.heigit.org/manage/key).

---

## 🇬🇧 English

### Description
The **Sports Route Generator** is a modern, responsive Progressive Web App (PWA) designed to generate perfect custom round-trip loops for cyclists and runners using the intelligent OpenRouteService algorithm.
1. **Starting Location**: GPS Geolocation, address search, or direct map click.
2. **Target Distance**: From 5 km up to 200 km.
3. **Discipline**: MTB, Gravel, Road Bike, or Running.

### Key Features
- 📱 **Progressive Web App (PWA)**: Installable on iOS & Android. Features a highly optimized mobile UI with a retractable Glassmorphism control panel.
- 🔄 **Routing Engine**: Leverages OpenRouteService's native `round_trip` algorithm for generating true, unpredictable sports loops.
- 🔑 **Custom API Configuration**: Users can input their own free ORS API Token directly in the app to prevent quota limits.
- ➡️ **Route Direction**: Dynamic directional arrows on the map using `leaflet-polylinedecorator`.
- 🚰 **Points of Interest (POIs)**: Option to display drinking water and public toilets via Overpass API.
- ⛰️ **HD Elevation Profile**: Powered by Open-Meteo Elevation.
- 💾 **GPX 1.1 Export**: Fully compatible with Garmin, Wahoo, Strava, Komoot.
- 🌓 **Dark / Light Theme** & **Bilingual (FR/EN)** with automatic saving of user preferences.
- 🌐 **Iframe Embed Code** ready for WordPress and other CMS.

### Prerequisites & Installation
No backend is required. The app is 100% static (HTML, CSS, Vanilla JS) and communicates directly with public APIs.
1. Clone this repository.
2. Host the files on any static web server (Apache, Nginx, GitHub Pages...).
3. For optimal performance, users should generate and input their own free Token via the **API Settings (⚙️)** menu by creating an account on [account.heigit.org](https://account.heigit.org/manage/key).

---

## 📜 Licence & Crédits / License & Credits

- **Développeur** : Fabrice Faucheux ([faucheux.bzh](https://faucheux.bzh))
- **Licence** : MIT
- **Données cartographiques** : OpenStreetMap contributors, OpenRouteService, Open-Meteo, CyclOSM, OpenTopoMap, Overpass API.
