document.addEventListener('DOMContentLoaded', () => {
    const readonlyThresholdsList = document.getElementById('readonlyThresholdsList');
    const estacionSelector = document.getElementById('estacionSelector');
    const btnOpenConfigModal = document.getElementById('btnOpenConfigModal');
    const configModal = document.getElementById('configThresholdsModal');
    const btnCloseConfigModal = document.getElementById('btnCloseConfigModal');
    const btnCancelConfig = document.getElementById('btnCancelConfig');
    
    // Custom Delete Modal Elements
    const deleteThresholdModal = document.getElementById('deleteThresholdModal');
    const closeDeleteThresholdModal = document.getElementById('closeDeleteThresholdModal');
    const btnCancelDeleteThreshold = document.getElementById('btnCancelDeleteThreshold');
    const btnConfirmDeleteThreshold = document.getElementById('btnConfirmDeleteThreshold');
    
    let lastEmptyWarningTime = 0;
    
    // Modal logic
    function closeDeleteModal() {
        if (deleteThresholdModal) deleteThresholdModal.style.display = 'none';
    }
    
    if (closeDeleteThresholdModal) closeDeleteThresholdModal.addEventListener('click', closeDeleteModal);
    if (btnCancelDeleteThreshold) btnCancelDeleteThreshold.addEventListener('click', closeDeleteModal);
    const radioApplyGlobal = document.querySelector('input[name="applyTarget"][value="global"]');
    const radioApplySpecific = document.querySelector('input[name="applyTarget"][value="specific"]');
    const multiStationSelectWrapper = document.getElementById('multiStationSelectWrapper');
    const scopeHint = document.querySelector('.th-scope-hint');
    const thresholdAjaxForm = document.getElementById('thresholdAjaxForm');
    const dynamicFormSensors = document.getElementById('dynamicFormSensors');
    const sensoresDef = [
        { id: 'temperatura', label: 'Temperatura (°C)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" style="vertical-align: text-bottom; margin-right: 4px; color: #EF4444;"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>', hasMin: true, hasMax: true },
        { id: 'humedad_aire', label: 'Humedad del Aire (%)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" style="vertical-align: text-bottom; margin-right: 4px; color: #3B82F6;"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>', hasMin: true, hasMax: true },
        { id: 'velocidad_viento', label: 'Velocidad Viento (km/h)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" style="vertical-align: text-bottom; margin-right: 4px; color: #8B5CF6;"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>', hasMin: true, hasMax: true },
        { id: 'lluvia', label: 'Precipitación (mm)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" style="vertical-align: text-bottom; margin-right: 4px; color: #0EA5E9;"><path d="M20 16.2A6.5 6.5 0 0 0 17.5 4h-1.6A7.5 7.5 0 0 0 2 11.5c0 1.2.3 2.3.8 3.3"/><path d="M16 14v6"/><path d="M8 14v6"/><path d="M12 16v6"/></svg>', hasMin: true, hasMax: true },
        { id: 'presion', label: 'Presión Atmosférica (hPa)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" style="vertical-align: text-bottom; margin-right: 4px; color: #10B981;"><path d="m12 14 4-4"/><path d="M3.34 16A10 10 0 1 1 20.66 16"/><circle cx="12" cy="14" r="2"/></svg>', hasMin: true, hasMax: true },
        { id: 'humedad_suelo', label: 'Humedad Suelo (%)', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" style="vertical-align: text-bottom; margin-right: 4px; color: #84CC16;"><path d="M12 10a6 6 0 0 0-6 6c0 1.5.5 2.8 1.3 3.8l4.7-9.8z"/><path d="M12 10a6 6 0 0 1 6 6c0 1.5-.5 2.8-1.3 3.8l-4.7-9.8z"/><path d="M12 22a6 6 0 0 1-6-6"/></svg>', hasMin: true, hasMax: true }
    ];
    function loadReadonlyThresholds(estacionId) {
        readonlyThresholdsList.style.opacity = '0';
        let url = '/api/alarmas/umbrales';
        if (estacionId && estacionId !== "") {
            url += '?estacionId=' + estacionId;
        }
        setTimeout(() => {
            fetch(url)
                .then(res => res.json())
                .then(umbrales => {
                    renderReadonlyThresholds(umbrales);
                })
                .catch(err => {
                    console.error("Error al cargar umbrales", err);
                    readonlyThresholdsList.innerHTML = `<div style="color: #EF4444; text-align:center; padding: 20px;">Error al cargar datos</div>`;
                })
                .finally(() => {
                    readonlyThresholdsList.style.opacity = '1';
                });
        }, 300);
    }
    function renderReadonlyThresholds(umbrales) {
        if (!umbrales || umbrales.length === 0) {
            readonlyThresholdsList.innerHTML = `<div style="color: #6B7280; font-size: 13px; text-align: center; padding: 20px;">No hay umbrales configurados.</div>`;
            return;
        }
        let html = '';
        sensoresDef.forEach(sensor => {
            const umbralSensor = umbrales.find(u => u.sensor === sensor.id);
            if (umbralSensor) {
                html += `
                    <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px;">
                        <div style="font-size: 13px; font-weight: 600; color: #111827; margin-bottom: 8px;">
                            ${sensor.icon} ${sensor.label}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #4B5563;">
                `;
                if (sensor.hasMin) {
                    html += `
                        <div style="background: #FFF5F5; padding: 6px 8px; border-radius: 6px; border: 1px solid #FECACA;">
                            <span style="display: block; font-size: 10px; color: #DC2626; text-transform: uppercase; font-weight: 700;">Min Crítico</span>
                            <span style="font-weight: 700; color: #991B1B;">${umbralSensor.critMinValor !== null ? umbralSensor.critMinValor : '--'}</span>
                        </div>
                        <div style="background: #FFFBEB; padding: 6px 8px; border-radius: 6px; border: 1px solid #FDE68A;">
                            <span style="display: block; font-size: 10px; color: #D97706; text-transform: uppercase; font-weight: 700;">Min Advertencia</span>
                            <span style="font-weight: 700; color: #92400E;">${umbralSensor.advMinValor !== null ? umbralSensor.advMinValor : '--'}</span>
                        </div>
                    `;
                }
                if (sensor.hasMax) {
                    html += `
                        <div style="background: #FFFBEB; padding: 6px 8px; border-radius: 6px; border: 1px solid #FDE68A;">
                            <span style="display: block; font-size: 10px; color: #D97706; text-transform: uppercase; font-weight: 700;">Max Advertencia</span>
                            <span style="font-weight: 700; color: #92400E;">${umbralSensor.advMaxValor !== null ? umbralSensor.advMaxValor : '--'}</span>
                        </div>
                        <div style="background: #FFF5F5; padding: 6px 8px; border-radius: 6px; border: 1px solid #FECACA;">
                            <span style="display: block; font-size: 10px; color: #DC2626; text-transform: uppercase; font-weight: 700;">Max Crítico</span>
                            <span style="font-weight: 700; color: #991B1B;">${umbralSensor.critMaxValor !== null ? umbralSensor.critMaxValor : '--'}</span>
                        </div>
                    `;
                }
                html += `</div></div>`;
            }
        });
        readonlyThresholdsList.innerHTML = html;
    }
    if (estacionSelector) {
        estacionSelector.addEventListener('change', (e) => {
            loadReadonlyThresholds(e.target.value);
        });
        loadReadonlyThresholds(estacionSelector.value);
    }
    function renderFormSensors(umbralesValues = []) {
        let html = '';
        sensoresDef.forEach(sensor => {
            const u = umbralesValues.find(umb => umb.sensor === sensor.id) || {};
            html += `
                <div class="th-sensor-card" data-sensor="${sensor.id}">
                    <div class="th-sensor-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="th-sensor-icon">${sensor.icon}</div>
                            <span>${sensor.label}</span>
                        </div>
                        <button type="button" class="btn-delete-threshold" data-sensor="${sensor.id}" style="background: none; border: none; color: #EF4444; cursor: pointer; padding: 4px; border-radius: 4px;" title="Borrar umbrales para ${sensor.label}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                        </button>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            `;
            if (sensor.hasMin) {
                html += `
                    <div class="th-input-group th-input-crit">
                        <label>Min Crítico</label>
                        <div class="th-input-wrapper">
                            <input type="number" step="0.1" name="${sensor.id}_critMinValor" value="${u.critMinValor !== undefined && u.critMinValor !== null ? u.critMinValor : ''}" placeholder="--">
                        </div>
                    </div>
                    <div class="th-input-group th-input-adv">
                        <label>Min Advertencia</label>
                        <div class="th-input-wrapper">
                            <input type="number" step="0.1" name="${sensor.id}_advMinValor" value="${u.advMinValor !== undefined && u.advMinValor !== null ? u.advMinValor : ''}" placeholder="--">
                        </div>
                    </div>
                `;
            }
            if (sensor.hasMax) {
                html += `
                    <div class="th-input-group th-input-adv">
                        <label>Max Advertencia</label>
                        <div class="th-input-wrapper">
                            <input type="number" step="0.1" name="${sensor.id}_advMaxValor" value="${u.advMaxValor !== undefined && u.advMaxValor !== null ? u.advMaxValor : ''}" placeholder="--">
                        </div>
                    </div>
                    <div class="th-input-group th-input-crit">
                        <label>Max Crítico</label>
                        <div class="th-input-wrapper">
                            <input type="number" step="0.1" name="${sensor.id}_critMaxValor" value="${u.critMaxValor !== undefined && u.critMaxValor !== null ? u.critMaxValor : ''}" placeholder="--">
                        </div>
                    </div>
                `;
            }
            html += `</div></div>`;
        });
        dynamicFormSensors.innerHTML = html;
        
        // Attach delete event listeners
        dynamicFormSensors.querySelectorAll('.btn-delete-threshold').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const sensorId = btn.getAttribute('data-sensor');
                
                let targets = [];
                if (radioApplyGlobal.checked) {
                    targets.push(null); 
                } else {
                    const checkedBoxes = document.querySelectorAll('.th-station-check:checked');
                    if (checkedBoxes.length === 0) {
                        if (window.Utils) Utils.showToast("Debes seleccionar al menos una estación.", "error");
                        else alert("Debes seleccionar al menos una estación.");
                        return;
                    }
                    checkedBoxes.forEach(chk => targets.push(parseInt(chk.value)));
                }

                let isEmpty = true;
                const card = btn.closest('.th-sensor-card');
                if (card) {
                    const inputs = card.querySelectorAll('input[type="number"]');
                    inputs.forEach(inp => {
                        if (inp.value.trim() !== '') {
                            isEmpty = false;
                        }
                    });
                }

                if (isEmpty) {
                    const now = Date.now();
                    if (now - lastEmptyWarningTime > 5000) {
                        lastEmptyWarningTime = now;
                        if (window.Utils) {
                            Utils.showToast("No hay umbrales configurados para este sensor", "warning");
                        } else {
                            alert("No hay umbrales configurados para este sensor");
                        }
                    }
                    return; // Stop deletion process
                }

                if (deleteThresholdModal) {
                    deleteThresholdModal.style.display = 'flex';
                    
                    // Remove any existing listeners to avoid multiple triggers
                    const newConfirmBtn = btnConfirmDeleteThreshold.cloneNode(true);
                    btnConfirmDeleteThreshold.parentNode.replaceChild(newConfirmBtn, btnConfirmDeleteThreshold);
                    
                    newConfirmBtn.addEventListener('click', () => {
                        closeDeleteModal();
                        ejecutarBorradoUmbral(targets, sensorId);
                    });
                } else {
                    if(confirm("¿Estás seguro de que quieres borrar los umbrales de este sensor?")) {
                        ejecutarBorradoUmbral(targets, sensorId);
                    }
                }
            });
        });
    }
    
    function ejecutarBorradoUmbral(targets, sensorId) {
        Promise.all(targets.map(estId => {
            let url = `/api/alarmas/umbrales/${sensorId}`;
            if (estId !== null) {
                url += `?estacionId=${estId}`;
            }
            return fetch(url, { method: 'DELETE' });
        }))
        .then(() => {
            if (window.Utils) Utils.showToast("Umbrales borrados", "success");
            openConfigModal();
            loadReadonlyThresholds(estacionSelector.value);
        })
        .catch(err => console.error("Error al borrar", err));
    }
    function openConfigModal() {
        const currentEstacionId = estacionSelector.value;
        let url = '/api/alarmas/umbrales';
        if (currentEstacionId && currentEstacionId !== "") {
            url += '?estacionId=' + currentEstacionId;
        }
        if (currentEstacionId === "") {
            radioApplyGlobal.checked = true;
            multiStationSelectWrapper.style.display = 'none';
            if (scopeHint) scopeHint.textContent = 'Afecta a todas las estaciones registradas en el sistema';
        } else {
            radioApplySpecific.checked = true;
            multiStationSelectWrapper.style.display = 'block';
            document.querySelectorAll('.th-station-check').forEach(chk => {
                chk.checked = (chk.value === currentEstacionId);
            });
            if (scopeHint) scopeHint.textContent = 'Selecciona una o más estaciones abajo';
        }
        fetch(url)
            .then(res => res.json())
            .then(umbrales => {
                renderFormSensors(umbrales);
                configModal.classList.add('active');
            });
    }
    function closeConfigModal() {
        configModal.classList.remove('active');
    }
    radioApplyGlobal.addEventListener('change', () => {
        if (radioApplyGlobal.checked) {
            multiStationSelectWrapper.style.display = 'none';
            if (scopeHint) scopeHint.textContent = 'Afecta a todas las estaciones registradas en el sistema';
        }
    });
    radioApplySpecific.addEventListener('change', () => {
        if (radioApplySpecific.checked) {
            multiStationSelectWrapper.style.display = 'block';
            if (scopeHint) scopeHint.textContent = 'Selecciona una o más estaciones abajo';
        }
    });
    if (btnOpenConfigModal) btnOpenConfigModal.addEventListener('click', openConfigModal);
    if (btnCloseConfigModal) btnCloseConfigModal.addEventListener('click', closeConfigModal);
    if (btnCancelConfig) btnCancelConfig.addEventListener('click', closeConfigModal);
    if (thresholdAjaxForm) {
        thresholdAjaxForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(thresholdAjaxForm);
            const sensoresBase = [];
            sensoresDef.forEach(s => {
                const critMinVal = formData.get(`${s.id}_critMinValor`);
                const critMaxVal = formData.get(`${s.id}_critMaxValor`);
                const advMinVal = formData.get(`${s.id}_advMinValor`);
                const advMaxVal = formData.get(`${s.id}_advMaxValor`);
                if ((critMinVal !== null && critMinVal !== "") || 
                    (critMaxVal !== null && critMaxVal !== "") ||
                    (advMinVal !== null && advMinVal !== "") ||
                    (advMaxVal !== null && advMaxVal !== "")) {
                    sensoresBase.push({
                        sensor: s.id,
                        critMinValor: (critMinVal !== null && critMinVal !== "") ? parseFloat(critMinVal) : null,
                        critMaxValor: (critMaxVal !== null && critMaxVal !== "") ? parseFloat(critMaxVal) : null,
                        advMinValor: (advMinVal !== null && advMinVal !== "") ? parseFloat(advMinVal) : null,
                        advMaxValor: (advMaxVal !== null && advMaxVal !== "") ? parseFloat(advMaxVal) : null
                    });
                }
            });
            let targets = [];
            if (radioApplyGlobal.checked) {
                targets.push(null); 
            } else {
                const checkedBoxes = document.querySelectorAll('.th-station-check:checked');
                if (checkedBoxes.length === 0) {
                    if (window.Utils) Utils.showToast("Debes seleccionar al menos una estación.", "error");
                    else alert("Debes seleccionar al menos una estación.");
                    return;
                }
                checkedBoxes.forEach(chk => {
                    targets.push(parseInt(chk.value));
                });
            }
            let payload = [];
            targets.forEach(estId => {
                sensoresBase.forEach(sb => {
                    payload.push({
                        estacionId: estId,
                        sensor: sb.sensor,
                        critMinValor: sb.critMinValor,
                        critMaxValor: sb.critMaxValor,
                        advMinValor: sb.advMinValor,
                        advMaxValor: sb.advMaxValor
                    });
                });
            });
            fetch('/api/alarmas/umbrales', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(res => {
                if (res.ok) {
                    if (window.Utils) Utils.showToast("Umbrales configurados exitosamente", "success");
                    closeConfigModal();
                    loadReadonlyThresholds(estacionSelector.value);
                } else {
                    if (window.Utils) Utils.showToast("Error al guardar umbrales", "error");
                }
            })
            .catch(err => {
                console.error(err);
                if (window.Utils) Utils.showToast("Error de conexión", "error");
            });
        });
    }
});
