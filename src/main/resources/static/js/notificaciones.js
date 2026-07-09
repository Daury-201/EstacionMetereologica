document.addEventListener('DOMContentLoaded', () => {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    if (!window.location.pathname.includes('/alarmas')) {
        connectNotificationWebSocket();
    }
});
function connectNotificationWebSocket() {
    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') return;
    const socket = new SockJS('/ws');
    const stompClient = Stomp.over(socket);
    stompClient.debug = null;
    stompClient.connect({}, function (frame) {
        stompClient.subscribe('/topic/alarmas', function (mensaje) {
            const alarma = JSON.parse(mensaje.body);
            if (!alarma.resuelta) {
                showGlobalToast(alarma);
                incrementGlobalAlarmBadge();
            } else {
                decrementGlobalAlarmBadge();
            }
        });
    }, function(error) {
        setTimeout(connectNotificationWebSocket, 5000);
    });
}
function showGlobalToast(alarma) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${alarma.gravedad.toLowerCase()}`;
    const icon = alarma.gravedad === "CRITICA" ? "🚨" : "⚠️";
    const sensorName = alarma.sensor.replace('_', ' ');
    toast.innerHTML = `
        <div style="font-size: 20px; margin-right: 8px;">${icon}</div>
        <div class="toast-content" style="flex: 1;">
            <div class="toast-title" style="font-weight: 700; font-size: 13px; margin-bottom: 2px;">¡Alerta en ${alarma.estacionNombre}!</div>
            <div class="toast-message" style="font-size: 12px; color: #4B5563;">
                Sensor <span style="text-transform: capitalize;">${sensorName}</span>: <strong>${alarma.valor}</strong> (${alarma.umbralExcedido})
            </div>
        </div>
        <div class="toast-close" style="cursor: pointer; font-size: 16px; margin-left: 8px; font-weight: bold; line-height: 1;">&times;</div>
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
function incrementGlobalAlarmBadge() {
    const badge = document.getElementById('headerAlarmCount');
    const dot = document.getElementById('globalAlarmBadge') || document.querySelector('.notification-dot');
    if (badge) {
        let count = parseInt(badge.textContent) || 0;
        badge.textContent = count + 1;
        badge.style.display = 'block';
    }
    if (dot) {
        let count = parseInt(dot.textContent) || 0;
        dot.textContent = count + 1;
        dot.style.display = 'flex';
    }
}
function decrementGlobalAlarmBadge() {
    const badge = document.getElementById('headerAlarmCount');
    const dot = document.getElementById('globalAlarmBadge') || document.querySelector('.notification-dot');
    if (badge) {
        let count = parseInt(badge.textContent) || 0;
        if (count > 0) {
            badge.textContent = count - 1;
        }
    }
    if (dot) {
        let count = parseInt(dot.textContent) || 0;
        if (count > 0) {
            dot.textContent = count - 1;
        }
    }
}

function cargarAlarmasDropdown() {
    const container = document.getElementById('alarms-dropdown-items');
    const activeCountBadge = document.getElementById('dropdownActiveCount');
    if (!container) return;
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6B7280; font-size: 13px;">Cargando alarmas...</div>';
    fetch('/api/alarmas/activas')
        .then(res => res.json())
        .then(alarmas => {
            if (activeCountBadge) {
                activeCountBadge.textContent = `${alarmas.length} Activas`;
            }
            updateBadgesLocally(alarmas.length);
            container.innerHTML = '';
            if (alarmas.length === 0) {
                container.innerHTML = '<div style="padding: 30px 20px; text-align: center; color: #9CA3AF; font-size: 13px;">✨ No hay alarmas activas en este momento.</div>';
                return;
            }
            alarmas.forEach(alarma => {
                const sensorName = alarma.sensor.replace('_', ' ');
                const icon = alarma.gravedad === 'CRITICA' ? '🚨' : '⚠️';
                const statusClass = alarma.gravedad === 'CRITICA' ? 'status-offline' : 'status-online';
                const gravedadLabel = alarma.gravedad === 'CRITICA' ? 'Crítica' : 'Advertencia';
                const itemHTML = `
                    <div class="summary-item" style="cursor: pointer; padding: 12px 16px; border-bottom: 1px solid #F3F4F6; display: flex; justify-content: space-between; align-items: center; gap: 8px;" onclick="window.location.href='/alarmas'">
                        <div class="summary-info" style="text-align: left; flex: 1;">
                            <h4 style="margin: 0; font-size: 13px; font-weight: 600; color: #111827; text-transform: capitalize; display: flex; align-items: center; gap: 6px;">
                                <span>${icon}</span> ${sensorName}
                            </h4>
                            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 500; color: #374151;">Valor: ${alarma.valor} (${alarma.umbralExcedido})</p>
                            <p style="margin: 2px 0 0 0; font-size: 10px; color: #9CA3AF;">${alarma.estacionNombre}</p>
                        </div>
                        <div class="summary-status ${statusClass}" style="padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; flex-shrink: 0;">
                            ${gravedadLabel}
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', itemHTML);
            });
        })
        .catch(err => {
            console.error(err);
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #EF4444; font-size: 13px;">Error al cargar alarmas.</div>';
        });
}
function updateBadgesLocally(count) {
    const badge = document.getElementById('headerAlarmCount');
    const dot = document.getElementById('globalAlarmBadge') || document.querySelector('.notification-dot');
    if (badge) badge.textContent = count;
    if (dot) dot.textContent = count;
}
function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    const logoIcon = document.querySelector('.logo-icon');
    if (toggleBtn && sidebar) {
        const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
        }
        const doToggle = () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
            let start = Date.now();
            let resizeTimer = setInterval(() => {
                window.dispatchEvent(new Event('resize'));
                if (window.map) window.map.resize();
                if (Date.now() - start > 400) {
                    clearInterval(resizeTimer);
                    window.dispatchEvent(new Event('resize')); 
                    if (window.map) window.map.resize();
                }
            }, 15);
        };
        toggleBtn.addEventListener('click', doToggle);
        if (logoIcon) {
            logoIcon.addEventListener('click', () => {
                if (sidebar.classList.contains('collapsed')) {
                    doToggle();
                }
            });
        }
    }
}
initSidebarToggle();
