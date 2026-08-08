/**
 * Module de rendu du profil altimétrique interactif (Chart.js / Canvas).
 * 
 * @author Fabrice Faucheux (https://faucheux.bzh)
 */

class GraphiqueAltimetrique {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.chart = null;
    this.callbackSurvolPoint = null;
  }

  /**
   * Rendu du graphique altimétrique à partir des données de profil.
   * 
   * @param {Array<Object>} profilAltimetrique - [{distanceKm, altitude, lat, lng}, ...]
   * @param {string} couleurHex - Couleur principale du dégradé
   */
  afficherProfil(profilAltimetrique, couleurHex = '#10b981') {
    if (!this.canvas) return;

    // Destruction de l'ancien graphique si existant
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.canvas.getContext('2d');
    
    // Création du dégradé vertical sous la courbe
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, couleurHex + '80'); // 50% opacité en haut
    gradient.addColorStop(1, couleurHex + '05'); // 5% opacité en bas

    const labels = profilAltimetrique.map(p => `${p.distanceKm} km`);
    const altitudes = profilAltimetrique.map(p => p.altitude);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Altitude (m)',
          data: altitudes,
          borderColor: couleurHex,
          borderWidth: 2.5,
          fill: true,
          backgroundColor: gradient,
          tension: 0.3, // Courbe lissée
          pointRadius: 0, // Points masqués par défaut
          pointHoverRadius: 6,
          pointHoverBackgroundColor: couleurHex,
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            titleFont: { family: 'Outfit, sans-serif', size: 13 },
            bodyFont: { family: 'Inter, sans-serif', size: 12 },
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => `Km ${profilAltimetrique[items[0].dataIndex].distanceKm}`,
              label: (item) => `Altitude : ${item.raw} m`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 8,
              font: { family: 'Inter, sans-serif', size: 11 },
              color: '#94a3b8'
            }
          },
          y: {
            grid: { color: 'rgba(148, 163, 184, 0.1)' },
            ticks: {
              font: { family: 'Inter, sans-serif', size: 11 },
              color: '#94a3b8',
              callback: (val) => `${val}m`
            }
          }
        },
        onHover: (event, activeElements) => {
          if (activeElements && activeElements.length > 0 && this.callbackSurvolPoint) {
            const index = activeElements[0].index;
            const point = profilAltimetrique[index];
            if (point) {
              this.callbackSurvolPoint(point.lat, point.lng);
            }
          }
        }
      }
    });
  }
}
