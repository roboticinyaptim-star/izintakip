// Veri köprüsü — Railway'de otomatik origin, dosyadan açılırsa localhost:3000
const API_BASE = (window.location.protocol === 'file:')
  ? 'http://localhost:3000/api'
  : `${window.location.origin}/api`;

// Yerel önbellek
const DB = {
  companies: [],
  users: [],
  leaves: [],
  leaveTypes: [],
  settings: {},
};

// Aktif şirket bilgisi
const CurrentCompany = {
  _id: null,
  set(id) { this._id = id; },
  get()   { return this._id; },
};

// Sunucu istek fonksiyonu
async function apiFetch(endpoint, options = {}) {
  const token = sessionStorage.getItem('izt_token') || localStorage.getItem('izt_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Hatası: ${response.status}`);
  }
  
  return response.json();
}

// Kullanıcı modelini dönüştür
function mapUser(u) {
  return {
    ...u,
    companyId: u.company_id || u.companyId,
    isActive: u.is_active !== undefined ? Boolean(u.is_active) : Boolean(u.isActive),
    telegramChatId: u.telegram_chat_id || u.telegramChatId,
    createdAt: u.created_at || u.createdAt,
    leaveBalance: {
      total: u.leave_total !== undefined ? u.leave_total : (u.leaveBalance?.total || 0),
      used: u.leave_used !== undefined ? u.leave_used : (u.leaveBalance?.used || 0),
      pending: u.leave_pending !== undefined ? u.leave_pending : (u.leaveBalance?.pending || 0),
      remaining: u.leave_remaining !== undefined ? u.leave_remaining : (u.leaveBalance?.remaining || 0),
      hourlyTotal: u.hourly_total !== undefined ? u.hourly_total : (u.leaveBalance?.hourlyTotal || 0),
      hourlyUsed: u.hourly_used !== undefined ? u.hourly_used : (u.leaveBalance?.hourlyUsed || 0)
    }
  };
}

// Sunucudan verileri yükle
async function initializeDataFromAPI() {
  const user = JSON.parse(sessionStorage.getItem('izt_user') || localStorage.getItem('izt_user') || 'null');
  if (!user) return false;

  CurrentCompany.set(user.companyId);

  // İzin detaylarını birleştir
  const enrichLeaves = (rawLeaves) => {
    return rawLeaves.map(l => {
      const uid = l.user_id || l.userId;
      const user = DB.users.find(u => u.id === uid);
      const uName = user ? user.name : 'Bilinmeyen Kullanıcı';
      const uDept = user ? user.department : '';
      
      const typeKey = l.leave_type_key || l.leaveTypeKey;
      const typeObj = LeaveTypes.byKey(typeKey);
      const tName = typeObj ? typeObj.name : 'Belirtilmemiş İzin';

      return {
        ...l,
        userId: uid,
        companyId: l.company_id || l.companyId,
        leaveType: l.leave_type || l.leaveType,
        leaveTypeKey: typeKey,
        leaveTypeId: typeObj ? typeObj.id : typeKey,
        startDate: l.start_date ? l.start_date.substring(0, 10) : l.startDate || '',
        endDate: l.end_date ? l.end_date.substring(0, 10) : l.endDate || '',
        returnDate: l.return_date ? l.return_date.substring(0, 10) : l.returnDate || '',
        startTime: l.start_time || l.startTime || null,
        endTime: l.end_time || l.endTime || null,
        rejectionReason: l.rejection_reason || l.rejectionReason,
        approvedBy: l.approved_by || l.approvedBy || null,
        approvedAt: l.approved_at || l.approvedAt || null,
        createdAt: l.created_at || l.createdAt,
        userName: uName,
        userDept: uDept,
        leaveTypeName: tName
      };
    });
  };

  window._enrichLeaves = enrichLeaves;

  try {
    if (user.role === 'superadmin') {
      // Süper yönetici verileri
      DB.companies = await apiFetch('/companies');
      const usersRaw = await apiFetch('/users');
      DB.users = usersRaw.map(mapUser);
    } else if (user.role === 'admin') {
      // Şirket yöneticisi verileri
      const usersRaw = await apiFetch('/users');
      DB.users = usersRaw.map(mapUser);
      const leavesRaw = await apiFetch('/leaves');
      DB.leaves = enrichLeaves(leavesRaw);
    } else {
      // Personel verileri
      const leavesRaw = await apiFetch('/leaves');
      try {
        const usersRaw = await apiFetch('/users');
        DB.users = usersRaw.map(mapUser);
      } catch {
        DB.users = [{ ...user, leaveBalance: { total: 0, used: 0, pending: 0, remaining: 0, hourlyTotal: 0, hourlyUsed: 0 } }];
      }
      DB.leaves = enrichLeaves(leavesRaw);
    }

    // Şirket ayarlarını yükle
    if (user.companyId && user.companyId !== 'system') {
      try {
        const companySettings = await apiFetch('/companies/settings');
        if (companySettings) {
          Settings.update(companySettings, false);
        }
      } catch (_) {}
    }

    return true;
  } catch (error) {
    console.error('Veri yüklenemedi:', error);
    return false;
  }
}

