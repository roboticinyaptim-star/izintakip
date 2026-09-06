/* ============================================================
   company.js — Multi-company management layer
   Firma kayıt, firma kodu, izolasyon
   ============================================================ */

const DB_COMPANIES = 'izt_companies';

const Companies = {
  all()       { return dbGet(DB_COMPANIES); },
  save(list)  { dbSet(DB_COMPANIES, list); },
  byId(id)    {
    if (id === 'system') {
      return { id: 'system', name: 'Tüm Şirketler (Sistem Yönetimi)', code: 'SYSTEM', createdAt: new Date().toISOString() };
    }
    return Companies.all().find(c => c.id === id) || null;
  },

  delete(companyId) {
    // 1. Şirketi sil
    const companies = Companies.all().filter(c => c.id !== companyId);
    Companies.save(companies);
    // 2. Şirkete ait kullanıcıları sil
    const users = Users.all().filter(u => u.companyId !== companyId);
    Users.save(users);
    // 3. Şirkete ait izinleri sil
    const leaves = Leaves.all().filter(l => l.companyId !== companyId);
    Leaves.save(leaves);
  },

  create(data) {
    const companies = Companies.all();
    const id   = genId('c');
    const code = id.replace('c_', '').slice(0, 8).toUpperCase();
    const company = {
      id,
      code,
      name:      data.name,
      adminId:   null,           // admin oluşturulduktan sonra set edilir
      createdAt: new Date().toISOString(),
    };
    companies.push(company);
    Companies.save(companies);
    return company;
  },

  setAdmin(companyId, adminId) {
    const companies = Companies.all();
    const idx = companies.findIndex(c => c.id === companyId);
    if (idx === -1) return;
    companies[idx].adminId = adminId;
    Companies.save(companies);
  },

  /* Firma oluştur + admin hesabını da oluştur (tek işlemde) */
  register(companyName, adminData) {
    // Şirket adı kontrolü
    const existing = Companies.all().find(c =>
      c.name.toLowerCase() === companyName.toLowerCase()
    );
    if (existing) return { error: 'Bu firma adı zaten kayıtlı.' };

    // Admin e-posta kontrolü (global)
    const existingUser = Users.all().find(u =>
      u.email === adminData.email || u.username === adminData.username
    );
    if (existingUser) return { error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' };

    // 1. Firma oluştur
    const company = Companies.create({ name: companyName });

    // 2. Admin kullanıcı oluştur
    const admin = Users.create({
      companyId:   company.id,
      name:        adminData.name,
      username:    adminData.username,
      email:       adminData.email,
      password:    adminData.password,
      role:        'admin',
      department:  'Yönetim',
      leaveTotal:  0,
      hourlyTotal: 0,
    });

    // 3. Firma'ya admin ID'yi bağla
    Companies.setAdmin(company.id, admin.id);

    return { company, admin };
  }
};
