document.addEventListener('DOMContentLoaded', () => {
    const fechaInicioInput = document.getElementById('fechaInicio');
    const fechaFinInput = document.getElementById('fechaFin');
    const estacionIdSelect = document.getElementById('estacionId');
    const variableSelect = document.getElementById('variable');
    const tbody = document.getElementById('report-tbody');
    const valRegistros = document.getElementById('val-registros');
    const tableMeta = document.getElementById('table-meta');
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    fechaFinInput.value = today.toISOString().split('T')[0];
    fechaInicioInput.value = lastWeek.toISOString().split('T')[0];
    let lecturasGlobales = [];
    let currentPage = 1;
    const PAGE_SIZE = 10;
    let sortColumn = 'fecha';
    let sortDirection = 'desc'; 
    let sparkTemp = null, sparkHum = null, sparkPres = null, sparkLluvia = null;
    function showSkeleton() {
        document.querySelectorAll('.summary-card').forEach(c => c.classList.add('skeleton-card'));
        tbody.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const tr = document.createElement('tr');
            tr.className = 'skeleton-row';
            const widths = [120, 50, 50, 60, 50, 50, 50, 50];
            for (let w of widths) {
                tr.innerHTML += `<td><div class="skeleton-bar" style="width: ${w}px;"></div></td>`;
            }
            tbody.appendChild(tr);
        }
        document.getElementById('pagination-container').style.display = 'none';
        tableMeta.textContent = 'Cargando...';
    }
    function hideSkeleton() {
        document.querySelectorAll('.summary-card').forEach(c => c.classList.remove('skeleton-card'));
    }
    function applyVariableFilter() {
        const variable = variableSelect.value;
        const allCols = ['fecha', 'temp', 'hum', 'pres', 'viento', 'dir', 'lluvia', 'suelo'];
        const visibleMap = {
            'all':     allCols,
            'temp':    ['fecha', 'temp'],
            'hum':     ['fecha', 'hum'],
            'pres':    ['fecha', 'pres'],
            'viento':  ['fecha', 'viento', 'dir'],
            'dir':     ['fecha', 'dir'],
            'lluvia':  ['fecha', 'lluvia'],
            'suelo':   ['fecha', 'suelo']
        };
        const visible = visibleMap[variable] || allCols;
        document.querySelectorAll('.report-table th[data-col]').forEach(th => {
            th.classList.toggle('col-hidden', !visible.includes(th.dataset.col));
        });
        document.querySelectorAll('.report-table tbody tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            allCols.forEach((col, idx) => {
                if (cells[idx]) {
                    cells[idx].classList.toggle('col-hidden', !visible.includes(col));
                }
            });
        });
    }
    function getSortValue(lectura, col) {
        switch (col) {
            case 'fecha': return new Date(lectura.fechaHora).getTime();
            case 'temp': return lectura.temperatura ?? -Infinity;
            case 'hum': return lectura.humedadAire ?? -Infinity;
            case 'pres': return lectura.presion ?? -Infinity;
            case 'viento': return lectura.velocidadViento ?? -Infinity;
            case 'dir': return (lectura.direccionViento || '').toLowerCase();
            case 'lluvia': return lectura.lluvia ?? -Infinity;
            case 'suelo': return lectura.humedadSuelo ?? -Infinity;
            default: return 0;
        }
    }
    function sortLecturas() {
        lecturasGlobales.sort((a, b) => {
            let valA = getSortValue(a, sortColumn);
            let valB = getSortValue(b, sortColumn);
            if (typeof valA === 'string') {
                const cmp = valA.localeCompare(valB);
                return sortDirection === 'asc' ? cmp : -cmp;
            }
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });
    }
    function initSortHeaders() {
        document.querySelectorAll('.report-table th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const col = th.dataset.sort;
                if (sortColumn === col) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = col;
                    sortDirection = 'asc';
                }
                document.querySelectorAll('.report-table th').forEach(h => h.classList.remove('sort-active'));
                th.classList.add('sort-active');
                th.querySelector('.sort-icon').textContent = sortDirection === 'asc' ? '▲' : '▼';
                sortLecturas();
                currentPage = 1;
                renderTablePage();
            });
        });
    }
    function getCellClass(col, value) {
        if (value == null || value === '-') return '';
        const v = parseFloat(value);
        if (isNaN(v)) return '';
        switch (col) {
            case 'temp':
                if (v >= 35) return 'cell-danger';
                if (v <= 15) return 'cell-cold';
                if (v >= 30) return 'cell-warning';
                return '';
            case 'viento':
                if (v >= 40) return 'cell-danger';
                if (v >= 25) return 'cell-warning';
                return '';
            case 'hum':
                if (v < 20) return 'cell-danger';
                if (v > 90) return 'cell-warning';
                return '';
            case 'lluvia':
                if (v > 50) return 'cell-danger';
                if (v > 20) return 'cell-warning';
                if (v > 0) return 'cell-cold';
                return '';
            default:
                return '';
        }
    }
    let chartDonut = null, chartBarDia = null, chartBarSensor = null, chartUptime = null;
    let hiddenMetChart = null, hiddenMetChartHum = null, hiddenMetChartPres = null, hiddenMetChartLluvia = null;
    function initChart(elId, options) {
        const el = document.getElementById(elId);
        if (!el) return null;
        el.innerHTML = '';
        const chart = new ApexCharts(el, options);
        chart.render();
        return chart;
    }
    function updateManagementCharts(data) {
        if (chartDonut) chartDonut.destroy();
        if (chartBarDia) chartBarDia.destroy();
        if (chartBarSensor) chartBarSensor.destroy();
        if (chartUptime) chartUptime.destroy();
        if (hiddenMetChart) hiddenMetChart.destroy();
        if (hiddenMetChartHum) hiddenMetChartHum.destroy();
        if (hiddenMetChartPres) hiddenMetChartPres.destroy();
        if (hiddenMetChartLluvia) hiddenMetChartLluvia.destroy();
        const gravKeys = Object.keys(data.alarmasPorGravedad || {});
        const gravVals = gravKeys.map(k => data.alarmasPorGravedad[k]);
        chartDonut = initChart('chart-donut', {
            series: gravVals.length ? gravVals : [1],
            labels: gravVals.length ? gravKeys : ['Sin Alarmas'],
            chart: { type: 'donut', height: 250 },
            colors: gravVals.length ? gravKeys.map(k => k.toUpperCase() === 'CRITICA' ? '#EF4444' : '#F59E0B') : ['#E2E8F0'],
            dataLabels: { enabled: false },
            legend: { position: 'bottom' }
        });
        const diaKeys = Object.keys(data.alarmasPorDia || {}).sort();
        const diaVals = diaKeys.map(k => data.alarmasPorDia[k]);
        chartBarDia = initChart('chart-bar-dia', {
            series: [{ name: 'Alarmas', data: diaVals }],
            xaxis: { categories: diaKeys },
            chart: { type: 'bar', height: 250, toolbar: { show: false } },
            colors: ['#3B82F6'],
            plotOptions: { bar: { borderRadius: 4 } }
        });
        const sensorNameMap = {
            'humedad_suelo': 'Humedad de Suelo',
            'humedad_aire': 'Humedad del aire',
            'temperatura': 'Temperatura',
            'presion': 'Presión',
            'lluvia': 'Lluvia',
            'velocidad_viento': 'Velocidad de Viento'
        };
        const allSensors = ['humedad_suelo', 'humedad_aire', 'temperatura', 'presion', 'lluvia', 'velocidad_viento'];
        const backendSensorData = data.alarmasPorSensor || {};
        const sensorVals = allSensors.map(k => backendSensorData[k] || 0);
        const formattedKeys = allSensors.map(k => sensorNameMap[k]);
        chartBarSensor = initChart('chart-bar-sensor', {
            series: [{ name: 'Alarmas', data: sensorVals }],
            xaxis: { categories: formattedKeys },
            chart: { type: 'bar', height: 250, toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
            colors: ['#8B5CF6']
        });
        const lecturasPorDia = {};
        (data.lecturas || []).forEach(l => {
            const day = l.fechaHora.split('T')[0];
            lecturasPorDia[day] = (lecturasPorDia[day] || 0) + 1;
        });
        let upKeys = Object.keys(lecturasPorDia).sort();
        if (upKeys.length > 7) {
            upKeys = upKeys.slice(-7);
        }
        const upVals = upKeys.map(k => lecturasPorDia[k]);
        chartUptime = initChart('chart-uptime', {
            series: [{ name: 'Lecturas', data: upVals }],
            xaxis: { categories: upKeys },
            chart: { type: 'area', height: 250, toolbar: { show: false } },
            colors: ['#10B981'],
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } }
        });
        const variable = document.getElementById('variable').value;
        const lecturas = (data.lecturas || []).slice().reverse();
        const dates = lecturas.map(l => l.fechaHora.replace('T', ' ').substring(0, 16));
        let seriesData = [];
        let yaxisConfig = [];
        let colors = [];
        if (variable === 'all') {
            hiddenMetChart = initChart('hidden-met-chart', {
                series: [{ name: 'Temperatura (°C)', data: lecturas.map(l => l.temperatura) }],
                xaxis: { categories: dates, labels: { show: false } },
                chart: { type: 'line', height: 350, toolbar: { show: false }, animations: { enabled: false } },
                stroke: { width: 2, curve: 'smooth' }, colors: ['#EF4444'], legend: { position: 'top' }
            });
            hiddenMetChartHum = initChart('hidden-met-chart-hum', {
                series: [{ name: 'Humedad (%)', data: lecturas.map(l => l.humedadAire) }],
                xaxis: { categories: dates, labels: { show: false } },
                chart: { type: 'line', height: 350, toolbar: { show: false }, animations: { enabled: false } },
                stroke: { width: 2, curve: 'smooth' }, colors: ['#3B82F6'], legend: { position: 'top' }
            });
            hiddenMetChartPres = initChart('hidden-met-chart-pres', {
                series: [{ name: 'Presión (hPa)', data: lecturas.map(l => l.presion) }],
                xaxis: { categories: dates, labels: { show: false } },
                chart: { type: 'line', height: 350, toolbar: { show: false }, animations: { enabled: false } },
                stroke: { width: 2, curve: 'smooth' }, colors: ['#8B5CF6'], legend: { position: 'top' }
            });
            hiddenMetChartLluvia = initChart('hidden-met-chart-lluvia', {
                series: [{ name: 'Lluvia (mm)', data: lecturas.map(l => l.lluvia) }],
                xaxis: { categories: dates, labels: { show: false } },
                chart: { type: 'line', height: 350, toolbar: { show: false }, animations: { enabled: false } },
                stroke: { width: 2, curve: 'smooth' }, colors: ['#10B981'], legend: { position: 'top' }
            });
        } else {
            let sData = [];
            let sName = '';
            let sColor = '#3B82F6';
            if (variable === 'temp') { sData = lecturas.map(l => l.temperatura); sName = 'Temperatura (°C)'; sColor = '#EF4444'; }
            if (variable === 'hum') { sData = lecturas.map(l => l.humedadAire); sName = 'Humedad (%)'; sColor = '#3B82F6'; }
            if (variable === 'pres') { sData = lecturas.map(l => l.presion); sName = 'Presión (hPa)'; sColor = '#8B5CF6'; }
            if (variable === 'viento') { sData = lecturas.map(l => l.velocidadViento); sName = 'Viento (km/h)'; sColor = '#F59E0B'; }
            if (variable === 'lluvia') { sData = lecturas.map(l => l.lluvia); sName = 'Lluvia (mm)'; sColor = '#10B981'; }
            if (variable === 'suelo') { sData = lecturas.map(l => l.humedadSuelo); sName = 'Humedad Suelo (%)'; sColor = '#059669'; }
            hiddenMetChart = initChart('hidden-met-chart', {
                series: [{ name: sName, data: sData }],
                xaxis: { categories: dates, labels: { show: false } },
                chart: { type: 'line', height: 350, toolbar: { show: false }, animations: { enabled: false } },
                stroke: { width: 2, curve: 'smooth' },
                colors: [sColor],
                legend: { position: 'top' }
            });
        }
    }
    function cargarDatos() {
        const estacionId = estacionIdSelect.value;
        const inicio = fechaInicioInput.value;
        const fin = fechaFinInput.value;
        if (inicio > fin) {
            alert('La fecha de inicio no puede ser mayor a la fecha de fin');
            return;
        }
        showSkeleton();
        fetch(`/api/reportes/datos?estacionId=${estacionId}&inicio=${inicio}&fin=${fin}`)
            .then(res => res.json())
            .then(data => {
                hideSkeleton();
                actualizarTarjetas(data);
                lecturasGlobales = data.lecturas || [];
                sortColumn = 'fecha';
                sortDirection = 'desc';
                sortLecturas();
                currentPage = 1;
                renderTablePage();
                updateManagementCharts(data);
            })
            .catch(err => {
                hideSkeleton();
                console.error('Error cargando datos de reporte:', err);
            });
    }
    function actualizarTarjetas(data) {
        if (valRegistros) valRegistros.textContent = (data.lecturas || []).length;
        const valAlarmas = document.getElementById('val-alarmas');
        if (valAlarmas) valAlarmas.textContent = data.alarmasTotal !== undefined ? data.alarmasTotal : '--';
        const valInact = document.getElementById('val-inactividad');
        if (valInact) {
            valInact.textContent = data.tiempoInactivo || '--';
            const iconBox = document.getElementById('icon-inactividad');
            if (data.tiempoInactivo && data.tiempoInactivo.includes('Conectado')) {
                iconBox.style.color = '#10B981';
                iconBox.style.background = 'rgba(16, 185, 129, 0.1)';
            } else {
                iconBox.style.color = '#EF4444';
                iconBox.style.background = 'rgba(239, 68, 68, 0.1)';
            }
        }
    }
    function renderTablePage() {
        tbody.innerHTML = '';
        const paginationContainer = document.getElementById('pagination-container');
        if (!lecturasGlobales || lecturasGlobales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px 24px; color: #94A3B8; font-size: 14px;">No hay registros para este período</td></tr>';
            tableMeta.textContent = '0 registros';
            paginationContainer.style.display = 'none';
            return;
        }
        const totalPages = Math.ceil(lecturasGlobales.length / PAGE_SIZE);
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = Math.min(startIndex + PAGE_SIZE, lecturasGlobales.length);
        const pageLecturas = lecturasGlobales.slice(startIndex, endIndex);
        tableMeta.textContent = `${lecturasGlobales.length} registros`;
        const selectEst = document.getElementById('estacionId');
        const showEstacion = (selectEst && selectEst.value === '0');
        const colEstacionHeader = document.getElementById('col-estacion-header');
        if (colEstacionHeader) {
            colEstacionHeader.style.display = showEstacion ? 'table-cell' : 'none';
        }
        
        pageLecturas.forEach(l => {
            const date = new Date(l.fechaHora);
            const fechaStr = date.toLocaleString('es-ES', { 
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            }).replace(',', '');
            const tempVal = typeof l.temperatura === 'number' ? l.temperatura.toFixed(1) : '-';
            const humVal = typeof l.humedadAire === 'number' ? Math.round(l.humedadAire) : '-';
            const presVal = typeof l.presion === 'number' ? Math.round(l.presion) : '-';
            const vientoVal = typeof l.velocidadViento === 'number' ? Math.round(l.velocidadViento) : '-';
            const dirVal = l.direccionViento || '-';
            const lluviaVal = typeof l.lluvia === 'number' ? l.lluvia.toFixed(1) : '-';
            const sueloVal = typeof l.humedadSuelo === 'number' ? Math.round(l.humedadSuelo) : '-';
            let tdEstacion = '';
            if (showEstacion) {
                const est = window.estacionesData ? window.estacionesData.find(e => e.id === l.estacionId) : null;
                const estName = est ? est.nombre : ('ID: ' + l.estacionId);
                tdEstacion = `<td>${estName}</td>`;
            }
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-col="fecha">${fechaStr}</td>
                ${tdEstacion}
                <td data-col="temp" class="${getCellClass('temp', tempVal)}">${tempVal}</td>
                <td data-col="hum" class="${getCellClass('hum', humVal)}">${humVal}</td>
                <td data-col="pres">${presVal}</td>
                <td data-col="viento" class="${getCellClass('viento', vientoVal)}">${vientoVal}</td>
                <td data-col="dir">${dirVal}</td>
                <td data-col="lluvia" class="${getCellClass('lluvia', lluviaVal)}">${lluviaVal}</td>
                <td data-col="suelo">${sueloVal}</td>
            `;
            tbody.appendChild(tr);
        });
        applyVariableFilter();
        paginationContainer.style.display = 'flex';
        let paginationHTML = `
            <div class="pagination-info">Mostrando ${lecturasGlobales.length} registros — Página ${currentPage} de ${totalPages}</div>
            <div class="pagination-controls">
                <button class="page-btn" id="btnFirstPage" ${currentPage <= 1 ? 'disabled' : ''} title="Primera Página">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
                </button>
                <button class="page-btn" id="btnPrevPage" ${currentPage <= 1 ? 'disabled' : ''} title="Anterior">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
        `;
        let startPage = Math.max(1, currentPage - 1);
        let endPage = Math.min(totalPages, currentPage + 1);
        if (currentPage <= 1) endPage = Math.min(totalPages, 3);
        if (currentPage >= totalPages) startPage = Math.max(1, totalPages - 2);
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''} page-num-btn" data-page="${i}">${i}</button>`;
        }
        paginationHTML += `
                <button class="page-btn" id="btnNextPage" ${currentPage >= totalPages ? 'disabled' : ''} title="Siguiente">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
                <button class="page-btn" id="btnLastPage" ${currentPage >= totalPages ? 'disabled' : ''} title="Última Página">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                </button>
            </div>
        `;
        paginationContainer.innerHTML = paginationHTML;
        document.getElementById('btnFirstPage').addEventListener('click', () => {
            if (currentPage > 1) { currentPage = 1; renderTablePage(); }
        });
        document.getElementById('btnPrevPage').addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderTablePage(); }
        });
        document.getElementById('btnNextPage').addEventListener('click', () => {
            if (currentPage < totalPages) { currentPage++; renderTablePage(); }
        });
        document.getElementById('btnLastPage').addEventListener('click', () => {
            if (currentPage < totalPages) { currentPage = totalPages; renderTablePage(); }
        });
        document.querySelectorAll('.page-num-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentPage = parseInt(e.target.closest('[data-page]').getAttribute('data-page'));
                renderTablePage();
            });
        });
    }
    estacionIdSelect.addEventListener('change', cargarDatos);
    fechaInicioInput.addEventListener('change', cargarDatos);
    fechaFinInput.addEventListener('change', cargarDatos);
    variableSelect.addEventListener('change', () => {
        applyVariableFilter();
        const descGraficoMet = document.getElementById('desc-grafico-met');
        if (variableSelect.value === 'all') {
            descGraficoMet.textContent = 'Curva climática de todas las variables superpuestas.';
        } else {
            descGraficoMet.textContent = 'Curva climática de la variable seleccionada.';
        }
    });
    const modal = document.getElementById('export-modal');
    const btnOpenModal = document.getElementById('btn-generar-pdf');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const btnConfirmExport = document.getElementById('btn-confirm-export');
    btnOpenModal.addEventListener('click', () => {
        variableSelect.dispatchEvent(new Event('change'));
        modal.classList.add('active');
    });
    const closeModal = () => modal.classList.remove('active');
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    btnConfirmExport.addEventListener('click', async () => {
        const variable = variableSelect.value;
        const nombreReporte = document.getElementById('nombre-reporte').value.trim();
        const incluirGestion = document.getElementById('chk-gestion').checked;
        const incluirTabla = document.getElementById('chk-tabla').checked;
        const incluirMeteorologia = document.getElementById('chk-grafico-met').checked;
        let chartMetUri = '', chartMetHumUri = '', chartMetPresUri = '', chartMetLluviaUri = '';
        let uriDonut = '', uriBarDia = '', uriBarSensor = '', uriUptime = '';
        try {
            if (incluirMeteorologia) {
                if (hiddenMetChart) chartMetUri = (await hiddenMetChart.dataURI()).imgURI;
                if (hiddenMetChartHum) chartMetHumUri = (await hiddenMetChartHum.dataURI()).imgURI;
                if (hiddenMetChartPres) chartMetPresUri = (await hiddenMetChartPres.dataURI()).imgURI;
                if (hiddenMetChartLluvia) chartMetLluviaUri = (await hiddenMetChartLluvia.dataURI()).imgURI;
            }
            if (incluirGestion) {
                if (chartDonut) uriDonut = (await chartDonut.dataURI()).imgURI;
                if (chartBarDia) uriBarDia = (await chartBarDia.dataURI()).imgURI;
                if (chartBarSensor) uriBarSensor = (await chartBarSensor.dataURI()).imgURI;
                if (chartUptime) uriUptime = (await chartUptime.dataURI()).imgURI;
            }
        } catch (e) {
            console.error("Error exportando graficos:", e);
        }
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/reportes/pdf';
        form.target = '_blank';
        const fields = {
            estacionId: estacionIdSelect.value,
            inicio: fechaInicioInput.value,
            fin: fechaFinInput.value,
            variable: variable,
            nombreReporte: nombreReporte,
            chartImage: chartMetUri,
            chartImageHum: chartMetHumUri,
            chartImagePres: chartMetPresUri,
            chartImageLluvia: chartMetLluviaUri,
            incluirMeteorologia: incluirMeteorologia,
            incluirGestion: incluirGestion,
            incluirTablaLecturas: incluirTabla,
            chartDonut: uriDonut,
            chartBarDia: uriBarDia,
            chartBarSensor: uriBarSensor,
            chartUptime: uriUptime
        };
        for (const [key, val] of Object.entries(fields)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = val;
            form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        closeModal();
    });
    function initWebSocket() {
        if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') return;
        const socket = new SockJS('/ws');
        const stompClient = Stomp.over(socket);
        stompClient.debug = null;
        stompClient.connect({}, function (frame) {
            stompClient.subscribe('/topic/lecturas', function (mensaje) {
                const lectura = JSON.parse(mensaje.body);
                const currentEst = parseInt(estacionIdSelect.value);
                if (currentEst !== 0 && lectura.estacionId !== currentEst) return;
                
                // Check if date is within selected range (optional, but good practice)
                const readingDate = lectura.fechaHora.split('T')[0];
                if (readingDate < fechaInicioInput.value || readingDate > fechaFinInput.value) return;

                // Buscar si ya existe para actualizarla
                const index = lecturasGlobales.findIndex(l => l.fechaHora === lectura.fechaHora && l.estacionId === lectura.estacionId);
                if (index >= 0) {
                    lecturasGlobales[index] = lectura;
                } else {
                    lecturasGlobales.push(lectura);
                    if (valRegistros) {
                        valRegistros.textContent = lecturasGlobales.length;
                    }
                }
                
                // Agrupar los renders si llegan muy rápido
                if (window.renderTimeout) clearTimeout(window.renderTimeout);
                window.renderTimeout = setTimeout(() => {
                    sortLecturas();
                    currentPage = 1;
                    renderTablePage();
                    
                    // Resaltar la primera fila
                    setTimeout(() => {
                        const firstRow = tbody.querySelector('tr');
                        if (firstRow) {
                            firstRow.style.backgroundColor = '#e0f2fe';
                            firstRow.style.transition = 'background-color 2s';
                            setTimeout(() => firstRow.style.backgroundColor = '', 2000);
                        }
                    }, 100);
                }, 300);
            });
        }, function(error) {
            setTimeout(initWebSocket, 5000);
        });
    }

    document.getElementById('btn-exportar-csv').addEventListener('click', () => {
        const url = `/reportes/csv?estacionId=${estacionIdSelect.value}&inicio=${fechaInicioInput.value}&fin=${fechaFinInput.value}`;
        window.location.href = url;
    });
    
    initWebSocket();
    initSortHeaders();
    cargarDatos();
});

