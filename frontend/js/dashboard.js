// Gösterge paneli servisi
const Dashboard = {
  render() {
    if (Auth.isAdmin()) {
      this._renderAdmin();
    } else {
      this._renderStaff();
    }
    this._renderRecentLeaves();
    this._updatePendingBadge();
  },

  _renderStaff() {
    document.getElementById('staffStatsSection').style.display = '';
    document.getElementById('adminStatsSection').style.display = 'none';
    document.getElementById('adminPendingCard').style.display = '';

    Auth.refreshUser();
    const sessionUser = Auth.user();
    const fullUser = Users.byId(sessionUser.id);
    const bal = fullUser ? fullUser.leaveBalance : { total:0, used:0, pending:0, remaining:0, hourlyTotal:0, hourlyUsed:0 };

    const cards = document.getElementById('balanceCards');
    cards.innerHTML = `
      <div class="stat-card total">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
          </svg>
        </div>
        <div class="stat-label">Toplam İzin Hakkı</div>
        <div class="stat-value" data-val="${bal.total}" data-suffix=" <span>gün</span>">${bal.total} <span>gün</span></div>
        <div class="stat-desc">Yıllık toplam hak</div>
      </div>
      <div class="stat-card used">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="stat-label">Kullanılan İzin</div>
        <div class="stat-value" data-val="${bal.used}" data-suffix=" <span>gün</span>">${bal.used} <span>gün</span></div>
        <div class="stat-desc">Onaylanan izinler</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-label">Bekleyen İzin</div>
        <div class="stat-value" data-val="${bal.pending}" data-suffix=" <span>gün</span>">${bal.pending} <span>gün</span></div>
        <div class="stat-desc">Onay bekleyenler</div>
      </div>
      <div class="stat-card remaining">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="stat-label">Kalan İzin</div>
        <div class="stat-value" data-val="${bal.remaining}" data-suffix=" <span>gün</span>">${bal.remaining} <span>gün</span></div>
      </div>
      <div class="stat-card hourly">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-label">Toplam Saatlik İzin</div>
        <div class="stat-value" data-val="${bal.hourlyTotal || 0}" data-suffix=" <span>saat</span>">${bal.hourlyTotal || 0} <span>saat</span></div>
        <div class="stat-desc">Yıllık saatlik hak</div>
      </div>
    `;

    // Bekleyen talepler listesi
    document.getElementById('dashRightCardTitle').textContent = 'Aktif İzin Taleplerim';
    const pending = Leaves.byUser(sessionUser.id).filter(l => l.status === 'pending');
    const container = document.getElementById('pendingLeavesList');
    if (pending.length === 0) {
      container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>Bekleyen izin talebiniz yok</p></div>`;
    } else {
      container.innerHTML = pending.map(l => this._leaveItemHtml(l, false)).join('');
    }
  },

  _renderAdmin() {
    document.getElementById('staffStatsSection').style.display = 'none';
    document.getElementById('adminStatsSection').style.display = '';

    const allLeaves  = Leaves.ofCompany();
    const allUsers  = Users.staff();
    const pending   = allLeaves.filter(l => l.status === 'pending');
    const approved  = allLeaves.filter(l => l.status === 'approved');
    const today     = todayStr();
    const onLeave   = allLeaves.filter(l => l.status === 'approved' && l.startDate <= today && l.endDate >= today);

    const cards = document.getElementById('adminCards');
    cards.innerHTML = `
      <div class="stat-card total">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <div class="stat-label">Toplam Personel</div>
        <div class="stat-value" data-val="${allUsers.length}">${allUsers.length}</div>
        <div class="stat-desc">Aktif personel sayısı</div>
      </div>
      <div class="stat-card pending">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="stat-label">Bekleyen Onaylar</div>
        <div class="stat-value" data-val="${pending.length}">${pending.length}</div>
        <div class="stat-desc">İnceleme bekleyen talepler</div>
      </div>
      <div class="stat-card used">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div class="stat-label">İzinde Olan</div>
        <div class="stat-value" data-val="${onLeave.length}">${onLeave.length}</div>
        <div class="stat-desc">Bugün izinde olan personel</div>
      </div>
      <div class="stat-card remaining">
        <div class="stat-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div class="stat-label">Toplam Onaylanan</div>
        <div class="stat-value" data-val="${approved.length}">${approved.length}</div>
        <div class="stat-desc">Tüm zamanlar</div>
      </div>
    `;

    // Yönetici bekleyen onaylar
    document.getElementById('adminPendingCard').style.display = '';
    document.getElementById('dashRightCardTitle').textContent = 'Bekleyen Onaylar';
    const container = document.getElementById('pendingLeavesList');
    if (pending.length === 0) {
      container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>Bekleyen izin talebi yok</p></div>`;
    } else {
      container.innerHTML = pending.slice(0, 5).map(l => this._leaveItemHtml(l, true)).join('');
    }
  },

  _renderRecentLeaves() {
    const user = Auth.user();
    const isAdmin = Auth.isAdmin();

    // Kart başlığını belirle
    const cardTitleEl = document.querySelector('#recentLeaves')?.previousElementSibling;
    if (cardTitleEl) {
      const seeAllBtn = document.getElementById('dashSeeAllBtn');
      const btnHtml = seeAllBtn ? seeAllBtn.outerHTML : '<a href="#" class="btn btn-ghost btn-sm" id="dashSeeAllBtn">Tümünü Gör</a>';
      cardTitleEl.innerHTML = (isAdmin ? 'Son İzin Talepleri' : 'Aldığım İzinler (Son Taleplerim)') + btnHtml;
      const newBtn = document.getElementById('dashSeeAllBtn');
      if (newBtn) {
        newBtn.onclick = (e) => { e.preventDefault(); Router.navigate('history'); };
      }
    }

    let leaves = [];
    if (isAdmin) {
      leaves = Leaves.ofCompany().slice().sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 10);
    } else {
      // Personel izinlerini filtrele
      const userLeaves = user ? Leaves.byUser(user.id) : [];
      const source = (userLeaves && userLeaves.length > 0) ? userLeaves : Leaves.all();
      leaves = source.slice().sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 15);
    }

    const container = document.getElementById('recentLeaves');
    if (!container) return;

    if (leaves.length === 0) {
      container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><p>${isAdmin ? 'Henüz izin kaydı yok' : 'Henüz bir izin talebiniz bulunmuyor'}</p></div>`;
      return;
    }
    container.innerHTML = leaves.map(l => this._leaveItemHtml(l, isAdmin)).join('');
  },

  // İzin satırı şablonu
  _leaveItemHtml(leave, showUser = false) {
    const user = Users.byId(leave.userId);
    const userName = user ? user.name : (leave.userName || 'Personel');
    
    // İzin türünü bul
    const typeKey = leave.leave_type_key || leave.leaveTypeKey || leave.leaveTypeId;
    const typeObj = LeaveTypes.byKey(typeKey);
    const leaveTypeName = typeObj ? typeObj.name : (leave.leaveTypeName || 'İzin');

    const name = showUser ? userName : leaveTypeName;
    
    let dateStr = '';
    if (leave.type === 'hourly' || leave.leaveType === 'hourly') {
      dateStr = `${formatDate(leave.startDate)}${leave.startTime ? ', ' + leave.startTime + (leave.endTime ? ' – ' + leave.endTime : '') : ''}`;
    } else {
      dateStr = `${formatDate(leave.startDate)}${leave.endDate && leave.endDate !== leave.startDate ? ' – ' + formatDate(leave.endDate) : ''}`;
    }

    const sub = showUser
      ? `${leaveTypeName} • ${dateStr}`
      : `${dateStr}${leave.description ? ' • ' + leave.description : ''}`;

    const avatarText = showUser ? initials(userName) : initials(leaveTypeName);

    return `
      <div class="leave-item" onclick="LeaveForm.showDetail('${leave.id}')" style="cursor:pointer" title="Detayı görmek için tıklayın">
        <div class="leave-item-avatar">${avatarText}</div>
        <div class="leave-item-info">
          <div class="leave-item-name">${name}</div>
          <div class="leave-item-meta">${sub}</div>
        </div>
        <div class="leave-item-right">
          <div class="leave-item-duration">${formatDuration(leave)}</div>
          ${statusBadge(leave.status)}
        </div>
      </div>`;
  },

  // Bekleyen sayacını güncelle
  _updatePendingBadge() {
    const count = Leaves.pending().length;
    const badge = document.getElementById('pendingBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? '' : 'none';
    }
  }
};