// Kullanıcı servis nesnesi
const Users = {
  all()          { return DB.users; },
  ofCompany(cid) { return DB.users; },
  active()       { return DB.users.filter(u => Boolean(u.isActive)); },
  staff()        { return Users.active().filter(u => u.role === 'staff'); },
  byId(id)       { return DB.users.find(u => u.id === id) || null; },
  
  // Yeni personel oluştur
  async create(data) {
    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const usersRaw = await apiFetch('/users');
      DB.users = usersRaw.map(mapUser);
      return res.id;
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  },

  // Personel bilgilerini güncelle
  async update(id, updates) {
    try {
      await apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
      const usersRaw = await apiFetch('/users');
      DB.users = usersRaw.map(mapUser);
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  },

  // Personel durumunu değiştir
  async setActive(id, isActive) {
    return await this.update(id, { isActive });
  },

  // Personeli sil
  async delete(id) {
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      const usersRaw = await apiFetch('/users');
      DB.users = usersRaw.map(mapUser);
      if (typeof window._enrichLeaves === 'function') {
        try {
          const leavesRaw = await apiFetch('/leaves');
          DB.leaves = window._enrichLeaves(leavesRaw);
        } catch (_) {}
      }
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  }
};

// Şirket servis nesnesi
const Companies = {
  all()      { return DB.companies; },
  byId(id)   { return DB.companies.find(c => c.id === id) || null; },
  
  // Şirketi sil
  async delete(id) {
    try {
      await apiFetch(`/companies/${id}`, { method: 'DELETE' });
      DB.companies = await apiFetch('/companies');
    } catch (err) {
      toast(err.message, 'error');
    }
  }
};

// İzin servis nesnesi
const Leaves = {
  all()          { return DB.leaves; },
  ofCompany()    { return DB.leaves; },
  ofUser(uid)    { return DB.leaves.filter(l => l.userId === uid); },
  byUser(uid)    { return this.ofUser(uid); },
  pending()      { return DB.leaves.filter(l => l.status === 'pending'); },
  byId(id)       { return DB.leaves.find(l => l.id === id) || null; },
  
  // İzinleri filtrele
  filter(criteria = {}) {
    let list = this.all() || [];
    if (criteria.userId) {
      list = list.filter(l => l.userId === criteria.userId);
    }
    if (criteria.leaveTypeId) {
      list = list.filter(l => 
        l.leaveTypeId === criteria.leaveTypeId || 
        l.leaveTypeKey === criteria.leaveTypeId ||
        (LeaveTypes.byKey(criteria.leaveTypeId) && l.leaveTypeName === LeaveTypes.byKey(criteria.leaveTypeId).name)
      );
    }
    if (criteria.status) {
      list = list.filter(l => l.status === criteria.status);
    }
    if (criteria.startDate) {
      list = list.filter(l => (l.startDate ? l.startDate.substring(0, 10) : '') >= criteria.startDate);
    }
    if (criteria.endDate) {
      list = list.filter(l => (l.endDate ? l.endDate.substring(0, 10) : (l.startDate ? l.startDate.substring(0, 10) : '')) <= criteria.endDate);
    }
    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },

  // Yeni izin talebi
  async create(data) {
    try {
      const res = await apiFetch('/leaves', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const leavesRaw = await apiFetch('/leaves');
      DB.leaves = window._enrichLeaves(leavesRaw);
      return res && res.id ? Leaves.byId(res.id) : (DB.leaves.length > 0 ? DB.leaves[0] : null);
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  },

  // İzin durumunu güncelle
  async updateStatus(id, newStatus, reason = '') {
    try {
      await apiFetch(`/leaves/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, rejectionReason: reason })
      });
      const leavesRaw = await apiFetch('/leaves');
      DB.leaves = window._enrichLeaves(leavesRaw);
    } catch (err) {
      toast(err.message, 'error');
      throw err;
    }
  }
};

// İzin türleri nesnesi
const LeaveTypes = {
  _default: [
    { id: 't1', key: 'annual', name: 'Yıllık İzin', requiresApproval: true, isActive: true },
    { id: 't2', key: 'excuse', name: 'Mazeret İzni', requiresApproval: true, isActive: true },
    { id: 't3', key: 'sick', name: 'Hastalık İzni', requiresApproval: true, isActive: true }
  ],
  all() { 
    const stored = localStorage.getItem('izt_leave_types');
    return stored ? JSON.parse(stored) : this._default;
  },
  active() { return this.all().filter(t => t.isActive); },
  save(types) { localStorage.setItem('izt_leave_types', JSON.stringify(types)); },
  ofCompany() { return this.all(); },
  byKey(key)  { return this.all().find(t => t.key === key || t.id === key); },
  byId(id)    { return this.all().find(t => t.id === id); },
  create(name) {
    const types = this.all();
    const newType = { id: 't_' + Date.now(), key: 'custom_' + Date.now(), name, requiresApproval: true, isActive: true };
    types.push(newType);
    this.save(types);
  },
  update(id, updates) {
    const types = this.all();
    const idx = types.findIndex(t => t.id === id);
    if (idx !== -1) {
      types[idx] = { ...types[idx], ...updates };
      this.save(types);
    }
  },
  toggle(id) {
    const types = this.all();
    const idx = types.findIndex(t => t.id === id);
    if (idx !== -1) {
      types[idx].isActive = !types[idx].isActive;
      this.save(types);
    }
  }
};

// Ayarlar ve kayıtlar
const Settings = {
  get() { return JSON.parse(localStorage.getItem('izt_settings') || '{}'); },
  async update(updates, syncBackend = true) { 
    const current = this.get();
    const merged = { ...current, ...updates };
    localStorage.setItem('izt_settings', JSON.stringify(merged));
    if (syncBackend) {
      try {
        await apiFetch('/companies/settings', {
          method: 'PUT',
          body: JSON.stringify({
            telegramBotToken: merged.telegramBotToken || null,
            telegramChatId: merged.telegramChatId || null
          })
        });
      } catch (err) {
        console.warn('[Settings] Backend senkronizasyon hatası:', err);
      }
    }
  }
};

// Hata kayıtları
const ErrorLogs = {
  all() { return JSON.parse(localStorage.getItem('izt_logs') || '[]'); },
  save(logs) { localStorage.setItem('izt_logs', JSON.stringify(logs)); },
  add(message, details = '') {
    const logs = this.all();
    logs.unshift({
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      message: String(message),
      details: typeof details === 'object' ? JSON.stringify(details) : String(details)
    });
    this.save(logs.slice(0, 30));
  }
};

// Global nesneleri dışaaktar
window.DB_CACHE = DB;
window.Users = Users;
window.Companies = Companies;
window.Leaves = Leaves;
window.LeaveTypes = LeaveTypes;
window.CurrentCompany = CurrentCompany;
window.Settings = Settings;
window.ErrorLogs = ErrorLogs;
window.initializeDataFromAPI = initializeDataFromAPI;
window.apiFetch = apiFetch;
