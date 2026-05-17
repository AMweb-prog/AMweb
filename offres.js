/* =============================================
   AMweb — Offres Page Script
   ============================================= */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ---- PRICING TOGGLE (Monthly / Annual) ----
  const toggleMonthly = document.getElementById('toggleMonthly');
  const toggleAnnual  = document.getElementById('toggleAnnual');
  const toggleThumb   = document.getElementById('toggleThumb');
  const priceAmounts  = document.querySelectorAll('.price-amount');

  let isAnnual = false;

  function setMode(annual) {
    isAnnual = annual;

    // Toggle button active states
    toggleMonthly.classList.toggle('active', !annual);
    toggleAnnual.classList.toggle('active', annual);

    // Move thumb
    if (annual) {
      toggleThumb.classList.add('right');
    } else {
      toggleThumb.classList.remove('right');
    }

    // Animate prices
    priceAmounts.forEach(el => {
      const monthlyVal = parseInt(el.dataset.monthly);
      const annualVal  = parseInt(el.dataset.annual);
      const target = annual ? annualVal : monthlyVal;

      animatePrice(el, parseInt(el.textContent), target);
    });
  }

  function animatePrice(el, from, to) {
    const duration = 500;
    const start = performance.now();

    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = to;
    }
    requestAnimationFrame(update);
  }

  // Toggle track click
  const toggleTrack = document.querySelector('.toggle-track');
  if (toggleTrack) {
    toggleTrack.addEventListener('click', () => setMode(!isAnnual));
  }
  if (toggleMonthly) toggleMonthly.addEventListener('click', () => setMode(false));
  if (toggleAnnual)  toggleAnnual.addEventListener('click',  () => setMode(true));

  // ---- STAGGERED CARD ENTRANCE ----
  const pricingCards = document.querySelectorAll('.pricing-card');

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.dataset.delay) || 0;
        setTimeout(() => {
          entry.target.classList.add('revealed');
        }, delay);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  pricingCards.forEach(card => cardObserver.observe(card));

});
