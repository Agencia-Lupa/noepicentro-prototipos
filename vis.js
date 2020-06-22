mapboxgl.accessToken = 'pk.eyJ1IjoidGlhZ29tYnAiLCJhIjoiY2thdjJmajYzMHR1YzJ5b2huM2pscjdreCJ9.oT7nAiasQnIMjhUB-VFvmw';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/tiagombp/ckb2zfl7a02xc1gp3u5ege6xh', // replace this with your style URL,
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
    let setores = map.queryRenderedFeatures({layers : ["set-29jjsu"]});
    console.log({setores});
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

function povoa(setores_dentro, poligono_features) {

    if (map.getLayer('ponto')) map.removeLayer('ponto');
    if (map.getSource('ponto_dentro')) map.removeSource('ponto_dentro');

    let lista_pontos = [];
    let total_pontos = 0;
    let pop_total = 0;
    let setores_undefined = []


    for (setor of setores_dentro) {
        try {
            let pop = setor.properties.populacao_residente;
            let cod_setor = setor.properties.code_tract;

            let bbox_setor = turf.bbox(setor);
            let bboxPoly = turf.bboxPolygon(bbox_setor);

            let area_bbox = turf.area(bboxPoly);

            // melhor fazer um query pra cada setor? ou um query só dos features e os differences. e, nesse último caso, fazer um intersect antes dos features com o bbox do setor?

            let setor_liquido = turf.difference(setor, poligono_features);
            let area_liquida = turf.area(setor_liquido);

            let razao = area_bbox / area_liquida;

            let pontos = turf.randomPoint(pop * razao, {bbox: bbox_setor});

            let pontos_dentro = turf.pointsWithinPolygon(pontos, setor_liquido);

            if (!pop) setores_undefined.push(cod_setor);
            
            total_pontos += pontos_dentro.features.length;
            pop_total += pop ? pop : 0;

            lista_pontos.push(pontos_dentro);

            console.log("Setor", cod_setor, "\n Pop: ", pop, "\n pontos_dentro: ", pontos_dentro.features.length, "\n taxa de pontos_dentro/necessarios: ", 100*pontos_dentro.features.length/pop, '\n Pop total até agora ', pop_total);                        
        } catch (error) {
            console.log("Erro: " + error);
        }
    }

    let todos_features = [];
    lista_pontos.forEach(d => todos_features = todos_features.concat(d.features));
    //console.log({lista_pontos});
    //console.log({todos_features})

    console.log("A população total nos setores é: ", pop_total, '\n A quantidade de pontos gerados dentro dos polígonos foi ', total_pontos);

    console.log("Setores com população indefinida", setores_undefined);


    todos_pontos = {
        "type": "FeatureCollection",
        "features": todos_features
    }

    $log.append("p").append("span").text("8. Simulação Ok!");   

    /*
    map.addSource('ponto_dentro', {
    'type': 'geojson',
    'data': todos_pontos});

    map.addLayer({
        'id': 'ponto',
        'type': 'circle',
        'source': 'ponto_dentro',
        'layout': {},
        'paint': {
        'circle-color': 'firebrick',
        'circle-radius' : 2
    }},
    'road-minor-low'); */
} 

function limita(o_circulo) {

    if (map.getLayer('limita')) map.removeLayer('limita');
    if (map.getSource('limita')) map.removeSource('limita');    

    let t1 = performance.now();

    let pontos_dentro_circulo = turf.pointsWithinPolygon(todos_pontos, o_circulo);

    let t2 = performance.now();

    console.log("Total de pontos dentro do círculo ", pontos_dentro_circulo.features.length)

    console.log(t2-t1);

    $log.select("p.limita>span").text("9. Filtrando pontos que dentro do círculo... ok!");
    $log.append("p").append("span").text("10. Renderizando (também pode demorar).");
    $log.insert("p", "p.first").classed("oculta", true).text("Ocultar log").on("click", function() {
        $log.style("opacity", 0);
    })

    
    map.addSource('limita', {
    'type': 'geojson',
    'data': pontos_dentro_circulo});

    map.addLayer({
        'id': 'limita',
        'type': 'circle',
        'source': 'limita',
        'layout': {},
        'paint': {
        'circle-color': 'firebrick',
        'circle-radius' : 2,
        'circle-opacity' : 0.5
    }},
    'road-minor-low'); 


    
    //map.removeLayer('ponto');
    //map.removeSource('ponto_dentro');
} 

