/* ============================================================
   approvals.js — Admin approval interface
   ============================================================ */

const Approvals = {
  _tab: 'pending',

  render() {
    this._renderTabs();
    this._renderContent();
  },

  _renderTabs() {
    document.querySelectorAll('.tab-btn[data-apptab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.apptab === this._tab);
    });
    const count = Leaves.pending().length;
    document.getElementById('appPendingCount').textContent = count;
  },

  _renderContent() {
    const container = document.getElementById('approvalsContent');
    const leaves = this._tab === 'pending'
      ? Leaves.pending().sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt))
      : Leaves.ofCompany().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));

    if (leaves.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            <p>${this._tab === 'pending' ? 'Bekleyen izin talebi yok' : 'İzin talebi bulunamadı'}</p>
          </div>
        </div>`;
      return;
    }

    container.innerHTML = leaves.map(l => this._cardHtml(l)).join('');
  },

  _cardHtml(leave) {
    const isPending = leave.status === 'pending';

    let dateInfo = '';
    if (leave.type === 'hourly') {
      dateInfo = `${formatDate(leave.startDate)}, ${leave.startTime} – ${leave.endTime}`;
    } else {
      dateInfo = `${formatDate(leave.startDate)}${leave.endDate !== leave.startDate ? ' – ' + formatDate(leave.endDate) : ''}`;
    }

    const actionsHtml = isPending ? `
      <div class="approval-card-actions">
        <button class="btn btn-success btn-sm" onclick="Approvals.approve('${leave.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px"><polyline points="20 6 9 17 4 12"/></svg>
          Onayla
        </button>
        <button class="btn btn-danger btn-sm" onclick="LeaveForm.openReject('${leave.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Reddet
        </button>
      </div>` : '';

    return `
      <div class="approval-card ${leave.status}" id="apcard-${leave.id}">
        <div class="approval-card-header">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="leave-item-avatar">${initials(leave.userName)}</div>
            <div>
              <div style="font-weight:700;color:var(--text-primary)">${leave.userName}</div>
              <div style="font-size:.75rem;color:var(--text-secondary)">${leave.userDept || ''}</div>
            </div>
          </div>
          ${actionsHtml}
        </div>
        <div class="detail-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
          <div class="detail-row">
            <div class="detail-label">İzin Türü</div>
            <div class="detail-value">${leave.leaveTypeName}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Tarih / Saat</div>
            <div class="detail-value">${dateInfo}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Süre</div>
            <div class="detail-value">${formatDuration(leave)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Durum</div>
            <div class="detail-value">${statusBadge(leave.status)}</div>
          </div>
          <div class="detail-row">
            <div class="detail-label">Talep Tarihi</div>
            <div class="detail-value">${formatDateTime(leave.createdAt)}</div>
          </div>
          ${leave.approvedByName ? `<div class="detail-row">
            <div class="detail-label">İşlem Yapan</div>
            <div class="detail-value">${leave.approvedByName}</div>
          </div>` : ''}
        </div>
        ${leave.description ? `<div style="margin-top:10px;font-size:.8rem;color:var(--text-secondary)">
          <strong>Açıklama:</strong> ${leave.description}
        </div>` : ''}
        ${leave.rejectionReason ? `
          <div class="rejection-box" style="margin-top:12px">
            <div class="rejection-box-label">Red Nedeni</div>
            <div class="rejection-box-text">${leave.rejectionReason}</div>
          </div>` : ''}
        <div style="margin-top:12px">
          <button class="btn btn-ghost btn-sm" onclick="LeaveForm.showDetail('${leave.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Detayı Gör
          </button>
        </div>
      </div>`;
  },

  approve(leaveId) {
    LeaveForm.approve(leaveId);
    // Re-render approvals after state change
    setTimeout(() => this.render(), 100);
  },

  init() {
    document.querySelectorAll('.tab-btn[data-apptab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._tab = btn.dataset.apptab;
        this._renderTabs();
        this._renderContent();
      });
    });
  }
};
