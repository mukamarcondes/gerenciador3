// Dark Mode Toggle System

class DarkModeManager {
  constructor() {
    this.darkModeKey = 'sistemainvestidor-dark-mode';
    this.init();
  }

  init() {
    // Load saved preference
    const isDarkMode = localStorage.getItem(this.darkModeKey) === 'true';
    
    // Apply saved preference
    if (isDarkMode) {
      this.enableDarkMode();
    }

    // Create and attach toggle button
    this.createToggleButton();
  }

  createToggleButton() {
    const toggle = document.createElement('button');
    toggle.className = 'dark-mode-toggle';
    toggle.setAttribute('aria-label', 'Alternar modo escuro');
    toggle.innerHTML = this.isDarkModeEnabled() ? '☀️' : '🌙';
    toggle.addEventListener('click', () => this.toggle());
    
    document.body.appendChild(toggle);
  }

  toggle() {
    if (this.isDarkModeEnabled()) {
      this.disableDarkMode();
    } else {
      this.enableDarkMode();
    }
  }

  isDarkModeEnabled() {
    return document.body.classList.contains('dark-mode');
  }

  enableDarkMode() {
    document.body.classList.add('dark-mode');
    localStorage.setItem(this.darkModeKey, 'true');
    this.updateToggleIcon(true);
  }

  disableDarkMode() {
    document.body.classList.remove('dark-mode');
    localStorage.setItem(this.darkModeKey, 'false');
    this.updateToggleIcon(false);
  }

  updateToggleIcon(isDarkMode) {
    const toggle = document.querySelector('.dark-mode-toggle');
    if (toggle) {
      toggle.innerHTML = isDarkMode ? '☀️' : '🌙';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new DarkModeManager();
  });
} else {
  new DarkModeManager();
}
