// Raporlama servisi
const Reports = {
  _results: [],

  render() {
    this._populateDropdowns();
    this._applyFilters();
  },

  // Açılır menüleri doldur
  _populateDropdowns() {
    // Personel listesi
    const userSel = document.getElementById('rptUser');
    if (userSel) {
      const users = Users.all().filter(u => u.role !== 'superadmin');
      userSel.innerHTML = '<option value="">Tümü (Tüm Personel)</option>' +
        users.map(u => `<option value="${u.id}">${u.name}${u.department ? ' — ' + u.department : ''}</option>`).join('');
    }

    // İzin türleri
    const typeSel = document.getElementById('rptType');
    if (typeSel) {
      const types = LeaveTypes.ofCompany();
      typeSel.innerHTML = '<option value="">Tümü (Tüm İzin Türleri)</option>' +
        types.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    }
  },

  _applyFilters() {
    const userEl  = document.getElementById('rptUser');
    const startEl = document.getElementById('rptStartDate');
    const endEl   = document.getElementById('rptEndDate');
    const typeEl  = document.getElementById('rptType');
    const statEl  = document.getElementById('rptStatus');

    const userId    = userEl  ? userEl.value  : '';
    const startDate = startEl ? startEl.value : '';
    const endDate   = endEl   ? endEl.value   : '';
    const typeId    = typeEl  ? typeEl.value  : '';
    const status    = statEl  ? statEl.value  : '';

    // İzin kayıtlarını getir
    if (typeof Leaves.filter === 'function') {
      this._results = Leaves.filter({ userId, startDate, endDate, leaveTypeId: typeId, status });
    } else {
      this._results = (Leaves.all() || []).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    const countEl = document.getElementById('rptCount');
    if (countEl) countEl.textContent = this._results.length;

    this._renderTable();
  },

  // Filtreleri sıfırla
  _resetFilters() {
    ['rptUser', 'rptStartDate', 'rptEndDate', 'rptType', 'rptStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this._applyFilters();
    toast('Filtreler sıfırlandı.', 'info');
  },

  // Rapor tablosunu çiz
  _renderTable() {
    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    if (this._results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:36px;color:var(--text-muted);font-size:.85rem">Filtrelere uygun izin kaydı bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = this._results.map(l => `
      <tr>
        <td>
          <strong style="color:var(--text-primary)">${l.userName || '—'}</strong>
          ${l.userDept ? `<br><span style="font-size:.7rem;color:var(--text-muted)">${l.userDept}</span>` : ''}
        </td>
        <td><span class="badge badge-accent" style="font-weight:600">${l.leaveTypeName || '—'}</span></td>
        <td>${formatDate(l.startDate)}${l.startTime ? ' ' + l.startTime : ''}</td>
        <td>${formatDate(l.endDate)}${l.endTime ? ' ' + l.endTime : ''}</td>
        <td><strong>${formatDuration(l)}</strong></td>
        <td style="max-width:180px;font-size:.78rem;color:var(--text-secondary);word-break:break-word">${l.description || '—'}</td>
        <td>${statusBadge(l.status)}</td>
        <td style="font-size:.78rem;color:var(--text-secondary)">${l.approvedByName || '—'}</td>
        <td style="font-size:.75rem;color:var(--text-muted)">${formatDateTime(l.createdAt)}</td>
      </tr>
    `).join('');
  },

  // Excel dışa aktar
  exportExcel() {
    if (this._exporting) return;
    this._exporting = true;
    setTimeout(() => { this._exporting = false; }, 1500);

    if (!this._results || this._results.length === 0) {
      toast('Dışa aktarılacak kayıt bulunamadı. Lütfen filtrelerinizi kontrol edin.', 'warning');
      return;
    }

    const rows = this._results.map(l => ({
      'Personel':         l.userName || '—',
      'Departman':        l.userDept || '—',
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
      'Oluşturulma':      formatDateTime(l.createdAt),
    }));

    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
    const fileName = `izin-raporu-${dateStr}`;

    // SheetJS excel çıktısı
    if (typeof XLSX !== 'undefined' && XLSX.utils) {
      try {
        const ws = XLSX.utils.json_to_sheet(rows);
        const colWidths = [18, 14, 16, 14, 12, 14, 12, 10, 30, 14, 18, 14, 20, 18];
        ws['!cols'] = colWidths.map(w => ({ wch: w }));

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'İzin Raporu');

        XLSX.writeFile(wb, `${fileName}.xlsx`);
        toast('Excel belgesi (.xlsx) başarıyla indirildi!', 'success');
        return;
      } catch (err) {
        console.warn('SheetJS hatası, HTML-Excel fallback deneniyor:', err);
      }
    }

    // Temel excel çıktısı
    try {
      const headers = Object.keys(rows[0]);
      let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8" /><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>İzin Raporu</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
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
      toast('Excel belgesi (.xls) başarıyla indirildi!', 'success');
    } catch (err) {
      console.error('Excel indirme hatası:', err);
      toast('Excel belgesi oluşturulurken hata oluştu.', 'error');
    }
  },

  // Olay dinleyicileri bağla
  init() {
    const rptBtn = document.getElementById('rptFilterBtn');
    if (rptBtn) rptBtn.addEventListener('click', () => this._applyFilters());

    const resetBtn = document.getElementById('rptResetBtn');
    if (resetBtn) resetBtn.addEventListener('click', () => this._resetFilters());

    const exportBtn = document.getElementById('exportExcelBtn');
    if (exportBtn) exportBtn.addEventListener('click', () => this.exportExcel());

    const exportBtn2 = document.getElementById('exportExcelBtn2');
    if (exportBtn2) exportBtn2.addEventListener('click', () => this.exportExcel());
  }
};
