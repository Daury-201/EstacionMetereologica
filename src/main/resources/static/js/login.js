document.addEventListener("DOMContentLoaded", function() {
    const dots = document.querySelectorAll('.dot');
    const slides = document.querySelectorAll('.slide');
    const loginLeft = document.querySelector('.login-left');
    let currentSlide = 0;
    let isInteracting = false;
    let slideTimer;
    let interactionTimeout;
    const slideDurations = [4500, 4000, 4000];
    function goToSlide(index) {
        dots[currentSlide].classList.remove('active');
        slides[currentSlide].classList.remove('active');
        currentSlide = index;
        dots[currentSlide].classList.add('active');
        slides[currentSlide].classList.add('active');
    }
    function nextSlide(manual = false) {
        if(!isInteracting || manual) {
            let next = (currentSlide + 1) % dots.length;
            goToSlide(next);
            if(!manual) resetSlider();
        } else {
            if(!manual) {
                clearTimeout(slideTimer);
                slideTimer = setTimeout(() => nextSlide(false), 1000);
            }
        }
    }
    function prevSlide(manual = false) {
        if(!isInteracting || manual) {
            let prev = (currentSlide - 1 + dots.length) % dots.length;
            goToSlide(prev);
        }
    }
    function startSlider() {
        clearTimeout(slideTimer);
        slideTimer = setTimeout(() => nextSlide(false), slideDurations[currentSlide]);
    }
    function resetSlider() {
        clearTimeout(slideTimer);
        startSlider();
    }
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            goToSlide(index);
            resetSlider();
        });
    });
    startSlider();
    loginLeft.addEventListener('mousemove', (e) => {
        isInteracting = true;
        clearTimeout(interactionTimeout);
        interactionTimeout = setTimeout(() => {
            isInteracting = false;
        }, 2000);
        const rect = loginLeft.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mapScene = document.getElementById('map-scene');
        const isoScene = document.getElementById('iso-scene');
        if (mapScene) {
            const rotateX = 15 - ((y - centerY) / centerY) * 15;
            const rotateY = 15 + ((x - centerX) / centerX) * 15;
            mapScene.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(-3deg)`;
        }
        if (isoScene) {
            const rotateX = 5 - ((y - centerY) / centerY) * 20;
            const rotateY = 0 + ((x - centerX) / centerX) * 20;
            isoScene.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(0deg)`;
        }
    });
    loginLeft.addEventListener('mouseleave', () => {
        isInteracting = false;
        clearTimeout(interactionTimeout);
        const mapScene = document.getElementById('map-scene');
        const isoScene = document.getElementById('iso-scene');
        if (mapScene) mapScene.style.transform = `rotateX(15deg) rotateY(15deg) rotateZ(-3deg)`;
        if (isoScene) isoScene.style.transform = `rotateX(5deg) rotateY(0deg) rotateZ(0deg)`;
    });
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;
    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        if (swipeDistance < -50) {
            nextSlide(true);
            resetSlider();
        } else if (swipeDistance > 50) {
            prevSlide(true);
            resetSlider();
        }
    }
    loginLeft.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        isInteracting = true;
    }, {passive: true});
    loginLeft.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
        isInteracting = false;
        resetSlider();
    }, {passive: true});
    loginLeft.addEventListener('mousedown', e => {
        isDragging = true;
        isInteracting = true;
        touchStartX = e.screenX;
        loginLeft.style.cursor = 'grabbing';
    });
    loginLeft.addEventListener('mouseup', e => {
        if (!isDragging) return;
        isDragging = false;
        isInteracting = false;
        touchEndX = e.screenX;
        loginLeft.style.cursor = 'default';
        handleSwipe();
    });
    let isWheeling = false;
    let wheelTimer;
    loginLeft.addEventListener('wheel', (e) => {
        if (isWheeling) return;
        if (Math.abs(e.deltaX) > 25) {
            isWheeling = true;
            if (e.deltaX > 0) nextSlide(true);
            else prevSlide(true);
            resetSlider();
            clearTimeout(wheelTimer);
            wheelTimer = setTimeout(() => {
                isWheeling = false;
            }, 800);
        }
    }, { passive: true });
});    document.addEventListener('DOMContentLoaded', () => {
        const wrapper = document.querySelector('.login-icon-wrapper');
        const icon    = document.querySelector('.login-icon');
        if (!wrapper || !icon) return;
        /* -- 3-D tilt -- */
        wrapper.addEventListener('mousemove', (e) => {
            const r  = wrapper.getBoundingClientRect();
            const dx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
            const dy = (e.clientY - r.top   - r.height / 2) / (r.height / 2);
            icon.style.transform  = `perspective(1000px) rotateX(${-dy * 18}deg) rotateY(${dx * 18}deg) scale3d(1.06,1.06,1.06)`;
            icon.style.boxShadow  = "0 22px 36px rgba(124,58,237,0.32)";
            icon.style.transition = 'none';
        });
        wrapper.addEventListener('mouseleave', () => {
            icon.style.transform  = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
            icon.style.boxShadow  = 'none';
            icon.style.transition = 'transform 0.55s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.55s ease';
        });
        wrapper.addEventListener('mousedown', () => {
            icon.style.transform  = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(0.94,0.94,0.94)";
            icon.style.boxShadow  = "0 4px 10px rgba(124,58,237,0.18)";
            icon.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
        });
        wrapper.addEventListener('mouseup', () => {
            icon.style.transform  = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1.06,1.06,1.06)";
            icon.style.boxShadow  = "0 22px 36px rgba(124,58,237,0.32)";
            icon.style.transition = 'transform 0.2s cubic-bezier(0.2,0.8,0.2,1), box-shadow 0.2s ease';
        });
        /* -- Sparkles -- */
        const COLORS  = ['#A78BFA','#7C3AED','#60A5FA','#34D399','#FCD34D','#F9A8D4'];
        const SIZES   = [4, 5, 6, 7];
        let   spawner = null;
        let   active  = false;
        function spawnSparkle() {
            if (!active) return;
            const r    = wrapper.getBoundingClientRect();
            const side = Math.random();
            let rx, ry;
            const pad = 20;
            if (side < 0.25)      { rx = rand(pad, r.width - pad);  ry = pad; }
            else if (side < 0.5)  { rx = r.width - pad;             ry = rand(pad, r.height - pad); }
            else if (side < 0.75) { rx = rand(pad, r.width - pad);  ry = r.height - pad; }
            else                  { rx = pad;                        ry = rand(pad, r.height - pad); }
            const el = document.createElement('span');
            el.className = 'sparkle';
            const size  = pick(SIZES);
            const color = pick(COLORS);
            const angle = Math.random() * Math.PI * 2;
            const dist  = rand(20, 42);
            el.style.cssText = `
                left:${rx}px; top:${ry}px;
                width:${size}px; height:${size}px;
                background:${color};
                box-shadow: 0 0 ${size + 3}px ${color};
                --sx: ${Math.cos(angle) * dist};
                --sy: ${Math.sin(angle) * dist};
            `;
            wrapper.appendChild(el);
            el.addEventListener('animationend', () => el.remove());
        }
        function rand(min, max) { return Math.random() * (max - min) + min; }
        function pick(arr)      { return arr[Math.floor(Math.random() * arr.length)]; }
        wrapper.addEventListener('mouseenter', () => {
            active  = true;
            spawner = setInterval(spawnSparkle, 120);
        });
        wrapper.addEventListener('mouseleave', () => {
            active = false;
            clearInterval(spawner);
        });
    });

