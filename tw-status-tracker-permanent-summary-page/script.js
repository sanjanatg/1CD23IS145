  const STORE_KEY = 'tw_tracker_v9';
  let rowSeq = 0; /* unique id seq for module rows across all entries */

  /* ── I-AUTHO-NUM: fixed 11-zero prefix + 5 manually entered digits = 16 chars total ── */
  const AUTHO_PREFIX = '00000000000'; /* 11 zeros */
  function buildAuthoNum(suffix) {
    const digits = String(suffix || '').replace(/\D/g, '').slice(0, 5);
    return digits ? AUTHO_PREFIX + digits.padStart(5, '0') : '';
  }

  /* ── Storage ──
     Stored shape: array of entry objects
     { projectName, modules: [ {moduleName, fwDocs, moduleNumber, authoNumSuffix, authoNum, dvcReview, version, review, dateOfTesting, tcRelease}, ... ] }
  */
  function loadAll() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; } }
  function saveAll(d) {
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
    if (typeof renderDashboard === 'function') renderDashboard();
  }

  /* ── Suggestion data ── */
  function getSavedProjects() {
    return [...new Set(loadAll().map(r => r.projectName).filter(Boolean))];
  }
  function getSavedVersions(project) {
    const src = project ? loadAll().filter(r => r.projectName === project) : loadAll();
    const names = [];
    src.forEach(r => (r.modules || []).forEach(m => { if (m.version) names.push(m.version); }));
    return [...new Set(names)];
  }
  function getSavedModules(project) {
    const src = project ? loadAll().filter(r => r.projectName === project) : loadAll();
    const names = [];
    src.forEach(r => (r.modules || []).forEach(m => { if (m.moduleName) names.push(m.moduleName); }));
    return [...new Set(names)];
  }

  function getProjectNames(entries = loadAll()) {
    return [...new Set(entries.map(r => (r.projectName || '').trim()).filter(Boolean))];
  }

  function getSummary(entries = loadAll()) {
    const validEntries = entries.filter(Boolean);
    const projects = getProjectNames(validEntries);
    const rows = buildAllProjectRows(validEntries);
    const perProject = projects.map(projectName => {
      const projectRows = rows.filter(row => row.projectName === projectName);
      return {
        projectName,
        entries: validEntries.filter(entry => entry.projectName === projectName).length,
        modules: projectRows.filter(row => row.moduleName).length,
        dvcYes: projectRows.filter(row => row.dvcReview === 'Yes').length,
        tcYes: projectRows.filter(row => row.tcRelease === 'Yes').length
      };
    });

    return {
      totalProjects: projects.length,
      totalEntries: validEntries.length,
      totalModules: rows.filter(row => row.moduleName).length,
      dvcYes: rows.filter(row => row.dvcReview === 'Yes').length,
      dvcNo: rows.filter(row => row.dvcReview === 'No').length,
      tcYes: rows.filter(row => row.tcRelease === 'Yes').length,
      tcNo: rows.filter(row => row.tcRelease === 'No').length,
      perProject
    };
  }

  function renderDashboard() {
    // (Project Wise Status section removed — nothing to render here now)
  }

  /* ── Calendar icon SVG ── */
  const CAL_ICON = `<svg class="cal-icon" width="15" height="15" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/>
    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

  /* ── Renumber all "Entry N" labels and delete-button visibility to match current DOM order ── */
  function renumberEntries() {
    const cards = [...document.querySelectorAll('.entry-card')];
    cards.forEach((card, idx) => {
      const n = idx + 1;
      card.dataset.eid = n;
      const label = card.querySelector('.entry-label');
      if (label) label.textContent = 'Entry ' + n;
      const delBtn = card.querySelector('.btn-delete-entry');
      if (delBtn) delBtn.style.display = 'inline-flex';
    });
  }

  /* ── Build one module row's inner HTML ──
     Order: Module Name | FW Document | Module Number | I-AUTHO-NUM | DVC Review Status | Version | Date of Review | Date of Testing | TC Release */
  function moduleRowHtml(rid, data = {}) {
    return `
      <div class="card-line3">

        <div class="fgroup">
          <div class="flabel">Module Name</div>
          <div class="mod-wrap">
            <input type="text" name="moduleName"
              placeholder="e.g. User Login and Authentication"
              value="${escHtml(data.moduleName || '')}"
              autocomplete="off"
              oninput="onModInput(this)"
              onblur="closeModSugg(this)"/>
            <div class="mod-sugg"></div>
          </div>
        </div>

        <div class="fgroup">
          <div class="flabel">FW Document</div>
          ${makeSelect('fwDocs', ['','FRS','FIRS','FDD'], data.fwDocs || '')}
        </div>

        <div class="fgroup">
          <div class="flabel">Module Number</div>
          <input type="text" name="moduleNumber"
            placeholder="e.g. 1024"
            inputmode="numeric"
            value="${escHtml(data.moduleNumber || '')}"
            autocomplete="off"
            oninput="onModuleNumberInput(this)"/>
        </div>

        <div class="fgroup">
          <div class="flabel">I-AUTHO-NUM</div>
          <div class="autho-wrap">
            <span class="autho-prefix">${AUTHO_PREFIX}</span>
            <input type="text" class="autho-suffix" name="authoNumSuffix"
              placeholder="12345"
              maxlength="5"
              inputmode="numeric"
              value="${escHtml(data.authoNumSuffix || '')}"
              autocomplete="off"
              oninput="onAuthoNumInput(this)"/>
          </div>
          <div class="autho-preview">${escHtml(buildAuthoNum(data.authoNumSuffix || '') || '—')}</div>
        </div>

        <div class="fgroup">
          <div class="flabel">DVC Review Status</div>
          ${makeSelect('dvcReview', ['','Yes','No'], data.dvcReview || '')}
        </div>

        <div class="fgroup">
          <div class="flabel">Version</div>
          <div class="ver-wrap">
            <input type="text" name="version"
              placeholder="e.g. v1.2"
              value="${escHtml(data.version || '')}"
              autocomplete="off"
              oninput="onVerInput(this)"
              onblur="closeVerSugg(this)"/>
            <div class="ver-sugg"></div>
          </div>
        </div>

        <div class="fgroup">
          <div class="flabel">Date of Review</div>
          <div class="date-wrap">
            <input class="date-inp" type="text" name="review"
              placeholder="DD/MM/YYYY"
              value="${escHtml(data.review || '')}"
              autocomplete="off" readonly/>
            ${CAL_ICON}
          </div>
        </div>

        <div class="fgroup">
          <div class="flabel">Date of Testing</div>
          <div class="date-wrap">
            <input class="date-inp" type="text" name="dateOfTesting"
              placeholder="DD/MM/YYYY"
              value="${escHtml(data.dateOfTesting || '')}"
              autocomplete="off" readonly/>
            ${CAL_ICON}
          </div>
        </div>

        <div class="fgroup">
          <div class="flabel">TC Release</div>
          ${makeSelect('tcRelease', ['','Yes','No'], data.tcRelease || '')}
        </div>

      </div>
    `;
  }

  /* ── Init pickers for a module row ── */
  function initRowPickers(rowWrap) {
    const reviewInp = rowWrap.querySelector('[name="review"]');
    flatpickr(reviewInp, {
      dateFormat: 'd/m/Y',
      allowInput: false,
      disableMobile: true,
      defaultDate: reviewInp.value || null,
      onChange: function(selectedDates, dateStr) { reviewInp.value = dateStr; }
    });

    const testInp = rowWrap.querySelector('[name="dateOfTesting"]');
    flatpickr(testInp, {
      dateFormat: 'd/m/Y',
      allowInput: false,
      disableMobile: true,
      defaultDate: testInp.value || null,
      onChange: function(selectedDates, dateStr) { testInp.value = dateStr; }
    });
  }

  /* ── Add a module row to an entry card ── */
  function addModuleRow(card, data = {}) {
    rowSeq++;
    const rid = rowSeq;
    const wrap = document.createElement('div');
    wrap.className = 'module-row-wrap';
    wrap.dataset.rid = rid;

    const removeBtn = `
      <button class="btn-remove-row" title="Remove module row" onclick="removeModuleRow(this)">
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
          <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        </svg>
      </button>`;

    wrap.innerHTML = moduleRowHtml(rid, data);
    wrap.insertAdjacentHTML('beforeend', removeBtn);

    card.querySelector('.module-rows').appendChild(wrap);
    initRowPickers(wrap);
    toggleRemoveButtons(card);
    return wrap;
  }

  function removeModuleRow(btn) {
    const wrap = btn.closest('.module-row-wrap');
    const card = wrap.closest('.entry-card');
    wrap.remove();
    toggleRemoveButtons(card);
    persistVisibleCards();
  }

  /* Hide the remove button when only one module row remains */
  function toggleRemoveButtons(card) {
    const rows = card.querySelectorAll('.module-row-wrap');
    rows.forEach(r => {
      const btn = r.querySelector('.btn-remove-row');
      if (!btn) return;
      btn.style.display = rows.length > 1 ? 'inline-flex' : 'none';
    });
  }

  /* ── Add entry card ── */
  function addEntry(data = {}, options = {}) {
    const card = document.createElement('div');
    card.className = 'entry-card';

    card.innerHTML = `

      <!-- LINE 1: Entry label (clickable header to collapse/expand) -->
      <div class="card-line1 entry-card-toggle" onclick="toggleEntryCard(this)">
        <span class="entry-label">Entry</span>
        <div class="entry-header-right">
          <svg class="entry-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <button class="btn-delete-entry" title="Remove entry" onclick="event.stopPropagation(); deleteEntry(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
                stroke="currentColor" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Collapsible body -->
      <div class="entry-card-body">
        <!-- LINE 2: Project Name (full width) -->
        <div class="card-line2">
          <div class="fgroup">
            <div class="flabel">Project Name</div>
            <div class="proj-wrap">
              <input type="text" class="proj-name-inp" name="projectName"
                placeholder="e.g. DRDO Radar System"
                value="${escHtml(data.projectName || '')}"
                autocomplete="off"
                oninput="onProjInput(this)"
                onblur="closeProjSugg(this)"/>
              <div class="proj-sugg"></div>
            </div>
          </div>
        </div>

        <!-- Module rows -->
        <div class="module-rows"></div>

        <!-- "+" add row & per-entry save, side by side -->
        <div class="entry-actions">
          <button class="btn-add-row" type="button" onclick="addModuleRow(this.closest('.entry-card'))">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
            Add Rows
          </button>
          <div class="save-group">
            <span class="saved-badge">✓ Saved</span>
            <button class="btn-save-entry" type="button" onclick="saveEntry(this.closest('.entry-card'))">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M17 21H7a4 4 0 0 1-4-4V7l4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4Z" stroke="#fff" stroke-width="1.8"/>
                <path d="M9 21v-6h6v6M9 3v4h6V3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              Save
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('entriesContainer').appendChild(card);

    /* Seed module rows: at least one, from data.modules if provided */
    const seedModules = (data.modules && data.modules.length) ? data.modules : [{}];
    seedModules.forEach(m => addModuleRow(card, m));

    /* Any edit after a save hides the "Saved" badge again */
    card.addEventListener('input', () => markUnsaved(card));
    card.addEventListener('change', () => markUnsaved(card));

    renumberEntries();

    // New entries (no data / explicit focus) open expanded; loaded ones start collapsed
    const isNewEntry = !data.projectName && options.focus !== false;
    const body = card.querySelector('.entry-card-body');
    const chevron = card.querySelector('.entry-chevron');
    if (isNewEntry) {
      body.style.display = 'block';
      chevron.style.transform = 'rotate(180deg)';
      card.querySelector('[name="projectName"]').focus();
    } else {
      body.style.display = 'none';
    }
  }

  function markSaved(card) {
    const badge = card.querySelector('.saved-badge');
    if (badge) badge.classList.add('show');
  }
  function markUnsaved(card) {
    const badge = card.querySelector('.saved-badge');
    if (badge) badge.classList.remove('show');
  }

  /* ── Toggle entry card expand/collapse ── */
  function toggleEntryCard(header) {
    const card = header.closest('.entry-card');
    const body = card.querySelector('.entry-card-body');
    const chevron = card.querySelector('.entry-chevron');
    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  }

  /* ── After a Save, the entered data must not stay visible on screen.
     It is already safely written to localStorage (and stays available for
     Download Excel) — this just wipes the on-screen form back to a single
     blank entry so nobody can read the typed-in details off the screen. ── */
  function resetToBlank() {
    document.getElementById('entriesContainer').innerHTML = '';
    addEntry();
  }

  function renderEntries(entries) {
    const container = document.getElementById('entriesContainer');
    container.innerHTML = '';
    const cleanEntries = entries && entries.length ? entries : [{}];
    cleanEntries.forEach(entry => addEntry(entry, { focus: false }));
    renumberEntries();
  }

  /* ── Delete entry (removes from form view only — permanent module data is kept) ── */
  function deleteEntry(btn) {
    const card = btn.closest('.entry-card');
    card.remove();
    renumberEntries();
    // Save the remaining visible entries (does NOT wipe permanent module store)
    const remaining = getSavableCardData();
    localStorage.setItem(STORE_KEY, JSON.stringify(remaining));
    showToast('Entry removed from view. Module details permanently preserved.');
  }

  /* ── Select builder ── */
  /* ── Module Number: numbers only ── */
  function onModuleNumberInput(inp) {
    inp.value = inp.value.replace(/\D/g, '');
  }

  /* ── I-AUTHO-NUM: keep only 5 digits, live-preview the full 16-char value
     (11-zero prefix + the 5 digits entered here) ── */
  function onAuthoNumInput(inp) {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 5);
    const preview = inp.closest('.fgroup').querySelector('.autho-preview');
    if (preview) preview.textContent = buildAuthoNum(inp.value) || '—';
  }

  function makeSelect(name, opts, val) {
    return `<select name="${name}">${opts.map(o =>
      `<option value="${o}"${o === val ? ' selected' : ''}>${o || '— select —'}</option>`
    ).join('')}</select>`;
  }

  /* ── Project autocomplete ── */
  function onProjInput(inp) {
    const val = inp.value.trim().toLowerCase();
    const sugg = inp.closest('.proj-wrap').querySelector('.proj-sugg');
    const names = getSavedProjects().filter(n => n.toLowerCase().includes(val));
    if (!names.length || !val) { sugg.style.display = 'none'; sugg.innerHTML = ''; return; }
    sugg.innerHTML = names.map(n => `<div class="sugg-item" onmousedown="event.preventDefault()">${escHtml(n)}</div>`).join('');
    sugg.querySelectorAll('.sugg-item').forEach((el, i) =>
      el.addEventListener('mousedown', () => {
        inp.value = names[i];
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        sugg.style.display = 'none';
        sugg.innerHTML = '';
      })
    );
    sugg.style.display = 'block';
  }
  function closeProjSugg(inp) {
    setTimeout(() => {
      const sugg = inp.closest('.proj-wrap').querySelector('.proj-sugg');
      sugg.style.display = 'none'; sugg.innerHTML = '';
    }, 160);
  }

  /* ── Version autocomplete / search ── */
  function onVerInput(inp) {
    const card = inp.closest('.entry-card');
    const project = card.querySelector('[name="projectName"]').value.trim();
    const val = inp.value.trim().toLowerCase();
    const sugg = inp.closest('.ver-wrap').querySelector('.ver-sugg');
    const names = getSavedVersions(project).filter(n => n.toLowerCase().includes(val));
    if (!names.length || !val) { sugg.style.display = 'none'; sugg.innerHTML = ''; return; }
    sugg.innerHTML = names.map(n => `<div class="sugg-item" onmousedown="event.preventDefault()">${escHtml(n)}</div>`).join('');
    sugg.querySelectorAll('.sugg-item').forEach((el, i) =>
      el.addEventListener('mousedown', () => {
        inp.value = names[i];
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        sugg.style.display = 'none';
        sugg.innerHTML = '';
      })
    );
    sugg.style.display = 'block';
  }
  function closeVerSugg(inp) {
    setTimeout(() => {
      const sugg = inp.closest('.ver-wrap').querySelector('.ver-sugg');
      sugg.style.display = 'none'; sugg.innerHTML = '';
    }, 160);
  }

  /* ── Module autocomplete ── */
  function onModInput(inp) {
    const card = inp.closest('.entry-card');
    const project = card.querySelector('[name="projectName"]').value.trim();
    const val = inp.value.trim().toLowerCase();
    const sugg = inp.closest('.mod-wrap').querySelector('.mod-sugg');
    const names = getSavedModules(project).filter(n => n.toLowerCase().includes(val));
    if (!names.length || !val) { sugg.style.display = 'none'; sugg.innerHTML = ''; return; }
    sugg.innerHTML = names.map(n => `<div class="sugg-item" onmousedown="event.preventDefault()">${escHtml(n)}</div>`).join('');
    sugg.querySelectorAll('.sugg-item').forEach((el, i) =>
      el.addEventListener('mousedown', () => {
        inp.value = names[i];
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        sugg.style.display = 'none';
        sugg.innerHTML = '';
      })
    );
    sugg.style.display = 'block';
  }
  function closeModSugg(inp) {
    setTimeout(() => {
      const sugg = inp.closest('.mod-wrap').querySelector('.mod-sugg');
      sugg.style.display = 'none'; sugg.innerHTML = '';
    }, 160);
  }

  /* ── Read one entry card into the stored shape ── */
  function getEntryData(card) {
    const projectName = card.querySelector('[name="projectName"]').value.trim();
    const modules = [...card.querySelectorAll('.module-row-wrap')].map(row => {
      const authoNumSuffix = row.querySelector('[name="authoNumSuffix"]').value.trim();
      return {
        moduleName:     row.querySelector('[name="moduleName"]').value.trim(),
        fwDocs:         row.querySelector('[name="fwDocs"]').value.trim(),
        moduleNumber:   row.querySelector('[name="moduleNumber"]').value.trim(),
        authoNumSuffix: authoNumSuffix,
        authoNum:       buildAuthoNum(authoNumSuffix),
        dvcReview:      row.querySelector('[name="dvcReview"]').value,
        version:        row.querySelector('[name="version"]').value.trim(),
        review:         row.querySelector('[name="review"]').value,
        dateOfTesting:  row.querySelector('[name="dateOfTesting"]').value,
        tcRelease:      row.querySelector('[name="tcRelease"]').value,
      };
    });
    return { projectName, modules };
  }

  /* ── Read all cards, in DOM (display) order ── */
  function getAllCardData() {
    return [...document.querySelectorAll('.entry-card')].map(getEntryData);
  }

  function getSavableCardData() {
    return getAllCardData()
      .filter(entry => entry.projectName && entry.modules.some(module => module.moduleName))
      .map(entry => ({
        projectName: entry.projectName,
        modules: entry.modules.filter(module => module.moduleName)
      }));
  }

  function persistVisibleCards() {
    saveAll(getSavableCardData());
  }

  /* ── Save a single entry (its own "Save" button) ──
     Persists a full snapshot of ALL entries in current display order, so Entry
     positions (and therefore sheet numbers on download) always stay consistent. */
  function saveEntry(card) {
    const entry = getEntryData(card);
    if (!entry.projectName) { showToast('⚠  Add a Project Name for this entry first'); return; }
    if (!entry.modules.length || entry.modules.every(m => !m.moduleName)) {
      showToast('⚠  Add at least one row with a Module Name'); return;
    }

    const allData = getSavableCardData();
    saveAll(allData);
    syncToPermanentStore(allData);
    const eid = card.dataset.eid;
    const rowCount = entry.modules.length;
    markSaved(card);
    renderDashboard();
    showToast('✓  Entry ' + eid + ' saved — ' + rowCount + ' row(s).');
  }

  /* ── Save all entries at once (bottom bar), preserving display order/position ── */
  function saveData() {
    const entries = getSavableCardData();
    if (!entries.length) { showToast('⚠  Add at least one complete project first'); return; }

    saveAll(entries);
    syncToPermanentStore(entries);
    const count = entries.length;
    document.querySelectorAll('.entry-card').forEach(card => {
      if (getEntryData(card).projectName) markSaved(card);
    });
    renderDashboard();
    showToast('✓  ' + count + ' entr' + (count === 1 ? 'y' : 'ies') + ' saved.');
  }

  /* ── Sync to permanent module store (append-only, never deletes) ── */
  function syncToPermanentStore(entries) {
    const PERM_KEY = 'tw_tracker_perm_modules';
    let existing = [];
    try { existing = JSON.parse(localStorage.getItem(PERM_KEY) || '[]'); } catch { existing = []; }

    const newRows = entries.flatMap((entry, idx) =>
      (entry.modules || []).map((m, mi) => ({
        entryNum: idx + 1, moduleNum: mi + 1,
        projectName: entry.projectName || '',
        moduleName: m.moduleName || '',
        fwDocs: m.fwDocs || '',
        moduleNumber: m.moduleNumber || '',
        authoNum: m.authoNum || buildAuthoNum(m.authoNumSuffix || ''),
        dvcReview: m.dvcReview || '',
        version: m.version || '', review: m.review || '',
        dateOfTesting: m.dateOfTesting || '', tcRelease: m.tcRelease || ''
      }))
    );

    const makeKey = r => [r.projectName, r.moduleName, r.version, r.fwDocs].join('||').toLowerCase();
    const existingKeyMap = new Map(existing.map((r, i) => [makeKey(r), i]));

    const merged = [...existing];
    newRows.forEach(row => {
      if (!row.moduleName) return;
      const key = makeKey(row);
      if (existingKeyMap.has(key)) {
        merged[existingKeyMap.get(key)] = row; // update
      } else {
        merged.push(row); // append new
      }
    });

    localStorage.setItem(PERM_KEY, JSON.stringify(merged));
  }

  /* ── Sheet-name sanitizer (Excel: max 31 chars, no \ / ? * [ ] :) ──
     Prefixed with the entry's position so Entry 1 -> Sheet 1, Entry 2 -> Sheet 2, etc.
     is guaranteed even if two entries share the same Project Name. */
  function safeSheetName(entryNum, name) {
    const prefix = 'E' + entryNum + '-';
    let base = String(name || 'Project').replace(/[\\/?*\[\]:]/g, '-').trim();
    if (!base) base = 'Project';
    const maxBaseLen = 31 - prefix.length;
    return prefix + base.substring(0, maxBaseLen);
  }

  /* Download Excel: all saved project details in one sheet */
  function buildAllProjectRows(entries) {
    return entries.flatMap((entry, idx) => {
      const entryNum = idx + 1;
      const rows = (entry.modules && entry.modules.length) ? entry.modules : [{}];
      return rows.map((m, moduleIdx) => ({
        entryNum,
        moduleNum: moduleIdx + 1,
        projectName: entry.projectName || '',
        moduleName: m.moduleName || '',
        fwDocs: m.fwDocs || '',
        moduleNumber: m.moduleNumber || '',
        authoNum: m.authoNum || buildAuthoNum(m.authoNumSuffix || ''),
        dvcReview: m.dvcReview || '',
        version: m.version || '',
        review: m.review || '',
        dateOfTesting: m.dateOfTesting || '',
        tcRelease: m.tcRelease || ''
      }));
    });
  }

  function handleImportFile(input) {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const wb = XLSX.read(event.target.result, { type: 'array', cellDates: true });
        const entries = importWorkbookToEntries(wb);
        if (!entries.length) {
          showToast('No project rows found. Check the Excel column headers.');
          return;
        }

        saveAll(entries);
        renderEntries(entries);
        renderDashboard();
        showToast('Imported ' + entries.length + ' project card(s) from Excel and saved them.');
      } catch (err) {
        console.error(err);
        showToast('Could not import this Excel file. Please check the sheet format.');
      } finally {
        input.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function importWorkbookToEntries(wb) {
    for (const sheetName of getImportSheetOrder(wb)) {
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
      const parsed = sheetRowsToEntries(rows);
      if (parsed.length) return parsed;
    }
    return [];
  }

  function getImportSheetOrder(wb) {
    const preferred = ['All Project Details', 'Project Details', 'Details'];
    const names = wb.SheetNames || [];
    return [
      ...preferred.filter(name => names.includes(name)),
      ...names.filter(name => !preferred.includes(name) && name !== 'Summary')
    ];
  }

  function sheetRowsToEntries(rows) {
    const headerInfo = findImportHeader(rows);
    if (!headerInfo) return [];

    const { headerRowIndex, map } = headerInfo;
    const groups = new Map();
    let lastProjectName = '';
    let lastEntryNum = '';

    rows.slice(headerRowIndex + 1).forEach((row, rowOffset) => {
      const rawProject = importCell(row, map.projectName);
      const rawEntry = importCell(row, map.entryNum);
      const projectName = rawProject || lastProjectName;
      const entryNum = rawEntry || lastEntryNum || String(groups.size + 1);
      const moduleName = importCell(row, map.moduleName);

      if (!projectName && !moduleName) return;
      lastProjectName = projectName || lastProjectName;
      lastEntryNum = entryNum || lastEntryNum;

      const groupKey = entryNum + '::' + projectName;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          entryNum: Number(entryNum) || groups.size + 1,
          firstRowIndex: rowOffset,
          projectName,
          modules: []
        });
      }

      const importedAuthoNum = importCell(row, map.authoNum);
      groups.get(groupKey).modules.push({
        rowNum: Number(importCell(row, map.moduleNum)) || groups.get(groupKey).modules.length + 1,
        moduleName,
        fwDocs: importCell(row, map.fwDocs),
        moduleNumber: importCell(row, map.moduleNumber),
        authoNumSuffix: importedAuthoNum.slice(-5).replace(/\D/g, ''),
        authoNum: importedAuthoNum,
        dvcReview: normalizeChoice(importCell(row, map.dvcReview)),
        version: importCell(row, map.version),
        review: importDateCell(row, map.review),
        dateOfTesting: importDateCell(row, map.dateOfTesting),
        tcRelease: normalizeChoice(importCell(row, map.tcRelease))
      });
    });

    return [...groups.values()]
      .sort((a, b) => (a.entryNum - b.entryNum) || (a.firstRowIndex - b.firstRowIndex))
      .map(group => ({
        projectName: group.projectName,
        modules: group.modules
          .sort((a, b) => a.rowNum - b.rowNum)
          .map(({ rowNum, ...module }) => module)
      }));
  }

  function findImportHeader(rows) {
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const normalized = rows[r].map(normalizeHeader);
      const map = {
        entryNum: findHeaderIndex(normalized, ['entryno', 'entrynum', 'entrynumber', 'entry', 'index']),
        moduleNum: findHeaderIndex(normalized, ['rowno', 'rownum', 'rownumber', 'moduleno', 'modulenum', 'srno']),
        projectName: findHeaderIndex(normalized, ['projectname', 'project', 'projectid']),
        moduleName: findHeaderIndex(normalized, ['modulename', 'module', 'modules', 'modelname', 'model', 'models']),
        fwDocs: findHeaderIndex(normalized, ['fwdocs', 'fwdoc', 'fwdocument', 'fwdocument']),
        moduleNumber: findHeaderIndex(normalized, ['modulenumber', 'modelnumber', 'modulenum']),
        authoNum: findHeaderIndex(normalized, ['iauthonum', 'authonum', 'iauthonumber']),
        dvcReview: findHeaderIndex(normalized, ['dvcreview', 'dvcreviewstatus', 'dvcstatus']),
        version: findHeaderIndex(normalized, ['version', 'versions']),
        review: findHeaderIndex(normalized, ['dateofreview', 'reviewdate', 'review']),
        dateOfTesting: findHeaderIndex(normalized, ['dateoftesting', 'testingdate', 'testdate']),
        tcRelease: findHeaderIndex(normalized, ['tcrelease', 'tcreleasestatus', 'tcstatus'])
      };

      if (map.projectName > -1 && map.moduleName > -1) return { headerRowIndex: r, map };
    }
    return null;
  }

  function findHeaderIndex(headers, names) {
    return headers.findIndex(header => names.includes(header));
  }

  function normalizeHeader(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function importCell(row, index) {
    if (index === undefined || index < 0) return '';
    const value = row[index];
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return formatDate(value);
    return String(value).trim();
  }

  function importDateCell(row, index) {
    if (index === undefined || index < 0) return '';
    const value = row[index];
    if (value instanceof Date) return formatDate(value);
    if (typeof value === 'number' && XLSX.SSF && XLSX.SSF.parse_date_code) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) return pad2(parsed.d) + '/' + pad2(parsed.m) + '/' + parsed.y;
    }
    return importCell(row, index);
  }

  function formatDate(date) {
    return pad2(date.getDate()) + '/' + pad2(date.getMonth() + 1) + '/' + date.getFullYear();
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function normalizeChoice(value) {
    const text = String(value || '').trim().toLowerCase();
    if (text === 'yes' || text === 'y' || text === 'true' || text === '1') return 'Yes';
    if (text === 'no' || text === 'n' || text === 'false' || text === '0') return 'No';
    return value || '';
  }

  /* ── Toast ── */
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3400);
  }

  /* ── Util ── */
  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* Init — load saved entries as collapsed cards; start blank if none */
  const savedEntries = loadAll();
  if (savedEntries.length) renderEntries(savedEntries);
  // else: leave container empty — user clicks "New Entry" to add
  renderDashboard();

  function doLogout() {
    sessionStorage.removeItem('tw_auth_session');
    window.location.href = 'login.html';
  }
