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
    center: [-70.6667, 19.4500],
    zoom: 14,
    pitch: 60,
    bearing: -17.6,
    projection: 'globe'
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
});
const estaciones = window.estacionesData || [];
const stationMarkers = {};
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
        el.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
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
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.slideshowInterval) {
                clearInterval(window.slideshowInterval);
                window.slideshowInterval = null;
            }
            window.seleccionarEstacion(est);
        });
        stationMarkers[est.id] = marker;
    }
});
let activas = estaciones.filter(e => e.estado === 'En línea').length;
document.querySelector('.badge-status span').textContent = `${activas}/${estaciones.length} Estaciones Activas`;
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
const badgeBtn = document.getElementById('status-badge-btn');
const summaryDropdown = document.getElementById('summary-dropdown');
let summaryHTML = `<div class="summary-dropdown-header">Resumen de Red (${activas} activas de ${estaciones.length})</div>`;
const estacionesOrdenadas = [...estaciones].sort((a, b) => {
    if (a.estado === 'En línea' && b.estado !== 'En línea') return -1;
    if (a.estado !== 'En línea' && b.estado === 'En línea') return 1;
    return 0;
});
estacionesOrdenadas.forEach(est => {
    const isOnline = est.estado === 'En línea';
    const statusClass = isOnline ? 'status-online' : 'status-offline';
    summaryHTML += `
        <div class="summary-item">
            <div class="summary-info">
                <h4>${est.nombre}</h4>
                <p>${est.codigo}</p>
            </div>
            <div class="summary-status ${statusClass}">
                ${est.estado}
            </div>
        </div>
    `;
});
summaryDropdown.innerHTML = summaryHTML;
badgeBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    const isVisible = summaryDropdown.style.display === 'flex';
    summaryDropdown.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
        searchDropdown.style.display = 'none';
    }
    badgeBtn.style.transform = 'scale(0.97)';
    setTimeout(() => badgeBtn.style.transform = 'scale(1)', 100);
});
document.addEventListener('click', (e) => {
    if (!badgeBtn.contains(e.target)) {
        summaryDropdown.style.display = 'none';
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
        if (newStyle.includes('outdoors') || newStyle.includes('light')) {
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
                actualizarClimaEnVivo(lectura);
            }
        });
        stompClient.subscribe('/topic/alarmas', function (mensaje) {
            const alarma = JSON.parse(mensaje.body);
            actualizarAlarmaEnVivo(alarma);
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
    return isoString.replace('T', ' ').substring(0, 19);
}
function actualizarMarcadorEnVivo(lectura) {
    if (!lectura || !lectura.estacionId) return;
    const est = estaciones.find(e => e.id === lectura.estacionId);
    if (est) {
        est.temperatura = lectura.temperatura;
        est.humedadAire = lectura.humedadAire;
        est.velocidadViento = lectura.velocidadViento;
        est.lluvia = lectura.lluvia;
    }
    const marker = stationMarkers[lectura.estacionId];
    if (marker) {
        const el = marker.getElement();
        const hasAlarms = est && est.alarmasActivas && est.alarmasActivas.length > 0;
        const colorHex = hasAlarms ? '#F59E0B' : '#34D399'; 
        el.style.border = `2px solid ${colorHex}`;
        el.style.color = colorHex;
        el.style.boxShadow = `0 0 10px ${colorHex}`;
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
        const hasAlarms = est.alarmasActivas.length > 0;
        const colorHex = hasAlarms ? '#F59E0B' : '#34D399'; 
        el.style.border = `2px solid ${colorHex}`;
        el.style.color = colorHex;
        el.style.boxShadow = `0 0 10px ${colorHex}`;
        if (hasAlarms) {
            el.classList.add('has-alarms');
        } else {
            el.classList.remove('has-alarms');
        }
    }
}
connectWebSocket();
window.seleccionarEstacion = function(est, skipFly) {
    if (!est) return;
    currentStationId = est.id;
    if (!skipFly) {
        map.flyTo({
            center: [est.longitud, est.latitud],
            zoom: 13,
            pitch: 45,
            essential: true
        });
    }
    actualizarTarjetaClima(est);
    cargarHistorialGrafico(est.id);
};
function cargarHistorialGrafico(estacionId) {
    fetch(`/api/lecturas/historial/${estacionId}?limite=12`)
        .then(res => res.json())
        .then(readings => {
            readings.reverse();
            const labels = readings.map(r => formatTime(r.fechaHora));
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
                xaxis: { categories: labels, labels: { style: { colors: textColor, fontFamily: 'Inter, sans-serif', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: v => v !== null && v !== undefined ? v.toFixed(1) + '°' : '--' } },
                grid: { borderColor: 'rgba(107, 114, 128, 0.1)', strokeDashArray: 4, padding: { left: 8, right: 8 } },
                theme: { mode: chartMode },
                tooltip: { theme: chartMode, y: { formatter: v => v !== null ? v.toFixed(1) + ` °${window.currentTempUnit || 'C'}` : '--' } },
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
                xaxis: { categories: labels, labels: { style: { colors: textColor, fontFamily: 'Inter, sans-serif', fontSize: '10px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
                yaxis: { labels: { style: { colors: textColor, fontSize: '11px' }, formatter: v => v !== null && v !== undefined ? v.toFixed(0) + '%' : '--' }, min: 0, max: 100 },
                grid: { borderColor: 'rgba(107, 114, 128, 0.1)', strokeDashArray: 4, padding: { left: 8, right: 8 } },
                theme: { mode: chartMode },
                tooltip: { theme: chartMode, y: { formatter: v => v !== null ? v.toFixed(1) + ' %' : '--' } },
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
function actualizarTarjetaClima(est) {
    if (!est) return;
    const safeFixed = (val, decimals) => (val !== null && val !== undefined) ? Number(val).toFixed(decimals) : null;
    document.getElementById('activeStationName').textContent = est.nombre || '--';
    document.getElementById('activeStationCode').textContent = est.codigo || 'EST-XXX';
    const convertedTemp = window.convertTempObj(est.temperatura);
    document.getElementById('activeTemp').textContent = safeFixed(convertedTemp, 1) || '--';
    const unitEls = document.querySelectorAll('.weather-unit');
    unitEls.forEach(el => el.textContent = `°${window.currentTempUnit}`);
    document.getElementById('activeFeels').textContent = 'Sensación: ' + (safeFixed(convertedTemp, 1) ? (convertedTemp + (window.currentTempUnit === 'F' ? 0.9 : 0.5)).toFixed(1) + `°${window.currentTempUnit}` : '--');
    document.getElementById('activeStatusText').textContent = est.estado || '--';
    document.getElementById('activeTime').textContent = est.fechaHoraLectura ? est.fechaHoraLectura.split(' ')[1] : '--:--';
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
        photoHeader.style.backgroundImage = obtenerImagenClimatica(est);
    }
    const card = document.getElementById('weatherCard');
    if (card) {
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
    lsIconWrapper.className = 'ls-icon-wrapper';
    if (lluvia > 3) {
        lsIcon.textContent = '☔';
        lsTitle.textContent = 'Lleva Paraguas';
        lsDesc.textContent = lluvia >= 5 ? 'Lluvias fuertes en la zona. Maneja con precaución.' : 'Se registran lluvias ligeras. Un paraguas será útil hoy.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #93C5FD 0%, #3B82F6 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(59, 130, 246, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-rain');
    } else if (viento > 20) {
        lsIcon.textContent = '🪁';
        lsTitle.textContent = 'Mucho Viento';
        lsDesc.textContent = 'Las ráfagas están intensas. Ten cuidado con objetos sueltos o ramas caídas.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(124, 58, 237, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-wind');
    } else if (temp > 32) {
        lsIcon.textContent = '😎';
        lsTitle.textContent = 'Calor Extremo';
        lsDesc.textContent = 'Las temperaturas están muy altas. Mantente hidratado y usa protector solar si sales.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #FCA5A5 0%, #EF4444 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(239, 68, 68, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-sun');
    } else if (temp < 18) {
        lsIcon.textContent = '🧥';
        lsTitle.textContent = 'Ambiente Fresco';
        lsDesc.textContent = 'Se siente fresco afuera. Te recomendamos llevar un abrigo ligero contigo.';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #6EE7B7 0%, #10B981 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(16, 185, 129, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-cold');
    } else {
        lsIcon.textContent = '☀️';
        lsTitle.textContent = 'Día Agradable';
        lsDesc.textContent = 'Las condiciones son perfectas para actividades al aire libre. ¡Disfruta el día!';
        lsIconWrapper.style.background = 'linear-gradient(135deg, #FDE68A 0%, #F59E0B 100%)';
        lsIconWrapper.style.boxShadow = '0 10px 25px -5px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5)';
        lsIconWrapper.classList.add('ls-anim-sun');
    }
}
function obtenerImagenClimatica(est) {
    if (!est) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (est.nombre) {
        const nombreStr = est.nombre.toLowerCase();
        if (nombreStr.includes('homs')) return 'url("/img/homs.png")';
        if (nombreStr.includes('pucmm')) return 'url("/img/pucmm.png")';
        if (nombreStr.includes('utesa')) return 'url("/img/utesa.png")';
    }
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}
function actualizarClimaEnVivo(lectura) {
    if (!lectura) return;
    document.getElementById('activeTemp').textContent = lectura.temperatura !== null ? lectura.temperatura.toFixed(1) : '--';
    document.getElementById('activeFeels').textContent = 'Sensación: ' + (lectura.temperatura !== null ? (lectura.temperatura + 0.5).toFixed(1) + '°C' : '--');
    document.getElementById('activeWind').textContent = lectura.velocidadViento !== null ? lectura.velocidadViento.toFixed(1) + ' km/h' : '--';
    document.getElementById('activeHum').textContent = lectura.humedadAire !== null ? lectura.humedadAire.toFixed(0) + '%' : '--';
    document.getElementById('activeSoil').textContent = lectura.humedadSuelo !== null ? lectura.humedadSuelo.toFixed(0) + '%' : '--';
    document.getElementById('activePressure').textContent = lectura.presion !== null ? lectura.presion.toFixed(0) + ' hPa' : '--';
    document.getElementById('activeRain').textContent = lectura.lluvia !== null ? lectura.lluvia.toFixed(1) + ' mm' : '--';
    document.getElementById('activeWindDir').textContent = lectura.direccionViento || '--';
    const photoHeader = document.getElementById('weatherPhotoHeader');
    if (photoHeader) {
        const estacionAsociada = typeof estaciones !== 'undefined' ? estaciones.find(e => e.id === lectura.estacionId) : lectura;
        photoHeader.style.backgroundImage = obtenerImagenClimatica(estacionAsociada || lectura);
    }
    if (lectura.fechaHora) {
        document.getElementById('activeTime').textContent = formatTime(lectura.fechaHora);
    }
    const card = document.getElementById('weatherCard');
    if (card) {
        card.classList.remove('slide-fade-active');
        void card.offsetWidth;
        card.classList.add('slide-fade-active');
    }
    cargarHistorialGrafico(lectura.estacionId);
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
        seleccionarEstacion(estaciones[0]);
        window.startSlideshow();
    }, 500);
}
function initForecastBar() {
    const container = document.getElementById('forecastDaysContainer');
    if (!container) return;
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const icons = ['☀️', '☁️', '🌤️', '🌧️', '🌩️'];
    const today = new Date();
    if (!window.forecastBaseTemps) {
        window.forecastBaseTemps = [];
        for (let i = 0; i < 7; i++) {
            window.forecastBaseTemps.push(Math.floor(Math.random() * (32 - 24 + 1)) + 24);
        }
    }
    let html = '';
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        let dayName = i === 0 ? 'Hoy' : days[d.getDay()];
        let baseTemp = window.forecastBaseTemps[i];
        let displayTemp = window.convertTempObj(baseTemp).toFixed(0);
        let icon = icons[Math.floor(Math.random() * icons.length)]; 
        let activeClass = i === 0 ? 'active' : '';
        html += `
            <div class="forecast-day ${activeClass}">
                <span class="day-name">${dayName}</span>
                <span class="day-temp">${displayTemp}° ${icon}</span>
            </div>
        `;
    }
    container.innerHTML = html;
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
                    actualizarTarjetaClima(est);
                    cargarHistorialGrafico(est.id);
                }
            }
        });
    });
}
initTempToggle();
