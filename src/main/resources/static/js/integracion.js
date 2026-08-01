let allSyncLogs = []; 
let currentPage = 1;
const PAGE_SIZE = 10;
document.addEventListener('DOMContentLoaded', () => {
    recolectarLogsIniciales();
    renderizarTabla();
    inicializarChips();
    document.getElementById('integracionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarConfiguracion();
    });
    document.getElementById('toggle-activa').addEventListener('change', (e) => {
        document.getElementById('config-subtitle').innerText = `OpenWeatherMap ${e.target.checked ? 'activa' : 'inactiva'}`;
        guardarConfiguracion();
    });
    conectarWebSocket();
});
function recolectarLogsIniciales() {
    allSyncLogs = [];
    const rows = document.querySelectorAll('#syncTableBody tr:not(.empty-row)');
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
            allSyncLogs.push({
                fechaHora: cells[0].innerText,
                plataforma: cells[1].innerText,
                estacionNombre: cells[2].innerText,
                registrosEnviados: cells[3].innerText,
                estado: cells[4].querySelector('span')?.className.includes('badge-success') ? 'EXITOSO' : (cells[4].querySelector('span')?.className.includes('badge-warning') ? 'ADVERTENCIA' : 'ERROR'),
                mensaje: cells[5].innerText
            });
        }
    });
}
function renderizarTabla() {
    const tbody = document.getElementById('syncTableBody');
    const totalPages = Math.max(1, Math.ceil(allSyncLogs.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = allSyncLogs.slice(start, start + PAGE_SIZE);
    if (pageItems.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row" id="empty-logs-row">
                <td colspan="6" style="padding: 0;">
                    <div class="empty-state-modern">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line>
                            <line x1="12" y1="17" x2="12" y2="21"></line>
                            <polyline points="10 10 12 12 14 10"></polyline>
                            <line x1="12" y1="6" x2="12" y2="12"></line>
                        </svg>
                        <h4>Sin sincronizaciones</h4>
                        <p>Conecta al menos una plataforma y pulsa "Sincronizar ahora" para comenzar a recibir datos meteorológicos en tiempo real.</p>
                    </div>
                </td>
            </tr>`;
    } else {
        tbody.innerHTML = pageItems.map(log => {
            const esExitoso = log.estado === 'EXITOSO';
            const badgeClass = esExitoso ? 'badge-success' : (log.estado === 'ADVERTENCIA' ? 'badge-warning' : 'badge-danger');
            const badgeLabel = esExitoso ? 'Exitoso' : (log.estado === 'ADVERTENCIA' ? 'Advertencia' : 'Error');
            const msg = log.mensaje || '---';
            const animClass = log.isNew ? 'new-row-animation' : '';
            if (log.isNew) log.isNew = false; 
            return `<tr class="${animClass}">
                <td>${log.fechaHora}</td>
                <td>${log.plataforma}</td>
                <td>${log.estacionNombre}</td>
                <td>${log.registrosEnviados}</td>
                <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
                <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${msg}">${msg}</td>
            </tr>`;
        }).join('');
    }
    renderizarPaginacion(totalPages);
}
function renderizarPaginacion(totalPages) {
    let container = document.getElementById('syncPaginacion');
    if (!container) return;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    let html = `<div class="pagination-controls">`;
    html += `<button onclick="cambiarPagina(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="btn-page">‹ Anterior</button>`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button onclick="cambiarPagina(${i})" class="btn-page ${i === currentPage ? 'active' : ''}">${i}</button>`;
    }
    html += `<button onclick="cambiarPagina(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="btn-page">Siguiente ›</button>`;
    html += `</div>`;
    container.innerHTML = html;
}
function cambiarPagina(page) {
    const totalPages = Math.ceil(allSyncLogs.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderizarTabla();
}
function conectarWebSocket() {
    const socket = new SockJS('/ws');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    stompClient.connect({}, function () {
        stompClient.subscribe('/topic/integracion', function (message) {
            const data = JSON.parse(message.body);
            actualizarCardsDesdeWS(data);
            agregarLogDesdeWS(data);
        });
    }, function (error) {
        console.warn('WS Integración desconectado, reintentando en 5s...', error);
        setTimeout(conectarWebSocket, 5000);
    });
}
function actualizarCardsDesdeWS(data) {
    const cardConectadas = document.getElementById('card-plataformas-conectadas');
    if (cardConectadas) cardConectadas.innerText = data.plataformasConectadas;
    const cardSyncsHoy = document.getElementById('card-syncs-hoy');
    if (cardSyncsHoy) cardSyncsHoy.innerText = data.syncsHoy;
    const cardUltima = document.getElementById('card-ultima-sync');
    if (cardUltima && data.ultimaSincronizacion) {
        const dt = new Date(data.ultimaSincronizacion);
        cardUltima.innerText = dt.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
    }
    const cardStatusText = document.getElementById('card-sync-status');
    if (cardStatusText) {
        cardStatusText.innerText = data.estado === 'EXITOSO' ? 'Sincronización exitosa' : 'Error en sincronización';
    }
    const navBadge = document.getElementById('nav-last-sync');
    if (navBadge && data.ultimaSincronizacion) {
        const dt = new Date(data.ultimaSincronizacion);
        const fmt = dt.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                    ' ' + dt.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
        navBadge.innerText = `Última sincronización: ${fmt}`;
    }
}
function agregarLogDesdeWS(data) {
    let fechaFmt = data.fechaHora;
    try {
        const dt = new Date(data.fechaHora);
        fechaFmt = dt.toLocaleDateString('es-DO') + ' ' + dt.toLocaleTimeString('es-DO');
    } catch(e) {}
    allSyncLogs.unshift({
        fechaHora: fechaFmt,
        plataforma: data.plataforma,
        estacionNombre: data.estacionNombre,
        registrosEnviados: data.registrosEnviados,
        estado: data.estado,
        mensaje: data.mensaje || '---',
        isNew: true 
    });
    if (allSyncLogs.length > 100) allSyncLogs = allSyncLogs.slice(0, 100);
    currentPage = 1;
    renderizarTabla();
}
function selectPlatform(platformId, element) {
    document.querySelectorAll('.platform-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('plataformaSeleccionada').value = platformId;
    cargarEstadoPlataforma(platformId);
}
function cargarEstadoPlataforma(plataforma) {
    const names = {
        'openweathermap': 'OpenWeatherMap',
        'pucmm': 'Hub PUCMM'
    };
    fetch(`/api/integracion/estado/${plataforma}`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('intervalo').value = data.intervaloMin || '10';
            const intervalChips = document.querySelectorAll('.interval-chip');
            intervalChips.forEach(chip => {
                if (chip.getAttribute('data-value') === (data.intervaloMin ? data.intervaloMin.toString() : '10')) {
                    chip.classList.add('active');
                } else {
                    chip.classList.remove('active');
                }
            });
            document.getElementById('estacionesIds').value = data.estacionesIds || '';
            if (plataforma === 'openweathermap') {
                document.getElementById('webhookUrl').value = data.webhookUrl || 'https://api.openweathermap.org/data/2.5/weather';
                document.getElementById('webhookUrl').readOnly = true;
                const label = document.querySelector('label[for="webhookUrl"]');
                if(label) label.innerText = 'API Endpoint';
            } else if (plataforma === 'pucmm') {
                document.getElementById('webhookUrl').value = data.webhookUrl || 'https://itt363-hub.eict.ce.pucmm.edu.do/api/';
                document.getElementById('webhookUrl').readOnly = false;
                const label = document.querySelector('label[for="webhookUrl"]');
                if(label) label.innerText = 'URL Webhook';
            }
            document.getElementById('toggle-activa').checked = data.activa || false;
            inicializarChips();
            document.getElementById('config-subtitle').innerText = `${names[plataforma] || plataforma} ${data.activa ? 'activa' : 'inactiva'}`;
            actualizarBadgePlataforma(plataforma, data.activa);
            actualizarTopNavStatus(data.activa);
            const overlay = document.getElementById('config-overlay');
            if (data.activa) {
                overlay.style.display = 'none';
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
            } else {
                overlay.style.display = 'flex';
                overlay.style.opacity = '1';
                overlay.style.pointerEvents = 'auto';
            }
        })
        .catch(err => console.error("Error cargando estado:", err));
}
function guardarConfiguracion() {
    const data = {
        plataforma: document.getElementById('plataformaSeleccionada').value,
        intervaloMin: parseInt(document.getElementById('intervalo').value),
        estacionesIds: document.getElementById('estacionesIds').value,
        webhookUrl: document.getElementById('webhookUrl').value,
        token: '',
        activa: document.getElementById('toggle-activa').checked
    };
    const btn = document.getElementById('btn-save-config');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 6px; display: inline-block; vertical-align: middle;"></div> Guardando...';
    btn.disabled = true;
    fetch('/api/integracion/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            btn.style.backgroundColor = '#10B981';
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg> Guardado';
            actualizarBadgePlataforma(data.plataforma, data.activa);
            actualizarTopNavStatus(data.activa);
            
            // Salir del modo edición tras guardar exitosamente
            exitEditMode();
            
            const overlay = document.getElementById('config-overlay');
            if (data.activa) {
                overlay.style.opacity = '0';
                overlay.style.pointerEvents = 'none';
                setTimeout(() => overlay.style.display = 'none', 300);
            } else {
                overlay.style.display = 'flex';
                void overlay.offsetWidth;
                overlay.style.opacity = '1';
                overlay.style.pointerEvents = 'auto';
            }
        } else {
            mostrarToast('Error al guardar configuración', 'error');
            btn.innerHTML = originalText;
            btn.style.backgroundColor = 'var(--primary)';
        }
    })
    .catch(err => {
        mostrarToast('Error de red', 'error');
        btn.innerHTML = originalText;
        btn.style.backgroundColor = 'var(--primary)';
    })
    .finally(() => {
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            btn.style.backgroundColor = 'var(--primary)';
        }, 2500);
    });
}
function actualizarBadgePlataforma(plataforma, activa) {
    const badgeContainer = document.getElementById(`badge-${plataforma}`);
    if (!badgeContainer) return;
    if (activa) {
        badgeContainer.innerHTML = '<span class="status-badge bg-success"><div style="width:6px;height:6px;border-radius:50%;background:#10B981;"></div> Conectado</span>';
    } else {
        badgeContainer.innerHTML = '<span class="status-badge bg-gray">No conectado</span>';
    }
}
function actualizarTopNavStatus(activa) {
    const indicator = document.getElementById('nav-api-status');
    const text = document.getElementById('nav-api-status-text');
    if (indicator) {
        indicator.style.background = activa ? '#10B981' : '#EF4444';
        const parentBadge = indicator.parentElement;
        if (parentBadge) {
            if (activa) {
                parentBadge.classList.remove('badge-alarms');
                parentBadge.classList.add('badge-status');
            } else {
                parentBadge.classList.remove('badge-status');
                parentBadge.classList.add('badge-alarms');
            }
        }
    }
    if (text) text.innerText = activa ? 'Conectado' : 'Desconectado';
}
function mostrarToast(mensaje, tipo) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        background: ${tipo === 'success' ? '#10B981' : '#EF4444'};
        color: white; padding: 12px 20px; border-radius: 12px;
        font-size: 14px; font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    toast.innerText = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
