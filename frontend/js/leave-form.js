/* ============================================================
   leave-form.js — Leave creation form + Detail modal
   ============================================================ */

const LeaveForm = {
  _currentTab: 'daily',
  _rejectLeaveId: null,
  _processing: false,

  init() {
    // Tab switcher
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab));
    });

    // Date/time auto-calc
    ['dailyStart', 'dailyEnd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this._calcDaily());
    });
    ['hourlyStart', 'hourlyEnd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this._calcHourly());
    });

    // Open buttons
    const nlb = document.getElementById('newLeaveBtn');
    if (nlb) nlb.addEventListener('click', () => this.open());
    const dnlb = document.getElementById('dashNewLeaveBtn');
    if (dnlb) dnlb.addEventListener('click', () => this.open());

    // Close buttons
    ['leaveModalClose', 'leaveModalCancel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => closeModal('leaveModal'));
    });
    const dmc = document.getElementById('detailModalClose');
    if (dmc) dmc.addEventListener('click', () => closeModal('detailModal'));

    // Submit
    const lsb = document.getElementById('leaveSubmitBtn');
    if (lsb) lsb.addEventListener('click', () => this._submit());

    // Reject modal
    ['rejectModalClose', 'rejectModalCancel'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => closeModal('rejectModal'));
    });
    const rcb = document.getElementById('rejectConfirmBtn');
    if (rcb) rcb.addEventListener('click', () => this._confirmReject());

    // Populate leave types
    this._populateLeaveTypes();

    // Default dates
    const today = todayStr();
    const ds = document.getElementById('dailyStart');
    if (ds) ds.value = today;
    const de = document.getElementById('dailyEnd');
    if (de) de.value = today;
    const hd = document.getElementById('hourlyDate');
    if (hd) hd.value = today;
  },

  open() {
    this._clearForm();
    this._populateLeaveTypes();
    const today = todayStr();
    document.getElementById('dailyStart').value = today;
    document.getElementById('dailyEnd').value   = today;
    document.getElementById('hourlyDate').value  = today;
    this._calcDaily();
    openModal('leaveModal');
  },

  _switchTab(tab) {
    this._currentTab = tab;
    document.querySelectorAll('.tab-btn[data-tab]').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('[id^="tabContent"]').forEach(c => c.classList.remove('active'));
    document.getElementById(`tabContent${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    document.getElementById('leaveFormError').style.display = 'none';
  },

  _populateLeaveTypes() {
    const sel = document.getElementById('leaveTypeSelect');
    const types = LeaveTypes.active();
    sel.innerHTML = types.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  },

  _calcDaily() {
    const s = document.getElementById('dailyStart').value;
    const e = document.getElementById('dailyEnd').value;
    if (!s) return;
    const end = e || s;
    const days = calcDailyDuration(s, end);
    const disp = document.getElementById('dailyDurationDisplay');
    const val  = document.getElementById('dailyDurationValue');
    disp.style.display = 'flex';
    val.textContent = days > 0 ? `${days} iş günü` : 'Geçersiz tarih aralığı';
  },

  _calcHourly() {
    const s = document.getElementById('hourlyStart').value;
    const e = document.getElementById('hourlyEnd').value;
    if (!s || !e) return;
    const hrs = calcHourlyDuration(s, e);
    const disp = document.getElementById('hourlyDurationDisplay');
    const val  = document.getElementById('hourlyDurationValue');
    disp.style.display = 'flex';
    const h = Math.floor(hrs);
    const m = Math.round((hrs - h) * 60);
    val.textContent = hrs > 0
      ? (m > 0 ? `${h} saat ${m} dakika` : `${h} saat`)
      : 'Geçersiz saat aralığı';
  },

  _clearForm() {
    ['dailyStart','dailyEnd','hourlyDate','hourlyStart','hourlyEnd','leaveDescription'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('dailyDurationDisplay').style.display  = 'none';
    document.getElementById('hourlyDurationDisplay').style.display = 'none';
    document.getElementById('leaveFormError').style.display = 'none';
    this._switchTab('daily');
  },

  async _submit() {
    if (this._processing) return;

    const errBox = document.getElementById('leaveFormError');
    const errMsg = document.getElementById('leaveFormErrorMsg');
    errBox.style.display = 'none';

    const typeId = document.getElementById('leaveTypeSelect').value;
    const desc   = document.getElementById('leaveDescription').value.trim();
    let data = { userId: Auth.userId(), leaveTypeKey: typeId, description: desc };

    if (this._currentTab === 'daily') {
      const start = document.getElementById('dailyStart').value;
      const end   = document.getElementById('dailyEnd').value;
      if (!start || !end) { errMsg.textContent = 'Lütfen tarih aralığını girin.'; errBox.style.display = 'flex'; return; }
      if (start > end)    { errMsg.textContent = 'Bitiş tarihi başlangıçtan önce olamaz.'; errBox.style.display = 'flex'; return; }
      const duration = calcDailyDuration(start, end);
      if (duration === 0) { errMsg.textContent = 'Seçilen tarihler iş günü içermiyor.'; errBox.style.display = 'flex'; return; }
      data = { ...data, type: 'daily', startDate: start, endDate: end, duration };
    } else {
      const date  = document.getElementById('hourlyDate').value;
      const start = document.getElementById('hourlyStart').value;
      const end   = document.getElementById('hourlyEnd').value;
      if (!date || !start || !end) { errMsg.textContent = 'Lütfen tüm saat bilgilerini girin.'; errBox.style.display = 'flex'; return; }
      const duration = calcHourlyDuration(start, end);
      if (duration <= 0) { errMsg.textContent = 'Geçerli bir saat aralığı girin.'; errBox.style.display = 'flex'; return; }
      data = { ...data, type: 'hourly', startDate: date, endDate: date, startTime: start, endTime: end, duration };
    }

    this._processing = true;
    try {
      const leave = await Leaves.create(data);
      closeModal('leaveModal');
      toast('İzin talebiniz başarıyla oluşturuldu!', 'success');

      // Telegram notification
      if(leave) Telegram.notifyNewLeave(leave);

      // Refresh current view
      Router._onNavigate(Router.current);
      Dashboard._updatePendingBadge();
    } catch (err) {
      console.error(err);
    } finally {
      this._processing = false;
    }
  },

  // ── Detail Modal ─────────────────────────────────────────────
  showDetail(leaveId) {
    const leave = Leaves.byId(leaveId);
    if (!leave) return;
    const user = Users.byId(leave.userId);
    const isAdmin = Auth.isAdmin();

    const body = document.getElementById('detailModalBody');
    const footer = document.getElementById('detailModalFooter');

    let dateInfo = '';
    if (leave.type === 'hourly') {
      dateInfo = `
        <div class="detail-row"><div class="detail-label">Tarih</div><div class="detail-value">${formatDate(leave.startDate)}</div></div>
        <div class="detail-row"><div class="detail-label">Saat Aralığı</div><div class="detail-value">${leave.startTime} – ${leave.endTime}</div></div>
        <div class="detail-row"><div class="detail-label">Süre</div><div class="detail-value">${formatDuration(leave)}</div></div>
      `;
    } else {
      dateInfo = `
        <div class="detail-row"><div class="detail-label">Başlangıç</div><div class="detail-value">${formatDate(leave.startDate)}</div></div>
        <div class="detail-row"><div class="detail-label">Bitiş</div><div class="detail-value">${formatDate(leave.endDate)}</div></div>
        <div class="detail-row"><div class="detail-label">Süre</div><div class="detail-value">${formatDuration(leave)}</div></div>
      `;
    }

    body.innerHTML = `
      <div class="detail-grid">
        <div class="detail-row">
          <div class="detail-label">Personel</div>
          <div class="detail-value">${leave.userName}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Departman</div>
          <div class="detail-value">${leave.userDept || '—'}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">İzin Türü</div>
          <div class="detail-value">${leave.leaveTypeName}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Durum</div>
          <div class="detail-value">${statusBadge(leave.status)}</div>
        </div>
        ${dateInfo}
        <div class="detail-row">
          <div class="detail-label">Oluşturulma</div>
          <div class="detail-value">${formatDateTime(leave.createdAt)}</div>
        </div>
        ${leave.approvedBy ? `
        <div class="detail-row">
          <div class="detail-label">Onaylayan</div>
          <div class="detail-value">${leave.approvedByName}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Onay Tarihi</div>
          <div class="detail-value">${formatDateTime(leave.approvedAt)}</div>
        </div>` : ''}
        ${leave.description ? `<div class="detail-row" style="grid-column:span 2">
          <div class="detail-label">Açıklama</div>
          <div class="detail-value">${leave.description}</div>
        </div>` : ''}
      </div>
      ${leave.status === 'rejected' && leave.rejectionReason ? `
        <div class="rejection-box" style="margin-top:16px">
          <div class="rejection-box-label">Red Nedeni</div>
          <div class="rejection-box-text">${leave.rejectionReason}</div>
        </div>` : ''}
    `;

    footer.innerHTML = '';
    if (isAdmin && leave.status === 'pending') {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal('detailModal')">Kapat</button>
        <button class="btn btn-danger btn-sm" onclick="LeaveForm.openReject('${leave.id}');closeModal('detailModal')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Reddet
        </button>
        <button class="btn btn-success btn-sm" onclick="LeaveForm.approve('${leave.id}');closeModal('detailModal')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Onayla
        </button>
      `;
    } else if (!isAdmin && leave.status === 'pending') {
      footer.innerHTML = `
        <button class="btn btn-outline" onclick="closeModal('detailModal')">Kapat</button>
        <button class="btn btn-danger btn-sm" onclick="LeaveForm.cancel('${leave.id}')">İptal Et</button>
      `;
    } else {
      footer.innerHTML = `<button class="btn btn-outline" onclick="closeModal('detailModal')">Kapat</button>`;
    }

    openModal('detailModal');
  },

  async approve(leaveId) {
    if (this._processing) return;
    this._processing = true;
    try {
      await Leaves.updateStatus(leaveId, 'approved');
      toast('İzin talebi onaylandı.', 'success');
      const updated = Leaves.byId(leaveId);
      if (updated) {
        await Telegram.notifyLeaveDecision(updated).catch(e => console.error('[Telegram Error]:', e));
      }
      Dashboard._updatePendingBadge();
      Router._onNavigate(Router.current);
    } catch (err) {
      toast('İşlem başarısız.', 'error');
    } finally {
      this._processing = false;
    }
  },

  openReject(leaveId) {
    this._rejectLeaveId = leaveId;
    document.getElementById('rejectionReasonInput').value = '';
    openModal('rejectModal');
  },

  async _confirmReject() {
    if (this._processing) return;
    const reason = document.getElementById('rejectionReasonInput').value.trim();
    if (!reason) { toast('Lütfen red nedeni girin.', 'warning'); return; }
    this._processing = true;
    try {
      await Leaves.updateStatus(this._rejectLeaveId, 'rejected', reason);
      closeModal('rejectModal');
      toast('İzin talebi reddedildi.', 'error');
      const updated = Leaves.byId(this._rejectLeaveId);
      if (updated) {
        await Telegram.notifyLeaveDecision(updated).catch(e => console.error('[Telegram Error]:', e));
      }
      Dashboard._updatePendingBadge();
      Router._onNavigate(Router.current);
    } catch (err) {
      toast('İşlem başarısız.', 'error');
    } finally {
      this._processing = false;
    }
  },

  async cancel(leaveId) {
    if (!confirm('Bu izin talebini iptal etmek istediğinizden emin misiniz?')) return;
    try {
      await Leaves.updateStatus(leaveId, 'cancelled');
      toast('İzin talebi iptal edildi.', 'success');
      closeModal('detailModal');
      Dashboard._updatePendingBadge();
      Router._onNavigate(Router.current);
    } catch (err) {
      toast('İşlem başarısız.', 'error');
    }
  }
};
