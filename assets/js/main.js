/* ──────────────────────────────────────────────────────────
   LUX site · client behaviour
   - Language toggle (DE/EN, persisted in localStorage)
   - Mobile menu open/close
   - Scroll reveal
   - Form placeholder handlers (replace with real endpoint later)
   - Nav scroll shadow
   ────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ── Language ─────────────────────────────────────────── */
  var STORAGE_KEY = 'lux:lang';
  var SUPPORTED   = ['de', 'en'];

  function getStoredLang() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.indexOf(v) !== -1 ? v : null;
    } catch (e) { return null; }
  }

  function detectLang() {
    var stored = getStoredLang();
    if (stored) return stored;
    var nav = (navigator.language || 'de').toLowerCase();
    return nav.indexOf('en') === 0 ? 'en' : 'de';
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'de';
    document.documentElement.setAttribute('lang', lang);
    document.body.classList.toggle('en', lang === 'en');

    // Active state on lang buttons
    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
    });

    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  // Expose for inline onclick fallbacks (none used now, but safe)
  window.luxSetLang = setLang;

  /* ── Mobile menu ──────────────────────────────────────── */
  function openMenu()  { var m = document.querySelector('.mob-menu'); if (m) m.classList.add('open'); }
  function closeMenu() { var m = document.querySelector('.mob-menu'); if (m) m.classList.remove('open'); }

  /* ── Scroll reveal ────────────────────────────────────── */
  function initReveal() {
    var els = document.querySelectorAll('.reveal:not(.in)');
    if (!els.length || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { obs.observe(el); });
  }

  /* ── Contact form (placeholder — wire to real endpoint) ── */
  function bindContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // ── TODO: replace with your endpoint ──────────────
      // Options: Formspree, Netlify Forms, Brevo, custom backend.
      // Example (Formspree):
      //   fetch('https://formspree.io/f/YOUR_ID', {
      //     method: 'POST',
      //     body: new FormData(form),
      //     headers: { Accept: 'application/json' }
      //   }).then(...)
      // ───────────────────────────────────────────────────

      var ok  = document.getElementById('formSuccess');
      var err = document.getElementById('formError');
      var btn = document.getElementById('submitBtn');

      if (btn) { btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none'; }

      // Simulate success
      setTimeout(function () {
        if (ok)  ok.style.display  = 'block';
        if (err) err.style.display = 'none';
        form.reset();
        if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = ''; }
      }, 800);
    });
  }

  /* ── Mailchimp newsletter signup (JSONP, no jQuery) ───── */
  function bindMailchimpSignup() {
    var form = document.getElementById('mcSignupForm');
    if (!form) return;

    var action = form.getAttribute('data-mc-action');
    var btn    = document.getElementById('mcSubmitBtn');
    var ok     = document.getElementById('mcSuccess');
    var err    = document.getElementById('mcError');

    function lang() { return document.body.classList.contains('en') ? 'en' : 'de'; }

    function showError(deMsg, enMsg) {
      if (!err) return;
      err.textContent = lang() === 'en' ? enMsg : deMsg;
      err.style.display = 'block';
      if (ok) ok.style.display = 'none';
    }

    function clearError() { if (err) { err.style.display = 'none'; err.textContent = ''; } }

    function setBusy(busy) {
      if (!btn) return;
      btn.style.opacity = busy ? '0.6' : '1';
      btn.style.pointerEvents = busy ? 'none' : '';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError();

      var email = (form.querySelector('[name="EMAIL"]').value || '').trim();
      if (!email) return;

      var consents = form.querySelectorAll('input[type="checkbox"][name^="gdpr["]:checked');
      if (consents.length === 0) {
        showError(
          'Bitte wählen Sie mindestens eine Option aus.',
          'Please tick at least one option.'
        );
        return;
      }

      var params = new URLSearchParams(new FormData(form));
      var cb = '__mcCallback_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
      params.append('c', cb);

      var script = document.createElement('script');
      var timeoutId;

      function cleanup() {
        if (timeoutId) clearTimeout(timeoutId);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
        setBusy(false);
      }

      window[cb] = function (data) {
        cleanup();
        if (data && data.result === 'success') {
          clearError();
          if (ok) ok.style.display = 'block';
          form.reset();
        } else {
          var raw = (data && data.msg) ? String(data.msg) : '';
          // Mailchimp prefixes some messages with "0 - "
          var msg = raw.replace(/^[0-9]+\s*-\s*/, '');
          if (/already subscribed/i.test(msg)) {
            showError(
              'Diese E-Mail-Adresse ist bereits angemeldet.',
              'This email address is already subscribed.'
            );
          } else if (msg) {
            // Render server message as plain text (never as HTML)
            err.textContent = msg;
            err.style.display = 'block';
            if (ok) ok.style.display = 'none';
          } else {
            showError(
              'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
              'Something went wrong. Please try again.'
            );
          }
        }
      };

      timeoutId = setTimeout(function () {
        cleanup();
        showError(
          'Die Anmeldung dauert länger als erwartet. Bitte versuchen Sie es später erneut.',
          'The request is taking longer than expected. Please try again later.'
        );
      }, 12000);

      setBusy(true);
      script.src = action + '&' + params.toString();
      script.onerror = function () {
        cleanup();
        showError(
          'Verbindung zum Newsletter-Dienst fehlgeschlagen.',
          'Could not reach the newsletter service.'
        );
      };
      document.head.appendChild(script);
    });
  }

  /* ── Nav scroll shadow ────────────────────────────────── */
  function bindNavShadow() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        nav.style.boxShadow = window.scrollY > 16
          ? '0 2px 20px rgba(26,26,24,0.18)'
          : 'none';
        ticking = false;
      });
    }, { passive: true });
  }

  /* ── Bind nav controls ────────────────────────────────── */
  function bindNav() {
    var burger = document.querySelector('.nav__burger');
    if (burger) burger.addEventListener('click', openMenu);

    var close = document.querySelector('.mob-close');
    if (close) close.addEventListener('click', closeMenu);

    document.querySelectorAll('.mob-menu a[href]').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });

    document.querySelectorAll('[data-lang-btn]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        setLang(btn.getAttribute('data-lang-btn'));
      });
    });
  }

  /* ── Init ─────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    setLang(detectLang());
    bindNav();
    bindNavShadow();
    bindContactForm();
    bindMailchimpSignup();
    initReveal();
  });
})();
