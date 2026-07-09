mapboxgl.accessToken = window.mapboxApiKey || '';
window.currentTempUnit = 'C';
window.convertTempObj = function(val) {
    if (val === null || val === undefined) return null;
    let num = Number(val);
    if (window.currentTempUnit === 'F') {
        return (num * 9/5) + 32;
    }
    return num;
};
const map = new mapboxgl.Map({
    container: 'map-root',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-70.4, 18.9],
    zoom: 6.5,
    pitch: 50,
    bearing: 0
    
});
window.map = map; 
let currentStationId = null;
let dashboardChart = null;
function apply3DEffects(mapInstance) {
    const activeBtn = document.querySelector('.style-btn.active');
    const style = activeBtn ? activeBtn.getAttribute('data-style') : '';
    const isDark = style.includes('dark');
    if (isDark) {
        mapInstance.setFog({
            'range': [1, 12],
            'horizon-blend': 0.3,
            'color': '#242B4B',
            'high-color': '#161B36',
            'space-color': '#0B1026',
            'star-intensity': 0.8
        });
    } else {
        mapInstance.setFog({
            'range': [1, 12],
            'horizon-blend': 0.3,
            'color': '#c0daf6',
            'high-color': '#e8f4ff',
            'space-color': '#b0d9ff',
            'star-intensity': 0.0
        });
    }
    if (!mapInstance.getSource('mapbox-dem')) {
        mapInstance.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
        });
    }
    mapInstance.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
    const styleObj = mapInstance.getStyle();
    if (!styleObj || !styleObj.layers) return;
    const layers = styleObj.layers;
    const labelLayer = layers.find((layer) => layer.type === 'symbol' && layer.layout['text-field']);
    const labelLayerId = labelLayer ? labelLayer.id : undefined;
    if (!mapInstance.getLayer('add-3d-buildings')) {
        mapInstance.addLayer(
            {
                'id': 'add-3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                    'fill-extrusion-color': '#aaa',
                    'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
                    'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
                    'fill-extrusion-opacity': 0.6
                }
            },
            labelLayerId
        );
    }
}
map.on('style.load', () => {
    apply3DEffects(map);
    
    
    
    setTimeout(() => {
        if (window.mapRotationActive) {
            rotateCamera();
        }
    }, 1500);
});

window.mapRotationActive = true;

function rotateCamera() {
    if (!window.mapRotationActive) {
        return;
    }
    
    
    
    
    
    const currentBearing = map.getBearing();
    map.easeTo({
        bearing: currentBearing + 5,
        duration: 3333, 
        easing: t => t,
        animate: true
    });
    
    map.once('moveend', () => {
        if (window.mapRotationActive) {
            rotateCamera();
        }
    });
}
const stopSlideshowAndRotation = () => {
    window.mapRotationActive = false;
    map.off('moveend', window.onResetMoveEnd); 
    if (window.slideshowInterval) {
        clearInterval(window.slideshowInterval);
        window.slideshowInterval = null;
    }
};
map.on('mousedown', stopSlideshowAndRotation);
map.on('touchstart', stopSlideshowAndRotation);
map.on('wheel', stopSlideshowAndRotation);
map.on('dragstart', stopSlideshowAndRotation);

window.getPremiumBiomeFallback = function(lat, lon) {
    if (lon > -69.5) {
        return 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80';
    } else if (lat > 18.6 && lat < 19.3 && lon < -70.4 && lon > -71.5) {
        return 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80';
    } else if (lat >= 19.3) {
        return 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80';
    } else {
        return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
    }
};

window.getDynamicImage = function(est, callback) {
    if (window.stationImagesCache && window.stationImagesCache[est.id]) {
        return callback(window.stationImagesCache[est.id]);
    }
    
    // Nivel 4: Mapbox Satellite Fallback Absoluto
    const fallbackSat = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${est.longitud},${est.latitud},13,0,45/800x400?access_token=${window.mapboxApiKey}`;
    if (!est.latitud || !est.longitud) return callback(fallbackSat);
    
    const resolveFinal = (img) => {
        if (window.stationImagesCache) window.stationImagesCache[est.id] = img;
        callback(img);
    };

    const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${est.longitud},${est.latitud}.json?types=place,locality&access_token=${window.mapboxApiKey}`;
    fetch(geoUrl).then(r => r.json()).then(geoData => {
        let exactName = est.nombre;
        if (geoData.features && geoData.features.length > 0) {
            exactName = geoData.features[0].text;
        }
        
        // Nivel 1: Wikipedia Article GeoSearch (Radio ESTRICTO de 2km para precisión milimétrica)
        const geoSearchUrl = `https://es.wikipedia.org/w/api.php?action=query&generator=geosearch&ggsprimary=all&ggsnamespace=0&ggsradius=2000&ggscoord=${est.latitud}|${est.longitud}&ggslimit=10&prop=pageimages&pithumbsize=1000&format=json&origin=*`;
        fetch(geoSearchUrl).then(r => r.json()).then(wData => {
            let bestImage = null;
            if (wData?.query?.pages) {
                // Priorizar si el título del artículo coincide con el nombre de la estación para máxima precisión
                const pages = Object.values(wData.query.pages);
                
                // Intento 1: Buscar coincidencia exacta de nombre
                const searchStr = (est.nombre || "").toLowerCase();
                for (const p of pages) {
                    if (p.title && p.title.toLowerCase().includes(searchStr) && p.pageimage && p.thumbnail && p.thumbnail.source) {
                        const imgName = p.pageimage.toLowerCase();
                        if (imgName.includes('.svg') || imgName.includes('.png') || imgName.includes('map') || imgName.includes('flag') || imgName.includes('logo') || imgName.includes('earth') || imgName.includes('globe')) continue;
                        bestImage = p.thumbnail.source;
                        break;
                    }
                }
                
                // Intento 2: Si no hay coincidencia exacta de nombre, tomar la primera foto válida del radio de 2km
                if (!bestImage) {
                    for (const p of pages) {
                        if (p.pageimage && p.thumbnail && p.thumbnail.source) {
                            const imgName = p.pageimage.toLowerCase();
                            if (imgName.includes('.svg') || imgName.includes('.png') || imgName.includes('map') || imgName.includes('flag') || imgName.includes('logo') || imgName.includes('earth') || imgName.includes('globe')) continue;
                            bestImage = p.thumbnail.source;
                            break; 
                        }
                    }
                }
            }
            if (bestImage) return resolveFinal(bestImage);

            const query = encodeURIComponent(exactName + " Republica Dominicana");
            const wikiArtUrl = `https://es.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=5&prop=pageimages&pithumbsize=1000&format=json&origin=*`;
            fetch(wikiArtUrl).then(r => r.json()).then(artData => {
                let artImage = null;
                if (artData?.query?.pages) {
                    const pages = Object.values(artData.query.pages);
                    for (const p of pages) {
                        if (p.pageimage && p.thumbnail && p.thumbnail.source) {
                            const imgName = p.pageimage.toLowerCase();
                            if (imgName.includes('.svg') || imgName.includes('.png') || imgName.includes('map') || imgName.includes('flag') || imgName.includes('logo') || imgName.includes('earth') || imgName.includes('globe')) continue;
                            artImage = p.thumbnail.source;
                            break;
                        }
                    }
                }
                if (artImage) return resolveFinal(artImage);
                // Nivel 3: Bioma Premium por ubicación/altitud
                resolveFinal(window.getPremiumBiomeFallback(est.latitud, est.longitud));
            }).catch(() => resolveFinal(window.getPremiumBiomeFallback(est.latitud, est.longitud)));
        }).catch(() => resolveFinal(window.getPremiumBiomeFallback(est.latitud, est.longitud)));
    }).catch(() => resolveFinal(fallbackSat));
};

