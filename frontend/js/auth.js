// Kimlik doğrulama servisi
const Auth = {
  _session: null,

  // Kullanıcı girişi
  async login(email, password, isPersistent = false) {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (isPersistent) {
      localStorage.setItem('izt_token', res.token);
      localStorage.setItem('izt_user', JSON.stringify(res.user));
    } else {
      sessionStorage.setItem('izt_token', res.token);
      sessionStorage.setItem('izt_user', JSON.stringify(res.user));
    }
    
    this._session = res.user;
    return true;
  },

  // Yeni firma kaydı
  async register(companyName, username, email, password) {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ companyName, username, email, password })
    });
    
    sessionStorage.setItem('izt_token', res.token);
    sessionStorage.setItem('izt_user', JSON.stringify(res.user));
    this._session = res.user;
    return true;
  },

  // Oturum kontrolü
  init() {
    const raw   = sessionStorage.getItem('izt_user')  || localStorage.getItem('izt_user');
    const token = sessionStorage.getItem('izt_token') || localStorage.getItem('izt_token');
    
    if (!raw || !token) {
      this._redirectToLogin();
      return null;
    }
    
    try {
      this._session = JSON.parse(raw);
      // Tokeni hafızaya yaz
      if (!sessionStorage.getItem('izt_token')) {
        sessionStorage.setItem('izt_token', token);
      }
    } catch {
      this._redirectToLogin();
      return null;
    }

    // Şirket kontrolü
    if (!this._session.companyId && this._session.role !== 'superadmin') {
      this.logout();
      return null;
    }
    
    return this._session;
  },

  session()      { return this._session; },
  user()         { return this._session; },
  userId()       { return this._session ? this._session.id : null; },
  companyId()    { return this._session ? this._session.companyId : null; },
  isSuperAdmin() { return this._session && this._session.role === 'superadmin'; },
  isAdmin()      { return this._session && (this._session.role === 'admin' || this._session.role === 'superadmin'); },
  isStaff()      { return this._session && this._session.role === 'staff'; },

  // Oturum bilgilerini yenile
  refreshUser() {
    if (!this._session) return;
    const user = Users.byId(this._session.id);
    if (user) {
      this._session.name  = user.name;
      this._session.email = user.email;
      sessionStorage.setItem('izt_user', JSON.stringify(this._session));
    }
  },

  // Çıkış yap
  logout() {
    sessionStorage.removeItem('izt_token');
    sessionStorage.removeItem('izt_user');
    localStorage.removeItem('izt_token');
    localStorage.removeItem('izt_user');
    this._redirectToLogin();
  },

  // Giriş sayfasına yönlendir
  _redirectToLogin() {
    if (!window.location.pathname.includes('index.html')) {
      window.location.href = 'index.html';
    }
  }
};
