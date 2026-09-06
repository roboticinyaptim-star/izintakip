/* ============================================================
   settings.js — Settings page (Admin: user mgmt, leave types,
   telegram; Staff: profile)
   ============================================================ */

const AppSettings = {
  _editUserId: null,
  _editTypeId: null,

  render() {
    const container = document.getElementById('settingsContent');
    if (Auth.isAdmin()) {
      container.innerHTML = this._adminHtml();
      this._bindAdminEvents();
    } else {
      container.innerHTML = this._profileHtml();
      this._bindProfileEvents();
    }
  },

  // ── Admin HTML ────────────────────────────────────────────────
  _adminHtml() {
    return `
      <!-- Users -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">
          Personel Yönetimi
          <button class="btn btn-primary btn-sm" id="addUserBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Personel Ekle
          </button>
        </div>
        <div id="usersList">${this._usersListHtml()}</div>
      </div>

      <!-- Leave Types -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">
          İzin Türleri
          <button class="btn btn-primary btn-sm" id="addLeaveTypeBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Tür Ekle
          </button>
        </div>
        <div id="leaveTypesList">${this._leaveTypesHtml()}</div>
      </div>

      <!-- Telegram -->
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Telegram Bildirim Ayarları</div>
        <div class="telegram-section">
          <div class="telegram-header">
            <div class="telegram-icon">
              <svg viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 1 0 24 12 12.013 12.013 0 0 0 11.944 0zM18.893 6.85l-2.033 9.57c-.148.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.9.65z"/></svg>
            </div>
            <div>
              <div class="telegram-title">Telegram Bot Entegrasyonu</div>
              <div class="telegram-sub">Yeni izin talepleri ve kararlar için bildirim gönderir</div>
            </div>
          </div>
          <div class="field">
            <label class="field-label">Bot Token</label>
            <input class="field-input" type="text" id="tgBotToken" placeholder="123456789:ABCDEFGHijklmnopqrstuvwxyz" />
          </div>
          <div class="field">
            <label class="field-label">Admin Grup Chat ID</label>
            <input class="field-input" type="text" id="tgChatId" placeholder="-100123456789" />
            <div class="field-hint">Bu chat'e yeni izin bildirimleri gönderilir.</div>
          </div>
          <button class="btn btn-primary" id="saveTelegramBtn">Kaydet</button>
          <button class="btn btn-outline" id="testTelegramBtn" style="margin-left:8px">Test Gönder</button>
        </div>

        <!-- Error Logs -->
        <div style="margin-top:20px">
          <div class="card-title" style="font-size:.82rem;margin-bottom:12px">Hata Logları
            <button class="btn btn-ghost btn-sm" id="clearLogsBtn">Temizle</button>
          </div>
          <div id="errorLogsList">${this._errorLogsHtml()}</div>
        </div>
      </div>
    `;
  },

  _usersListHtml() {
    const users = Users.ofCompany().filter(u => u.role !== 'admin' || u.id !== Auth.userId());
    if (users.length === 0) return '<p style="color:var(--text-muted);font-size:.82rem">Kullanıcı yok</p>';
    return `<div style="display:flex;flex-direction:column;gap:10px">` +
      users.map(u => `
        <div class="user-card ${u.isActive ? '' : 'inactive-user'}" id="ucard-${u.id}">
          <div class="user-card-avatar">${initials(u.name)}</div>
          <div class="user-card-info">
            <div class="user-card-name">${u.name} ${u.isActive ? '' : '<span style="font-size:.68rem;color:var(--text-muted)">(Pasif)</span>'}
              <span class="badge badge-${u.role}" style="margin-left:6px">${u.role==='admin'?'Admin':'Personel'}</span>
            </div>
            <div class="user-card-email">${u.email} • ${u.department || '?'} • İzin: ${u.leaveBalance?.remaining||0}/${u.leaveBalance?.total||0} gün</div>
          </div>
          <div class="user-card-actions">
            <button class="btn btn-outline btn-sm" onclick="AppSettings.editUser('${u.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Düzenle
            </button>
            <button class="btn btn-sm ${u.isActive ? 'btn-warning' : 'btn-success'}" onclick="AppSettings.toggleUser('${u.id}', ${Boolean(u.isActive)})">
              ${u.isActive ? 'Pasif Yap' : 'Aktif Et'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="AppSettings.deleteUser('${u.id}')" title="Personeli Sil">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              Sil
            </button>
          </div>
        </div>`
      ).join('') + '</div>';
  },

  _leaveTypesHtml() {
    const types = LeaveTypes.ofCompany();
    if (types.length === 0) return '<p style="color:var(--text-muted);font-size:.82rem">İzin türü yok</p>';
    return `<div style="display:flex;flex-wrap:wrap;gap:10px">` +
      types.map(t => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;
                    border:1.5px solid var(--border);border-radius:8px;background:var(--bg-card)">
          <span style="font-size:.82rem;font-weight:600;color:${t.isActive ? 'var(--text-primary)':'var(--text-muted)'}">${t.name}</span>
          <button class="btn btn-ghost btn-sm btn-icon" title="Düzenle" onclick="AppSettings.editLeaveType('${t.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm btn-icon" title="${t.isActive?'Pasif Yap':'Aktif Et'}" onclick="AppSettings.toggleLeaveType('${t.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;color:${t.isActive?'var(--success)':'var(--text-muted)'}">
              ${t.isActive
                ? '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
                : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
            </svg>
          </button>
        </div>`
      ).join('') + '</div>';
  },

  _errorLogsHtml() {
    const logs = ErrorLogs.all().slice(0, 10);
    if (logs.length === 0) return '<p style="color:var(--text-muted);font-size:.78rem">Hata logu yok.</p>';
    return `<div style="display:flex;flex-direction:column;gap:6px">` +
      logs.map(l => `
        <div style="background:var(--danger-light);border:1px solid rgba(231,76,60,.2);border-radius:8px;padding:10px 14px">
          <div style="font-size:.72rem;color:var(--text-muted)">${formatDateTime(l.timestamp)}</div>
          <div style="font-size:.8rem;font-weight:500;color:var(--danger)">${l.message}</div>
          ${l.details ? `<div style="font-size:.72rem;color:var(--text-secondary);margin-top:2px;font-family:monospace">${l.details}</div>` : ''}
        </div>`
      ).join('') + '</div>';
  },

  // ── Profile HTML (Staff) ──────────────────────────────────────
  _profileHtml() {
    const u = Auth.user();
    return `
      <div class="card" style="max-width:600px">
        <div class="card-title">Profil Bilgileri</div>
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">
          <div style="width:64px;height:64px;border-radius:16px;background:linear-gradient(135deg,#1a3a6b,#2a5298);
                      color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700">
            ${initials(u.name)}
          </div>
          <div>
            <div style="font-size:1rem;font-weight:700">${u.name}</div>
            <div style="font-size:.8rem;color:var(--text-secondary)">${u.email}</div>
            <span class="badge badge-staff" style="margin-top:4px">Personel</span>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label class="field-label">Ad Soyad</label><input class="field-input" type="text" id="profileName" value="${u.name}" /></div>
          <div class="field"><label class="field-label">Departman</label><input class="field-input" type="text" id="profileDept" value="${u.department||''}" /></div>
        </div>
        <div class="field"><label class="field-label">E-posta</label><input class="field-input" type="email" id="profileEmail" value="${u.email}" /></div>
        <div class="field"><label class="field-label">Telegram Chat ID (bildirim için)</label><input class="field-input" type="text" id="profileTelegram" value="${u.telegramChatId||''}" placeholder="123456789" /></div>
        <div class="divider"></div>
        <div class="card-title" style="font-size:.85rem">Şifre Değiştir</div>
        <div class="field"><label class="field-label">Yeni Şifre</label><input class="field-input" type="password" id="profileNewPwd" placeholder="En az 6 karakter" /></div>
        <div class="field"><label class="field-label">Şifre Tekrar</label><input class="field-input" type="password" id="profileConfirmPwd" placeholder="Şifreyi tekrar girin" /></div>
        <button class="btn btn-primary" id="saveProfileBtn">Değişiklikleri Kaydet</button>
      </div>
    `;
  },

  // ── Admin Events ──────────────────────────────────────────────
  _bindAdminEvents() {
    // Telegram settings load
    const settings = Settings.get();
    document.getElementById('tgBotToken').value = settings.telegramBotToken || '';
    document.getElementById('tgChatId').value   = settings.telegramChatId || '';

    document.getElementById('saveTelegramBtn').addEventListener('click', async () => {
      const token = document.getElementById('tgBotToken').value.trim();
      const chatId = document.getElementById('tgChatId').value.trim();
      await Settings.update({
        telegramBotToken: token,
        telegramChatId:   chatId,
      });
      toast('Telegram ayarları başarıyla kaydedildi.', 'success');
    });

    document.getElementById('testTelegramBtn').addEventListener('click', async () => {
      const token = document.getElementById('tgBotToken').value.trim();
      const chatId = document.getElementById('tgChatId').value.trim();
      if (!token || !chatId) {
        toast('Önce Bot Token ve Chat ID alanlarını doldurun.', 'warning');
        return;
      }
      await Settings.update({ telegramBotToken: token, telegramChatId: chatId });
      const ok = await Telegram.send(chatId, '✅ <b>İzin Takip Sistemi</b> bağlantı testi başarılı!');
      document.getElementById('errorLogsList').innerHTML = this._errorLogsHtml();
      toast(ok ? 'Test mesajı Telegram\'a gönderildi!' : 'Gönderim başarısız. Aşağıdaki hata logunu kontrol edin.', ok ? 'success' : 'error');
    });

    document.getElementById('clearLogsBtn').addEventListener('click', () => {
      ErrorLogs.save([]);
      document.getElementById('errorLogsList').innerHTML = '<p style="color:var(--text-muted);font-size:.78rem">Hata logu yok.</p>';
      toast('Loglar temizlendi.', 'success');
    });

    document.getElementById('addUserBtn').addEventListener('click', () => this.openUserModal());
    document.getElementById('addLeaveTypeBtn').addEventListener('click', () => this.openLeaveTypeModal());

    // User modal
    document.getElementById('userModalClose').addEventListener('click',  () => closeModal('userModal'));
    document.getElementById('userModalCancel').addEventListener('click', () => closeModal('userModal'));
    document.getElementById('userModalSave').addEventListener('click',   () => this.saveUser());

    // Leave type modal
    document.getElementById('leaveTypeModalClose').addEventListener('click',  () => closeModal('leaveTypeModal'));
    document.getElementById('leaveTypeModalCancel').addEventListener('click', () => closeModal('leaveTypeModal'));
    document.getElementById('leaveTypeModalSave').addEventListener('click',   () => this.saveLeaveType());
  },

  _bindProfileEvents() {
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
      const name    = document.getElementById('profileName').value.trim();
      const dept    = document.getElementById('profileDept').value.trim();
      const email   = document.getElementById('profileEmail').value.trim();
      const tg      = document.getElementById('profileTelegram').value.trim();
      const newPwd  = document.getElementById('profileNewPwd').value;
      const confPwd = document.getElementById('profileConfirmPwd').value;

      if (!name) { toast('Ad Soyad boş olamaz.', 'warning'); return; }
      const updates = { name, department: dept, email, telegramChatId: tg };

      if (newPwd) {
        if (newPwd.length < 6) { toast('Şifre en az 6 karakter olmalı.', 'warning'); return; }
        if (newPwd !== confPwd) { toast('Şifreler eşleşmiyor.', 'warning'); return; }
        updates.password = newPwd;
      }

      Users.update(Auth.userId(), updates);
      Auth.refreshUser();
      toast('Profil güncellendi.', 'success');
    });
  },

  // ── User Modal ────────────────────────────────────────────────
  openUserModal(userId = null) {
    this._editUserId = userId;
    const title = document.getElementById('userModalTitle');
    const passLabel = document.getElementById('userModalPassLabel');

    if (userId) {
      const u = Users.byId(userId);
      title.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Personel Düzenle`;
      passLabel.textContent = 'Yeni Şifre (boş bırakılabilir)';
      document.getElementById('userModalName').value       = u.name;
      document.getElementById('userModalDept').value       = u.department || '';
      document.getElementById('userModalUsername').value   = u.username;
      document.getElementById('userModalEmail').value      = u.email;
      document.getElementById('userModalRole').value       = u.role;
      document.getElementById('userModalPassword').value   = '';
      document.getElementById('userModalTelegram').value   = u.telegramChatId || '';
      document.getElementById('userModalLeaveTotal').value = u.leaveBalance?.total || 14;
      document.getElementById('userModalHourlyTotal').value= u.leaveBalance?.hourlyTotal || 16;
    } else {
      title.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Personel Ekle`;
      passLabel.textContent = 'Şifre *';
      ['userModalName','userModalDept','userModalUsername','userModalEmail','userModalPassword','userModalTelegram'].forEach(id =>
        document.getElementById(id).value = '');
      document.getElementById('userModalRole').value        = 'staff';
      document.getElementById('userModalLeaveTotal').value  = '14';
      document.getElementById('userModalHourlyTotal').value = '16';
    }
    openModal('userModal');
  },

  async saveUser() {
    const name     = document.getElementById('userModalName').value.trim();
    const dept     = document.getElementById('userModalDept').value.trim();
    const username = document.getElementById('userModalUsername').value.trim();
    const email    = document.getElementById('userModalEmail').value.trim();
    const password = document.getElementById('userModalPassword').value;
    const role     = document.getElementById('userModalRole').value;
    const tg       = document.getElementById('userModalTelegram').value.trim();
    const leaveTotal   = Number(document.getElementById('userModalLeaveTotal').value) || 14;
    const hourlyTotal  = Number(document.getElementById('userModalHourlyTotal').value) || 16;

    if (!name || !username || !email) { toast('Ad, kullanıcı adı ve e-posta zorunludur.', 'warning'); return; }

    try {
      if (this._editUserId) {
        const updates = { 
          name, 
          department: dept, 
          username, 
          email, 
          role, 
          telegramChatId: tg,
          leaveTotal,
          hourlyTotal
        };
        if (password) updates.password = password;
        const u = Users.byId(this._editUserId);
        updates.leaveBalance = {
          ...u.leaveBalance,
          total: leaveTotal,
          remaining: leaveTotal - (u.leaveBalance?.used || 0),
          hourlyTotal,
        };
        await Users.update(this._editUserId, updates);
        toast('Kullanıcı güncellendi.', 'success');
      } else {
        if (!password || password.length < 6) { toast('Şifre en az 6 karakter olmalı.', 'warning'); return; }
        const existing = Users.all().find(u => u.username === username || u.email === email);
        if (existing) { toast('Bu kullanıcı adı veya e-posta zaten kullanılıyor.', 'warning'); return; }
        await Users.create({ name, department: dept, username, email, password, role, telegramChatId: tg, leaveTotal, hourlyTotal });
        toast('Kullanıcı oluşturuldu.', 'success');
      }

      closeModal('userModal');
      document.getElementById('usersList').innerHTML = this._usersListHtml();
    } catch (err) {
      console.error(err);
      toast('İşlem başarısız: ' + (err.message || 'Hata oluştu'), 'error');
    }
  },

  editUser(userId) { this.openUserModal(userId); },

  async toggleUser(userId, currentStatus) {
    const isCurrentlyActive = Boolean(currentStatus);
    const newStatus = !isCurrentlyActive;
    try {
      await Users.setActive(userId, newStatus);
      document.getElementById('usersList').innerHTML = this._usersListHtml();
      toast(newStatus ? 'Kullanıcı aktif edildi.' : 'Kullanıcı pasif yapıldı.', 'success');
    } catch (err) {
      console.error(err);
      toast('İşlem gerçekleştirilemedi: ' + (err.message || 'Hata oluştu'), 'error');
    }
  },

  async deleteUser(userId) {
    if (userId === Auth.userId()) {
      toast('Kendi hesabınızı silemezsiniz.', 'warning');
      return;
    }
    const user = Users.byId(userId);
    const userName = user ? user.name : 'Bu personeli';
    if (!confirm(`"${userName}" adlı personeli ve personele ait tüm izin geçmişini kalıcı olarak silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz!`)) {
      return;
    }
    try {
      await Users.delete(userId);
      document.getElementById('usersList').innerHTML = this._usersListHtml();
      toast('Personel başarıyla silindi.', 'success');
    } catch (err) {
      console.error(err);
      toast('Personel silinemedi: ' + (err.message || 'Hata oluştu'), 'error');
    }
  },

  // ── Leave Type Modal ──────────────────────────────────────────
  openLeaveTypeModal(typeId = null) {
    this._editTypeId = typeId;
    if (typeId) {
      const t = LeaveTypes.byId(typeId);
      document.getElementById('leaveTypeModalName').value = t.name;
    } else {
      document.getElementById('leaveTypeModalName').value = '';
    }
    openModal('leaveTypeModal');
  },

  saveLeaveType() {
    const name = document.getElementById('leaveTypeModalName').value.trim();
    if (!name) { toast('İzin türü adı boş olamaz.', 'warning'); return; }

    if (this._editTypeId) {
      LeaveTypes.update(this._editTypeId, { name });
      toast('İzin türü güncellendi.', 'success');
    } else {
      LeaveTypes.create(name);
      toast('İzin türü eklendi.', 'success');
    }
    closeModal('leaveTypeModal');
    document.getElementById('leaveTypesList').innerHTML = this._leaveTypesHtml();
    LeaveForm._populateLeaveTypes();
  },

  editLeaveType(typeId) { this.openLeaveTypeModal(typeId); },

  toggleLeaveType(typeId) {
    LeaveTypes.toggle(typeId);
    document.getElementById('leaveTypesList').innerHTML = this._leaveTypesHtml();
    LeaveForm._populateLeaveTypes();
    toast('İzin türü güncellendi.', 'success');
  }
};
