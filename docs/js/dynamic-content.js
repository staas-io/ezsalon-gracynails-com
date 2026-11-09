// Dynamic content: services + contact/hours from staas deploy platform.
// APIs are configured on <body data-services-api data-settings-api>.
// Static fallback HTML is kept when fetch fails. Escape all API text.
(function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(cents) {
    if (cents == null || cents <= 0) return '—';
    var v = cents / 100;
    return '$' + (Number.isInteger(v) ? String(v) : v.toFixed(2));
  }
  function fmtTime(t) {
    if (!t) return '';
    var p = String(t).split(':');
    var h = parseInt(p[0], 10);
    var m = p[1] || '00';
    var ap = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + m + ' ' + ap;
  }
  function normalizeServices(payload) {
    if (!payload) return null;
    if (Array.isArray(payload)) return { categories: [], services: payload };
    if (Array.isArray(payload.services)) return payload;
    if (payload.json && typeof payload.json === 'string') {
      try { return normalizeServices(JSON.parse(payload.json)); } catch (e) { return null; }
    }
    return null;
  }
  function renderServices(data, container) {
    if (!container) return;
    var level = parseInt(container.getAttribute('data-heading-level') || '2', 10);
    if (![2, 3, 4].includes(level)) level = 2;
    var hTag = 'h' + level;
    var cats = (data.categories || []).slice().sort(function (a, b) {
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });
    var byCat = {};
    (data.services || []).forEach(function (s) {
      if (s && typeof s.showOnBooking !== 'undefined' && !s.showOnBooking) {
        // Skip internal blocks / hidden services, but keep services without the flag.
        if (s.showOnBooking === 0 || s.showOnBooking === false) return;
      }
      var key = s.categoryId || s.categoryName || 'Other';
      (byCat[key] = byCat[key] || []).push(s);
    });
    var html = '';
    cats.forEach(function (c) {
      var list = byCat[c.id] || byCat[c.name] || [];
      if (!list.length) return;
      list = list.slice().sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      html += '<section class="service-cat" aria-label="' + esc(c.name) + '">'
        + '<div class="service-cat-head"><' + hTag + '>' + esc(c.name) + '</' + hTag + '>'
        + '<a class="service-book" href="/booking/">Book →</a></div>'
        + '<ul class="service-list">';
      list.forEach(function (s) {
        var desc = s.description || s.desc || '';
        var dur = s.durationMinutes ? s.durationMinutes + ' min' : '';
        html += '<li class="service-item"><div><strong>' + esc(s.name) + '</strong>'
          + (desc ? '<span class="service-desc">' + esc(desc) + '</span>' : '')
          + '</div><div class="service-meta"><span class="service-price">' + esc(money(s.priceCents)) + '</span>'
          + (dur ? '<div class="service-dur">' + esc(dur) + '</div>' : '')
          + '</div></li>';
      });
      html += '</ul></section>';
    });
    // Services whose category is not in categories list
    Object.keys(byCat).forEach(function (key) {
      var found = cats.some(function (c) { return c.id === key || c.name === key; });
      if (found) return;
      var list = byCat[key];
      html += '<section class="service-cat" aria-label="' + esc(key) + '"><div class="service-cat-head"><' + hTag + '>' + esc(key) + '</' + hTag + '></div><ul class="service-list">';
      list.forEach(function (s) {
        html += '<li class="service-item"><div><strong>' + esc(s.name) + '</strong></div><div class="service-meta"><span class="service-price">' + esc(money(s.priceCents)) + '</span></div></li>';
      });
      html += '</ul></section>';
    });
    if (html) container.innerHTML = html;
  }
  function renderSettings(settings, body) {
    var about = settings.about || {};
    if (about.address) {
      document.querySelectorAll('#footer-address').forEach(function (el) {
        // Preserve street structure; settings address is "146 Prince Street, downtown, Charlottetown"
        el.innerHTML = esc(about.address) + '<br />Charlottetown, PEI<br />Corner of Prince and Grafton St';
      });
      document.querySelectorAll('#visit-address').forEach(function (el) { el.textContent = about.address; });
      var notes = document.getElementById('about-notes');
      if (notes && about.notes) notes.textContent = about.notes;
    }
    if (about.phone) {
      var digits = String(about.phone).replace(/[^0-9]/g, '');
      document.querySelectorAll('#footer-phone, #visit-phone, #booking-phone').forEach(function (el) {
        el.textContent = about.phone;
        el.setAttribute('href', 'tel:' + digits);
      });
      var buy = document.getElementById('booking-call');
      if (buy) { buy.textContent = 'Call ' + about.phone; buy.setAttribute('href', 'tel:' + digits); }
    }
    if (about.website) {
      var bm = document.getElementById('booking-map-link');
      if (bm) bm.setAttribute('href', 'https://maps.google.com/?q=' + encodeURIComponent(about.address || '146 Prince Street Charlottetown'));
    }
    var bh = settings.businessHours;
    if (bh) {
      var order = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
      var rows = order.map(function (p) {
        var d = bh[p[0]];
        if (!d) return '';
        var val = d.closed ? 'Closed' : fmtTime(d.open) + ' – ' + fmtTime(d.close);
        return { day: p[1], val: val, closed: !!d.closed };
      }).filter(Boolean);
      var visit = document.getElementById('visit-hours-table');
      if (visit && rows.length) {
        visit.innerHTML = rows.map(function (r) {
          return '<tr><th scope="row">' + esc(r.day) + '</th><td>' + esc(r.val) + '</td></tr>';
        }).join('');
      }
      // Compact footer: Mon–Sat range if uniform, else list
      var footer = document.getElementById('footer-hours');
      if (footer && rows.length) {
        var monSat = rows.slice(0, 6);
        var allSame = monSat.every(function (r) { return r.val === monSat[0].val; });
        var sun = rows[6] ? rows[6].val : 'Closed';
        if (allSame && !rows[0].closed) footer.innerHTML = 'Mon – Sat: ' + esc(monSat[0].val) + '<br />Sunday: ' + esc(sun);
        else footer.innerHTML = rows.map(function (r) { return esc(r.day.slice(0, 3)) + ': ' + esc(r.val); }).join('<br />');
      }
      var visitCompact = document.getElementById('visit-hours-compact');
      if (visitCompact && rows.length) {
        visitCompact.innerHTML = rows.map(function (r) { return esc(r.day) + ': ' + esc(r.val); }).join('<br />');
      }
    }
  }
  async function load() {
    var body = document.body;
    var servicesUrl = body.getAttribute('data-services-api');
    var settingsUrl = body.getAttribute('data-settings-api');
    var svcContainer = document.getElementById('services-list');
    if (svcContainer && servicesUrl) {
      try {
        var r = await fetch(servicesUrl);
        if (r.ok) {
          var j = await r.json();
          var norm = normalizeServices(j);
          if (norm) renderServices(norm, svcContainer);
        }
      } catch (e) { /* keep static fallback */ }
    }
    if (settingsUrl) {
      try {
        var r2 = await fetch(settingsUrl);
        if (r2.ok) {
          var j2 = await r2.json();
          var inner = j2;
          if (j2 && typeof j2.json === 'string') {
            try { inner = JSON.parse(j2.json); } catch (e) { inner = null; }
          }
          if (inner) renderSettings(inner, body);
        }
      } catch (e) { /* keep static fallback */ }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
  else load();
})();
