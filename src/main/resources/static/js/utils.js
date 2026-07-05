const Utils = {
    showToast: function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;
        document.body.appendChild(toast);
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '12px 20px';
        toast.style.background = type === 'success' ? '#10B981' : (type === 'error' ? '#EF4444' : '#3B82F6');
        toast.style.color = '#fff';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        toast.style.zIndex = '9999';
        toast.style.display = 'flex';
        toast.style.gap = '12px';
        toast.style.alignItems = 'center';
        toast.style.animation = 'slideInUp 0.3s ease';
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#fff';
        closeBtn.style.fontSize = '18px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.onclick = () => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        };
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    },
    formatDate: function(dateString) {
        if (!dateString) return '--';
        const d = new Date(dateString);
        
        let tz = 'America/Santo_Domingo';
        let locale = 'es-DO';
        if (window.APP_CONFIG) {
            tz = window.APP_CONFIG.zonaHoraria || tz;
            locale = window.APP_CONFIG.formatoNumerico || locale;
        }

        try {
            return new Intl.DateTimeFormat(locale, { 
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                timeZone: tz
            }).format(d);
        } catch (e) {
            return d.toLocaleString();
        }
    },
    formatNumber: function(value, maxDecimals = 2) {
        if (value === null || value === undefined) return '--';
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        
        let locale = 'es-DO';
        if (window.APP_CONFIG && window.APP_CONFIG.formatoNumerico) {
            locale = window.APP_CONFIG.formatoNumerico;
        }
        
        try {
            return new Intl.NumberFormat(locale, {
                maximumFractionDigits: maxDecimals,
                minimumFractionDigits: 0
            }).format(num);
        } catch (e) {
            return num.toFixed(maxDecimals);
        }
    }
};
window.Utils = Utils;
