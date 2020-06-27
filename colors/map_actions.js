function circulo(centro, raio) {

    if (map.getLayer('circulo')) map.removeLayer('circulo');
    if (map.getSource('circulo')) map.removeSource('circulo');
    
    let circle = turf.circle(centro, raio);

    map.addSource('circulo', {
            'type': 'geojson',
            'data': circle});

    map.addLayer({
            'id': 'circulo',
            'type': 'fill',
            'source': 'circulo',
            'layout': {},
            'paint': {
            'fill-outline-color': 'tomato',
            'fill-color': 'transparent',
            'fill-opacity': 1
        }},
    );
    return circle;
}

function popula_mapa() {
    // map.addSource('pop', {
    //     type: 'vector',
    //     url: 'mapbox://tiagombp.9px4rd7q'
    //     });

    map.addLayer({
        'id': 'popdentro',
        'type': 'circle',
        'source': 'composite',
        'source-layer': 'concatenated_tract_points',
        'paint': {
            'circle-color' : 'transparent',
            'circle-opacity': 0,
            'circle-radius': 2
        }},
        "landuse");
}

function estiliza(o_circulo, estado_estilo) {

    map.setPaintProperty(
        'popdentro', 
        'circle-color', 
        [
            "case",
            ['within', o_circulo], 
            estado_estilo['dentro'].cor,
            estado_estilo['fora'].cor
        ]);

    map.setPaintProperty(
        'popdentro', 
        'circle-opacity', 
        [
            "case",
            ['within', o_circulo], 
            +estado_estilo['dentro'].opacity,
            +estado_estilo['fora'].opacity
        ]);
}

function toggle_labels(show) {

    labels_layers = ["settlement-subdivision-label", "poi-label", "water-point-label", "road-label",
    "waterway-label", "airport-label", "natural-line-label"];

    let opacity = show ? 1 : 0;

    for (layer of labels_layers) {
        map.setPaintProperty(layer, "text-opacity", opacity);
    }
}

function toggle_circle(show) {

    let opacity = show ? 1 : 0;

    map.setPaintProperty("circulo", "fill-opacity", opacity);
}

