// theme.js - 主題管理腳本

const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        this.createToggleButton();
        this.watchSystemTheme();
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.updateToggleButton(theme);
    },

    toggle() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },

    createToggleButton() {
        if (document.querySelector('.theme-toggle')) return;

        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.innerHTML = `
            <span id="theme-icon">🌙</span>
            <span id="theme-text">深色模式</span>
        `;
        button.addEventListener('click', () => this.toggle());
        document.body.appendChild(button);
        
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        this.updateToggleButton(currentTheme);
    },

    updateToggleButton(theme) {
        const icon = document.getElementById('theme-icon');
        const text = document.getElementById('theme-text');
        
        if (!icon || !text) return;
        
        if (theme === 'dark') {
            icon.textContent = '☀️';
            text.textContent = '淺色模式';
        } else {
            icon.textContent = '🌙';
            text.textContent = '深色模式';
        }
    },

    watchSystemTheme() {
        if (!window.matchMedia) return;
        
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
};

// 初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}