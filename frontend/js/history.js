// İzin geçmişi modülü
const History = {
  _page: 1,
  _perPage: 10,
  _filtered: [],

  render() {
    this._page = 1;
    this._populateFilters();
    this._applyFilters();
  },

  // İzin türleri filtresi
  _populateFilters() {
    const typeSelect = document.getElementById('historyTypeFilter');
    if (typeSelect) {
      const types = LeaveTypes.all();
      typeSelect.innerHTML = '<option value="">Tüm Türler</option>' +
        types.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
  },

  _applyFilters() {
    const searchInput = document.getElementById('historySearch');
    const statusInput = document.getElementById('historyStatusFilter');
    const typeInput   = document.getElementById('historyTypeFilter');

    const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const status = statusInput ? statusInput.value : '';
    const type   = typeInput   ? typeInput.value : '';

    // Sadece kendi izinleri
    const currentUserId = Auth.userId();
    let results = Leaves.byUser(currentUserId).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (status) results = results.filter(l => l.status === status);
    if (type)   results = results.filter(l => l.leaveTypeId === type || l.leaveTypeKey === type);
    if (search) results = results.filter(l =>
      (l.leaveTypeName || '').toLowerCase().includes(search) ||
      (l.description || '').toLowerCase().includes(search)
    );

    this._filtered = results;
    this._page = 1;
    this._renderTable();
    this._renderPagination();
  },

  // Tabloyu çiz
  _renderTable() {
    const start = (this._page - 1) * this._perPage;
    const page  = this._filtered.slice(start, start + this._perPage);
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    if (page.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:36px;color:var(--text-muted);font-size:.85rem">Henüz izin kaydınız bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = page.map(l => `
      <tr>
        <td><strong style="color:var(--text-primary)">${l.leaveTypeName || '—'}</strong></td>
        <td>${formatDate(l.startDate)}${l.startTime ? ` ${l.startTime}` : ''}</td>
        <td>${formatDate(l.endDate)}${l.endTime ? ` ${l.endTime}` : ''}</td>
        <td><strong>${formatDuration(l)}</strong></td>
        <td style="max-width:180px;font-size:.78rem;color:var(--text-secondary);word-break:break-word">${l.description || '—'}</td>
        <td>${statusBadge(l.status)}</td>
        <td style="color:var(--text-muted);font-size:.78rem">${formatDateTime(l.createdAt)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-ghost btn-sm btn-icon" title="Detay Görüntüle" onclick="LeaveForm.showDetail('${l.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            ${l.status === 'pending' ? `
            <button class="btn btn-danger btn-sm btn-icon" title="Talebi İptal Et" onclick="LeaveForm.cancel('${l.id}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  // Sayfalama kontrollerini çiz
  _renderPagination() {
    const total = this._filtered.length;
    const pages = Math.ceil(total / this._perPage);
    const container = document.getElementById('historyPagination');
    if (!container) return;

    const start = (this._page - 1) * this._perPage + 1;
    const end   = Math.min(this._page * this._perPage, total);

    if (total === 0) { container.innerHTML = ''; return; }

    let btns = '';
    for (let i = 1; i <= pages; i++) {
      btns += `<button class="pagination-btn${i === this._page ? ' active' : ''}" onclick="History._goPage(${i})">${i}</button>`;
    }
    container.innerHTML = `
      <span>${start}–${end} / ${total} kayıt</span>
      <div class="pagination-btns">${btns}</div>
    `;
  },

  _goPage(p) {
    this._page = p;
    this._renderTable();
    this._renderPagination();
  },

  // Excel olarak aktar
  exportExcel() {
    if (this._exporting) return;
    this._exporting = true;
    setTimeout(() => { this._exporting = false; }, 1500);

    if (!this._filtered || this._filtered.length === 0) {
      toast('Dışa aktarılacak izin kaydı bulunamadı.', 'warning');
      return;
    }

    const u = Auth.user();
    const rows = this._filtered.map(l => ({
      'İzin Türü':        l.leaveTypeName || '—',
      'Başlangıç Tarihi': formatDate(l.startDate),
      'Başlangıç Saati':  l.startTime || '—',
      'Bitiş Tarihi':     formatDate(l.endDate),
      'Bitiş Saati':      l.endTime || '—',
      'Süre':             l.type === 'hourly'
        ? `${Math.floor(l.duration)}s ${Math.round((l.duration % 1) * 60)}dk`
        : `${l.duration} gün`,
      'Açıklama':         l.description || '—',
      'Durum':            statusLabel(l.status),
      'Onaylayan':        l.approvedByName || '—',
      'Onay Tarihi':      l.approvedAt ? formatDateTime(l.approvedAt) : '—',
      'Red Nedeni':       l.rejectionReason || '—',
      'Talep Tarihi':     formatDateTime(l.createdAt),
    }));

    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
    const safeName = (u?.name || 'Kullanici').replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ_]/g, '_');
    const fileName = `izin-gecmisi-${safeName}-${dateStr}`;

    // SheetJS excel dışaaktarımı
    if (typeof XLSX !== 'undefined' && XLSX.utils) {
      try {
        const ws = XLSX.utils.json_to_sheet(rows);
        const colWidths = [18, 16, 14, 16, 14, 12, 30, 14, 18, 16, 20, 18];
        ws['!cols'] = colWidths.map(w => ({ wch: w }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'İzin Geçmişim');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
        toast('İzin geçmişiniz Excel (.xlsx) olarak indirildi!', 'success');
        return;
      } catch (err) {
        console.warn('SheetJS hatası, fallback deneniyor:', err);
      }
    }

    // Temel excel dışaaktarımı
    try {
      const headers = Object.keys(rows[0]);
      let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>İzin Geçmişim</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body><table border="1"><thead><tr style="background-color:#0f1f3d;color:#ffffff;font-weight:bold;">`;
      headers.forEach(h => { tableHtml += `<th style="padding:8px 12px;">${h}</th>`; });
      tableHtml += `</tr></thead><tbody>`;
      rows.forEach(r => {
        tableHtml += `<tr>`;
        headers.forEach(h => { tableHtml += `<td style="padding:6px 10px;">${r[h] || ''}</td>`; });
        tableHtml += `</tr>`;
      });
      tableHtml += `</tbody></table></body></html>`;

      const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast('İzin geçmişiniz Excel (.xls) olarak indirildi!', 'success');
    } catch (err) {
      console.error('Excel indirme hatası:', err);
      toast('Excel belgesi oluşturulurken hata oluştu.', 'error');
    }
  },

  // Olay dinleyicileri bağla
  init() {
    const searchEl = document.getElementById('historySearch');
    if (searchEl) searchEl.addEventListener('input', () => { this._page = 1; this._applyFilters(); });

    const statusEl = document.getElementById('historyStatusFilter');
    if (statusEl) statusEl.addEventListener('change', () => { this._page = 1; this._applyFilters(); });

    const typeEl = document.getElementById('historyTypeFilter');
    if (typeEl) typeEl.addEventListener('change', () => { this._page = 1; this._applyFilters(); });

    const excelBtn = document.getElementById('historyExcelBtn');
    if (excelBtn) excelBtn.addEventListener('click', () => this.exportExcel());
  }
};
