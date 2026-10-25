/**
 * Campus Lost & Found — Front-end JavaScript
 *
 * Responsibilities:
 *  1. Fetch items from GET /api/items and render item cards.
 *  2. Fetch version from GET /version and update the footer.
 *  3. Handle the report form: client-side validation → POST /api/items →
 *     prepend the new card without a full page reload.
 *
 * Safe DOM usage: textContent is used everywhere for user-supplied text.
 * No innerHTML is used with user data.
 */

(function () {
  'use strict';

  // ── DOM references ──────────────────────────────────────────────────────────
  const itemsGrid    = document.getElementById('items-grid');
  const itemsLoading = document.getElementById('items-loading');
  const itemsEmpty   = document.getElementById('items-empty');
  const footerMsg    = document.getElementById('footer-version-msg');

  const form        = document.getElementById('report-form');
  const nameInput   = document.getElementById('item-name');
  const descInput   = document.getElementById('item-description');
  const statusSel   = document.getElementById('item-status');
  const submitBtn   = document.getElementById('submit-btn');
  const successBanner = document.getElementById('form-success');
  const errorBanner   = document.getElementById('form-error');

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Format an ISO date string as a human-readable date.
   * @param {string} dateStr  e.g. "2026-10-20"
   * @returns {string}        e.g. "20 Oct 2026"
   */
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  /**
   * Build a single item card DOM element.
   * All user-provided values are set via textContent — never innerHTML.
   * @param {object} item
   * @returns {HTMLElement}
   */
  function buildCard(item) {
    const article = document.createElement('article');
    article.className = 'item-card';
    article.setAttribute('role', 'listitem');

    // Header row: name + badge
    const header = document.createElement('div');
    header.className = 'item-card__header';

    const nameEl = document.createElement('h3');
    nameEl.className = 'item-card__name';
    nameEl.textContent = item.name;          // safe — no raw HTML

    const badge = document.createElement('span');
    const badgeClass = item.status === 'Lost' ? 'badge--lost' : 'badge--found';
    badge.className = 'badge ' + badgeClass;
    badge.textContent = item.status;         // safe

    header.appendChild(nameEl);
    header.appendChild(badge);

    // Description
    const desc = document.createElement('p');
    desc.className = 'item-card__desc';
    desc.textContent = item.description;     // safe

    // Date
    const date = document.createElement('p');
    date.className = 'item-card__date';
    date.textContent = 'Reported: ' + formatDate(item.date);  // safe

    article.appendChild(header);
    article.appendChild(desc);
    article.appendChild(date);

    return article;
  }

  // ── Fetch and render items ───────────────────────────────────────────────────
  async function loadItems() {
    try {
      const res   = await fetch('/api/items');
      const items = await res.json();

      itemsLoading.hidden = true;

      if (!Array.isArray(items) || items.length === 0) {
        itemsEmpty.hidden = false;
        return;
      }

      const fragment = document.createDocumentFragment();
      items.forEach(function (item) {
        fragment.appendChild(buildCard(item));
      });
      itemsGrid.appendChild(fragment);
    } catch (err) {
      itemsLoading.textContent = 'Could not load items. Please refresh the page.';
      console.error('Failed to fetch items:', err);
    }
  }

  // ── Fetch version and update footer ─────────────────────────────────────────
  async function loadVersion() {
    try {
      const res  = await fetch('/version');
      const data = await res.json();
      if (data && data.deploymentMessage) {
        footerMsg.textContent = data.deploymentMessage;
      }
    } catch (err) {
      // Footer fallback text from HTML is already visible; silently ignore.
      console.warn('Could not fetch /version:', err);
    }
  }

  // ── Form validation helpers ──────────────────────────────────────────────────
  function setFieldError(input, errorId, message) {
    const errorEl = document.getElementById(errorId);
    if (message) {
      input.classList.add('is-invalid');
      errorEl.textContent = message;
    } else {
      input.classList.remove('is-invalid');
      errorEl.textContent = '';
    }
  }

  function validateForm() {
    let valid = true;

    if (!nameInput.value.trim()) {
      setFieldError(nameInput, 'item-name-error', 'Please enter the item name.');
      valid = false;
    } else {
      setFieldError(nameInput, 'item-name-error', '');
    }

    if (!descInput.value.trim()) {
      setFieldError(descInput, 'item-description-error', 'Please enter a description.');
      valid = false;
    } else {
      setFieldError(descInput, 'item-description-error', '');
    }

    if (!statusSel.value) {
      setFieldError(statusSel, 'item-status-error', 'Please select a status.');
      valid = false;
    } else {
      setFieldError(statusSel, 'item-status-error', '');
    }

    return valid;
  }

  // ── Form submit ──────────────────────────────────────────────────────────────
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Hide any previous banners
    successBanner.hidden = true;
    errorBanner.hidden   = true;
    errorBanner.textContent = '';

    if (!validateForm()) return;

    submitBtn.disabled   = true;
    submitBtn.textContent = 'Submitting…';

    const payload = {
      name:        nameInput.value.trim(),
      description: descInput.value.trim(),
      status:      statusSel.value,
    };

    try {
      const res  = await fetch('/api/items', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        // Prepend new card to the top of the grid
        const newCard = buildCard(data);
        if (itemsEmpty && !itemsEmpty.hidden) {
          itemsEmpty.hidden = true;
        }
        itemsGrid.insertBefore(newCard, itemsGrid.firstChild);

        // Show success, clear form
        successBanner.hidden = false;
        form.reset();
        // Scroll to the new card
        newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Server-side validation error
        errorBanner.textContent = data.error || 'Submission failed. Please try again.';
        errorBanner.hidden = false;
      }
    } catch (err) {
      errorBanner.textContent = 'Network error. Please check your connection and try again.';
      errorBanner.hidden = false;
      console.error('Submit error:', err);
    } finally {
      submitBtn.disabled   = false;
      submitBtn.textContent = 'Submit Report';
    }
  });

  // Clear field errors on input
  [nameInput, descInput, statusSel].forEach(function (el) {
    el.addEventListener('input', function () {
      el.classList.remove('is-invalid');
    });
  });

  // ── Init ─────────────────────────────────────────────────────────────────────
  loadItems();
  loadVersion();

})();
