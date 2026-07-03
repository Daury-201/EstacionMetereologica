let stompClient = null;
document.addEventListener('DOMContentLoaded', () => {
    initModals();
    connectWebSocket();
    const alertSuccess = document.querySelector('.alert-success');
    if (alertSuccess) {
        alertSuccess.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        setTimeout(() => {
            alertSuccess.style.opacity = '0';
            alertSuccess.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                alertSuccess.remove();
            }, 500);
        }, 3000);
    }
    inicializarPaginacionResueltas();
    inicializarPaginacionActivas();
    initBatchActions();
    initHistoryFilters();
});
function initModals() {
    const resolveModal = document.getElementById('resolveModal');
    const detailsModal = document.getElementById('detailsModal');
    document.getElementById('closeResolveModal').addEventListener('click', () => closeModal(resolveModal));
    document.getElementById('btnCancelResolve').addEventListener('click', () => closeModal(resolveModal));
    document.getElementById('closeDetailsModal').addEventListener('click', () => closeModal(detailsModal));
    document.getElementById('btnCloseDetails').addEventListener('click', () => closeModal(detailsModal));
    window.addEventListener('click', (e) => {
        if (e.target === resolveModal) closeModal(resolveModal);
        if (e.target === detailsModal) closeModal(detailsModal);
    });
    document.body.addEventListener('click', (e) => {
        if (e.target.classList.contains('resolve-btn') || e.target.closest('.resolve-btn')) {
            const btn = e.target.closest('.resolve-btn') || e.target;
            const id = btn.getAttribute('data-id');
            openResolveModal(id);
        }
        if (e.target.classList.contains('view-btn') || e.target.closest('.view-btn')) {
            const btn = e.target.closest('.view-btn') || e.target;
            const id = btn.getAttribute('data-id');
            openDetailsModal(id);
        }
        if (e.target.classList.contains('ack-btn') || e.target.closest('.ack-btn')) {
            const btn = e.target.closest('.ack-btn') || e.target;
            if(!btn.hasAttribute('disabled')) {
                const id = btn.getAttribute('data-id');
                fetch(`/api/alarmas/reconocer/${id}`, { method: 'POST' });
            }
        }
    });
    document.getElementById('resolveForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('resolveAlarmId').value;
        const notas = document.getElementById('resolveNotes').value;
        resolverAlarma(id, notas);
    });
}
function openModal(modal) {
    modal.style.display = 'flex';
}
function closeModal(modal) {
    modal.style.display = 'none';
}
function openResolveModal(id) {
    document.getElementById('resolveAlarmId').value = id;
    document.getElementById('resolveNotes').value = '';
    openModal(document.getElementById('resolveModal'));
}
function openDetailsModal(id) {
    const detailEstacion = document.getElementById('detailEstacion');
    const detailSensor = document.getElementById('detailSensor');
    const detailValor = document.getElementById('detailValor');
    const detailUmbral = document.getElementById('detailUmbral');
    const detailFecha = document.getElementById('detailFecha');
    const detailGravedad = document.getElementById('detailGravedad');
    const detailNotas = document.getElementById('detailNotas');
    detailEstacion.innerText = "Cargando...";
    detailSensor.innerText = "Cargando...";
    detailValor.innerText = "--";
    detailUmbral.innerText = "--";
    detailFecha.innerText = "--";
    detailGravedad.innerText = "--";
    detailNotas.innerText = "Ninguna nota disponible.";
    openModal(document.getElementById('detailsModal'));
    const activeRow = document.querySelector(`.resolve-btn[data-id="${id}"]`)?.closest('tr');
    const resolvedRow = document.querySelector(`.view-btn[data-id="${id}"]`)?.closest('tr');
    const row = activeRow || resolvedRow;
    if (row) {
        const cells = row.getElementsByTagName('td');
        if (cells.length >= 7) {
            detailEstacion.innerText = cells[1].innerText;
            detailSensor.innerText = cells[2].innerText;
            detailValor.innerText = cells[3].innerText;
            detailUmbral.innerText = cells[4].innerText;
            detailFecha.innerText = cells[5].innerText;
            detailGravedad.innerText = cells[6].innerText.trim();
            fetch(`/api/alarmas/${id}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error("No API");
                })
                .then(alarma => {
                    detailFecha.innerText = formatDateTime(alarma.fechaHora);
                    detailGravedad.innerText = alarma.gravedad === "CRITICA" ? "Crítica" : "Advertencia";
                    if (alarma.notas) {
                        detailNotas.innerText = alarma.notas;
                    }
                })
                .catch(() => {
                    detailNotas.innerText = "Detalles de notas del servidor no disponibles.";
                });
        }
    }
}
function resolverAlarma(id, notas) {
    const resolveModal = document.getElementById('resolveModal');
    const formData = new FormData();
    formData.append('notas', notas);
    fetch(`/api/alarmas/resolver/${id}`, {
        method: 'POST',
        body: formData
    })
    .then(res => {
        if (res.ok) {
            closeModal(resolveModal);
        } else {
            alert('Error al resolver la alarma.');
        }
    })
    .catch(err => {
        console.error(err);
        alert('Error de conexión.');
    });
}
function connectWebSocket() {
    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') return;
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    stompClient.connect({}, function (frame) {
        stompClient.subscribe('/topic/alarmas', function (mensaje) {
            const alarma = JSON.parse(mensaje.body);
            handleIncomingAlarm(alarma);
        });
    }, function(error) {
        setTimeout(connectWebSocket, 5000); 
    });
}
function handleIncomingAlarm(alarma) {
    if (!alarma.resuelta) {
        showToast(alarma);
    }
    updateAlarmUI(alarma);
}
function showToast(alarma) {
    const container = document.getElementById('toastContainer');
    if (!container) return; 
    const toast = document.createElement('div');
    toast.className = `toast ${alarma.gravedad.toLowerCase()}`;
    const icon = alarma.gravedad === "CRITICA" ? "🚨" : "⚠️";
    const sensorName = alarma.sensor.replace('_', ' ');
    toast.innerHTML = `
        <div style="font-size: 20px;">${icon}</div>
        <div class="toast-content">
            <div class="toast-title">¡Nueva Alerta en ${alarma.estacionNombre}!</div>
            <div class="toast-message">El sensor de <strong style="text-transform: capitalize;">${sensorName}</strong> reportó <strong>${alarma.valor}</strong> (Umbral: ${alarma.umbralExcedido})</div>
        </div>
        <div class="toast-close">&times;</div>
    `;
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    });
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }
    }, 8000);
}
function getSensorSvg(sensor) {
    const s = sensor.toLowerCase();
    if (s.includes('temp')) return `<span style="color: #EF4444;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg></span>`;
    if (s.includes('hum') && !s.includes('suelo')) return `<span style="color: #3B82F6;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg></span>`;
    if (s.includes('suelo')) return `<span style="color: #84CC16;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M12 10a6 6 0 0 0-6 6c0 1.5.5 2.8 1.3 3.8l4.7-9.8z"/><path d="M12 10a6 6 0 0 1 6 6c0 1.5-.5 2.8-1.3 3.8l-4.7-9.8z"/><path d="M12 22a6 6 0 0 1-6-6"/></svg></span>`;
    if (s.includes('vien')) return `<span style="color: #8B5CF6;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg></span>`;
    if (s.includes('lluv')) return `<span style="color: #0EA5E9;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M20 16.2A6.5 6.5 0 0 0 17.5 4h-1.6A7.5 7.5 0 0 0 2 11.5c0 1.2.3 2.3.8 3.3"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg></span>`;
    if (s.includes('pres')) return `<span style="color: #10B981;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="m12 14 4-4"/><path d="M3.34 16A10 10 0 1 1 20.66 16"/><circle cx="12" cy="14" r="2"/></svg></span>`;
    return '';
}
function getUmbralHtml(umbralStr) {
    if (!umbralStr) return '';
    if (umbralStr.includes('>')) {
        const val = umbralStr.replace('>= ', '').replace('> ', '');
        return `<div class="umbral-pill umbral-up"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 19V5M5 12l7-7 7 7"/></svg><span>${val}</span></div>`;
    }
    if (umbralStr.includes('<')) {
        const val = umbralStr.replace('<= ', '').replace('< ', '');
        return `<div class="umbral-pill umbral-down"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 5v14M19 12l-7 7-7-7"/></svg><span>${val}</span></div>`;
    }
    return `<div class="umbral-pill umbral-up"><span>${umbralStr}</span></div>`;
}
function updateAlarmUI(alarma) {
    const activeTable = document.getElementById('activeAlarmsTable');
    const resolvedTable = document.getElementById('resolvedAlarmsTable');
    if (!activeTable) return; 
    removeEmptyRowPlaceholder(activeTable);
    removeEmptyRowPlaceholder(resolvedTable);
    if (alarma.resuelta) {
        const activeRow = document.querySelector(`.resolve-btn[data-id="${alarma.id}"]`)?.closest('tr');
        if (activeRow) {
            activeRow.remove();
            if(typeof updateBatchToolbar === 'function') updateBatchToolbar();
        }
        const newRow = document.createElement('tr');
        const sensorName = alarma.sensor.replace('_', ' ');
        const fechaResolucion = formatDateTime(alarma.fechaHoraResolucion);
        const sensorSvg = getSensorSvg(alarma.sensor);
        const umbralHtml = getUmbralHtml(alarma.umbralExcedido);
        newRow.innerHTML = `
            <td>${alarma.estacionNombre}</td>
            <td class="sensor-cell">
                <div style="display: flex; align-items: center; gap: 6px;">
                    ${sensorSvg}
                    <span style="text-transform: capitalize; font-weight: 500;">${sensorName}</span>
                </div>
            </td>
            <td style="font-weight: 600;">${alarma.valor}</td>
            <td>${umbralHtml}</td>
            <td class="time-cell" style="color: #64748B;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>${alarma.duracionMinutos} min</span>
                </div>
            </td>
            <td class="time-cell" style="color: #64748B;">
                <span>${fechaResolucion}</span>
            </td>
            <td><span class="badge badge-success">Resuelta</span></td>
        `;
        resolvedTable.insertBefore(newRow, resolvedTable.firstChild);
        actualizarTablaResueltasPaginada();
        actualizarTablaActivasPaginada();
        checkIfTableEmpty(activeTable, "No hay alarmas activas en este momento.");
    } else {
        const existingRow = document.querySelector(`.resolve-btn[data-id="${alarma.id}"]`)?.closest('tr');
        const sensorName = alarma.sensor.replace('_', ' ');
        const badgeClass = alarma.gravedad === "CRITICA" ? "badge-danger" : "badge-warning";
        const valClass = alarma.gravedad === "CRITICA" ? "text-danger" : "text-warning";
        const gravedadLabel = alarma.gravedad === "CRITICA" ? "Crítica" : "Advertencia";
        const fechaHora = formatTimeOnly(alarma.fechaHora);
        const isReconocida = alarma.reconocida;
        const sensorSvg = getSensorSvg(alarma.sensor);
        const umbralHtml = getUmbralHtml(alarma.umbralExcedido);
        const rowHTML = `
            <td style="text-align: center;"><input type="checkbox" class="row-checkbox" value="${alarma.id}"></td>
            <td>${alarma.estacionNombre}</td>
            <td class="sensor-cell">
                <div style="display: flex; align-items: center; gap: 6px;">
                    ${sensorSvg}
                    <span style="text-transform: capitalize; font-weight: 500;">${sensorName}</span>
                </div>
            </td>
            <td class="value-cell ${valClass}" style="font-weight: 600;">${alarma.valor}</td>
            <td>${umbralHtml}</td>
            <td class="time-cell" style="color: #64748B;">
                <div style="display: flex; align-items: center; gap: 4px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>${fechaHora}</span>
                </div>
            </td>
            <td><span class="badge ${badgeClass}">${gravedadLabel}</span></td>
            <td>
                <div class="action-buttons-group">
                    <button class="action-btn ack-btn" data-id="${alarma.id}" title="Reconocer Alarma" ${isReconocida ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M18 11V6a2 2 0 0 0-4 0v4"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V3a2 2 0 0 0-4 0v9"/><path d="M6 12v-1a2 2 0 0 0-4 0v5a11 11 0 0 0 11 11h2.5a8.5 8.5 0 0 0 8.5-8.5V14a2 2 0 0 0-4 0"/></svg>
                    </button>
                    <button class="action-btn view-btn" data-id="${alarma.id}" title="Ver Detalles">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="action-btn resolve-btn" data-id="${alarma.id}" title="Resolver Alarma">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </button>
                </div>
            </td>
        `;
        let wasChecked = false;
        if (existingRow) {
            const cb = existingRow.querySelector('.row-checkbox');
            if (cb && cb.checked) wasChecked = true;
            existingRow.innerHTML = rowHTML;
            if (wasChecked) existingRow.querySelector('.row-checkbox').checked = true;
            if (isReconocida) existingRow.classList.add('row-reconocida');
            else existingRow.classList.remove('row-reconocida');
        } else {
            const newRow = document.createElement('tr');
            newRow.setAttribute('data-row-id', alarma.id);
            if (isReconocida) newRow.classList.add('row-reconocida');
            newRow.innerHTML = rowHTML;
            activeTable.insertBefore(newRow, activeTable.firstChild);
            actualizarTablaActivasPaginada();
        }
    }
    fetchAlarmsCountAndSummaries();
}
function removeEmptyRowPlaceholder(table) {
    const emptyRow = table.querySelector('.empty-row');
    if (emptyRow) emptyRow.remove();
}
function checkIfTableEmpty(table, message) {
    if (table.children.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = "empty-row";
        emptyRow.innerHTML = `<td colspan="8">${message}</td>`;
        table.appendChild(emptyRow);
    }
}
function fetchAlarmsCountAndSummaries() {
    fetch('/alarmas') 
        .then(res => res.text())
        .then(htmlStr => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlStr, 'text/html');
            document.getElementById('headerAlarmCount').innerText = doc.getElementById('headerAlarmCount').innerText;
            document.getElementById('cardTotalCount').innerText = doc.getElementById('cardTotalCount').innerText;
            document.getElementById('cardActivasCount').innerText = doc.getElementById('cardActivasCount').innerText;
            document.getElementById('cardAdvertenciaCount').innerText = doc.getElementById('cardAdvertenciaCount').innerText;
            document.getElementById('cardResueltasCount').innerText = doc.getElementById('cardResueltasCount').innerText;
        })
        .catch(err => console.error("Error actualizando contadores:", err));
}
function formatDateTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}
function formatTimeOnly(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${min}:${ss}`;
}
const FILAS_POR_PAGINA = 10;
let paginaActualActivas = 1;
function inicializarPaginacionActivas() {
    const prevBtn = document.getElementById('activasPrevBtn');
    const nextBtn = document.getElementById('activasNextBtn');
    if (!prevBtn || !nextBtn) return;
    prevBtn.addEventListener('click', () => {
        if (paginaActualActivas > 1) {
            paginaActualActivas--;
            actualizarTablaActivasPaginada();
        }
    });
    nextBtn.addEventListener('click', () => {
        const table = document.getElementById('activeAlarmsTable');
        const totalFilas = table.querySelectorAll('tr:not(.empty-row)').length;
        const totalPaginas = Math.ceil(totalFilas / FILAS_POR_PAGINA) || 1;
        if (paginaActualActivas < totalPaginas) {
            paginaActualActivas++;
            actualizarTablaActivasPaginada();
        }
    });
    actualizarTablaActivasPaginada();
}
function actualizarTablaActivasPaginada() {
    const table = document.getElementById('activeAlarmsTable');
    if (!table) return;
    const filas = Array.from(table.querySelectorAll('tr:not(.empty-row)'));
    const totalFilas = filas.length;
    const totalPaginas = Math.ceil(totalFilas / FILAS_POR_PAGINA) || 1;
    if (paginaActualActivas > totalPaginas) paginaActualActivas = totalPaginas;
    if (paginaActualActivas < 1) paginaActualActivas = 1;
    const indiceInicio = (paginaActualActivas - 1) * FILAS_POR_PAGINA;
    const indiceFin = indiceInicio + FILAS_POR_PAGINA;
    filas.forEach((fila, index) => {
        fila.style.display = (index >= indiceInicio && index < indiceFin) ? '' : 'none';
    });
    const info = document.getElementById('activasPaginationInfo');
    if (info) {
        info.innerHTML = `Mostrando <strong>${totalFilas}</strong> alarmas activas — Página <strong>${paginaActualActivas}</strong> de <strong>${totalPaginas}</strong>`;
    }
    const pageNumSpan = document.getElementById('activasPageNum');
    if (pageNumSpan) pageNumSpan.textContent = paginaActualActivas;
    const prevBtn = document.getElementById('activasPrevBtn');
    const nextBtn = document.getElementById('activasNextBtn');
    if (prevBtn) prevBtn.disabled = paginaActualActivas === 1;
    if (nextBtn) nextBtn.disabled = paginaActualActivas === totalPaginas;
}
let paginaActualResueltas = 1;
function inicializarPaginacionResueltas() {
    const prevBtn = document.getElementById('resolvedPrevBtn');
    const nextBtn = document.getElementById('resolvedNextBtn');
    if (!prevBtn || !nextBtn) return;
    prevBtn.addEventListener('click', () => {
        if (paginaActualResueltas > 1) {
            paginaActualResueltas--;
            actualizarTablaResueltasPaginada();
        }
    });
    nextBtn.addEventListener('click', () => {
        const table = document.getElementById('resolvedAlarmsTable');
        const totalFilas = table.querySelectorAll('tr:not(.empty-row)').length;
        const totalPaginas = Math.ceil(totalFilas / FILAS_POR_PAGINA) || 1;
        if (paginaActualResueltas < totalPaginas) {
            paginaActualResueltas++;
            actualizarTablaResueltasPaginada();
        }
    });
    actualizarTablaResueltasPaginada();
}
function actualizarTablaResueltasPaginada() {
    const table = document.getElementById('resolvedAlarmsTable');
    if (!table) return;
    const filas = Array.from(table.querySelectorAll('tr:not(.empty-row)'));
    const totalFilas = filas.length;
    const totalPaginas = Math.ceil(totalFilas / FILAS_POR_PAGINA) || 1;
    if (paginaActualResueltas > totalPaginas) {
        paginaActualResueltas = totalPaginas;
    }
    if (paginaActualResueltas < 1) {
        paginaActualResueltas = 1;
    }
    const indiceInicio = (paginaActualResueltas - 1) * FILAS_POR_PAGINA;
    const indiceFin = indiceInicio + FILAS_POR_PAGINA;
    filas.forEach((fila, index) => {
        if (index >= indiceInicio && index < indiceFin) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
    const info = document.getElementById('resolvedPaginationInfo');
    if (info) {
        info.innerHTML = `Mostrando <strong>${totalFilas}</strong> alarmas resueltas — Página <strong>${paginaActualResueltas}</strong> de <strong>${totalPaginas}</strong>`;
    }
    const pageNumSpan = document.getElementById('resolvedPageNum');
    if (pageNumSpan) {
        pageNumSpan.textContent = paginaActualResueltas;
    }
    const prevBtn = document.getElementById('resolvedPrevBtn');
    const nextBtn = document.getElementById('resolvedNextBtn');
    if (prevBtn) prevBtn.disabled = paginaActualResueltas === 1;
    if (nextBtn) nextBtn.disabled = paginaActualResueltas === totalPaginas;
}
function initBatchActions() {
    const selectAllBtn = document.getElementById('selectAllActivas');
    if(!selectAllBtn) return;
    document.getElementById('activeAlarmsTable').addEventListener('change', (e) => {
        if(e.target.classList.contains('row-checkbox')) {
            updateBatchToolbar();
        }
    });
    selectAllBtn.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.row-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
        updateBatchToolbar();
    });
    document.getElementById('btnBatchAck').addEventListener('click', () => {
        const ids = getSelectedIds();
        if(ids.length === 0) return;
        fetch('/api/alarmas/lote/reconocer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids)
        }).then(res => {
            if(res.ok) { clearSelection(); }
        });
    });
    document.getElementById('btnBatchResolve').addEventListener('click', () => {
        const ids = getSelectedIds();
        if(ids.length === 0) return;
        fetch('/api/alarmas/lote/resolver', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ids)
        }).then(res => {
            if(res.ok) { clearSelection(); }
        });
    });
}
function getSelectedIds() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}
function updateBatchToolbar() {
    const ids = getSelectedIds();
    const batchToolbar = document.getElementById('batchToolbar');
    const selectedCountSpan = document.getElementById('selectedCount');
    const selectAllBtn = document.getElementById('selectAllActivas');
    const allCheckboxes = document.querySelectorAll('.row-checkbox');
    if(ids.length > 0) {
        selectedCountSpan.innerText = ids.length;
        batchToolbar.classList.remove('hidden');
    } else {
        batchToolbar.classList.add('hidden');
    }
    if(selectAllBtn && allCheckboxes.length > 0) {
        selectAllBtn.checked = ids.length === allCheckboxes.length;
    }
}
function clearSelection() {
    const selectAllBtn = document.getElementById('selectAllActivas');
    if(selectAllBtn) selectAllBtn.checked = false;
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
    updateBatchToolbar();
}
function initHistoryFilters() {
    const btnApply = document.getElementById('btnApplyFilters');
    if(!btnApply) return;
    btnApply.addEventListener('click', () => {
        const sensor = document.getElementById('filterSensor').value;
        const gravedad = document.getElementById('filterGravedad').value;
        const fechaInicio = document.getElementById('filterFechaInicio').value;
        const fechaFin = document.getElementById('filterFechaFin').value;
        const params = new URLSearchParams();
        if (sensor !== 'todos') params.append('sensor', sensor);
        if (gravedad !== 'todas') params.append('gravedad', gravedad);
        if (fechaInicio) params.append('fechaInicio', fechaInicio);
        if (fechaFin) params.append('fechaFin', fechaFin);
        fetch(`/api/alarmas/historial/filtrar?${params.toString()}`)
            .then(res => res.json())
            .then(alarmas => {
                const table = document.getElementById('resolvedAlarmsTable');
                table.innerHTML = '';
                if(alarmas.length === 0) {
                    table.innerHTML = '<tr class="empty-row"><td colspan="7">No se encontraron resultados para los filtros.</td></tr>';
                } else {
                    alarmas.forEach(alarma => {
                        const tr = document.createElement('tr');
                        const sensorName = alarma.sensor.replace('_', ' ');
                        const fechaResolucion = formatDateTime(alarma.fechaHoraResolucion);
                        tr.innerHTML = `
                            <td>${alarma.estacionNombre}</td>
                            <td style="text-transform: capitalize;">${sensorName}</td>
                            <td>${alarma.valor}</td>
                            <td>${alarma.umbralExcedido}</td>
                            <td>${alarma.duracionMinutos} min</td>
                            <td>${fechaResolucion}</td>
                            <td><span class="badge badge-success">Resuelta</span></td>
                        `;
                        table.appendChild(tr);
                    });
                }
                paginaActualResueltas = 1;
                actualizarTablaResueltasPaginada();
            });
    });
}