const estaciones = window.estacionesData || [];
window.stationImagesCache = {};
estaciones.forEach(est => {
    if (est.nombre && (est.nombre.toLowerCase().includes('homs') || est.nombre.toLowerCase().includes('pucmm') || est.nombre.toLowerCase().includes('utesa'))) return;
    window.getDynamicImage(est, (imgUrl) => {
        const img = new Image();
        img.src = imgUrl; // Pre-descarga
    });
});
const stationMarkers = {};
window.stationMarkers = stationMarkers;
estaciones.forEach((est, index) => {
    if (est.latitud && est.longitud) {
        const hasAlarms = est.alarmasActivas && est.alarmasActivas.length > 0;
        const colorHex = hasAlarms ? '#F59E0B' : (est.estado === 'Sin señal' ? '#DC2626' : '#34D399');
        const el = document.createElement('div');
        el.className = 'custom-marker';
        if (hasAlarms) {
            el.classList.add('has-alarms');
        }
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.display = 'flex';
        el.style.justifyContent = 'center';
        el.style.alignItems = 'center';
        el.style.border = `2px solid ${colorHex}`;
        el.style.color = colorHex;
        el.style.cursor = 'pointer';
        el.style.boxShadow = `0 0 10px ${colorHex}`;
        el.style.setProperty('--pulse-color', colorHex);
        el.innerHTML = `
            <div class="radar-pulse"></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" style="position: relative; z-index: 2;">
                <path d="M4 7h16l-3 8H7Z"></path>
                <path d="M10 7v14"></path>
                <path d="M14 7v14"></path>
                <path d="M12 7V3"></path>
                <path d="M10 3h4"></path>
            </svg>
            <div class="marker-label">${est.nombre}</div>
        `;
        const marker = new mapboxgl.Marker(el)
            .setLngLat([est.longitud, est.latitud])
            .addTo(map);

        el.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            window.mapRotationActive = true; 
            map.flyTo({
                center: [-70.4, 18.9],
                zoom: 6.5,
                pitch: 50,
                bearing: 0,
                speed: 1.2,
                curve: 1.42,
                essential: true
            });
            if (window._stationPopup) {
                window._stationPopup.remove();
                window._stationPopup = null;
            }
        });

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            window.mapRotationActive = false; 
            if (window.slideshowInterval) {
                clearInterval(window.slideshowInterval);
                window.slideshowInterval = null;
            }
            
            // Update the dashboard cards and trigger the zoom animation
            if (typeof window.seleccionarEstacion === 'function') {
                window.seleccionarEstacion(est, false);
            }

            // Close any existing popup
            if (window._stationPopup) {
                window._stationPopup.remove();
                window._stationPopup = null;
            }
            
            // Only show the popup if the map is expanded
            if (!document.body.classList.contains('map-fullscreen')) {
                return;
            }

            // Build popup HTML
            const isOnline = est.estado === 'En l\u00ednea';
            const statusClass = isOnline ? 'online' : 'offline';
            const statusIcon = isOnline
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
            const sf = (val, d) => (val !== null && val !== undefined) ? Number(val).toFixed(d) : '--';
            const tempVal = sf(est.temperatura, 1);
            const humVal = sf(est.humedadAire, 0);
            const windVal = sf(est.velocidadViento, 1);
            const rainVal = sf(est.lluvia, 1);
            const pressVal = sf(est.presion, 0);
            const soilVal = sf(est.humedadSuelo, 0);
            const lastTime = est.fechaHoraLectura ? est.fechaHoraLectura.split(' ')[1].substring(0,5) : '--:--';
            const popupId = 'popup-details-' + est.id;
            const popupHTML = `
                <div class="station-popup-header">
                    <div class="station-popup-header-icon ${statusClass}">${statusIcon}</div>
                    <div class="station-popup-header-info">
                        <h4>${est.nombre}</h4>
                        <span>${est.codigo} \u2022 ${est.ubicacion || ''}</span>
                    </div>
                </div>
                <div class="station-popup-body">
                    <div class="popup-metric">
                        <div class="popup-metric-icon temp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg></div>
                        <div class="popup-metric-data"><div class="popup-val">${tempVal}\u00b0C</div><div class="popup-label">Temp.</div></div>
                    </div>
                    <div class="popup-metric">
                        <div class="popup-metric-icon hum"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg></div>
                        <div class="popup-metric-data"><div class="popup-val">${humVal}%</div><div class="popup-label">Humedad</div></div>
                    </div>
                    <div class="popup-metric">
                        <div class="popup-metric-icon wind"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path></svg></div>
                        <div class="popup-metric-data"><div class="popup-val">${windVal}</div><div class="popup-label">km/h</div></div>
                    </div>
                    <div class="popup-metric">
                        <div class="popup-metric-icon rain"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8.01" y2="21"></line><line x1="12" y1="13" x2="12.01" y2="18"></line><line x1="16" y1="16" x2="16.01" y2="21"></line></svg></div>
                        <div class="popup-metric-data"><div class="popup-val">${rainVal}</div><div class="popup-label">mm lluvia</div></div>
                    </div>
                    <div class="popup-metric">
                        <div class="popup-metric-icon pressure"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
                        <div class="popup-metric-data"><div class="popup-val">${pressVal}</div><div class="popup-label">hPa</div></div>
                    </div>
                    <div class="popup-metric">
                        <div class="popup-metric-icon soil"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 22h20"></path><path d="M12 2a10 10 0 0 0-6.88 17.23l3.06-7.28A4 4 0 0 1 12 9a4 4 0 0 1 3.82 2.95l3.06 7.28A10 10 0 0 0 12 2z"></path></svg></div>
                        <div class="popup-metric-data"><div class="popup-val">${soilVal}%</div><div class="popup-label">Suelo</div></div>
                    </div>
                </div>
                <div class="station-popup-details" id="${popupId}">
                    <div class="station-popup-details-inner">
                        <div class="popup-detail-row"><span class="detail-label">Dir. Viento</span><span class="detail-value">${est.direccionViento || '--'}</span></div>
                        <div class="popup-detail-row"><span class="detail-label">Estado</span><span class="detail-value" style="color:${isOnline ? '#34D399' : '#F87171'}">${est.estado || '--'}</span></div>
                        <div class="popup-detail-row"><span class="detail-label">Ubicaci\u00f3n</span><span class="detail-value">${est.ubicacion || '--'}</span></div>
                        <div class="popup-detail-row"><span class="detail-label">Coordenadas</span><span class="detail-value">${Number(est.latitud).toFixed(4)}, ${Number(est.longitud).toFixed(4)}</span></div>
                    </div>
                </div>
                <div class="station-popup-footer">
                    <div class="popup-last-update">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        ${lastTime}
                    </div>
                    <button class="popup-detail-btn" id="btn-${popupId}" onclick="(function(){ var d=document.getElementById('${popupId}'); var b=document.getElementById('btn-${popupId}'); if(d.classList.contains('expanded')){d.classList.remove('expanded');b.classList.remove('expanded');b.innerHTML='Ver m\\u00e1s <svg class=\\'chevron-icon\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><polyline points=\\'9 18 15 12 9 6\\'></polyline></svg>';}else{d.classList.add('expanded');b.classList.add('expanded');b.innerHTML='Ver menos <svg class=\\'chevron-icon\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><polyline points=\\'9 18 15 12 9 6\\'></polyline></svg>';}})()">
                        Ver m\u00e1s
                        <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
            `;
            window._stationPopup = new mapboxgl.Popup({
                anchor: 'left',
                offset: [40, 0],
                closeOnClick: true,
                focusAfterOpen: false,
                maxWidth: '300px'
            })
                .setLngLat([est.longitud, est.latitud])
                .setHTML(popupHTML)
                .addTo(map);
        });
        stationMarkers[est.id] = marker;
    }
});
let activas = estaciones.filter(e => e.estado === 'En línea').length;

