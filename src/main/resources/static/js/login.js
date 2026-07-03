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
});