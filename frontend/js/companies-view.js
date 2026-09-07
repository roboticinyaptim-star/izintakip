// Şirketler yönetim servisi
const CompaniesView = {
  _searchQuery: '',

  init() {
    const searchInput = document.getElementById('companySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = e.target.value.toLowerCase().trim();
        this._renderTable();
      });
    }

    const excelBtn = document.getElementById('companiesExcelBtn');
    if (excelBtn) {
      excelBtn.addEventListener('click', () => this.exportExcel());
    }
  },

  // Excel dışa aktar
  exportExcel() {
    if (typeof XLSX === 'undefined') {
      toast('Excel kütüphanesi yüklenemedi.', 'error');
      return;
    }

    let companies = Companies.all();
    if (this._searchQuery) {
      companies = companies.filter(c => {
        const admin = Users.byId(c.adminId) || Users.all().find(u => u.companyId === c.id && u.role === 'admin');
        return c.name.toLowerCase().includes(this._searchQuery) ||
               (admin && admin.name.toLowerCase().includes(this._searchQuery));
      });
    }

    if (companies.length === 0) {
      toast('Dışa aktarılacak veri bulunamadı.', 'warning');
      return;
    }

    const rows = companies.map(c => {
      const admin = Users.byId(c.adminId) || Users.all().find(u => u.companyId === c.id && u.role === 'admin');
      const staffCount = Users.all().filter(u => u.companyId === c.id && u.role === 'staff').length;
      const leaveCount = Leaves.all().filter(l => l.companyId === c.id).length;
      const pendingCount = Leaves.all().filter(l => l.companyId === c.id && l.status === 'pending').length;

      return {
        'Kurum Adı': c.name,
        'Kurum Kodu': c.code || '',
        'Kurum Yöneticisi': admin ? admin.name : '',
        'Yönetici E-posta': admin ? admin.email : '',
        'Personel Sayısı': staffCount,
        'Toplam İzin Talebi': leaveCount,
        'Bekleyen İzin': pendingCount,
        'Kayıt Tarihi': formatDateTime(c.createdAt || new Date()).split(' ')[0]
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [20, 15, 20, 25, 15, 20, 15, 15];
    ws['!cols'] = colWidths.map(w => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Şirketler');

    const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g,'-');
    XLSX.writeFile(wb, `sirket-listesi-${dateStr}.xlsx`);
    toast('Excel dosyası indirildi.', 'success');
  },

  render() {
    this._renderStats();
    this._renderTable();
  },

  // İstatistikleri hesapla
  _renderStats() {
    const companies = Companies.all();
    const staff = Users.all().filter(u => u.role === 'staff');
    const leaves = Leaves.all();
    const pending = leaves.filter(l => l.status === 'pending');

    document.getElementById('statTotalCompanies').textContent = companies.length;
    document.getElementById('statTotalStaff').textContent     = staff.length;
    document.getElementById('statTotalLeaves').textContent    = leaves.length;
    document.getElementById('statPendingLeaves').textContent  = pending.length;
  },

  // Şirketler tablosunu çiz
  _renderTable() {
    const tbody = document.getElementById('companiesTableBody');
    if (!tbody) return;

    let companies = Companies.all();

    if (this._searchQuery) {
      companies = companies.filter(c => {
        const admin = Users.byId(c.adminId);
        const nameMatch  = c.name.toLowerCase().includes(this._searchQuery);
        const adminMatch = admin && (admin.name.toLowerCase().includes(this._searchQuery) || admin.email.toLowerCase().includes(this._searchQuery));
        return nameMatch || adminMatch;
      });
    }

    if (companies.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:36px;color:var(--text-muted)">Kayıtlı kurum bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = companies.map(c => {
      const admin = Users.byId(c.adminId) || Users.all().find(u => u.companyId === c.id && u.role === 'admin');
      const staffCount = Users.all().filter(u => u.companyId === c.id && u.role === 'staff').length;
      const leaveCount = Leaves.all().filter(l => l.companyId === c.id).length;
      const pendingCount = Leaves.all().filter(l => l.companyId === c.id && l.status === 'pending').length;

      return `
        <tr>
          <td>
            <strong>${c.name}</strong>
            <div style="font-size:.72rem;color:var(--text-muted)">Kod: ${c.code || '—'}</div>
          </td>
          <td>${admin ? admin.name : '—'}</td>
          <td style="font-size:.82rem;color:var(--text-secondary)">${admin ? admin.email : '—'}</td>
          <td>
            <span class="badge" style="background:rgba(31,170,107,.1);color:#1faa6b;font-weight:700">
              ${staffCount} Personel
            </span>
          </td>
          <td>
            <span style="font-size:.82rem;font-weight:600">${leaveCount} talep</span>
            ${pendingCount > 0 ? `<span class="badge badge-pending" style="margin-left:4px">${pendingCount} bekleyen</span>` : ''}
          </td>
          <td style="font-size:.78rem;color:var(--text-muted)">${formatDateTime(c.createdAt || new Date()).split(' ')[0]}</td>
          <td style="text-align:right; white-space:nowrap;">
            <button class="btn btn-outline btn-sm" onclick="CompaniesView.showStaff('${c.id}')" style="margin-right:6px">
              Personelleri Gör
            </button>
            <button class="btn btn-danger btn-sm" onclick="CompaniesView.deleteCompany('${c.id}')">
              Sil
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  // Şirket personelini listele
  showStaff(companyId) {
    const company = Companies.byId(companyId);
    if (!company) return;

    const staffList = Users.all().filter(u => u.companyId === companyId);
    const title = document.getElementById('companyDetailTitle');
    const body = document.getElementById('companyDetailBody');

    title.textContent = `${company.name} — Kullanıcı ve Personel Listesi`;

    if (staffList.length === 0) {
      body.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:24px">Bu kuruma ait kayıtlı kullanıcı bulunmuyor.</p>';
    } else {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px">
          ${staffList.map(u => `
            <div class="user-card">
              <div class="user-card-avatar">${initials(u.name)}</div>
              <div class="user-card-info">
                <div class="user-card-name">
                  ${u.name}
                  <span class="badge badge-${u.role}" style="margin-left:6px">${u.role === 'admin' ? 'Yönetici' : 'Personel'}</span>
                  ${u.isActive ? '' : '<span style="font-size:.7rem;color:var(--danger)">(Pasif)</span>'}
                </div>
                <div class="user-card-email">${u.email} • ${u.department || 'Genel'} • Kalan İzin: ${u.leaveBalance?.remaining || 0} gün</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    openModal('companyDetailModal');
  },

  // Şirketi sil
  deleteCompany(companyId) {
    const company = Companies.byId(companyId);
    if (!company) return;

    if (!confirm(`"${company.name}" kurumunu ve kuruma ait TÜM personel ve izin kayıtlarını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    Companies.delete(companyId);
    toast(`"${company.name}" kurumu başarıyla silindi.`, 'success');
    this.render();
  }
};