const searchInput = document.getElementById('station-search');
const searchDropdown = document.getElementById('search-dropdown');
function renderSearchResults(results) {
    searchDropdown.innerHTML = '';
    if (results.length === 0) {
        searchDropdown.innerHTML = '<div class="search-empty">No se encontraron estaciones</div>';
        return;
    }
    results.forEach(est => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.innerHTML = `
            <div class="search-item-icon" style="color: ${est.estado === 'En línea' ? '#10B981' : '#DC2626'}; background: ${est.estado === 'En línea' ? '#D1FAE5' : '#FEE2E2'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M4 7h16l-3 8H7Z"></path><path d="M10 7v14"></path><path d="M14 7v14"></path><path d="M12 7V3"></path><path d="M10 3h4"></path></svg>
            </div>
            <div class="search-item-info">
                <h4>${est.nombre}</h4>
                <p>${est.codigo} | ${est.ubicacion}</p>
            </div>
        `;
        div.addEventListener('click', () => {
            seleccionarEstacion(est);
            searchDropdown.style.display = 'none';
            searchInput.value = '';
            searchInput.blur();
        });
        searchDropdown.appendChild(div);
    });
}
searchInput.addEventListener('focus', () => {
    summaryDropdown.style.display = 'none';
    if (searchInput.value.trim().length > 0) {
        searchDropdown.style.display = 'block';
    }
});
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (query.length === 0) {
        searchDropdown.style.display = 'none';
        return;
    }
    searchDropdown.style.display = 'block';
    const filtradas = estaciones.filter(est => 
        est.nombre.toLowerCase().includes(query) || 
        est.codigo.toLowerCase().includes(query) ||
        est.ubicacion.toLowerCase().includes(query)
    );
    renderSearchResults(filtradas);
});
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = 'none';
    }
});

map.addControl(new mapboxgl.NavigationControl({
    visualizePitch: true
}), 'bottom-right');
const styleButtons = document.querySelectorAll('.style-btn');
styleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        styleButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const newStyle = e.target.getAttribute('data-style');
        map.setStyle(newStyle);
        const mapEl = document.getElementById('map-root');
        const isMapLight = newStyle.includes('light') || newStyle.includes('outdoors') || newStyle.includes('streets');
        if (isMapLight) {
            mapEl.classList.remove('map-is-dark');
            mapEl.classList.add('map-is-light');
        } else {
            mapEl.classList.remove('map-is-light');
            mapEl.classList.add('map-is-dark');
        }
    });
});
styleButtons.forEach(b => b.classList.remove('active'));
const initialActiveBtn = document.querySelector('[data-style="mapbox://styles/mapbox/outdoors-v12"]');
if (initialActiveBtn) {
    initialActiveBtn.classList.add('active');
    document.getElementById('map-root').classList.add('map-is-light');
}
let stompClient = null;
function connectWebSocket() {
    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
        console.warn('Librerías SockJS/STOMP no encontradas. Saltando conexión en tiempo real.');
        return;
    }
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;
    stompClient.connect({}, function (frame) {
        console.log('Conectado a WebSocket: ' + frame);
        stompClient.subscribe('/topic/lecturas', function (mensaje) {
            const lectura = JSON.parse(mensaje.body);
            actualizarMarcadorEnVivo(lectura);
            if (lectura.estacionId === currentStationId) {
                const est = estaciones.find(e => e.id === currentStationId);
                if (est) {
                    actualizarTarjetaClima(est);
                    const card = document.getElementById('weatherCard');
                    if (card) {
                        card.classList.remove('slide-fade-active');
                        void card.offsetWidth;
                        card.classList.add('slide-fade-active');
                    }
                    cargarHistorialGrafico(est.id);
                }
            }
        });
        stompClient.subscribe('/topic/alarmas', function (mensaje) {
            const alarma = JSON.parse(mensaje.body);
            actualizarAlarmaEnVivo(alarma);
        });
        stompClient.subscribe('/topic/estaciones-estado', function (mensaje) {
            const data = JSON.parse(mensaje.body);
            actualizarEstadoMarcador(data);
        });
    }, function(error) {
        console.error('WebSocket Error:', error);
        setTimeout(connectWebSocket, 5000); 
    });
}
function formatVal(val, suffix) {
    return val !== null ? val + suffix : '--';
}
function formatFechaISO(isoString) {
    if (!isoString) return 'Sin registro';
    return window.Utils && window.Utils.formatDate ? window.Utils.formatDate(isoString) : isoString.replace('T', ' ').substring(0, 19);
}
function actualizarEstadoMarcador(data) {
    if (!data || !data.id) return;
    const est = estaciones.find(e => e.id === data.id);
    if (!est) return;
    est.estado = data.estado;
    const marker = stationMarkers[est.id];
    if (marker) {
        const el = marker.getElement();
        const hasAlarms = est.alarmasActivas && est.alarmasActivas.length > 0;
        const colorHex = hasAlarms ? '#F59E0B' : (est.estado === 'Sin señal' ? '#DC2626' : '#34D399'); 
        el.style.border = `2px solid ${colorHex}`;
        el.style.color = colorHex;
        el.style.boxShadow = `0 0 10px ${colorHex}`;
        el.style.setProperty('--pulse-color', colorHex);
        const pulseEl = el.querySelector('.radar-pulse');
        if (pulseEl) pulseEl.style.removeProperty('--pulse-color'); // Clean up old inline styles
    }
}
function actualizarMarcadorEnVivo(lectura) {
    if (!lectura || !lectura.estacionId) return;
    const est = estaciones.find(e => e.id === lectura.estacionId);
    if (est) {
        est.temperatura = lectura.temperatura;
        est.humedadAire = lectura.humedadAire;
        est.velocidadViento = lectura.velocidadViento;
        est.lluvia = lectura.lluvia;
        est.presion = lectura.presion;
        est.humedadSuelo = lectura.humedadSuelo;
        est.direccionViento = lectura.direccionViento;
        if (lectura.fechaHora) {
            est.fechaHoraLectura = formatFechaISO(lectura.fechaHora);
        }
        
        est.estado = 'En línea';
    }
    const marker = stationMarkers[lectura.estacionId];
    if (marker) {
        const el = marker.getElement();
        const hasAlarms = est && est.alarmasActivas && est.alarmasActivas.length > 0;
        
        const colorHex = hasAlarms ? '#F59E0B' : (est.estado === 'Sin señal' ? '#DC2626' : '#34D399'); 
        el.style.border = `2px solid ${colorHex}`;
        el.style.color = colorHex;
        el.style.boxShadow = `0 0 10px ${colorHex}`;
        el.style.setProperty('--pulse-color', colorHex);
        const pulseEl = el.querySelector('.radar-pulse');
        if (pulseEl) pulseEl.style.removeProperty('--pulse-color');
        if (hasAlarms) {
            el.classList.add('has-alarms');
        } else {
            el.classList.remove('has-alarms');
        }
        el.classList.remove('data-received');
        void el.offsetWidth; 
        el.classList.add('data-received');
    }
}
function actualizarAlarmaEnVivo(alarma) {
    const est = estaciones.find(e => e.id === alarma.estacionId);
    if (!est) return;
    if (!est.alarmasActivas) {
        est.alarmasActivas = [];
    }
    if (alarma.resuelta) {
        est.alarmasActivas = est.alarmasActivas.filter(a => a.id !== alarma.id);
    } else {
        const idx = est.alarmasActivas.findIndex(a => a.id === alarma.id);
        if (idx >= 0) {
            est.alarmasActivas[idx] = alarma;
        } else {
            est.alarmasActivas.push(alarma);
        }
    }
    const marker = stationMarkers[est.id];
    if (marker) {
        const el = marker.getElement();
        const hasAlarms = est.alarmasActivas && est.alarmasActivas.length > 0;
        const colorHex = hasAlarms ? '#F59E0B' : (est.estado === 'Sin señal' ? '#DC2626' : '#34D399'); 
        el.style.border = `2px solid ${colorHex}`;
        el.style.color = colorHex;
        el.style.boxShadow = `0 0 10px ${colorHex}`;
        el.style.setProperty('--pulse-color', colorHex);
        const pulseEl = el.querySelector('.radar-pulse');
        if (pulseEl) pulseEl.style.removeProperty('--pulse-color');
        if (hasAlarms) {
            el.classList.add('has-alarms');
        } else {
            el.classList.remove('has-alarms');
        }
    }
}
connectWebSocket();
window.resetMapView = function() {
    window.mapRotationActive = false;
    currentStationId = null;
    
    if (window._stationPopup) {
        window._stationPopup.remove();
        window._stationPopup = null;
    }
    
    if (window.slideshowInterval) {
        clearInterval(window.slideshowInterval);
        window.slideshowInterval = null;
    }

    map.off('moveend', window.onResetMoveEnd);
    
    map.stop();

    
    map.once('moveend', window.onResetMoveEnd);

    map.flyTo({
        center: [-70.4, 18.9],
        zoom: 6.5,
        pitch: 50,
        bearing: 0,
        speed: 1.2,
        curve: 1.42,
        essential: true
    });
};

