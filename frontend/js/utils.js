// İsim baş harfleri
function initials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Bugünün tarihi
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Tarih formatla
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Tarih ve saat formatla
function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// İzin süresi metni
function formatDuration(l) {
  if (l.type === 'hourly' || l.leaveType === 'hourly') {
    if (l.duration) {
      const dur = parseFloat(l.duration);
      return `${dur} saat`;
    }
    if (l.startTime && l.endTime) {
      const [sh, sm] = l.startTime.split(':');
      const [eh, em] = l.endTime.split(':');
      const diff = (parseInt(eh)*60 + parseInt(em)) - (parseInt(sh)*60 + parseInt(sm));
      const h = Math.floor(diff/60);
      return `${h} saat`;
    }
    return 'Saatlik';
  } else {
    if (l.duration) {
      const dur = parseFloat(l.duration);
      return `${dur} gün`;
    }
    const s = new Date(l.startDate);
    const e = new Date(l.endDate || l.startDate);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} gün`;
  }
}

// Durum rozeti oluştur
function statusBadge(status) {
  switch (status) {
    case 'pending':   return '<span class="badge badge-pending">Bekliyor</span>';
    case 'approved':  return '<span class="badge badge-approved">Onaylandı</span>';
    case 'rejected':  return '<span class="badge badge-rejected">Reddedildi</span>';
    case 'cancelled': return '<span class="badge badge-cancelled">İptal</span>';
    default:          return '<span class="badge">' + status + '</span>';
  }
}

// Durum metni
function statusLabel(status) {
  switch (status) {
    case 'pending':   return 'Bekliyor';
    case 'approved':  return 'Onaylandı';
    case 'rejected':  return 'Reddedildi';
    case 'cancelled': return 'İptal Edildi';
    default:          return status || 'Belirsiz';
  }
}

// Günlük süre hesapla
function calcDailyDuration(startStr, endStr) {
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  if (e < s) return 0;
  const diffTime = Math.abs(e - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Saatlik süre hesapla
function calcHourlyDuration(startStr, endStr) {
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? (diff / 60) : 0;
}
