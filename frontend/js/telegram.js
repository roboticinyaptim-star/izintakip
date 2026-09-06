/* ============================================================
   telegram.js — Telegram Bot API integration
   ============================================================ */

const Telegram = {
  _lastSent: {},

  async send(chatId, text) {
    if (!chatId || !text) return false;

    const cid = String(chatId).trim();
    if (!cid) return false;

    // 3 saniye içinde aynı chat_id'ye birebir aynı mesajın mükerrer gitmesini engelle (deduplication)
    const key = `${cid}_${text.substring(0, 40)}`;
    const now = Date.now();
    if (this._lastSent[key] && (now - this._lastSent[key] < 3000)) {
      console.warn('[Telegram] Mükerrer bildirim engellendi:', key);
      return true;
    }
    this._lastSent[key] = now;

    const settings = Settings.get();
    const token = settings.telegramBotToken;
    if (!token) {
      console.warn('[Telegram] Bot token eksik. Lütfen Ayarlar sayfasından Telegram Bot Token kaydedin.');
      if (typeof ErrorLogs !== 'undefined' && ErrorLogs.add) {
        ErrorLogs.add('Telegram: Bot token eksik.', `chatId=${cid}`);
      }
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cid,
          text,
          parse_mode: 'HTML'
        })
      });
      const data = await res.json();
      if (!data.ok) {
        console.error('[Telegram] Gönderim başarısız:', data);
        if (typeof ErrorLogs !== 'undefined' && ErrorLogs.add) {
          ErrorLogs.add('Telegram gönderimi başarısız.', JSON.stringify(data));
        }
        return false;
      }
      console.log(`[Telegram] Bildirim başarıyla gönderildi -> ${cid}`);
      return true;
    } catch (err) {
      console.error('[Telegram] Ağ hatası:', err);
      if (typeof ErrorLogs !== 'undefined' && ErrorLogs.add) {
        ErrorLogs.add('Telegram ağ hatası.', err.message || String(err));
      }
      return false;
    }
  },

  async notifyNewLeave(leave) {
    const settings = Settings.get();
    if (!settings.telegramChatId) {
      console.warn('[Telegram] Admin Chat ID tanımlı değil. Yeni izin bildirimi gönderilemedi.');
      return;
    }

    const user = Users.byId(leave.userId);
    const personName = user ? user.name : (leave.userName || 'Personel');
    let dateInfo = '';
    if (leave.type === 'hourly') {
      dateInfo = `📅 Tarih: ${formatDate(leave.startDate)}\n⏰ Saat: ${leave.startTime || ''} - ${leave.endTime || ''}`;
    } else {
      dateInfo = `📅 Başlangıç: ${formatDate(leave.startDate)}\n📅 Bitiş: ${formatDate(leave.endDate)}\n⏱ Süre: ${formatDuration(leave)}`;
    }

    const text =
      `🔔 <b>Yeni İzin Talebi</b>\n\n` +
      `👤 <b>Personel:</b> ${personName}\n` +
      `🏷 <b>Tür:</b> ${leave.leaveTypeName || '—'}\n` +
      `${dateInfo}\n` +
      `📌 <b>Durum:</b> Bekliyor\n` +
      `📝 <b>Açıklama:</b> ${leave.description || '—'}`;

    await this.send(settings.telegramChatId, text);
  },

  async notifyLeaveDecision(leave) {
    const settings = Settings.get();
    const user = Users.byId(leave.userId);
    const personName = user ? user.name : (leave.userName || 'Personel');
    const approver = leave.approvedByName || (typeof Auth !== 'undefined' && Auth.user() ? Auth.user().name : 'Yönetici');
    const icon = leave.status === 'approved' ? '✅' : '❌';
    const label = statusLabel(leave.status);
    
    let dateInfo = '';
    if (leave.type === 'hourly') {
      dateInfo = `📅 Tarih: ${formatDate(leave.startDate)}\n⏰ Saat: ${leave.startTime || ''} - ${leave.endTime || ''}`;
    } else {
      dateInfo = `📅 Tarih: ${formatDate(leave.startDate)}${leave.endDate && leave.endDate !== leave.startDate ? ' - ' + formatDate(leave.endDate) : ''}`;
    }

    const text =
      `${icon} <b>İzin Talebi ${label}</b>\n\n` +
      `👤 <b>Personel:</b> ${personName}\n` +
      `🏷 <b>Tür:</b> ${leave.leaveTypeName || '—'}\n` +
      `${dateInfo}\n` +
      (leave.status === 'rejected' && leave.rejectionReason ? `❗ <b>Ret Nedeni:</b> ${leave.rejectionReason}\n` : '') +
      `✍️ <b>İşlem Yapan:</b> ${approver}`;

    // Hedefleri belirle:
    // 1. Personelin Telegram Chat ID'si varsa personele gönder
    const staffChatId = (user && user.telegramChatId) ? String(user.telegramChatId).trim() : null;
    // 2. Admin chat ID'si varsa bildirim gönder
    const adminChatId = settings.telegramChatId ? String(settings.telegramChatId).trim() : null;

    const targets = new Set();
    if (staffChatId) targets.add(staffChatId);
    if (adminChatId) targets.add(adminChatId);

    if (targets.size === 0) {
      console.warn('[Telegram] Bildirim gönderilecek hedef Chat ID bulunamadı. Lütfen Ayarlar sayfasından Admin Chat ID veya personelin Telegram ID\'sini tanımlayın.');
      if (typeof ErrorLogs !== 'undefined' && ErrorLogs.add) {
        ErrorLogs.add('Telegram: Hedef Chat ID bulunamadı.', `Personel: ${personName}`);
      }
      return;
    }

    for (const targetId of targets) {
      await this.send(targetId, text);
    }
  }
};