function inicializarChips() {
    const hiddenInput = document.getElementById('estacionesIds');
    if (!hiddenInput) return;
    const selectedIds = hiddenInput.value ? hiddenInput.value.split(',') : [];
    document.querySelectorAll('.station-chip').forEach(chip => {
        const id = chip.getAttribute('data-id');
        if (selectedIds.includes(id)) {
            chip.classList.add('selected');
            chip.style.background = '#F3F4F6';
            chip.style.borderColor = '#8B5CF6';
            chip.style.color = '#8B5CF6';
            chip.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.15)';
            chip.querySelector('.chip-icon-unselected').style.display = 'none';
            chip.querySelector('.chip-icon-selected').style.display = 'block';
        } else {
            chip.classList.remove('selected');
            chip.style.background = '#FFFFFF';
            chip.style.borderColor = '#E5E7EB';
            chip.style.color = '#4B5563';
            chip.style.boxShadow = 'none';
            chip.querySelector('.chip-icon-unselected').style.display = 'block';
            chip.querySelector('.chip-icon-selected').style.display = 'none';
        }
    });
}
function toggleStationChip(chipElement) {
    const id = chipElement.getAttribute('data-id');
    const hiddenInput = document.getElementById('estacionesIds');
    let selectedIds = hiddenInput.value ? hiddenInput.value.split(',') : [];
    if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter(v => v !== id);
    } else {
        selectedIds.push(id);
    }
    hiddenInput.value = selectedIds.join(',');
    inicializarChips();
}
function testConnectionInteractive() {
    const btn = document.getElementById('btn-test-conn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #9CA3AF; border-top-color: #4B5563; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 6px; display: inline-block; vertical-align: middle;"></div> Probando...';
    btn.disabled = true;
    const terminal = document.getElementById('test-terminal');
    const output = document.getElementById('terminal-output');
    terminal.style.display = 'block';
    output.innerHTML = '';
    
    const plataforma = document.getElementById('plataformaSeleccionada').value;
    const webhookUrl = document.getElementById('webhookUrl').value;
    const token = '';

    const lines = [
        `> Inicializando test de conexión...`,
        `> Plataforma detectada: ${plataforma === 'pucmm' ? 'Hub PUCMM' : 'OpenWeatherMap'}`,
        `> Haciendo ping a ${plataforma === 'pucmm' ? webhookUrl : 'api.openweathermap.org'}...`,
    ];
    let delay = 0;
    lines.forEach((line) => {
        setTimeout(() => {
            const div = document.createElement('div');
            div.textContent = line;
            output.appendChild(div);
        }, delay);
        delay += 300; 
    });
    setTimeout(() => {
        fetch('/api/integracion/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                plataforma: plataforma,
                webhookUrl: webhookUrl,
                token: token,
                apiKey: 'dummy'
            })
        })
        .then(res => res.json())
        .then(data => {
            const resultDiv = document.createElement('div');
            if (data.success) {
                resultDiv.innerHTML = `> <span style="color: #22C55E; font-weight: bold;">Autenticando... [Éxito - 200 OK]</span>`;
                resultDiv.innerHTML += `<br>> <span style="color: #22C55E;">Conexión establecida correctamente.</span>`;
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" width="16" height="16" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg> Conexión Exitosa';
                btn.style.color = '#10B981';
                btn.style.backgroundColor = '#ECFDF5';
                btn.style.borderColor = '#10B981';
            } else {
                resultDiv.innerHTML = `> <span style="color: #EF4444; font-weight: bold;">[Error]</span> Autenticación fallida o endpoint inalcanzable.`;
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" width="16" height="16" style="margin-right: 6px; display: inline-block; vertical-align: middle;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> Falló la Conexión';
                btn.style.color = '#EF4444';
                btn.style.backgroundColor = '#FEF2F2';
                btn.style.borderColor = '#EF4444';
            }
            output.appendChild(resultDiv);
        })
        .catch(err => {
            const errDiv = document.createElement('div');
            errDiv.innerHTML = `> <span style="color: #EF4444; font-weight: bold;">Error de red. No se pudo alcanzar el servidor.</span>`;
            output.appendChild(errDiv);
            btn.innerHTML = originalText;
        })
        .finally(() => {
            btn.disabled = false;
            setTimeout(() => {
                terminal.style.display = 'none';
                if(btn.innerHTML !== originalText) {
                    btn.innerHTML = originalText;
                    btn.style = 'flex: 1; justify-content: center; padding: 12px 16px; border-radius: 8px; font-weight: 600; background-color: #F3F4F6; color: #4B5563; border: 1px solid #E5E7EB; font-size: 14px; transition: all 0.2s;';
                }
            }, 4000);
        });
    }, delay);
}
function forceSync() {
    const plataforma = document.getElementById('plataformaSeleccionada').value;
    const btn = document.getElementById('btn-sync-now');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div style="width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 6px;"></div> Sincronizando...';
    btn.disabled = true;
    fetch('/api/integracion/sync-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plataforma: plataforma })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            mostrarToast('Sincronización manual enviada al servidor', 'success');
        } else {
            mostrarToast(data.message || 'Error forzando sincronización', 'error');
        }
    })
    .catch(err => {
        mostrarToast('Error de red', 'error');
    })
    .finally(() => {
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 2000);
    });
}
function togglePasswordVisibility(inputId, btnElement) {
    const input = document.getElementById(inputId);
    const svgIcon = btnElement.querySelector('svg');
    if (input.type === 'password') {
        input.type = 'text';
        svgIcon.innerHTML = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>`;
    } else {
        input.type = 'password';
        svgIcon.innerHTML = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>`;
    }
}
function copyToClipboard(inputId, btnElement) {
    const input = document.getElementById(inputId);
    input.select();
    input.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(input.value);
    const svgIcon = btnElement.querySelector('svg');
    const originalHTML = svgIcon.innerHTML;
    svgIcon.innerHTML = `<polyline points="20 6 9 17 4 12"></polyline>`;
    svgIcon.style.color = '#10B981';
    setTimeout(() => {
        svgIcon.innerHTML = originalHTML;
        svgIcon.style.color = '';
    }, 2000);
}
function toggleSelectAllStations() {
    const hiddenInput = document.getElementById('estacionesIds');
    const chips = document.querySelectorAll('.station-chip');
    let allSelected = true;
    chips.forEach(chip => {
        if (!chip.classList.contains('selected')) {
            allSelected = false;
        }
    });
    let selectedIds = [];
    if (!allSelected) {
        chips.forEach(chip => {
            selectedIds.push(chip.getAttribute('data-id'));
        });
    }
    hiddenInput.value = selectedIds.join(',');
    inicializarChips();
}
function selectInterval(chipElement) {
    const chips = document.querySelectorAll('.interval-chip');
    chips.forEach(chip => chip.classList.remove('active'));
    chipElement.classList.add('active');
    const hiddenInput = document.getElementById('intervalo');
    hiddenInput.value = chipElement.getAttribute('data-value');
}

