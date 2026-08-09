const fetch = require('node-fetch');

async function test() {
    const waypoints = [[8.681495,49.41461],[8.687872,49.420318]];
    const url = "https://api.openrouteservice.org/v2/directions/cycling-regular/geojson";
    const corps = {
      coordinates: waypoints,
      elevation: true
    };
    console.log(corps);
}
test();
