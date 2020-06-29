mapboxgl.accessToken = 'pk.eyJ1IjoidGlhZ29tYnAiLCJhIjoiY2thdjJmajYzMHR1YzJ5b2huM2pscjdreCJ9.oT7nAiasQnIMjhUB-VFvmw';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/tiagombp/ckbz4zcsb2x3w1iqyc3y2eilr',
    center: [-30, 0],
    zoom: 4
});

let $log = d3.select("#log");

// funções que vão ser chamadas

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
    $log.select("p.circulo>span").text("4. Desenhando círculo... OK!");
    return circle;
}

function lista_setores_dentro(circulo) {
    let setores = map.queryRenderedFeatures({layers : ["setores"]});
    let setores_dentro = [];
    setores.forEach(d => {
        if (turf.intersect(d, circulo)) {
            setores_dentro.push(d);
        }
    });
    let codigos_dentro = setores_dentro.map(d=>d.properties.code_tract);
    //localStorage.setItem('testObject', JSON.stringify(codigos_dentro));
    
    return setores_dentro;
}   

function popula_mapa() {
    map.setPaintProperty(
        'people', 
        'circle-opacity',
        0.25
    );
    map.moveLayer("people", "national-park")
}

// function estiliza(o_circulo) {

//     map.setPaintProperty(
//         'people', 
//         'circle-color', 
//         [
//             "case",
//             ['within', o_circulo], 
//             "white",
//             "grey"
//         ]);

//     map.setPaintProperty(
//         'people', 
//         'circle-opacity', 
//         [
//             "case",
//             ['within', o_circulo], 
//             0.8,
//             0.5
//         ]);

//     map.moveLayer("people", "national-park")
// }

function toggle_labels(show) {
    //console.log(labels_layers, !labels_layers);
    //if (!labels_layers) 
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

function creates_inside_layer(circulo) {
       
    map.addLayer(
        {
        'id': 'people-inside',
        'type': 'circle',
        'source': 'composite',
        'source-layer': 'people',
        'paint': {
            'circle-radius': 2,
            'circle-color': 'white',
            'circle-opacity': 0.8
        },
        'filter': ['within', circulo]
    },
    'people'); 
}


// função principal

function inicia_mapa() {
    let geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
    
        countries: 'br',


        language: 'pt-br',
        flyTo: {
            'speed': 2,
            'zoom': 4
        },
        mapboxgl: mapboxgl
    });

    //console.log(geocoder);
         
    document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

    //map.addControl(geocoder);

    // a cada resultado

    geocoder.on('result', function(e) {

        //zera o log
        $log.selectAll("*").remove();
        $log.style("opacity", 1);


        console.log(e.result.center);
        //d3.select("#geocoder").classed("hidden", true);

        //remove camadas para novo resultado
        if (map.getLayer('people-inside')) map.removeLayer('people-inside');
        if (map.getLayer('circulo')) map.removeLayer('circulo');
        if (map.getSource('circulo')) map.removeSource('circulo');
        if (map.getLayer('setores-destacados')) map.removeLayer('setores-destacados');

        $log.append("p").classed("first", true).append("span").text("1. Localização definida.")

        map.flyTo({ 
            'center': e.result.center,
            'speed': 0.8,
            'zoom': 12
         });

        $log.append("p").append("span").text("2. Voando para o destino.")

        let flying = true;

        let lat = e.result.center[1];
        let lon = e.result.center[0];

        $log.append("p").classed("fetch", true).append("span").text("3. Solicitando tamanho do raio para o backend...");

        //fetch 
        let t_antes = performance.now()
        fetch('https://coldfoot-api.eba-8zt2jyyb.us-west-2.elasticbeanstalk.com/coords?lat='+lat+'&lon=' + lon, {mode: 'cors'})
            .then(function(response) {
                if (!response.ok) {
                    throw Error();
                } 
                return response.json();
            })
            .then(function(resposta) {
                let t_depoisb = performance.now();
                console.log("tempo para fetch", t_depoisb-t_antes)
                let ponto_raio = resposta[1];

                let coord_centro = e.result.center;

                let centro = turf.point(e.result.center);
                let no_raio = turf.point(ponto_raio);
                let raio = turf.distance(centro, no_raio);

                $log.select("p.fetch>span").text("3. Solicitando tamanho do raio para o backend... OK! " + d3.format(",.1f")(raio) + "km.");

                // desenha círculo

                let todos_pontos;

                $log.append("p").classed("circulo", true).append("span").text("4. Desenhando círculo...");

                let o_circulo = circulo(coord_centro, raio);
                bbox_circulo = turf.bbox(o_circulo);

                let features, poligono_features;

                map.on('moveend', function(e){
                    if (flying) {
                        flying = false;

                        map.fitBounds(bbox_circulo, {
                            padding: {top: 20, bottom:20, left: 10, right: 10},
                            duration: 1000
                        }); 

                        $log.append("p").append("span").text("5. Ajusta zoom.");
                        let ajustandoBounds = true;
                        
                        map.on('moveend', function(e) {
                            if (ajustandoBounds) {
                                ajustandoBounds = false;
                                //console.log("Coletando features...");
                                //$log.append("p").append("span").text("6. Calcula setores dentro.");
                                //let setores_dentro = lista_setores_dentro(o_circulo)
                                //cod_setores_dentro = setores_dentro.map(d => d.properties.code_tract);

                                let botao_pop = false;
                                let botao_pop_circulo = false;
                                let botao_toggle_circle = true;
                                let botao_toggle_label = true;

                                $log.insert("p", "p.first").classed("oculta", true).classed("botoes", true).text("Ocultar log").on("click", function() {
                                    $log.style("opacity", 0);
                                });
                            
                                $log.insert("p", "p.oculta").classed("pop", true).classed("botoes", true).text("Mostra População").on("click", function() { 
                                    botao_pop = !botao_pop;
                                    //$log.select("p.pop").classed("selecionado", botao_pop);
                                    popula_mapa(); 
                                });

                                $log.insert("p", "p.oculta").classed("mostra", true).classed("selecionado", botao_toggle_label).classed("labels", true).classed("botoes", true).text("Toggle texto").on("click", function() { 
                                    botao_toggle_label = !botao_toggle_label;
                                    $log.select("p.labels").classed("selecionado", botao_toggle_label);
                                    toggle_labels(show = botao_toggle_label);
                                });

                                $log.insert("p", "p.mostra").classed("mostra-circulo", true).classed("botoes", true).classed("selecionado", botao_toggle_circle).text("Toggle Círculo").on("click", function() { 
                                    botao_toggle_circle = !botao_toggle_circle
                                    $log.select("p.mostra-circulo").classed("selecionado", botao_toggle_circle);
                                    toggle_circle(botao_toggle_circle);
                                });
                            
                                $log.insert("p", "p.mostra").classed("pop-circulo", true).classed("botoes", true).text("População Círculo").on("click", function() { 
                                    botao_pop_circulo = !botao_pop_circulo
                                    //$log.select("p.pop-circulo").classed("selecionado", botao_pop_circulo);
                                    creates_inside_layer(o_circulo);
                                });
                     
                            }                            


                        })


                    }
                });

                console.log("Centro", centro, "no_raio", no_raio, "raio em km", raio);
            })
            .catch(function(e) {
                $log.append("p").classed("erro", true).append("span").html("Erro na busca do raio. Provavelmente por causa do certificado do servidor da API. Experimente visitar primeiro <a href='https://coldfoot-api.eba-8zt2jyyb.us-west-2.elasticbeanstalk.com/'>esta página</a> e tentar novamente.");
            });      
    });
};

inicia_mapa();
