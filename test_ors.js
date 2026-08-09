const fetch = require('node-fetch');

async function test() {
    const url = "https://api.opentopodata.org/v1/mapzen?locations=48.33,-2.91";
    try {
        const reponse = await fetch(url);
        const txt = await reponse.text();
        console.log("OpenTopoData:", txt);
    } catch (e) {
        console.log("Error:", e);
    }
}
test();