function destaca_setores(setores_dentro) {
    
    codigos = setores_dentro.map(d => d.properties.code_tract);

    map.addSource('setores', {
        'type': 'vector',
        'url': 'mapbox://tiagombp.9h8xjbk1'
        });
    
    map.addLayer(
        {
        'id': 'setores-destacados',
        'type': 'fill',
        'source': 'setores',
        'source-layer': 'set-29jjsu',
        'paint': {
            'fill-outline-color': 'purple',
            'fill-color': 'purple',
            'fill-opacity': 0.5
        },
        'filter': ['in', 'code_tract', '']
    }); 

    map.addLayer(
        {
        'id': 'setores-destacados2',
        'type': 'fill',
        'source': 'setores',
        'source-layer': 'set-29jjsu',
        'paint': {
            'fill-outline-color': 'gold',
            'fill-color': 'gold',
            'fill-opacity': 0.5
        },
        'filter': ['in', 'code_tract', '']
    }); 

    map.setFilter('setores-destacados', ['in', ['get', 'code_tract'], ["literal", codigos]]);
    map.moveLayer('setores-destacados');

    let set = ['292740805070119', '292740805070071', '292740805070213',
    '292740805070233', '292740805070028', '292740805070114',
    '292740805070172', '292740805070253', '292740805070030',
    '292740805070111', '292740805070166', '292740805070181',
    '292740805070202', '292740805070110', '292740805070070',
    '292740805070029', '292740805070201', '292740805070243',
    '292740805070242', '292740805070232', '292740805070205',
    '292740805070203', '292740805070108', '292740805070064',
    '292740805070005', '292740805070069', '292740805070150',
    '292740805070180', '292740805070164', '292740805070173',
    '292740805070105', '292740805070004', '292740805070106',
    '292740805070268', '292740805070240', '292740805070066',
    '292740805070068', '292740805070063', '292740805070065',
    '292740805070241', '292740805070026', '292740805070020',
    '292740805070067', '292740805070025', '292740805070229',
    '292740805070231', '292740805070274', '292740805070183',
    '292740805070027', '292740805070021', '292740805070023',
    '292740805070022', '292740805070165', '292740805070024',
    '292740805070230', '292740805070189', '292740805070198',
    '292740805070101', '292740805070061', '292740805070265',
    '292740805070062', '292740805070058', '292740805070277',
    '292740805070276', '292740805070059', '292740805070057',
    '292740805070060', '292740805070056', '292740805070171',
    '292740805070197', '292740805070149', '292740805070103',
    '292740805070053', '292740805070054', '292740805070174',
    '292740805070222', '292740805070188', '292740805070055',
    '292740805070102', '292740805070187', '292740805070196',
    '292740805070098', '292740805070249', '292740805070099',
    '292740805070143', '292740805070142', '292740805070100',
    '292740805070264', '292740805070144'];

    map.setFilter('setores-destacados2', ['in', ['get', 'code_tract'], ["literal", set]]);
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
        if (map.getLayer('limita')) map.removeLayer('limita');
        if (map.getSource('limita')) map.removeSource('limita');
        if (map.getLayer('circulo')) map.removeLayer('circulo');
        if (map.getSource('circulo')) map.removeSource('circulo');

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

                $log.select("p.fetch>span").text("3. Solicitando tamanho do raio para o backend... OK!");

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
                        $log.append("p").append("span").text("6. Coleta features que serão removidos do cálculo (água, parques etc.).");
                        $log.append("p").classed("simulacao", true).append("span").text("7. Iniciando simulação: gerando um ponto para cada habitante de cada um dos setores total ou parcialmente dentro do círculo (vai demorar)...");
                        
                        map.on('moveend', function(e) {
                            if (ajustandoBounds) {
                                ajustandoBounds = false;
                                console.log("Coletando features...");

                                features = map.queryRenderedFeatures({layers : ["water", "landuse", "national-park"]});
                                poligono_features = turf.union(...features);

                                let setores_dentro = lista_setores_dentro(o_circulo)
                                
                                povoa(setores_dentro, poligono_features);

                                $log.append("p").classed("limita", true).append("span").text("9. Filtrando pontos que dentro do círculo... ");
                
                                limita(o_circulo); 
                                //destaca_setores(setores_dentro);


                            }                            


                        })


                    }});

                console.log("Centro", centro, "no_raio", no_raio, "raio em km", raio);
            })
            .catch(function(e) {
                $log.append("p").classed("erro", true).append("span").html("Erro na busca do raio. Provavelmente por causa do certificado do servidor da API. Experimente visitar primeiro <a href='https://coldfoot-api.eba-8zt2jyyb.us-west-2.elasticbeanstalk.com/'>esta página</a> e tentar novamente.");
            });      
    });
};

inicia_mapa();
