// Çoklu şirket servisi
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

  // Şirket verilerini sil
  delete(companyId) {
    const companies = Companies.all().filter(c => c.id !== companyId);
    Companies.save(companies);
    const users = Users.all().filter(u => u.companyId !== companyId);
    Users.save(users);
    const leaves = Leaves.all().filter(l => l.companyId !== companyId);
    Leaves.save(leaves);
  },

  // Yeni şirket oluştur
  create(data) {
    const companies = Companies.all();
    const id   = genId('c');
    const code = id.replace('c_', '').slice(0, 8).toUpperCase();
    const company = {
      id,
      code,
      name:      data.name,
      adminId:   null,
      createdAt: new Date().toISOString(),
    };
    companies.push(company);
    Companies.save(companies);
    return company;
  },

  // Şirket yöneticisini ata
  setAdmin(companyId, adminId) {
    const companies = Companies.all();
    const idx = companies.findIndex(c => c.id === companyId);
    if (idx === -1) return;
    companies[idx].adminId = adminId;
    Companies.save(companies);
  },

  // Şirket ve yönetici kaydı
  register(companyName, adminData) {
    const existing = Companies.all().find(c =>
      c.name.toLowerCase() === companyName.toLowerCase()
    );
    if (existing) return { error: 'Bu firma adı zaten kayıtlı.' };

    const existingUser = Users.all().find(u =>
      u.email === adminData.email || u.username === adminData.username
    );
    if (existingUser) return { error: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' };

    // Şirketi oluştur
    const company = Companies.create({ name: companyName });

    // Yönetici hesabı oluştur
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

    // Yöneticiyi şirkete bağla
    Companies.setAdmin(company.id, admin.id);

    return { company, admin };
  }
};
