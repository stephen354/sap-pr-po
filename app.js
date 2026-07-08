/**
 * SAP PR Creator — Application Logic
 * Dynamic form rows, uppercase material, formatted POST, and response handling.
 */

(function () {
  'use strict';

  // ===== Constants =====
  const API_URL = '/api/create-pr';
  const CONTENT_TYPE = 'text/plain';

  // ===== DOM References =====
  const form        = document.getElementById('prForm');
  const rowsContainer = document.getElementById('itemRows');
  const addItemBtn  = document.getElementById('addItemBtn');
  const submitBtn   = document.getElementById('submitBtn');
  const submitText  = document.getElementById('submitBtnText');
  const spinner     = document.getElementById('submitSpinner');
  const notification = document.getElementById('notification');
  const itemCountEl = document.querySelector('.card-header__count-num');
  const sapUserInput = document.getElementById('sapUser');
  const sapPassInput = document.getElementById('sapPass');

  // ===== State =====
  let rowIndex = 0;

  // ===== SVG Icons =====
  const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`;

  // ===== Create a single item row =====
  function createRow() {
    rowIndex++;
    const idx = rowIndex;
    const isFirst = rowsContainer.children.length === 0;

    const row = document.createElement('div');
    row.className = 'item-row';
    row.dataset.idx = idx;

    row.innerHTML = `
      <span class="row-idx">${rowsContainer.children.length + 1}</span>

      <div class="input-group">
        <label class="mobile-label" for="material-${idx}">Material</label>
        <input
          id="material-${idx}"
          class="input input--material"
          type="text"
          placeholder="e.g. MAT001"
          required
          autocomplete="off"
        />
      </div>

      <div class="input-group">
        <label class="mobile-label" for="qty-${idx}">Quantity</label>
        <input
          id="qty-${idx}"
          class="input input--qty"
          type="number"
          min="1"
          placeholder="Qty"
          required
        />
      </div>

      <div class="input-group">
        <label class="mobile-label" for="plant-${idx}">Plant</label>
        <input
          id="plant-${idx}"
          class="input input--plant"
          type="text"
          value="3000"
          required
          autocomplete="off"
        />
      </div>

      ${isFirst
        ? '<div class="btn--delete-placeholder"></div>'
        : `<button type="button" class="btn btn--delete" title="Remove item">${trashIcon}</button>`
      }
    `;

    // Auto-uppercase on material input
    const materialInput = row.querySelector('.input--material');
    materialInput.addEventListener('input', function () {
      const pos = this.selectionStart;
      this.value = this.value.toUpperCase();
      this.setSelectionRange(pos, pos);
    });

    // Delete button handler
    if (!isFirst) {
      const deleteBtn = row.querySelector('.btn--delete');
      deleteBtn.addEventListener('click', function () {
        row.remove();
        reindexRows();
        updateItemCount();
      });
    }

    return row;
  }

  // ===== Re-index visible row numbers =====
  function reindexRows() {
    const rows = rowsContainer.querySelectorAll('.item-row');
    rows.forEach((row, i) => {
      row.querySelector('.row-idx').textContent = i + 1;
    });
  }

  // ===== Update the item count badge =====
  function updateItemCount() {
    const count = rowsContainer.querySelectorAll('.item-row').length;
    itemCountEl.textContent = count;
  }

  // ===== Collect & format data =====
  function collectData() {
    const rows = rowsContainer.querySelectorAll('.item-row');
    const parts = [];

    rows.forEach(row => {
      const material = row.querySelector('.input--material').value.trim().toUpperCase();
      const qty      = row.querySelector('.input--qty').value.trim();
      const plant    = row.querySelector('.input--plant').value.trim();
      parts.push(`${material}|${qty}|${plant}`);
    });

    return 'NB#' + parts.join(';');
  }

  // ===== Show notification =====
  function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification notification--${type}`;
  }

  function hideNotification() {
    notification.className = 'notification hidden';
  }

  // ===== Set loading state =====
  function setLoading(loading) {
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitText.textContent = 'Creating PR…';
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitText.textContent = 'Submit PR';
    }
  }

  // ===== Form submit handler =====
  async function handleSubmit(e) {
    e.preventDefault();
    hideNotification();

    const body = collectData();
    if (!body) return;

    setLoading(true);

    const user = sapUserInput.value.trim();
    const pass = sapPassInput.value;
    const authToken = btoa(user + ':' + pass);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': CONTENT_TYPE,
          'Authorization': 'Basic ' + authToken,
          'X-SAP-Auth': authToken,
        },
        body: body,
      });

      const text = await response.text();

      if (text.toLowerCase().includes('sukses') || text.toLowerCase().includes('success')) {
        showNotification(text, 'success');
      } else if (text.toLowerCase().includes('error')) {
        showNotification(text, 'error');
      } else {
        // Neutral — default to success style for non-error responses
        showNotification(text, 'success');
      }
    } catch (err) {
      // Handle network / CORS errors gracefully
      let friendlyMessage;

      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        friendlyMessage =
          '⚠️ Tidak dapat terhubung ke server SAP. Kemungkinan penyebab:\n' +
          '• Server SAP sedang tidak aktif atau tidak dapat dijangkau.\n' +
          '• Browser memblokir request karena Mixed Content (HTTPS → HTTP). ' +
          'Coba akses halaman ini melalui http:// (tanpa "s").\n' +
          '• CORS policy pada server SAP memblokir request dari origin ini.';
      } else {
        friendlyMessage = `⚠️ Terjadi kesalahan: ${err.message}`;
      }

      showNotification(friendlyMessage, 'error');
    } finally {
      setLoading(false);
    }
  }


  // ===== Event Listeners =====
  addItemBtn.addEventListener('click', () => {
    const newRow = createRow();
    rowsContainer.appendChild(newRow);
    updateItemCount();
    // Focus the new material input
    newRow.querySelector('.input--material').focus();
  });

  form.addEventListener('submit', handleSubmit);

  // ===== Init — add the first row =====
  rowsContainer.appendChild(createRow());
  updateItemCount();
})();
