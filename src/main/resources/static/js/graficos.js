let chartTemp = null;
let chartHum = null;
let chartViento = null;
let chartPresion = null;
let chartSuelo = null;
let chartLluvia = null;
let currentStationId = null;
let stompClient = null;
const MAX_RAW_POINTS = 2000;   
let rawData = { temp: [], hum: [], viento: [], presion: [], suelo: [], lluvia: [] };
let timeLabels = [];
let isDarkMode = localStorage.getItem('darkMode') === 'true';
function formatLabel(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const mm = months[date.getMonth()];
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${min}`;
}
function aggregateDataSequential(rawPoints, targetCount = 100) {
    if (!rawPoints || rawPoints.length === 0) return { data: [], labels: [] };
    const totalPoints = rawPoints.length;
    const bucketSize = totalPoints <= targetCount ? 1 : Math.ceil(totalPoints / targetCount);
    const aggregatedData = [];
    const labels = [];
    for (let i = 0; i < totalPoints; i += bucketSize) {
        const chunk = rawPoints.slice(i, i + bucketSize);
        if (chunk.length === 0) continue;
        const avgY = chunk.reduce((sum, p) => sum + p.y, 0) / chunk.length;
        const midIndex = Math.floor(chunk.length / 2);
        const dateObj = new Date(chunk[midIndex].x);
        aggregatedData.push({ x: aggregatedData.length, y: avgY });
        labels.push(formatLabel(dateObj));
    }
    return { data: aggregatedData, labels: labels };
}
function parseServerDate(fechaHora) {
    if (Array.isArray(fechaHora)) {
        return new Date(fechaHora[0], fechaHora[1] - 1, fechaHora[2],
                        fechaHora[3] || 0, fechaHora[4] || 0, fechaHora[5] || 0);
    }
    return new Date(fechaHora);
}
const getCommonOptions = () => ({
    chart: {
        animations: {
            enabled: true,
            easing: 'linear',
            dynamicAnimation: { speed: 800 }
        },
        toolbar: { 
            show: true,
            tools: {
                download: true, 
                selection: false,
                zoom: false,
                zoomin: false,
                zoomout: false,
                pan: false,
                reset: false
            }
        },
        zoom: { enabled: false }, 
        fontFamily: 'Inter, sans-serif',
        background: 'transparent'
    },
    theme: {
        mode: isDarkMode ? 'dark' : 'light'
    },
    stroke: { curve: 'smooth', width: 2 },
    dataLabels: { enabled: false },
    xaxis: {
        type: 'numeric',
        tickAmount: 5,
        labels: {
            rotate: 0,
            rotateAlways: false,
            hideOverlappingLabels: true,
            trim: false,
            style: { fontSize: '9px', colors: isDarkMode ? '#9CA3AF' : '#6B7280' },
            formatter: function(val) {
                const idx = Math.round(val);
                if (idx >= 0 && idx < timeLabels.length) {
                    return timeLabels[idx];
                }
                return '';
            }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
    },
    yaxis: {
        labels: {
            minWidth: 40,
            formatter: val => val != null ? val.toFixed(1) : '',
            style: { colors: isDarkMode ? '#9CA3AF' : '#6B7280' }
        }
    },
    tooltip: {
        theme: isDarkMode ? 'dark' : 'light',
        x: {
            formatter: function(val) {
                const idx = Math.round(val);
                if (idx >= 0 && idx < timeLabels.length) {
                    return timeLabels[idx];
                }
                return '';
            }
        }
    },
    legend: { position: 'top', labels: { colors: isDarkMode ? '#F9FAFB' : '#374151' } },
    grid: { 
        borderColor: isDarkMode ? '#374151' : '#E5E7EB',
        strokeDashArray: 4,
        padding: { left: 15, right: 15, bottom: 10 }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const stationSelect = document.getElementById('stationSelect');
    const dateFilters = document.getElementById('dateFilters');
    const btnFiltrar = document.getElementById('btnFiltrarFechas');
    const btnDarkMode = document.getElementById('btnDarkMode');
    if (isDarkMode) document.body.classList.add('dark-mode');
    updateDarkModeIcons();
    if (btnDarkMode) {
        btnDarkMode.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            localStorage.setItem('darkMode', isDarkMode);
            document.body.classList.toggle('dark-mode');
            updateDarkModeIcons();
            const newOptions = { 
                theme: { mode: isDarkMode ? 'dark' : 'light' },
                grid: { borderColor: isDarkMode ? '#374151' : '#E5E7EB' },
                xaxis: { 
                    labels: { 
                        style: { colors: isDarkMode ? '#9CA3AF' : '#6B7280' },
                        formatter: function(val) {
                            const idx = Math.round(val);
                            if (idx >= 0 && idx < timeLabels.length) {
                                return timeLabels[idx];
                            }
                            return '';
                        }
                    } 
                },
                yaxis: { 
                    labels: { 
                        style: { colors: isDarkMode ? '#9CA3AF' : '#6B7280' },
                        formatter: val => val != null ? val.toFixed(1) : ''
                    } 
                },
                tooltip: {
                    theme: isDarkMode ? 'dark' : 'light',
                    x: {
                        formatter: function(val) {
                            const idx = Math.round(val);
                            if (idx >= 0 && idx < timeLabels.length) {
                                return timeLabels[idx];
                            }
                            return '';
                        }
                    }
                }
            };
            if (chartTemp) chartTemp.updateOptions(newOptions);
            if (chartHum) chartHum.updateOptions(newOptions);
            if (chartViento) chartViento.updateOptions(newOptions);
            if (chartPresion) chartPresion.updateOptions(newOptions);
            if (chartSuelo) chartSuelo.updateOptions(newOptions);
            if (chartLluvia) chartLluvia.updateOptions(newOptions);
        });
    }
    if (stationSelect) {
        stationSelect.addEventListener('change', (e) => {
            const estId = e.target.value;
            if (estId) {
                currentStationId = estId;
                document.getElementById('noStationMessage').style.display = 'none';
                const grid = document.getElementById('chartsGrid');
                grid.style.display = 'grid';
                dateFilters.style.display = 'flex';
                document.getElementById('summaryCards').style.display = 'grid';
                void grid.offsetHeight; 
                destroyCharts();
                initCharts();
                loadHistoricalData(estId);
            } else {
                currentStationId = null;
                document.getElementById('noStationMessage').style.display = 'block';
                document.getElementById('chartsGrid').style.display = 'none';
                dateFilters.style.display = 'none';
                document.getElementById('summaryCards').style.display = 'none';
                destroyCharts();
            }
        });
    }
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', () => {
            if (currentStationId) {
                destroyCharts();
                initCharts();
                loadHistoricalData(currentStationId);
            }
        });
    }
    connectWebSocket();
});
function updateDarkModeIcons() {
    document.getElementById('iconSun').style.display = isDarkMode ? 'block' : 'none';
    document.getElementById('iconMoon').style.display = isDarkMode ? 'none' : 'block';
}
function destroyCharts() {
    if (chartTemp) { chartTemp.destroy(); chartTemp = null; }
    if (chartHum) { chartHum.destroy(); chartHum = null; }
    if (chartViento) { chartViento.destroy(); chartViento = null; }
    if (chartPresion) { chartPresion.destroy(); chartPresion = null; }
    if (chartSuelo) { chartSuelo.destroy(); chartSuelo = null; }
    if (chartLluvia) { chartLluvia.destroy(); chartLluvia = null; }
}
function initCharts() {
    const baseOpts = getCommonOptions();
    const optionsTemp = {
        ...baseOpts,
        chart: { ...baseOpts.chart, type: 'area', height: 280, id: 'chartT' },
        series: [{ name: 'Temperatura (°C)', data: [] }],
        colors: ['#F59E0B'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
        annotations: {
            yaxis: [
                { y: 35, borderColor: '#EF4444', label: { borderColor: '#EF4444', style: { color: '#fff', background: '#EF4444' }, text: 'Peligro Calor' } },
                { y: 15, borderColor: '#3B82F6', label: { borderColor: '#3B82F6', style: { color: '#fff', background: '#3B82F6' }, text: 'Frío Extremo' } }
            ]
        }
    };
    chartTemp = new ApexCharts(document.querySelector("#chartTemperatura"), optionsTemp);
    chartTemp.render();
    const optionsHum = {
        ...baseOpts,
        chart: { ...baseOpts.chart, type: 'area', height: 280, id: 'chartH' },
        series: [{ name: 'Humedad (%)', data: [] }],
        colors: ['#3B82F6'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } }
    };
    chartHum = new ApexCharts(document.querySelector("#chartHumedad"), optionsHum);
    chartHum.render();
    const optionsViento = {
        ...baseOpts,
        chart: { ...baseOpts.chart, type: 'area', height: 280, id: 'chartV' },
        series: [{ name: 'Velocidad (km/h)', data: [] }],
        colors: ['#10B981'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
        annotations: {
            yaxis: [
                { y: 40, borderColor: '#EF4444', label: { borderColor: '#EF4444', style: { color: '#fff', background: '#EF4444' }, text: 'Viento Fuerte' } }
            ]
        }
    };
    chartViento = new ApexCharts(document.querySelector("#chartViento"), optionsViento);
    chartViento.render();
    const optionsPresion = {
        ...baseOpts,
        chart: { ...baseOpts.chart, type: 'area', height: 280, id: 'chartP' },
        series: [{ name: 'Presión (hPa)', data: [] }],
        colors: ['#6366F1'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } }
    };
    chartPresion = new ApexCharts(document.querySelector("#chartPresion"), optionsPresion);
    chartPresion.render();
    const optionsSuelo = {
        ...baseOpts,
        chart: { ...baseOpts.chart, type: 'area', height: 280, id: 'chartS' },
        series: [{ name: 'Humedad Suelo (%)', data: [] }],
        colors: ['#8B5CF6'],
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } }
    };
    chartSuelo = new ApexCharts(document.querySelector("#chartSuelo"), optionsSuelo);
    chartSuelo.render();
    const optionsLluvia = {
        ...baseOpts,
        chart: { ...baseOpts.chart, type: 'bar', height: 280, id: 'chartL' },
        series: [{ name: 'Precipitación (mm)', data: [] }],
        colors: ['#0EA5E9'],
        plotOptions: { bar: { columnWidth: '40%', borderRadius: 4 } }
    };
    chartLluvia = new ApexCharts(document.querySelector("#chartLluvia"), optionsLluvia);
    chartLluvia.render();
}
function calculateLast2hPrecipitation() {
    const lluviaData = rawData.lluvia;
    if (lluviaData.length === 0) return 0;
    const latestTimestamp = lluviaData[lluviaData.length - 1].x;
    const threshold = latestTimestamp - (2 * 60 * 60 * 1000); 
    let sum = 0;
    for (let i = 0; i < lluviaData.length; i++) {
        if (lluviaData[i].x >= threshold) {
            sum += (lluviaData[i].y || 0);
        }
    }
    return sum;
}
function loadHistoricalData(estId) {
    const start = document.getElementById('fechaInicio').value;
    const end = document.getElementById('fechaFin').value;
    let url = `/api/lecturas/historial/${estId}?limite=1000`;
    if (start && end) {
        url += `&fechaInicio=${start}&fechaFin=${end}`;
    }
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('chartsGrid').style.opacity = '0.3';
    fetch(url)
        .then(response => response.json())
        .then(data => {
            data.reverse();
            rawData = { temp: [], hum: [], viento: [], presion: [], suelo: [], lluvia: [] };
            let maxTemp = -999, minTemp = 999;
            let maxViento = -1;
            let sumHumTotal = 0;
            let totalRecords = data.length;
            data.forEach((lectura) => {
                const dateObj = parseServerDate(lectura.fechaHora);
                const timestamp = dateObj.getTime();
                rawData.temp.push({ x: timestamp, y: lectura.temperatura });
                rawData.hum.push({ x: timestamp, y: lectura.humedadAire });
                rawData.viento.push({ x: timestamp, y: lectura.velocidadViento });
                rawData.presion.push({ x: timestamp, y: lectura.presion });
                rawData.suelo.push({ x: timestamp, y: lectura.humedadSuelo });
                rawData.lluvia.push({ x: timestamp, y: lectura.lluvia });
                if(lectura.temperatura > maxTemp) maxTemp = lectura.temperatura;
                if(lectura.temperatura < minTemp) minTemp = lectura.temperatura;
                if(lectura.velocidadViento > maxViento) maxViento = lectura.velocidadViento;
                sumHumTotal += lectura.humedadAire;
            });
            if (totalRecords > 0) {
                const latestLluvia2h = calculateLast2hPrecipitation();
                document.getElementById('sumTemp').innerText = `${maxTemp.toFixed(1)} / ${minTemp.toFixed(1)} °C`;
                document.getElementById('sumViento').innerText = `${maxViento.toFixed(1)} km/h`;
                document.getElementById('sumLluvia').innerText = `${latestLluvia2h.toFixed(1)} mm`;
                document.getElementById('sumHum').innerText = `${(sumHumTotal / totalRecords).toFixed(1)} %`;
            } else {
                document.getElementById('sumTemp').innerText = `-- / -- °C`;
                document.getElementById('sumViento').innerText = `-- km/h`;
                document.getElementById('sumLluvia').innerText = `-- mm`;
                document.getElementById('sumHum').innerText = `-- %`;
            }
            updateChartsFromRawData();
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
        })
        .catch(error => console.error("Error cargando historial:", error))
        .finally(() => {
            document.getElementById('loadingSpinner').style.display = 'none';
            document.getElementById('chartsGrid').style.opacity = '1';
        });
}
function updateChartsFromRawData() {
    const tempRes = aggregateDataSequential(rawData.temp, 100);
    const humRes = aggregateDataSequential(rawData.hum, 100);
    const vientoRes = aggregateDataSequential(rawData.viento, 100);
    const presionRes = aggregateDataSequential(rawData.presion, 100);
    const sueloRes = aggregateDataSequential(rawData.suelo, 100);
    const lluviaRes = aggregateDataSequential(rawData.lluvia, 100);
    timeLabels = tempRes.labels || [];
    if (chartTemp) chartTemp.updateSeries([{ name: 'Temperatura (°C)', data: tempRes.data || [] }]);
    if (chartHum) chartHum.updateSeries([{ name: 'Humedad (%)', data: humRes.data || [] }]);
    if (chartViento) chartViento.updateSeries([{ name: 'Velocidad (km/h)', data: vientoRes.data || [] }]);
    if (chartPresion) chartPresion.updateSeries([{ name: 'Presión (hPa)', data: presionRes.data || [] }]);
    if (chartSuelo) chartSuelo.updateSeries([{ name: 'Humedad Suelo (%)', data: sueloRes.data || [] }]);
    if (chartLluvia) chartLluvia.updateSeries([{ name: 'Precipitación (mm)', data: lluviaRes.data || [] }]);
}
function connectWebSocket() {
    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') return;
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    stompClient.connect({}, function (frame) {
        stompClient.subscribe('/topic/lecturas', function (mensaje) {
            const lectura = JSON.parse(mensaje.body);
            if (currentStationId && lectura.estacionId == currentStationId && chartTemp) {
                appendDataToCharts(lectura);
            }
        });
    }, function(error) {
        setTimeout(connectWebSocket, 5000); 
    });
}
function appendDataToCharts(lectura) {
    const dateObj = parseServerDate(lectura.fechaHora);
    const timestamp = dateObj.getTime();
    rawData.temp.push({ x: timestamp, y: lectura.temperatura });
    rawData.hum.push({ x: timestamp, y: lectura.humedadAire });
    rawData.viento.push({ x: timestamp, y: lectura.velocidadViento });
    rawData.presion.push({ x: timestamp, y: lectura.presion });
    rawData.suelo.push({ x: timestamp, y: lectura.humedadSuelo });
    rawData.lluvia.push({ x: timestamp, y: lectura.lluvia });
    Object.keys(rawData).forEach(key => {
        if (rawData[key].length > MAX_RAW_POINTS) {
            rawData[key] = rawData[key].slice(rawData[key].length - MAX_RAW_POINTS);
        }
    });
    updateSummaryFromRaw();
    updateChartsFromRawData();
}
function updateSummaryFromRaw() {
    const tempData = rawData.temp;
    if (tempData.length === 0) return;
    let maxTemp = -999, minTemp = 999, maxViento = -1, sumHum = 0;
    for (let i = 0; i < tempData.length; i++) {
        if (tempData[i].y > maxTemp) maxTemp = tempData[i].y;
        if (tempData[i].y < minTemp) minTemp = tempData[i].y;
        if (rawData.viento[i] && rawData.viento[i].y > maxViento) maxViento = rawData.viento[i].y;
        if (rawData.hum[i]) sumHum += rawData.hum[i].y;
    }
    const latestLluvia2h = calculateLast2hPrecipitation();
    document.getElementById('sumTemp').innerText = `${maxTemp.toFixed(1)} / ${minTemp.toFixed(1)} °C`;
    document.getElementById('sumViento').innerText = `${maxViento.toFixed(1)} km/h`;
    document.getElementById('sumLluvia').innerText = `${latestLluvia2h.toFixed(1)} mm`;
    document.getElementById('sumHum').innerText = `${(sumHum / tempData.length).toFixed(1)} %`;
}
