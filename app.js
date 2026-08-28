/**
 * ĐOÀN THƯỢNG BADMINTON - MAIN APPLICATION CONTROLLER
 * Quản lý View Router, Modal dialogs, Toast notifications, File uploads
 */

class App {
  constructor() {
    this.currentView = 'rankings';
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.bindEvents();
      this.initModals();
      this.initNavigation();
      
      const hash = window.location.hash.replace('#', '');
      if (hash && ['rankings', 'matchmaking', 'doubles', 'friends', 'news', 'admin'].includes(hash)) {
        this.navigate(hash);
      } else {
        this.navigate('rankings');
      }

      this.updateOnlineIndicator();
      window.addEventListener('online', () => this.updateOnlineIndicator());
      window.addEventListener('offline', () => this.updateOnlineIndicator());
    });
  }

  updateOnlineIndicator() {
    const pill = document.getElementById('sync-status-indicator');
    if (!pill) return;
    if (navigator.onLine) {
      pill.className = 'sync-status-pill';
      pill.innerHTML = '<span class="sync-dot"></span><span>Realtime Sync: Đang kết nối</span>';
    } else {
      pill.className = 'sync-status-pill offline';
      pill.innerHTML = '<span class="sync-dot"></span><span>Ngoại tuyến (Offline Mode)</span>';
    }
  }

  navigate(viewName) {
    if (viewName === 'admin' && !window.authManager.isAdmin()) {
      this.showToast("Chỉ Admin Nguyễn Đức Nhật Minh và Nguyễn Đức Hiếu mới có quyền truy cập!", "error");
      this.openModal('modal-login');
      return;
    }

    this.currentView = viewName;
    window.location.hash = viewName;

    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active-view');
    });

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active-view');
    }

    document.querySelectorAll('.nav-item-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    const navLinks = document.getElementById('nav-links');
    if (navLinks) navLinks.classList.remove('show-mobile');

    if (viewName === 'rankings') window.rankingManager.render();
    if (viewName === 'matchmaking') window.matchmakingManager.render();
    if (viewName === 'doubles') window.doublesManager.render();
    if (viewName === 'friends') window.friendsChatManager.render();
    if (viewName === 'news') window.newsManager.render();
    if (viewName === 'admin') window.adminManager.setSection(window.adminManager.currentSection);
  }

  bindEvents() {
    const toggleBtn = document.getElementById('mobile-toggle-btn');
    const navLinks = document.getElementById('nav-links');
    if (toggleBtn && navLinks) {
      toggleBtn.addEventListener('click', () => {
        navLinks.classList.toggle('show-mobile');
      });
    }

    document.querySelectorAll('.cat-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const cat = e.currentTarget.dataset.category;
        window.rankingManager.setCategory(cat);
      });
    });

    const rankSearch = document.getElementById('ranking-search-input');
    if (rankSearch) {
      rankSearch.addEventListener('input', (e) => {
        window.rankingManager.setSearchQuery(e.target.value);
      });
    }
  }

  initModals() {
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('open');
        }
      });
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-backdrop');
        if (modal) modal.classList.remove('open');
      });
    });
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-solid fa-circle-info';
    if (type === 'success') icon = 'fa-solid fa-circle-check';
    if (type === 'error') icon = 'fa-solid fa-triangle-exclamation';

    toast.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

window.app = new App();

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}
