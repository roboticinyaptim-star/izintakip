// Ana uygulama başlatıcı
(async function () {
  'use strict';

  // Oturum kontrolü
  const session = Auth.init();
  if (!session) return;

  // Verileri sunucudan yükle
  const dataLoaded = await initializeDataFromAPI();
  if (!dataLoaded) {
     Auth.logout();
     return;
  }

  // Kullanıcı bilgilerini yaz
  const user = Auth.user();
  document.getElementById('sidebarAvatarText').textContent = initials(user.name);
  document.getElementById('sidebarUserName').textContent   = user.name;
  document.getElementById('sidebarUserRole').textContent   =
    user.role === 'superadmin' ? 'Sistem Yöneticisi' : (user.role === 'admin' ? 'Yönetici' : 'Personel');

  // Rol görünürlük ayarları
  if (Auth.isSuperAdmin()) {
    document.querySelectorAll('.superadmin-only').forEach(el => el.style.display = 'flex');
    document.querySelectorAll('.hide-superadmin').forEach(el => el.style.display = 'none');
  } else if (user.role === 'staff') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  } else if (user.role === 'admin') {
    // Yönetici tümünü görür
  }

  // Çıkış yapma işlemleri
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutOverlay = document.getElementById('logoutOverlay');
  const logoutConfirmBtn = document.getElementById('logoutConfirmBtn');
  const logoutCancelBtn  = document.getElementById('logoutCancelBtn');

  logoutBtn.addEventListener('click', () => {
    logoutOverlay.classList.add('open');
  });

  logoutCancelBtn.addEventListener('click', () => {
    logoutOverlay.classList.remove('open');
  });

  logoutConfirmBtn.addEventListener('click', () => {
    Auth.logout();
  });

  logoutOverlay.addEventListener('click', (e) => {
    if (e.target === logoutOverlay) logoutOverlay.classList.remove('open');
  });

  // Tümünü gör bağlantısı
  const dashSeeAll = document.getElementById('dashSeeAllBtn');
  if (dashSeeAll) {
    dashSeeAll.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('history');
    });
  }

  // Modülleri başlat
  Calendar.init();
  History.init();
  Approvals.init();
  Reports.init();
  CompaniesView.init();
  LeaveForm.init();
  Router.init();

  // Bildirim sayacını güncelle
  setInterval(() => {
    Dashboard._updatePendingBadge();
  }, 30000);

})();
