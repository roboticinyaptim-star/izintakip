/* ============================================================
   app.js — Main application entry point (v2)
   ============================================================ */

(async function () {
  'use strict';

  // ── 1. Auth check ──────────────────────────────────────────
  const session = Auth.init();
  if (!session) return; // redirected to login

  // Load backend data
  const dataLoaded = await initializeDataFromAPI();
  if (!dataLoaded) {
     Auth.logout();
     return;
  }

  // ── 2. Setup sidebar user info ─────────────────────────────
  const user = Auth.user();
  document.getElementById('sidebarAvatarText').textContent = initials(user.name);
  document.getElementById('sidebarUserName').textContent   = user.name;
  document.getElementById('sidebarUserRole').textContent   =
    user.role === 'superadmin' ? 'Sistem Yöneticisi' : (user.role === 'admin' ? 'Yönetici' : 'Personel');

  // ── Role-based UI visibility ─────────────────────────────────
  if (Auth.isSuperAdmin()) {
    document.querySelectorAll('.superadmin-only').forEach(el => el.style.display = 'flex');
    document.querySelectorAll('.hide-superadmin').forEach(el => el.style.display = 'none');
  } else if (user.role === 'staff') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  } else if (user.role === 'admin') {
    // Admin (şirket yöneticisi) personelin gördüğü her şeyi görür + admin-only
  }

  // ── 3. Logout — custom modal yerine basit overlay ─────────
  // (confirm() file:// protokolünde bloke olabilir)
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

  // ── 4. Dashboard "See All" links ───────────────────────────
  const dashSeeAll = document.getElementById('dashSeeAllBtn');
  if (dashSeeAll) {
    dashSeeAll.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('history');
    });
  }

  // ── 5. Initialize all modules ──────────────────────────────
  Calendar.init();
  History.init();
  Approvals.init();
  Reports.init();
  CompaniesView.init();
  LeaveForm.init();
  Router.init(); // navigates to dashboard + renders

  // ── 6. Refresh pending badge periodically (30s) ────────────
  setInterval(() => {
    Dashboard._updatePendingBadge();
  }, 30000);

})();
