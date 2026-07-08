/**
 * SAP PR / PO Creator — Application Logic
 * Supports both Purchase Requisition and Purchase Order creation.
 * PO supports two sub-modes: from PR reference, or direct material entry.
 */

(function () {
  'use strict';

  // ===== Constants =====
  const API_PR  = '/api/create-pr';
  const API_PO  = '/api/create-po';
  const CONTENT_TYPE = 'text/plain';

  // ===== DOM References =====
  const form           = document.getElementById('mainForm');
  const rowsContainer  = document.getElementById('itemRows');
  const addItemBtn     = document.getElementById('addItemBtn');
  const submitBtn      = document.getElementById('submitBtn');
  const submitText     = document.getElementById('submitBtnText');
  const spinner        = document.getElementById('submitSpinner');
  const notification   = document.getElementById('notification');
  const itemCountEl    = document.querySelector('.card-header__count-num');
  const sapUserInput   = document.getElementById('sapUser');
  const sapPassInput   = document.getElementById('sapPass');
  const mainCard       = document.querySelector('.main-card');
  const cardTitle      = document.getElementById('cardTitle');
  const cardDesc       = document.getElementById('cardDesc');

  // Mode buttons
  const modePRBtn      = document.getElementById('modePR');
  const modePOBtn      = document.getElementById('modePO');

  // PO-specific elements
  const poHeaderSection = document.getElementById('poHeaderSection');
  const compCodeInput   = document.getElementById('compCode');
  const docTypeInput    = document.getElementById('docType');
  const vendorInput     = document.getElementById('vendor');
  const purchOrgInput   = document.getElementById('purchOrg');
  const purGroupInput   = document.getElementById('purGroup');
  const prNumberInput   = document.getElementById('prNumber');
  const prRefSection    = document.getElementById('prRefSection');

  // PO sub-mode buttons
  const submodeFromPR   = document.getElementById('submodeFromPR');
  const submodeDirect   = document.getElementById('submodeDirect');

  // Table headers
  const tableHeaderDirect = document.getElementById('tableHeaderDirect');
  const tableHeaderPR     = document.getElementById('tableHeaderPR');

  // ===== State =====
  let rowIndex = 0;
  let currentMode = 'pr';       // 'pr' or 'po'
  let currentSubMode = 'from-pr'; // 'from-pr' or 'direct'

  // ===== SVG Icons =====
  const trashIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/>
    <path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>`;

  // ===== Create a single item row — Material/Qty/Plant (PR or Direct PO) =====
  function createDirectRow() {
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

  // ===== Create PR Item reference row (PO from PR mode) =====
  function createPRItemRow() {
    rowIndex++;
    const idx = rowIndex;
    const isFirst = rowsContainer.children.length === 0;

    const row = document.createElement('div');
    row.className = 'item-row item-row--pr-ref';
    row.dataset.idx = idx;

    row.innerHTML = `
      <span class="row-idx">${rowsContainer.children.length + 1}</span>

      <div class="input-group">
        <label class="mobile-label" for="pritem-${idx}">PR Item No</label>
        <input
          id="pritem-${idx}"
          class="input input--pritem"
          type="number"
          min="1"
          placeholder="e.g. 10"
          required
        />
      </div>

      ${isFirst
        ? '<div class="btn--delete-placeholder"></div>'
        : `<button type="button" class="btn btn--delete" title="Remove item">${trashIcon}</button>`
      }
    `;

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

  // ===== Clear all rows and re-add one =====
  function resetRows() {
    rowsContainer.innerHTML = '';
    rowIndex = 0;
    addNewRow();
    updateItemCount();
  }

  // ===== Add the correct row type based on current mode/sub-mode =====
  function addNewRow() {
    let row;
    if (currentMode === 'pr' || (currentMode === 'po' && currentSubMode === 'direct')) {
      row = createDirectRow();
    } else {
      row = createPRItemRow();
    }
    rowsContainer.appendChild(row);
    updateItemCount();
    return row;
  }

  // ===== Collect & format data =====
  function collectData() {
    const rows = rowsContainer.querySelectorAll('.item-row');

    if (currentMode === 'pr') {
      // PR format: NB#MATERIAL|QTY|PLANT;MATERIAL|QTY|PLANT
      const parts = [];
      rows.forEach(row => {
        const material = row.querySelector('.input--material').value.trim().toUpperCase();
        const qty      = row.querySelector('.input--qty').value.trim();
        const plant    = row.querySelector('.input--plant').value.trim();
        parts.push(`${material}|${qty}|${plant}`);
      });
      return 'NB#' + parts.join(';');
    }

    if (currentMode === 'po') {
      // PO header: COMP_CODE#DOC_TYPE#VENDOR#PURCH_ORG#PUR_GROUP#BODY
      const compCode = compCodeInput.value.trim();
      const docType  = docTypeInput.value.trim();
      const vendor   = vendorInput.value.trim();
      const purchOrg = purchOrgInput.value.trim();
      const purGroup = purGroupInput.value.trim();
      const header   = `${compCode}#${docType}#${vendor}#${purchOrg}#${purGroup}`;

      if (currentSubMode === 'from-pr') {
        // PO from PR: HEADER#PR_NO#ITEM;ITEM
        const prNo = prNumberInput.value.trim();
        const items = [];
        rows.forEach(row => {
          const prItem = row.querySelector('.input--pritem').value.trim();
          if (prItem) items.push(prItem);
        });
        return `${header}#${prNo}#${items.join(';')}`;
      } else {
        // Direct PO: HEADER#MATERIAL|QTY|PLANT;MATERIAL|QTY|PLANT
        const parts = [];
        rows.forEach(row => {
          const material = row.querySelector('.input--material').value.trim().toUpperCase();
          const qty      = row.querySelector('.input--qty').value.trim();
          const plant    = row.querySelector('.input--plant').value.trim();
          parts.push(`${material}|${qty}|${plant}`);
        });
        return `${header}#${parts.join(';')}`;
      }
    }

    return '';
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
    const label = currentMode === 'pr' ? 'PR' : 'PO';
    if (loading) {
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      submitText.textContent = `Creating ${label}…`;
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      submitText.textContent = `Submit ${label}`;
    }
  }

  // ===== Toggle table headers =====
  function updateTableHeaders() {
    if (currentMode === 'po' && currentSubMode === 'from-pr') {
      tableHeaderDirect.style.display = 'none';
      tableHeaderPR.style.display = '';
    } else {
      tableHeaderDirect.style.display = '';
      tableHeaderPR.style.display = 'none';
    }
  }

  // ===== Switch main mode (PR / PO) =====
  function switchMode(mode) {
    currentMode = mode;
    hideNotification();

    // Update mode buttons
    modePRBtn.classList.toggle('active', mode === 'pr');
    modePOBtn.classList.toggle('active', mode === 'po');

    // Update card styling
    mainCard.classList.toggle('po-mode', mode === 'po');

    // Update card header text
    if (mode === 'pr') {
      cardTitle.textContent = 'Create New PR';
      cardDesc.textContent = 'Add materials below and submit to create a Purchase Requisition in SAP.';
      submitText.textContent = 'Submit PR';
      poHeaderSection.style.display = 'none';
    } else {
      cardTitle.textContent = 'Create New PO';
      cardDesc.textContent = 'Fill in header details and items to create a Purchase Order in SAP.';
      submitText.textContent = 'Submit PO';
      poHeaderSection.style.display = '';
      // Set required on PO header fields
      vendorInput.setAttribute('required', '');
    }

    // Toggle PO header required fields
    const poFields = [compCodeInput, docTypeInput, vendorInput, purchOrgInput, purGroupInput];
    poFields.forEach(f => {
      if (mode === 'po') f.setAttribute('required', '');
      else f.removeAttribute('required');
    });

    // Toggle prNumber required
    if (mode === 'po' && currentSubMode === 'from-pr') {
      prNumberInput.setAttribute('required', '');
    } else {
      prNumberInput.removeAttribute('required');
    }

    updateTableHeaders();
    resetRows();
  }

  // ===== Switch PO sub-mode =====
  function switchSubMode(submode) {
    currentSubMode = submode;
    hideNotification();

    submodeFromPR.classList.toggle('active', submode === 'from-pr');
    submodeDirect.classList.toggle('active', submode === 'direct');

    if (submode === 'from-pr') {
      prRefSection.style.display = '';
      prNumberInput.setAttribute('required', '');
    } else {
      prRefSection.style.display = 'none';
      prNumberInput.removeAttribute('required');
    }

    updateTableHeaders();
    resetRows();
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
    const apiUrl = currentMode === 'pr' ? API_PR : API_PO;

    try {
      const response = await fetch(apiUrl, {
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
    const newRow = addNewRow();
    // Focus the first input in the new row
    const firstInput = newRow.querySelector('input');
    if (firstInput) firstInput.focus();
  });

  form.addEventListener('submit', handleSubmit);

  // Mode switcher
  modePRBtn.addEventListener('click', () => switchMode('pr'));
  modePOBtn.addEventListener('click', () => switchMode('po'));

  // PO sub-mode switcher
  submodeFromPR.addEventListener('click', () => switchSubMode('from-pr'));
  submodeDirect.addEventListener('click', () => switchSubMode('direct'));

  // ===== Init — add the first row =====
  addNewRow();
})();