window.onResetMoveEnd = function() {
    
    const center = map.getCenter();
    if (Math.abs(center.lng - (-70.4)) < 0.1 && Math.abs(center.lat - 18.9) < 0.1) {
        window.mapRotationActive = true;
        rotateCamera();
    }
};

window.seleccionarEstacion = function(est, skipFly) {
    if (!est) return;
    if (!skipFly) window.mapRotationActive = false; 
    currentStationId = est.id;
    if (!skipFly) {
        map.flyTo({
            center: [est.longitud, est.latitud],
            zoom: 16,
            pitch: 60,
            bearing: 45,
            speed: 1.2,
            curve: 1.42,
            essential: true
        });
    }
    actualizarTarjetaClima(est);
    cargarHistorialGrafico(est.id);
    
    // Refresh forecast for the new station
    window.forecastDataCache = null;
    window.fullForecastDataCache = null;
    window.hasAttemptedForecastFetch = false;
    if (typeof initForecastBar === 'function') {
        initForecastBar();
    }
};
function cargarHistorialGrafico(estacionId) {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const fechaFin = end.toISOString().substring(0, 19);
    const fechaInicio = start.toISOString().substring(0, 19);
    
    fetch(`/api/lecturas/historial/${estacionId}?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}&limite=288`)
        .then(res => res.json())
        .then(readings => {
            window.lastChartReadings = readings;
            readings.reverse();
            const labels = readings.map(r => new Date(r.fechaHora).getTime());
            const temps = readings.map(r => r.temperatura);
            const hums = readings.map(r => r.humedadAire);
            const chartMode = document.body.classList.contains('theme-light') ? 'light' : 'dark';
            const textColor = document.body.classList.contains('theme-light') ? '#6B7280' : '#9CA3AF';
            const tempOpts = {
                chart: { type: 'area', height: 200, toolbar: { show: false }, background: 'transparent', sparkline: { enabled: false } },
                stroke: { curve: 'smooth', width: 3 },
                series: [{ name: `Temperatura (°${window.currentTempUnit || 'C'})`, data: temps.map(t => window.convertTempObj ? window.convertTempObj(t) : t) }],
                colors: ['#F59E0B'],
                fill: {
                    type: 'gradient',
                    gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] }
                },
                xaxis: { type: 'datetime', tickAmount: 6, categories: labels, labels: { datetimeUTC: false, format: 'HH:mm', style: { colors: textColor, fontFamily: 'Inter, sans-serif', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: v => v !== null && v !== undefined ? v.toFixed(1) + '°' : '--' } },
                grid: { borderColor: 'rgba(107, 114, 128, 0.1)', strokeDashArray: 4, padding: { left: 8, right: 8 } },
                theme: { mode: chartMode },
                tooltip: { x: { format: 'dd MMM HH:mm' }, theme: chartMode, y: { formatter: v => v !== null ? v.toFixed(1) + ` °${window.currentTempUnit || 'C'}` : '--' } },
                dataLabels: { enabled: false }
            };
            if (window.tempChart) {
                window.tempChart.updateOptions({ 
                    xaxis: { categories: labels }, 
                    series: [{ name: `Temperatura (°${window.currentTempUnit || 'C'})`, data: temps.map(t => window.convertTempObj ? window.convertTempObj(t) : t) }],
                    theme: { mode: chartMode },
                    tooltip: { theme: chartMode }
                });
            } else {
                window.tempChart = new ApexCharts(document.querySelector("#tempTrendChart"), tempOpts);
                window.tempChart.render();
            }
            const humOpts = {
                chart: { type: 'area', height: 200, toolbar: { show: false }, background: 'transparent' },
                stroke: { curve: 'smooth', width: 3 },
                series: [{ name: 'Humedad (%)', data: hums }],
                colors: ['#3B82F6'],
                fill: {
                    type: 'gradient',
                    gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] }
                },
                xaxis: { type: 'datetime', tickAmount: 6, categories: labels, labels: { datetimeUTC: false, format: 'HH:mm', style: { colors: textColor, fontFamily: 'Inter, sans-serif', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: v => v !== null && v !== undefined ? v.toFixed(0) + '%' : '--' }, min: 0, max: 100 },
                grid: { borderColor: 'rgba(107, 114, 128, 0.1)', strokeDashArray: 4, padding: { left: 8, right: 8 } },
                theme: { mode: chartMode },
                tooltip: { x: { format: 'dd MMM HH:mm' }, theme: chartMode, y: { formatter: v => v !== null ? v.toFixed(1) + ' %' : '--' } },
                dataLabels: { enabled: false }
            };
            if (window.humChart) {
                window.humChart.updateOptions({ 
                    xaxis: { categories: labels }, 
                    series: [{ name: 'Humedad (%)', data: hums }],
                    theme: { mode: chartMode },
                    tooltip: { theme: chartMode }
                });
            } else {
                window.humChart = new ApexCharts(document.querySelector("#humTrendChart"), humOpts);
                window.humChart.render();
            }
        })
        .catch(err => console.error("Error al cargar historial gráfico:", err));
}
function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
}
function actualizarTarjetaClima(est, isUnitToggle = false) {
    if (!est) return;
    const safeFixed = (val, decimals) => (val !== null && val !== undefined) ? Number(val).toFixed(decimals) : null;
    document.getElementById('activeStationName').textContent = est.nombre || '--';
    document.getElementById('activeStationCode').textContent = est.codigo || 'EST-XXX';
    const convertedTemp = window.convertTempObj(est.temperatura);
    document.getElementById('activeTemp').textContent = safeFixed(convertedTemp, 1) || '--';
    const unitEls = document.querySelectorAll('.weather-unit');
    unitEls.forEach(el => el.textContent = `°${window.currentTempUnit}`);
    
    // Calculate feels like: prefer backend sensacionTermica, fallback to approx
    let convertedFeels;
    if (est.sensacionTermica !== null && est.sensacionTermica !== undefined) {
        convertedFeels = window.convertTempObj(est.sensacionTermica);
    } else {
        convertedFeels = convertedTemp !== null ? convertedTemp + (window.currentTempUnit === 'F' ? 0.9 : 0.5) : null;
    }
    document.getElementById('activeFeels').textContent = 'Sensación: ' + (safeFixed(convertedFeels, 1) ? safeFixed(convertedFeels, 1) + `°${window.currentTempUnit}` : '--');
    
    document.getElementById('activeStatusText').textContent = est.estado || '--';
    document.getElementById('activeTime').textContent = est.fechaHoraLectura ? est.fechaHoraLectura.split(' ')[1].substring(0, 5) : '--:--';
    const statusText = document.getElementById('activeStatusText');
    if (est.estado === 'En línea') {
        statusText.style.color = '#34D399';
    } else {
        statusText.style.color = '#F87171';
    }
    document.getElementById('activeWind').textContent = safeFixed(est.velocidadViento, 1) ? safeFixed(est.velocidadViento, 1) + ' km/h' : '--';
    document.getElementById('activeHum').textContent = safeFixed(est.humedadAire, 0) ? safeFixed(est.humedadAire, 0) + '%' : '--';
    document.getElementById('activeSoil').textContent = safeFixed(est.humedadSuelo, 0) ? safeFixed(est.humedadSuelo, 0) + '%' : '--';
    document.getElementById('activePressure').textContent = safeFixed(est.presion, 0) ? safeFixed(est.presion, 0) + ' hPa' : '--';
    document.getElementById('activeRain').textContent = safeFixed(est.lluvia, 1) ? safeFixed(est.lluvia, 1) + ' mm' : '--';
    document.getElementById('activeWindDir').textContent = est.direccionViento || '--';
    const photoHeader = document.getElementById('weatherPhotoHeader');
    if (photoHeader) {
        aplicarImagenClimatica(est, photoHeader);
    }
    const card = document.getElementById('weatherCard');
    if (card && !isUnitToggle) {
        const values = card.querySelectorAll('.weather-temp, .metric-value');
        values.forEach(v => {
            v.classList.remove('data-update-pulse');
            void v.offsetWidth;
            v.classList.add('data-update-pulse');
        });
    }
    actualizarWidgetLifestyle(est);
}
function actualizarWidgetLifestyle(est) {
    if (!est) return;
    const lsIcon = document.getElementById('lsIcon');
    const lsTitle = document.getElementById('lsTitle');
    const lsDesc = document.getElementById('lsDesc');
    const lsIconWrapper = document.getElementById('lsIconWrapper');
    if (!lsIcon || !lsTitle || !lsDesc || !lsIconWrapper) return;
    

    const lluvia = est.lluvia || 0;
    const viento = est.velocidadViento || 0;
    const temp = est.temperatura !== null ? est.temperatura : 25;
    const humedad = est.humedadAire || 0;
    const suelo = est.humedadSuelo || 0;
    const presion = est.presion || 1013;
    const sensacion = (est.sensacionTermica !== null && est.sensacionTermica !== undefined) ? est.sensacionTermica : temp;
    
    // Calculate Day/Night state and Hour
    let isNight = false;
    let currentHour = new Date().getHours();
    if (est.fechaHoraLectura) {
        const timePart = est.fechaHoraLectura.split(' ')[1];
        if (timePart) {
            const hour = parseInt(timePart.split(':')[0], 10);
            if (!isNaN(hour)) {
                currentHour = hour;
            }
        }
    }
    isNight = (currentHour < 6 || currentHour >= 19);

    // Reset base classes
    lsIconWrapper.className = 'ls-icon-wrapper';
    

    if (lluvia >= 15) { //
        lsIcon.textContent = '🌊';
        lsTitle.textContent = 'Alerta de Inundación';
        lsDesc.textContent = 'Lluvias torrenciales extremas. Alto riesgo de inundaciones repentinas. Busca terreno elevado.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #111827 0%, #1E3A8A 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(17, 24, 39, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.2)';
        lsIconWrapper.classList.add('ls-anim-rain');
    } else if (lluvia >= 10) {
        lsIcon.textContent = '⛈️';
        lsTitle.textContent = 'Tormenta Severa';
        lsDesc.textContent = 'Precipitaciones extremas. Evita zonas inundables y maneja con extrema precaución.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #1E3A8A 0%, #312E81 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(30, 58, 138, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        lsIconWrapper.classList.add('ls-anim-rain');
    } else if (presion < 1005 && viento > 25) {
        lsIcon.textContent = '🌀';
        lsTitle.textContent = 'Alerta Ciclónica';
        lsDesc.textContent = 'Presión atmosférica críticamente baja y ráfagas. Posible formación de tormenta o depresión.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #3730A3 0%, #312E81 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(49, 46, 129, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.2)';
        lsIconWrapper.classList.add('ls-anim-wind');
    } else if (temp > 30 && humedad < 40 && viento > 25) {
        lsIcon.textContent = '🔥';
        lsTitle.textContent = 'Riesgo de Incendio';
        lsDesc.textContent = 'Condiciones calurosas, secas y ventosas. ALTO RIESGO de incendios forestales. Evita encender fuego.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(154, 52, 18, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        lsIconWrapper.classList.add('ls-anim-sun');
    } else if (viento > 35) { 
        lsIcon.textContent = '🌪️';
        lsTitle.textContent = 'Vientos Peligrosos';
        lsDesc.textContent = 'Ráfagas muy intensas. Aléjate de estructuras inestables o árboles viejos.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(124, 58, 237, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        lsIconWrapper.classList.add('ls-anim-wind');
    } else if (lluvia >= 2) {
        lsIcon.textContent = '☔';
        lsTitle.textContent = 'Lluvia Fuerte';
        lsDesc.textContent = 'Lluvia sostenida en la zona. No salgas sin paraguas ni equipo de lluvia.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        lsIconWrapper.classList.add('ls-anim-rain');
    } else if (humedad >= 95 && viento < 5 && temp < 22) {
        lsIcon.textContent = '🌫️';
        lsTitle.textContent = 'Riesgo de Niebla';
        lsDesc.textContent = 'Humedad saturada y sin viento. Probabilidad de neblina espesa. Enciende las luces antiniebla.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(107, 114, 128, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
    } else if (temp >= 37) {
        lsIcon.textContent = '🌡️';
        lsTitle.textContent = 'Calor Extremo';
        lsDesc.textContent = 'Temperaturas sumamente altas (' + temp + '°C). Usa protector solar y evita el sol directo.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(239, 68, 68, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-sun');
    } else if (sensacion >= temp + 3 && temp > 28) {
        lsIcon.textContent = '🥵';
        lsTitle.textContent = 'Calor Sofocante';
        lsDesc.textContent = 'La altísima humedad hace que se sienta mucho más calor del que marca el termómetro. Riesgo de fatiga.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(220, 38, 38, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        lsIconWrapper.classList.add('ls-anim-sun');
    } else if (sensacion <= temp - 3 && temp < 20) {
        lsIcon.textContent = '🧊';
        lsTitle.textContent = 'Viento Helado';
        lsDesc.textContent = 'El viento corta la piel. Se siente mucho más frío de lo que marca el termómetro.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(2, 132, 199, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        lsIconWrapper.classList.add('ls-anim-cold');
    } else if (temp < 15) { // 11. Frío Congelante
        lsIcon.textContent = '🥶';
        lsTitle.textContent = 'Frío Intenso';
        lsDesc.textContent = 'Temperaturas muy bajas para la zona. Abrígate bien y mantente en lugares cálidos.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #6EE7B7 0%, #059669 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.3)';
        lsIconWrapper.classList.add('ls-anim-cold');
    } else if (lluvia > 0) {
        lsIcon.textContent = '🌦️';
        lsTitle.textContent = 'Llovizna Ligera';
        lsDesc.textContent = 'Ligeras lloviznas. Una chaqueta impermeable o sombrilla será suficiente.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(147, 197, 253, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-rain');
    } else if (currentHour >= 6 && currentHour < 12 && temp >= 20 && temp <= 27 && viento < 20) { // 13. Mañana Agradable
        lsIcon.textContent = '🌅';
        lsTitle.textContent = 'Mañana Agradable';
        lsDesc.textContent = 'Mañana fresca y muy agradable. Excelente momento para hacer ejercicio o empezar el día.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-sun');
    } else if (viento > 10 && viento <= 20 && temp >= 20 && temp <= 28) { // 14. Viento Agradable
        lsIcon.textContent = '🪁';
        lsTitle.textContent = 'Viento Agradable';
        lsDesc.textContent = 'Brisa refrescante y clima templado. Excelente día para volar una chichigua.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #C4B5FD 0%, #8B5CF6 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(139, 92, 246, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-wind');
    } else if (isNight && temp < 22) {
        lsIcon.textContent = '🌌';
        lsTitle.textContent = 'Noche Fresca';
        lsDesc.textContent = 'Noche estrellada con un clima algo frío. Duerme con una cobija extra.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(15, 23, 42, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.2)';
    } else if (isNight && humedad < 85 && presion >= 1010) {
        lsIcon.textContent = '🌙';
        lsTitle.textContent = 'Noche Despejada';
        lsDesc.textContent = 'Cielo despejado, condiciones ideales para dar un paseo nocturno o ver las estrellas.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #334155 0%, #1E293B 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(30, 41, 59, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.2)';
    } else if (isNight) {
        lsIcon.textContent = '☁️';
        lsTitle.textContent = 'Noche Nublada';
        lsDesc.textContent = 'Noche mayormente nublada. Condiciones tranquilas para descansar.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #475569 0%, #334155 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(51, 65, 85, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.2)';
    } else if (suelo > 85) {
        lsIcon.textContent = '🌱';
        lsTitle.textContent = 'Suelo Saturado';
        lsDesc.textContent = 'La tierra está en su máxima capacidad hídrica. Riesgo de lodo o encharcamiento en cultivos.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #A3E635 0%, #65A30D 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(101, 163, 13, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
    } else if (suelo < 30 && temp > 25) { // 17. Suelo Seco
        lsIcon.textContent = '🏜️';
        lsTitle.textContent = 'Suelo Seco';
        lsDesc.textContent = 'La tierra está perdiendo humedad rápidamente. Ideal para programar riego preventivo.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #FCD34D 0%, #D97706 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(217, 119, 6, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
    } else { 
        lsIcon.textContent = '☀️';
        lsTitle.textContent = 'Día Agradable';
        lsDesc.textContent = 'Las condiciones son perfectas para actividades al aire libre. ¡Disfruta el día!';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-sun');
    }
}
function aplicarImagenClimatica(est, photoHeaderElement) {
    if (!photoHeaderElement) return;
    
    // Default gradient
    photoHeaderElement.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (!est) return;

    if (est.nombre) {
        const nombreStr = est.nombre.toLowerCase();
        if (nombreStr.includes('homs')) {
            photoHeaderElement.style.backgroundImage = 'url("/img/homs.png")';
            return;
        }
        if (nombreStr.includes('pucmm')) {
            photoHeaderElement.style.backgroundImage = 'url("/img/pucmm.png")';
            return;
        }
        if (nombreStr.includes('utesa')) {
            photoHeaderElement.style.backgroundImage = 'url("/img/utesa.png")';
            return;
        }
    }
    
    // Si la imagen ya fue precargada en segundo plano, se muestra al instante
    if (window.stationImagesCache && window.stationImagesCache[est.id]) {
        photoHeaderElement.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6)), url("${window.stationImagesCache[est.id]}")`;
        photoHeaderElement.style.backgroundPosition = 'center';
        photoHeaderElement.style.backgroundSize = 'cover';
        return;
    }
    
    // Cargar con el motor de imágenes unificado
    window.getDynamicImage(est, (imgUrl) => {
        photoHeaderElement.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.6)), url("${imgUrl}")`;
        photoHeaderElement.style.backgroundPosition = 'center';
        photoHeaderElement.style.backgroundSize = 'cover';
    });
}

