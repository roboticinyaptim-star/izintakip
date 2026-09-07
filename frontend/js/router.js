// Sayfa yönlendirici servisi
const Router = {
  current: 'dashboard',

  views: {
    dashboard: { title: 'Dashboard',       subtitle: null },
    calendar:  { title: 'Takvim',          subtitle: 'İzinleri takvim üzerinde görüntüleyin' },
    history:   { title: 'İzin Geçmişi',    subtitle: 'Kişisel izin kayıtlarınız' },
    approvals: { title: 'İzin Onayları',   subtitle: 'Bekleyen izin taleplerini inceleyin', adminOnly: true },
    reports:   { title: 'Raporlama',       subtitle: 'İzin raporları ve Excel çıktısı', adminOnly: true },
    companies: { title: 'Tüm Şirketler',   subtitle: 'Kayıtlı kurumlar ve genel yönetim', superAdminOnly: true },
    settings:  { title: 'Ayarlar',         subtitle: 'Sistem ve profil ayarları' },
  },

  navigate(view) {
    const meta = this.views[view];
    if (!meta) return;

    // Yetki kontrolü
    if (meta.adminOnly && !Auth.isAdmin()) {
      return;
    }
    if (meta.superAdminOnly && !Auth.isSuperAdmin()) {
      return;
    }

    // Görünümleri gizle
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    // Hedef görünümü göster
    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active');

    // Menüyü güncelle
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === view);
    });

    // Başlığı güncelle
    document.getElementById('headerTitle').textContent = meta.title;

    // Alt başlığı güncelle
    const user = Auth.user();
    let sub = meta.subtitle || '';
    if (view === 'dashboard') {
      const hour = new Date().getHours();
      const greet = hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';
      document.getElementById('dashGreeting').textContent = `${greet}, ${user ? user.name.split(' ')[0] : ''}!`;
      document.getElementById('dashSubtitle').textContent =
        Auth.isAdmin() ? 'Sistem durumuna genel bakış' : 'İzin durumunuza genel bakış';
      sub = Auth.isAdmin() ? 'Yönetici Paneli' : user ? user.department : '';
    }
    document.getElementById('headerSubtitle').textContent = sub;

    this.current = view;
    this._onNavigate(view);
  },

  // İlgili görünümü çiz
  _onNavigate(view) {
    try {
      switch (view) {
        case 'dashboard': Dashboard.render(); break;
        case 'calendar':  Calendar.render(); break;
        case 'history':   History.render(); break;
        case 'approvals': Approvals.render(); break;
        case 'reports':   Reports.render(); break;
        case 'companies': CompaniesView.render(); break;
        case 'settings':  AppSettings.render(); break;
      }
    } catch(err) {
      console.error(`[Router] ${view} render hatası:`, err);
    }
  },

  // Yönlendiriciyi başlat
  init() {
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => {
        this.navigate(item.dataset.view);
      });
    });

    // Güncel tarihi yaz
    const now = new Date();
    document.getElementById('headerDate').textContent =
      now.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Rol görünürlük kontrolü
    const role = Auth.user()?.role;
    if (role === 'staff') {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }

    const startView = Auth.isSuperAdmin() ? 'companies' : 'dashboard';
    this.navigate(startView);
  }
};

// Bildirim mesaj kutusu
let _lastToast = { msg: '', time: 0 };
function toast(message, type = 'info', duration = 3500) {
  const now = Date.now();
  if (_lastToast.msg === message && (now - _lastToast.time) < 1200) {
    return;
  }
  _lastToast = { msg: message, time: now };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = (icons[type] || icons.info) + `<span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// Modal pencere yardımcıları
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.add('open');
    overlay.querySelector('.modal')?.scrollTo(0, 0);
  }
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('open');
}

// Dışarı tıklanınca kapat
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// Esc tuşuyla kapat
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
  }
});
