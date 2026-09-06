/* ============================================================
   calendar.js — Monthly calendar rendering
   ============================================================ */

const Calendar = {
  _date: new Date(),

  render() {
    this._renderGrid();
  },

  _renderGrid() {
    const year  = this._date.getFullYear();
    const month = this._date.getMonth();

    // Header label
    const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                        'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    document.getElementById('calMonthLabel').textContent = `${monthNames[month]} ${year}`;

    // Get leaves for current user/all
    const isAdmin = Auth.isAdmin();
    const uid     = Auth.userId();
    // Patch any leaves missing userName from older seed data
    const allLeaves = (isAdmin ? Leaves.ofCompany() : Leaves.byUser(uid)).map(l => {
      if (!l.userName) {
        const u = Users.byId(l.userId);
        if (u) l.userName = u.name;
        else l.userName = 'Bilinmiyor';
      }
      return l;
    });

    // Filter to current month
    const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
    const monthLeaves = allLeaves.filter(l => {
      const startM = l.startDate.substring(0,7);
      const endM   = l.endDate ? l.endDate.substring(0,7) : startM;
      return startM <= monthStr && endM >= monthStr;
    });

    // Build calendar grid
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month+1, 0);
    let startDow   = firstDay.getDay(); // 0=Sun
    if (startDow === 0) startDow = 7;  // Monday-first
    startDow -= 1;

    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const grid = document.getElementById('calendarGrid');

    // Day headers
    const dayHeaders = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    let html = dayHeaders.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    // Fill previous month days
    for (let i = 0; i < startDow; i++) {
      const d = new Date(year, month, -startDow + i + 1);
      html += `<div class="cal-day other-month">
        <div class="cal-day-num">${d.getDate()}</div>
      </div>`;
    }

    // Fill current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const cellDate = new Date(year, month, day); cellDate.setHours(0,0,0,0);
      const isToday  = cellDate.getTime() === todayDate.getTime();
      const dow      = cellDate.getDay();
      const isWeekend = dow === 0 || dow === 6;

      // Leaves for this day
      const dayLeaves = monthLeaves.filter(l => {
        const s = l.startDate; const e = l.endDate || s;
        return s <= dateStr && e >= dateStr;
      });

      const eventsHtml = dayLeaves.slice(0,3).map(l => {
        const uName = l.userName || (Users.byId(l.userId) ? Users.byId(l.userId).name : '?');
        const name = isAdmin ? uName.split(' ')[0] : (l.leaveTypeName || '?');
        return `<div class="cal-event ${l.status}" 
          title="${uName} — ${l.leaveTypeName || ''}" 
          onclick="event.stopPropagation();LeaveForm.showDetail('${l.id}')"
        >${name}</div>`;
      }).join('');

      const more = dayLeaves.length > 3
        ? `<div class="cal-event" style="background:rgba(0,0,0,.06);color:var(--text-muted)">+${dayLeaves.length-3} daha</div>`
        : '';

      html += `
        <div class="cal-day${isToday ? ' today' : ''}${isWeekend ? ' weekend' : ''}"
          onclick="Calendar._dayClick('${dateStr}')">
          <div class="cal-day-num">${day}</div>
          <div class="cal-events">${eventsHtml}${more}</div>
        </div>`;
    }

    // Fill remaining cells
    const totalCells = startDow + lastDay.getDate();
    const remaining  = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
    }

    grid.innerHTML = html;
  },

  _dayClick(dateStr) {
    // If staff: open leave form pre-filled with that date
    if (!Auth.isAdmin()) {
      LeaveForm.open();
      setTimeout(() => {
        document.getElementById('dailyStart').value = dateStr;
        document.getElementById('dailyEnd').value   = dateStr;
        LeaveForm._calcDaily();
      }, 100);
    }
  },

  init() {
    document.getElementById('calPrev').addEventListener('click', () => {
      this._date.setMonth(this._date.getMonth() - 1);
      this._renderGrid();
    });
    document.getElementById('calNext').addEventListener('click', () => {
      this._date.setMonth(this._date.getMonth() + 1);
      this._renderGrid();
    });
    document.getElementById('calToday').addEventListener('click', () => {
      this._date = new Date();
      this._renderGrid();
    });
  }
};
