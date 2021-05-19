const syncMove = require('@mapbox/mapbox-gl-sync-move');
const query = new URLSearchParams(window.location.search);
const order = query.get("order") || "cave";
let top, bottom
if (order == "cave") {
  document.getElementById("map-A").classList.add("flip");
} else {
  document.getElementById("map-B").classList.add("flip");
}

mapboxgl.accessToken = 'pk.eyJ1IjoiZG5vbWFkYiIsImEiOiJjaW16aXFsZzUwNHJmdjdra3h0Nmd2cjY1In0.SqzkaKalXxQaPhQLjodQcQ';
const B = new mapboxgl.Map({
    container: 'map-A',
    style: 'mapbox://styles/dnomadb/ckkeptams00lg18pkvkaj1i6g',
    center: [-120, 40],
    zoom: 9,
    hash: true
});

const A = new mapboxgl.Map({
    container: 'map-B',
    style: 'mapbox://styles/dnomadb/ckkeptams00lg18pkvkaj1i6g',
    center: [-120, 40],
    zoom: 9,
    hash: true
});

syncMove(A, B);