function enableEditMode() {
    const editableArea = document.getElementById('config-editable-area');
    if (editableArea) {
        editableArea.style.pointerEvents = 'auto';
        editableArea.style.opacity = '1';
    }
    const btnEdit = document.getElementById('btn-edit-config');
    if (btnEdit) btnEdit.style.display = 'none';
    const editActions = document.getElementById('edit-actions');
    if (editActions) editActions.style.display = 'flex';
    const btnTest = document.getElementById('btn-test-conn');
    if (btnTest) btnTest.style.display = 'none';
}

function exitEditMode() {
    const editableArea = document.getElementById('config-editable-area');
    if (editableArea) {
        editableArea.style.pointerEvents = 'none';
        editableArea.style.opacity = '0.7';
    }
    const btnEdit = document.getElementById('btn-edit-config');
    if (btnEdit) btnEdit.style.display = 'flex';
    const editActions = document.getElementById('edit-actions');
    if (editActions) editActions.style.display = 'none';
    const btnTest = document.getElementById('btn-test-conn');
    if (btnTest) btnTest.style.display = 'flex';
}

function cancelEditMode() {
    // Restaurar el formulario a sus valores por defecto (carga inicial)
    const form = document.getElementById('integracionForm');
    if (form) form.reset();
    
    // Restaurar UI de chips de intervalo basado en el input oculto restaurado
    const hiddenIntervalo = document.getElementById('intervalo');
    if (hiddenIntervalo) {
        const chips = document.querySelectorAll('.interval-chip');
        chips.forEach(chip => {
            if (chip.getAttribute('data-value') === hiddenIntervalo.value) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    // Restaurar UI de estaciones vinculadas
    inicializarChips();

    // Restaurar los botones y opacidad
    const editableArea = document.getElementById('config-editable-area');
    if (editableArea) {
        editableArea.style.pointerEvents = 'none';
        editableArea.style.opacity = '0.7';
    }
    const btnEdit = document.getElementById('btn-edit-config');
    if (btnEdit) btnEdit.style.display = 'flex';
    const editActions = document.getElementById('edit-actions');
    if (editActions) editActions.style.display = 'none';
    const btnTest = document.getElementById('btn-test-conn');
    if (btnTest) btnTest.style.display = 'flex';
}
