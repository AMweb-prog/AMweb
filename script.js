/* =============================================
   AMweb — Main Script (shared)
   [IMPROVED] — Mobile menu backdrop, nav-close btn,
   smoother animations, better UX details
   ============================================= */

'use strict';

/* ---- LANGUAGE SYSTEM ---- */
const LANG_KEY = 'amweb_lang';
let currentLang = localStorage.getItem(LANG_KEY) || 'fr';

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);

  document.documentElement.lang = lang;

  // Update all elements with data-fr / data-en
  document.querySelectorAll('[data-fr], [data-en]').forEach(el => {
    const text = lang === 'en' ? el.dataset.en : el.dataset.fr;
    if (text !== undefined) {
      if (el.tagName === 'INPUT') {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    }
  });

  // Update lang button label
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = lang === 'fr' ? 'EN' : 'FR';
}

document.addEventListener('DOMContentLoaded', () => {

  // ---- LAZY IMAGE FADE-IN FIX ----
  // Images with loading="lazy" start at opacity:0; add .loaded when ready
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('loaded'), { once: true }); // show broken icon rather than nothing
    }
  });

  // ---- SCROLL PROGRESS BAR ----
  const scrollProgress = document.getElementById('scrollProgress');
  const backToTop = document.getElementById('backToTop');

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollProgress && docHeight > 0) {
      scrollProgress.style.width = ((scrollTop / docHeight) * 100) + '%';
    }
    if (backToTop) {
      if (scrollTop > 400) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }
  }, { passive: true });

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- TOAST HELPER ----
  function showToast(msg) {
    let toast = document.getElementById('amwebToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.id = 'amwebToast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid fa-circle-check"></i>${msg}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  // ---- YEAR ----
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---- INITIAL LANG ----
  applyLanguage(currentLang);

  // ---- LANG TOGGLE ----
  const langBtn = document.getElementById('langBtn');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      applyLanguage(currentLang === 'fr' ? 'en' : 'fr');
    });
  }

  // ---- CUSTOM CURSOR ----
  const cursor         = document.getElementById('cursor');
  const cursorFollower = document.getElementById('cursorFollower');

  if (cursor && cursorFollower && window.innerWidth > 768) {
    let fx = 0, fy = 0;
    let cx = 0, cy = 0;

    document.addEventListener('mousemove', e => {
      cx = e.clientX;
      cy = e.clientY;
      cursor.style.left = cx + 'px';
      cursor.style.top  = cy + 'px';
    });

    (function animFollower() {
      fx += (cx - fx) * 0.1;
      fy += (cy - fy) * 0.1;
      cursorFollower.style.left = fx + 'px';
      cursorFollower.style.top  = fy + 'px';
      requestAnimationFrame(animFollower);
    })();

    // Hover effect on interactive elements
    document.querySelectorAll('a, button, .service-card, .pricing-card, .addon-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.width  = '14px';
        cursor.style.height = '14px';
        cursorFollower.style.width   = '48px';
        cursorFollower.style.height  = '48px';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.width  = '';
        cursor.style.height = '';
        cursorFollower.style.width  = '';
        cursorFollower.style.height = '';
      });
    });
  }

  // ---- NAVBAR SCROLL ----
  const navbar = document.getElementById('navbar');
  function handleNavScroll() {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // ---- MOBILE MENU — [IMPROVED] with backdrop & close button ----
  const hamburger   = document.getElementById('hamburger');
  const navLinks    = document.getElementById('navLinks');
  const navBackdrop = document.getElementById('navBackdrop');
  const navClose    = document.getElementById('navClose');

  function openMenu() {
    hamburger.classList.add('open');
    navLinks.classList.add('open');
    if (navBackdrop) navBackdrop.classList.add('visible');
    // [IMPROVED] Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    if (navBackdrop) navBackdrop.classList.remove('visible');
    // [IMPROVED] Restore body scroll
    document.body.style.overflow = '';
  }

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navLinks.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // [IMPROVED] Close button inside the menu
    if (navClose) {
      navClose.addEventListener('click', closeMenu);
    }

    // [IMPROVED] Backdrop click closes menu
    if (navBackdrop) {
      navBackdrop.addEventListener('click', closeMenu);
    }

    // Close on nav link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', closeMenu);
    });

    // [IMPROVED] Escape key to close menu
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        closeMenu();
      }
    });
  }

  // ---- SCROLL REVEAL ----
  const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseFloat(el.style.animationDelay) || 0;
        const dataDelay = parseInt(el.dataset.delay) || 0;
        setTimeout(() => {
          el.classList.add('revealed');
        }, delay * 1000 + dataDelay);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.1 }); // [IMPROVED] slightly lower threshold for earlier reveal

  revealEls.forEach(el => observer.observe(el));

  // ---- GOLD PARTICLES ----
  const particlesContainer = document.getElementById('particles');
  if (particlesContainer) {
    function createParticle() {
      const p = document.createElement('div');
      p.className = 'particle';

      const size = Math.random() * 3 + 1;
      p.style.width  = size + 'px';
      p.style.height = size + 'px';
      p.style.left   = Math.random() * 100 + '%';
      p.style.bottom = '-10px';
      p.style.animationDuration  = (Math.random() * 12 + 8) + 's';
      p.style.animationDelay     = (Math.random() * 5) + 's';
      p.style.opacity = Math.random() * 0.6 + 0.2;

      particlesContainer.appendChild(p);
      setTimeout(() => p.remove(), 20000);
    }

    // Spawn particles periodically
    for (let i = 0; i < 30; i++) {
      setTimeout(createParticle, i * 300);
    }
    setInterval(createParticle, 500);
  }

  // ---- COUNTER ANIMATION ----
  const counters = document.querySelectorAll('.stat-num');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));

  function animateCounter(el) {
    const target   = parseInt(el.dataset.target);
    const duration = 1800;
    const start    = performance.now();

    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const eased = 1 - Math.pow(2, -10 * progress);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target;
    }
    requestAnimationFrame(update);
  }

  // ---- CONTACT FORM → WHATSAPP ----
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();

      const nom        = document.getElementById('nom')?.value.trim() || '';
      const prenom     = document.getElementById('prenom')?.value.trim() || '';
      const email      = document.getElementById('email')?.value.trim() || '';
      const adresse    = document.getElementById('adresse')?.value.trim() || '';
      const entreprise = document.getElementById('entreprise')?.value.trim() || '';
      const tel        = document.getElementById('tel')?.value.trim() || '';

      const message = currentLang === 'fr'
        ? `Bonjour AMweb 👋\n\nJe souhaite démarrer un projet avec vous.\n\n*Nom :* ${nom} ${prenom}\n*Email :* ${email}\n*Adresse :* ${adresse}\n*Entreprise :* ${entreprise}\n*Téléphone :* ${tel}\n\nMerci de me recontacter !`
        : `Hello AMweb 👋\n\nI would like to start a project with you.\n\n*Name :* ${prenom} ${nom}\n*Email :* ${email}\n*Address :* ${adresse}\n*Company :* ${entreprise}\n*Phone :* ${tel}\n\nPlease contact me back!`;

      const whatsappNumber = '212780611376';
      const encodedMsg = encodeURIComponent(message);
      const url = `https://wa.me/${whatsappNumber}?text=${encodedMsg}`;

      window.open(url, '_blank');
      showToast(currentLang === 'fr' ? 'Redirection vers WhatsApp…' : 'Redirecting to WhatsApp…');
      contactForm.reset();
    });
  }

  // ---- SMOOTH SCROLL for anchor links ----
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---- [IMPROVED] Active nav link on scroll ----
  const sections  = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-link[href^="#"]');

  if (sections.length && navAnchors.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navAnchors.forEach(a => a.classList.remove('active'));
          const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
          if (activeLink) activeLink.classList.add('active');
        }
      });
    }, { threshold: 0.35, rootMargin: '-10% 0px -55% 0px' });

    sections.forEach(s => sectionObserver.observe(s));
  }

});
