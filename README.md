# 🚴 Générateur de Parcours Sportif (VTT, Route, Gravel) / Cycling Route Generator

**Version 1.1.0**  
Développé par **Fabrice Faucheux** — [https://faucheux.bzh](https://faucheux.bzh)

---

## 🇫🇷 Français

### Description
Le **Générateur de parcours sportif** est une application web moderne, réactive et autonome permettant de générer automatiquement des circuits en boucle (round-trip) adaptés aux cyclistes selon :
1. **Le point de départ** (Géolocalisation GPS du navigateur, recherche d'adresse Nominatim, ou clic direct sur la carte).
2. **La distance souhaitée** (de 5 km à 200 km).
3. **La direction** (Nord, Sud, Est, Ouest, ou aléatoire).
4. **La discipline** :
   - 🚵 **VTT / VTC** : privilégie les sentiers, forêts et chemins de terre.
   - 🚵‍♂️ **Gravel** : mix de pistes, voies vertes et petites routes secondaires.
   - 🚴 **Route** : privilégie l'asphalte et les pistes cyclables.

### Fonctionnalités Clés
- 🗺️ **Gradient Track dynamique** (Leaflet) : le tracé est coloré dynamiquement selon la déclivité locale calculée, avec légende au style Glassmorphism.
- ⛰️ **Profil altimétrique HD** (Chart.js) via batching Open-Meteo Elevation.
- 🔄 **Moteur Géométrique Unifié** : génération via l'API OpenRouteService Directions avec un fallback 100% autonome et sécurisé sur OSRM (profil *cycling*).
- 💾 **Exportation GPX 1.1** avec altitudes 3D.
- 🌐 **Code d'intégration Iframe** prêt pour WordPress (`faucheux.bzh`).
- 🌓 **Thème Sombre / Clair** & **Interface Bilingue (Français / Anglais)**.
- ℹ️ **Menu À Propos** avec mentions légales et coordonnées du développeur.

### Guide d'Intégration sur WordPress (faucheux.bzh)
Vous pouvez héberger l'outil sur votre serveur web ou l'intégrer facilement dans un article ou une page WordPress via un bloc HTML personnalisé :

```html
<iframe 
  src="https://faucheux.bzh/parcours/" 
  width="100%" 
  height="650px" 
  style="border: none; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);" 
  title="Générateur de Parcours Sportif - faucheux.bzh" 
  allow="geolocation">
</iframe>
```

---

## 🇬🇧 English

### Description
The **Cycling Route Generator** is a modern, responsive single-page web app designed to generate custom round-trip cycling loops based on:
1. **Starting Location** (Browser GPS Geolocation, address search, or direct map click).
2. **Target Distance** (from 5 km up to 200 km).
3. **Cycling Discipline**:
   - 🚵 **MTB / Mountain Bike**: favors unpaved tracks, trails, forest paths, elevation.
   - 🚵‍♂️ **Gravel**: blend of gravel tracks, greenways, and quiet secondary roads.
   - 🚴 **Road Bike**: favors smooth asphalt and paved cycle lanes.

### Key Features
- 🗺️ **Interactive Leaflet Map** with layer switching (*CyclOSM*, *OpenTopoMap*, *OpenStreetMap*).
- ⛰️ **Interactive Elevation Profile** (Chart.js): hovering highlights the exact map coordinates.
- 🔄 **Hybrid Routing Engine**: OpenRouteService API with automatic fallback to geometric polygon routing enriched by Open-Meteo DEM.
- 💾 **GPX 1.1 Download** with 3D elevation coordinates compatible with Garmin, Wahoo, Bryton, Strava, Komoot.
- 🌐 **Iframe Embed Code** ready for WordPress.
- 🌓 **Dark / Light Glassmorphism Theme** & **Bilingual Interface (French / English)**.

---

## 📜 Licence & Crédits / License & Credits

- **Développeur** : Fabrice Faucheux ([faucheux.bzh](https://faucheux.bzh))
- **Licence** : MIT
- **Données cartographiques** : OpenStreetMap contributors, OpenRouteService, Open-Meteo, CyclOSM, OpenTopoMap.
