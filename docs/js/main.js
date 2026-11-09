// Mobile nav toggle
(function () {
  var btn = document.getElementById('navToggle');
  var nav = document.getElementById('primaryNav');
  if (!btn || !nav) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = open ? '✕' : '☰';
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.textContent = '☰';
    }
  });
})();

// Gallery "Show all designs" — reveal hidden items
(function () {
  var btn = document.getElementById('showAllDesigns');
  var grid = document.getElementById('workGallery');
  if (!btn || !grid) return;
  btn.addEventListener('click', function () {
    var hidden = grid.querySelectorAll('.gallery-extra');
    hidden.forEach(function (el) { el.style.display = ''; });
    btn.style.display = 'none';
    btn.setAttribute('aria-hidden', 'true');
  });
})();
