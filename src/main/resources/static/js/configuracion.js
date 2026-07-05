document.addEventListener('DOMContentLoaded', () => {
    
    const navItems = document.querySelectorAll('.nav-section-item');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            
            navItems.forEach(nav => nav.classList.remove('active'));
            tabPanes.forEach(tab => tab.classList.remove('active'));

            
            item.classList.add('active');
            
            
            const targetId = item.getAttribute('data-target');
            const targetPane = document.getElementById('tab-' + targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
        const targetNav = document.querySelector(`.nav-section-item[data-target="${tabParam}"]`);
        if (targetNav) {
            targetNav.click();
        }
    }

    
    const alert = document.querySelector('.alert-success');
    if (alert) {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s ease';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 4000);
    }
    
    
    const pwdAlert = document.getElementById('pwd-success-alert');
    if (pwdAlert) {
        setTimeout(() => {
            pwdAlert.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            pwdAlert.style.opacity = '0';
            pwdAlert.style.transform = 'translateY(-10px)';
            setTimeout(() => pwdAlert.remove(), 300);
        }, 2000);
    }
});