document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            let isValid = true;
            const inputs = loginForm.querySelectorAll('input[required]');
            
            // Remove previous error messages
            loginForm.querySelectorAll('.field-error-msg').forEach(msg => msg.remove());
            
            inputs.forEach(input => {
                input.classList.remove('input-error', 'shake-error');
                
                if (!input.value.trim()) {
                    isValid = false;
                    e.preventDefault();
                    
                    // Add error styling
                    input.classList.add('input-error');
                    
                    // Trigger reflow for animation
                    void input.offsetWidth;
                    input.classList.add('shake-error');
                    
                    // Add inline error message
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'field-error-msg';
                    errorMsg.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Este campo es obligatorio';
                    
                    const targetEl = input.parentElement.classList.contains('password-wrapper') || input.parentElement.classList.contains('input-wrapper') ? input.parentElement : input;
                    targetEl.appendChild(errorMsg);
                }
            });
            
            // Remove shake class after animation finishes so it can shake again
            setTimeout(() => {
                inputs.forEach(input => input.classList.remove('shake-error'));
            }, 500);
            
            if (isValid) {
                e.preventDefault();
                const btn = loginForm.querySelector('.login-btn');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<div style="width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>';
                btn.disabled = true;
                
                const formData = new FormData(loginForm);
                const params = new URLSearchParams(formData);
                
                fetch(loginForm.action, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: params
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        window.location.href = data.redirectUrl || '/';
                    } else {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        mostrarAlertaError(data.error);
                    }
                })
                .catch(err => {
                    console.error('Error en login AJAX:', err);
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    mostrarAlertaError('true'); 
                });
            }
        });
        
        // Remove error states when user starts typing
        loginForm.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', function() {
                this.classList.remove('input-error', 'shake-error');
                const targetEl = this.parentElement.classList.contains('password-wrapper') || this.parentElement.classList.contains('input-wrapper') ? this.parentElement : this.parentElement;
                const errorMsg = targetEl.querySelector('.field-error-msg');
                if (errorMsg) {
                    errorMsg.remove();
                }
            });
        });
    }
});

document.addEventListener("DOMContentLoaded", function() {
    // Auto-dismiss floating alerts after 2.5 seconds
    const alerts = document.querySelectorAll('.alert-box');
    if (alerts.length > 0) {
        alerts.forEach(alert => {
            setTimeout(() => {
                alert.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                alert.style.opacity = '0';
                alert.style.transform = 'translateX(40px) scale(0.95)';
                setTimeout(() => {
                    alert.remove();
                }, 500);
            }, 2500);
        });
        
        // Remove query parameters from URL so alerts don't reappear on refresh
        if (window.history.replaceState) {
            const urlWithoutParams = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState(null, null, urlWithoutParams);
        }
    }
});

function mostrarAlertaError(errorType) {
    // Eliminar alertas previas
    document.querySelectorAll('.alert-box').forEach(el => el.remove());
    
    let errorMsg = 'Usuario o contraseña incorrectos';
    if (errorType === 'not_found') errorMsg = 'El usuario no existe';
    else if (errorType === 'bad_credentials') errorMsg = 'Contraseña incorrecta';
    
    const alertHtml = `
    <div class="alert-box error-alert slide-in-down" style="position: fixed; top: 24px; right: 24px; z-index: 1000;">
        <div class="alert-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
        <div class="alert-content">
            <span class="alert-title">Acceso denegado</span>
            <span class="alert-msg">${errorMsg}</span>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', alertHtml);
    
    // Auto-dismiss
    const newAlert = document.body.querySelector('.alert-box');
    setTimeout(() => {
        if (newAlert) {
            newAlert.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            newAlert.style.opacity = '0';
            newAlert.style.transform = 'translateX(40px) scale(0.95)';
            setTimeout(() => {
                newAlert.remove();
            }, 500);
        }
    }, 2500);
}