window.startSlideshow = function() {
    if (window.slideshowInterval) clearInterval(window.slideshowInterval);
    window.slideshowInterval = setInterval(() => {
        window.navigateStation(1, null, true);
    }, 8000);
};
window.navigateStation = function(direction, event, isAuto = false) {
    if (event) event.stopPropagation();
    if (!isAuto) {
        if (window.slideshowInterval) {
            clearInterval(window.slideshowInterval);
            window.slideshowInterval = null;
        }
        if (window.resumeSlideshowTimeout) {
            clearTimeout(window.resumeSlideshowTimeout);
        }
        window.resumeSlideshowTimeout = setTimeout(() => {
            window.startSlideshow();
        }, 15000);
    }
    const estacionesConDatos = window.estacionesData || [];
    if (estacionesConDatos.length === 0) return;
    let idx = estacionesConDatos.findIndex(e => e.id === currentStationId);
    if (idx === -1) idx = 0;
    idx = (idx + direction + estacionesConDatos.length) % estacionesConDatos.length;
    seleccionarEstacion(estacionesConDatos[idx], isAuto);
};
if (estaciones.length > 0) {
    setTimeout(() => {
        seleccionarEstacion(estaciones[0], true);
        window.startSlideshow();
    }, 500);
}
async function initForecastBar() {
    const container = document.getElementById('forecastDaysContainer');
    if (!container) return;
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    const getIcon = (condition) => {
        condition = (condition || '').toLowerCase();
        const defs = `
            <defs>
                <linearGradient id="sunGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#FEF08A" />
                    <stop offset="100%" stop-color="#F59E0B" />
                </linearGradient>
                <filter id="sunGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                <linearGradient id="cloudFront" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95" />
                    <stop offset="100%" stop-color="#F3F4F6" stop-opacity="0.75" />
                </linearGradient>
                <linearGradient id="cloudBack" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#E5E7EB" stop-opacity="0.7" />
                    <stop offset="100%" stop-color="#D1D5DB" stop-opacity="0.4" />
                </linearGradient>
                
                <linearGradient id="stormFront" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#94A3B8" stop-opacity="0.95" />
                    <stop offset="100%" stop-color="#475569" stop-opacity="0.85" />
                </linearGradient>
                <linearGradient id="stormBack" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#64748B" stop-opacity="0.75" />
                    <stop offset="100%" stop-color="#1E293B" stop-opacity="0.55" />
                </linearGradient>

                <linearGradient id="rainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#93C5FD" />
                    <stop offset="100%" stop-color="#2563EB" />
                </linearGradient>

                <linearGradient id="lightningGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#FEF08A" />
                    <stop offset="100%" stop-color="#F59E0B" />
                </linearGradient>
                <filter id="lightningGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                <filter id="cloudShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#0F172A" flood-opacity="0.15"/>
                </filter>
                
                <filter id="blurAmbient" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2"/>
                </filter>

                <radialGradient id="snowGrad">
                    <stop offset="0%" stop-color="#FFFFFF" />
                    <stop offset="100%" stop-color="#E2E8F0" />
                </radialGradient>
            </defs>
        `;

        // Common cloud path based on the high-quality login screen design
        const cloud3D = `
            <g class="cloud-body">
                <path filter="url(#cloudShadow)" fill="url(#cloudBack)" 
                      d="M 34 66 L 64 66 A 16 16 0 0 0 80 50 A 16 16 0 0 0 71 39 A 24 24 0 0 0 30 41 A 13 13 0 0 0 21 53 A 13 13 0 0 0 34 66 Z" />
                <path fill="url(#cloudFront)" stroke="#FFFFFF" stroke-width="1.2" stroke-opacity="0.6"
                      d="M 32 68 L 62 68 A 15 15 0 0 0 78 52 A 15 15 0 0 0 69 41 A 23 23 0 0 0 28 43 A 12 12 0 0 0 19 55 A 12 12 0 0 0 32 68 Z" />
                <ellipse cx="48" cy="62" rx="22" ry="4.5" fill="#60A5FA" opacity="0.15" filter="url(#blurAmbient)"/>
                <ellipse cx="46" cy="37" rx="14" ry="7" fill="#ffffff" opacity="0.4" filter="url(#blurAmbient)"/>
            </g>
        `;
        
        const stormCloud3D = `
            <g class="cloud-body">
                <path filter="url(#cloudShadow)" fill="url(#stormBack)" 
                      d="M 34 66 L 64 66 A 16 16 0 0 0 80 50 A 16 16 0 0 0 71 39 A 24 24 0 0 0 30 41 A 13 13 0 0 0 21 53 A 13 13 0 0 0 34 66 Z" />
                <path fill="url(#stormFront)" stroke="#94A3B8" stroke-width="1.2" stroke-opacity="0.5"
                      d="M 32 68 L 62 68 A 15 15 0 0 0 78 52 A 15 15 0 0 0 69 41 A 23 23 0 0 0 28 43 A 12 12 0 0 0 19 55 A 12 12 0 0 0 32 68 Z" />
                <ellipse cx="48" cy="62" rx="22" ry="4.5" fill="#1E293B" opacity="0.25" filter="url(#blurAmbient)"/>
                <ellipse cx="46" cy="37" rx="14" ry="7" fill="#94A3B8" opacity="0.3" filter="url(#blurAmbient)"/>
            </g>
        `;

        const sunSVG = `
            <g class="sun-rays" stroke="url(#sunGrad)" stroke-width="4.5" stroke-linecap="round">
                <line x1="50" y1="12" x2="50" y2="20" /><line x1="50" y1="80" x2="50" y2="88" />
                <line x1="12" y1="50" x2="20" y2="50" /><line x1="80" y1="50" x2="88" y2="50" />
                <line x1="23" y1="23" x2="29" y2="29" /><line x1="71" y1="71" x2="77" y2="77" />
                <line x1="23" y1="77" x2="29" y2="71" /><line x1="71" y1="29" x2="77" y2="23" />
            </g>
            <circle cx="50" cy="50" r="20" fill="url(#sunGrad)" filter="url(#sunGlow)" class="sun-core" />
        `;

        const lightningSVG = `<path d="M52,38 L38,62 L48,62 L42,85 L62,55 L52,55 Z" fill="url(#lightningGrad)" filter="url(#lightningGlow)" class="lightning" />`;
        
        const rainSVG = `
            <g class="rain-drops">
                <rect x="30" y="68" width="3.5" height="12" rx="1.75" fill="url(#rainGrad)" class="drop d1" />
                <rect x="45" y="66" width="3.5" height="12" rx="1.75" fill="url(#rainGrad)" class="drop d2" />
                <rect x="60" y="68" width="3.5" height="12" rx="1.75" fill="url(#rainGrad)" class="drop d3" />
            </g>
        `;

        const snowSVG = `
            <g class="rain-drops">
                <circle cx="33" cy="74" r="3" fill="url(#snowGrad)" class="drop d1" />
                <circle cx="48" cy="70" r="3.5" fill="url(#snowGrad)" class="drop d2" />
                <circle cx="63" cy="74" r="3" fill="url(#snowGrad)" class="drop d3" />
            </g>
        `;

        if (condition === 'clear') {
            return `<svg class="weather-svg glass-sun" viewBox="0 0 100 100" width="56" height="56">
                ${defs} ${sunSVG}
            </svg>`;
        }
        if (condition === 'mostlysunny') {
            return `<svg class="weather-svg glass-mostly-sun" viewBox="0 0 100 100" width="56" height="56">
                ${defs} ${sunSVG}
                <g transform="translate(35, 30) scale(0.6)">${cloud3D}</g>
            </svg>`;
        }
        if (condition === 'partlysunny') {
            return `<svg class="weather-svg glass-partly" viewBox="0 0 100 100" width="56" height="56">
                ${defs}
                <g class="sun-group" transform="translate(18, -12) scale(0.8)">${sunSVG}</g>
                ${cloud3D}
            </svg>`;
        }
        if (condition === 'mostlycloudy') {
            return `<svg class="weather-svg glass-mostly-cloud" viewBox="0 0 100 100" width="56" height="56">
                ${defs}
                <g class="sun-group" transform="translate(25, -5) scale(0.6)">${sunSVG}</g>
                ${cloud3D}
            </svg>`;
        }
        if (condition === 'overcast' || condition === 'clouds') {
            return `<svg class="weather-svg glass-cloud" viewBox="0 0 100 100" width="56" height="56">
                ${defs} ${cloud3D}
            </svg>`;
        }
        if (condition === 'scatteredstorm') {
            return `<svg class="weather-svg glass-scattered-thunder" viewBox="0 0 100 100" width="56" height="56">
                ${defs} ${lightningSVG} ${stormCloud3D}
            </svg>`;
        }
        if (condition === 'storm' || condition === 'thunderstorm') {
            return `<svg class="weather-svg glass-thunder" viewBox="0 0 100 100" width="56" height="56">
                ${defs} ${rainSVG} ${lightningSVG} ${stormCloud3D}
            </svg>`;
        }
        if (condition === 'rain' || condition === 'drizzle') {
            return `<svg class="weather-svg glass-rain" viewBox="0 0 100 100" width="56" height="56">
                ${defs} ${rainSVG} ${cloud3D}
            </svg>`;
        }
        if (condition === 'snow') {
            return `<svg class="weather-svg glass-snow" viewBox="0 0 100 100" width="56" height="56">
                ${defs} ${snowSVG} ${cloud3D}
            </svg>`;
        }
        
        // Fallback
        return `<svg class="weather-svg glass-partly" viewBox="0 0 100 100" width="56" height="56">
            ${defs}
            <g class="sun-group" transform="translate(18, -12) scale(0.8)">${sunSVG}</g>
            ${cloud3D}
        </svg>`;
    };

    const getConditionDesc = (condition) => {
        condition = (condition || '').toLowerCase();
        if (condition === 'clear') return 'Soleado';
        if (condition === 'mostlysunny') return 'Mayormente soleado';
        if (condition === 'partlysunny') return 'Parcialmente soleado';
        if (condition === 'mostlycloudy') return 'Mayormente nublado';
        if (condition === 'overcast') return 'Nublado';
        if (condition === 'scatteredstorm') return 'Tormenta eléctrica dispersa';
        if (condition === 'storm') return 'Tormenta';
        // Fallbacks
        if (condition.includes('clear')) return 'Soleado';
        if (condition.includes('rain') || condition.includes('drizzle')) return 'Lluvia';
        if (condition.includes('snow')) return 'Nieve';
        return 'Parcialmente soleado';
    };

    let forecastData = window.forecastDataCache;
    
    if (!forecastData && !window.hasAttemptedForecastFetch) {
        window.hasAttemptedForecastFetch = true;
        let url = currentStationId ? `/api/pronostico?estacionId=${currentStationId}` : '/api/pronostico';
        fetch(url)
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('API request failed');
            })
            .then(data => {
                window.forecastDataCache = data;
                initForecastBar(); 
            })
            .catch(error => {
                console.error("Error fetching forecast:", error);
            });
        return; // Prevent multiple re-renders before fetch completes
    }

    if (!window.fullForecastDataCache || (forecastData && forecastData.length > 0 && !window.fullForecastDataCache.fromApi)) {
        let fullData = [];
        let sourceData = window.forecastDataCache || [];
        
        for (let i = 0; i < 7; i++) {
            if (i < sourceData.length) {
                let item = sourceData[i];
                fullData.push({
                    temp: item.temp_max || item.temp || 25,
                    cond: item.condition || 'Clear',
                    pop: Math.round((item.pop || 0) * 100)
                });
            } else {
                // Fallback just in case the API returned fewer than 7 days despite our hybrid logic
                fullData.push({ temp: 25, cond: 'Clear', pop: 0 });
            }
        }
        window.fullForecastDataCache = fullData;
        window.fullForecastDataCache.fromApi = true;
    }

    const today = new Date();
    let html = '';
    
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        let dayName = i === 0 ? 'Hoy' : days[d.getDay()];
        let activeClass = i === 0 ? 'active' : '';
        let delay = i * 0.08;
        
        let item = window.fullForecastDataCache[i];
        let displayMax = window.convertTempObj(item.temp).toFixed(0);
        let icon = getIcon(item.cond);
        let desc = getConditionDesc(item.cond);
        let rainProb = item.pop;
        
        let bgEffectClass = '';
        if (i === 0) {
            if (item.cond.toLowerCase().includes('rain')) bgEffectClass = 'bg-effect-rain';
            else if (item.cond.toLowerCase().includes('thunder')) bgEffectClass = 'bg-effect-thunder';
            else if (item.cond.toLowerCase().includes('clear')) bgEffectClass = 'bg-effect-clear';
        }

        html += `
            <div class="forecast-day ${activeClass}" style="animation-delay: ${delay}s">
                ${i === 0 ? `<div class="bg-effect ${bgEffectClass}"></div>` : ''}
                <span class="day-name">${dayName}</span>
                <span class="day-icon">${icon}</span>
                <span class="day-desc">${desc}</span>
                <span class="day-temp">${displayMax}°</span>
                <span class="day-rain"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> ${rainProb}%</span>
            </div>
        `;
    }
    
    // Smooth transition
    if (container.innerHTML !== '') {
        container.style.transition = 'opacity 0.2s ease-in-out';
        container.style.opacity = '0';
        setTimeout(() => {
            container.innerHTML = html;
            container.style.opacity = '1';
        }, 200);
    } else {
        container.innerHTML = html;
    }
}
initForecastBar();
function initTempToggle() {
      const toggleBtns = document.querySelectorAll('.temp-toggle .toggle-btn');
      toggleBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
              const selectedUnit = e.target.textContent.replace('°', '');
              if (window.currentTempUnit === selectedUnit) return;
              window.currentTempUnit = selectedUnit;
              toggleBtns.forEach(b => b.classList.remove('active'));
              e.target.classList.add('active');
              initForecastBar();
              if (currentStationId) {
                  const est = estaciones.find(e => e.id === currentStationId);
                  if (est) {
                      actualizarTarjetaClima(est, true);
                      
                      
                      if (window.lastChartReadings && window.tempChart) {
                          const temps = window.lastChartReadings.map(r => r.temperatura);
                          window.tempChart.updateSeries([{ 
                              name: `Temperatura (°${window.currentTempUnit || 'C'})`, 
                              data: temps.map(t => window.convertTempObj ? window.convertTempObj(t) : t) 
                          }]);
                      } else {
                          cargarHistorialGrafico(est.id);
                      }
                  }
              }
        });
    });
}

document.addEventListener('click', function(e) {
    if (window._stationPopup) {
        const isClickInsideMap = e.target.closest('#map-root');
        const isClickInsidePopup = e.target.closest('.mapboxgl-popup');
        const isClickInsideMarker = e.target.closest('.mapboxgl-marker');
        
        if (!isClickInsideMap && !isClickInsidePopup && !isClickInsideMarker) {
            window._stationPopup.remove();
            window._stationPopup = null;
        }
    }
});
initTempToggle();
