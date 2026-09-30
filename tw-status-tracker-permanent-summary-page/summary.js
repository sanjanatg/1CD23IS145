const STORE_KEY = 'tw_tracker_v9';
// Separate permanent key for module details — never wiped by entry deletions
const PERM_KEY = 'tw_tracker_perm_modules';

// I-AUTHO-NUM: fixed 11-zero prefix + 5 manually entered digits = 16 chars total
const AUTHO_PREFIX = '00000000000';
function buildAuthoNum(suffix) {
  const digits = String(suffix || '').replace(/\D/g, '').slice(0, 5);
  return digits ? AUTHO_PREFIX + digits.padStart(5, '0') : '';
}

// ── All Module Details: search + manual row selection state ──
let currentPermRows = [];       // full, unfiltered list of module rows currently loaded
let moduleSearchText = '';      // current search bar text (lowercased)
let selectedModuleRows = new Set(); // indices (into currentPermRows) that are checked

// ── Storage ──
function loadAll() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}

function loadPermanentRows() {
  try { return JSON.parse(localStorage.getItem(PERM_KEY) || '[]'); } catch { return []; }
}

function savePermanentRows(rows) {
  localStorage.setItem(PERM_KEY, JSON.stringify(rows));
}

// ── Build rows from live entries (for metrics/project stats) ──
function buildRows(entries) {
  return entries.flatMap((entry, entryIdx) => {
    const modules = entry.modules && entry.modules.length ? entry.modules : [];
    return modules.map((module, moduleIdx) => ({
      entryNum: entryIdx + 1,
      moduleNum: moduleIdx + 1,
      projectName: entry.projectName || '',
      moduleName: module.moduleName || '',
      fwDocs: module.fwDocs || '',
      moduleNumber: module.moduleNumber || '',
      authoNum: module.authoNum || buildAuthoNum(module.authoNumSuffix || ''),
      dvcReview: module.dvcReview || '',
      version: module.version || '',
      review: module.review || '',
      dateOfTesting: module.dateOfTesting || '',
      tcRelease: module.tcRelease || ''
    }));
  });
}

// ── Merge new rows into permanent store (append only, no deletion) ──
function mergeToPermanent(entries) {
  const existing = loadPermanentRows();
  const newRows = buildRows(entries);

  // Build a key to deduplicate: project+module+version combo
  const makeKey = r => [r.projectName, r.moduleName, r.version, r.fwDocs].join('||').toLowerCase();
  const existingKeys = new Set(existing.map(makeKey));

  const toAdd = newRows.filter(r => r.moduleName && !existingKeys.has(makeKey(r)));
  if (toAdd.length) {
    savePermanentRows([...existing, ...toAdd]);
  }
  // Also update existing rows with new data (same key → update fields)
  const updatedRows = existing.map(r => {
    const match = newRows.find(n => makeKey(n) === makeKey(r));
    return match ? { ...r, ...match } : r;
  });
  savePermanentRows([...updatedRows, ...toAdd]);
}

function getSummary(entries) {
  const projects = [...new Set(entries.map(e => e.projectName).filter(Boolean))];
  const rows = buildRows(entries);
  const perProject = projects.map(projectName => {
    const projectRows = rows.filter(row => row.projectName === projectName);
    const dvcYes = projectRows.filter(row => row.dvcReview === 'Yes').length;
    const tcYes = projectRows.filter(row => row.tcRelease === 'Yes').length;
    const moduleCount = projectRows.filter(row => row.moduleName).length;
    return {
      projectName,
      modules: moduleCount,
      dvcYes,
      dvcNo: projectRows.filter(row => row.dvcReview === 'No').length,
      tcYes,
      tcNo: projectRows.filter(row => row.tcRelease === 'No').length,
      completion: moduleCount ? Math.round(((dvcYes + tcYes) / (moduleCount * 2)) * 100) : 0
    };
  });

  return {
    totalProjects: projects.length,
    totalModules: rows.filter(row => row.moduleName).length,
    dvcYes: rows.filter(row => row.dvcReview === 'Yes').length,
    dvcNo: rows.filter(row => row.dvcReview === 'No').length,
    tcYes: rows.filter(row => row.tcRelease === 'Yes').length,
    tcNo: rows.filter(row => row.tcRelease === 'No').length,
    perProject,
    rows
  };
}

// ── Toggle collapsible module details ──
function toggleModuleDetails() {
  const panel = document.getElementById('moduleDetailsPanel');
  const chevron = document.getElementById('moduleDetailsChevron');
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

// ── Render ──
function renderSummary() {
  const entries = loadAll().filter(Boolean);
  // Sync permanent store whenever page loads
  if (entries.length) mergeToPermanent(entries);

  const summary = getSummary(entries);
  renderMetrics(summary);
  renderProjects(summary);

  currentPermRows = loadPermanentRows();
  // Drop selections that no longer correspond to an existing row
  selectedModuleRows = new Set([...selectedModuleRows].filter(i => i < currentPermRows.length));
  renderFilteredTable();

  const updatedAt = document.getElementById('summaryUpdatedAt');
  const rowCount = document.getElementById('summaryRowCount');
  if (updatedAt) updatedAt.textContent = entries.length ? 'Live from saved browser data' : 'No saved data';
  if (rowCount) rowCount.textContent = currentPermRows.length + ' module row' + (currentPermRows.length === 1 ? '' : 's');
}

// ── Search bar: filter currentPermRows by any field, then render ──
function filterModuleTable() {
  const input = document.getElementById('moduleSearchInput');
  moduleSearchText = (input ? input.value : '').trim().toLowerCase();
  const clearBtn = document.getElementById('moduleSearchClear');
  if (clearBtn) clearBtn.classList.toggle('show', !!moduleSearchText);
  renderFilteredTable();
}

function clearModuleSearch() {
  const input = document.getElementById('moduleSearchInput');
  if (input) input.value = '';
  moduleSearchText = '';
  const clearBtn = document.getElementById('moduleSearchClear');
  if (clearBtn) clearBtn.classList.remove('show');
  renderFilteredTable();
}

function getFilteredModuleRows() {
  if (!moduleSearchText) return currentPermRows.map((row, idx) => ({ row, idx }));
  return currentPermRows
    .map((row, idx) => ({ row, idx }))
    .filter(({ row }) => [
      row.projectName, row.moduleName, row.fwDocs, row.moduleNumber, row.authoNum, row.dvcReview,
      row.version, row.review, row.dateOfTesting, row.tcRelease
    ].some(field => String(field || '').toLowerCase().includes(moduleSearchText)));
}

function renderFilteredTable() {
  renderTable(getFilteredModuleRows());
  updateSelectedCount();
  syncSelectAllCheckbox();
}

function renderMetrics(summary) {
  const grid = document.getElementById('summaryMetricGrid');
  // "Entries" card is removed as requested
  const metrics = [
    ['FW Total Projects', summary.totalProjects, 'Saved project names'],
    ['FW Total Project Modules', summary.totalModules, 'Total module rows'],
    ['FW Total DVC Reviewed', summary.dvcYes, summary.dvcNo + ' pending / no'],
    ['FW Total TC Released', summary.tcYes, summary.tcNo + ' pending / no']
  ];

  grid.innerHTML = metrics.map(metric => `
    <article class="summary-metric-card">
      <div>${escapeHtml(metric[0])}</div>
      <strong>${metric[1]}</strong>
      <span>${escapeHtml(metric[2])}</span>
    </article>
  `).join('');
}

function renderProjects(summary) {
  const list = document.getElementById('summaryProjectList');
  if (!summary.perProject.length) {
    list.innerHTML = '<div class="summary-empty-state">No saved projects yet. Open the Tracker, add a project, and click Save Records.</div>';
    return;
  }

  list.innerHTML = summary.perProject.map(project => `
    <article class="summary-project-card">
      <div class="summary-project-top">
        <div>
          <h3>${escapeHtml(project.projectName)}</h3>
        </div>
        <strong>${project.completion}%</strong>
      </div>
      <div class="summary-progress"><span style="width:${project.completion}%"></span></div>
      <div class="summary-project-stats">
        <span><strong>${project.modules}</strong> Modules</span>
        <span><strong>${project.dvcYes}</strong> DVC Yes</span>
        <span><strong>${project.dvcNo}</strong> DVC No</span>
        <span><strong>${project.tcYes}</strong> TC Yes</span>
        <span><strong>${project.tcNo}</strong> TC No</span>
      </div>
    </article>
  `).join('');
}

function renderTable(entries) {
  const body = document.getElementById('summaryTableBody');
  if (!entries.length) {
    const colspan = 11;
    const msg = moduleSearchText
      ? 'No module rows match your search.'
      : 'No module details available. Add entries in the Tracker.';
    body.innerHTML = `<tr><td colspan="${colspan}">${escapeHtml(msg)}</td></tr>`;
    return;
  }

  body.innerHTML = entries.map(({ row, idx }) => `
    <tr class="${selectedModuleRows.has(idx) ? 'row-selected' : ''}">
      <td class="summary-select-col">
        <input type="checkbox" data-idx="${idx}" ${selectedModuleRows.has(idx) ? 'checked' : ''} onchange="toggleRowSelection(${idx}, this.checked)"/>
      </td>
      <td>${escapeHtml(row.projectName)}</td>
      <td>${escapeHtml(row.moduleName)}</td>
      <td>${escapeHtml(row.fwDocs)}</td>
      <td>${escapeHtml(row.moduleNumber)}</td>
      <td>${escapeHtml(row.authoNum)}</td>
      <td>${statusPill(row.dvcReview)}</td>
      <td>${escapeHtml(row.version)}</td>
      <td>${escapeHtml(row.review)}</td>
      <td>${escapeHtml(row.dateOfTesting)}</td>
      <td>${statusPill(row.tcRelease)}</td>
    </tr>
  `).join('');
}

// ── Manual row selection (checkbox per row) ──
function toggleRowSelection(idx, checked) {
  if (checked) selectedModuleRows.add(idx);
  else selectedModuleRows.delete(idx);
  updateSelectedCount();
  syncSelectAllCheckbox();
  const cb = document.querySelector('#summaryTableBody input[data-idx="' + idx + '"]');
  const row = cb ? cb.closest('tr') : null;
  if (row) row.classList.toggle('row-selected', checked);
}

function toggleSelectAllRows(checkbox) {
  const visible = getFilteredModuleRows();
  if (checkbox.checked) visible.forEach(({ idx }) => selectedModuleRows.add(idx));
  else visible.forEach(({ idx }) => selectedModuleRows.delete(idx));
  renderFilteredTable();
}

function syncSelectAllCheckbox() {
  const selectAll = document.getElementById('selectAllRowsCheckbox');
  if (!selectAll) return;
  const visible = getFilteredModuleRows();
  const allSelected = visible.length > 0 && visible.every(({ idx }) => selectedModuleRows.has(idx));
  selectAll.checked = allSelected;
  selectAll.indeterminate = !allSelected && visible.some(({ idx }) => selectedModuleRows.has(idx));
}

function updateSelectedCount() {
  const el = document.getElementById('selectedRowCount');
  if (el) el.textContent = selectedModuleRows.size;
}

// ── Export only the manually selected module rows to Excel ──
function exportSelectedModuleRows() {
  if (!selectedModuleRows.size) {
    showSummaryToast('Select at least one row (checkbox) to export.');
    return;
  }
  const rows = [...selectedModuleRows]
    .sort((a, b) => a - b)
    .map(idx => currentPermRows[idx])
    .filter(Boolean);

  if (!rows.length) {
    showSummaryToast('Selected rows could not be found. Try reselecting.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const sheetData = [
    ['Project Name', 'Module Name', 'FW Docs', 'Module Number', 'I-AUTHO-NUM', 'DVC Review', 'Version', 'Date of Review', 'Date of Testing', 'TC Release'],
    ...rows.map(row => [
      row.projectName, row.moduleName, row.fwDocs, row.moduleNumber, row.authoNum, row.dvcReview,
      row.version, row.review, row.dateOfTesting, row.tcRelease
    ])
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = [24, 28, 12, 14, 18, 12, 12, 16, 16, 12].map(wch => ({ wch }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: sheetData.length - 1, c: 9 } }) };
  XLSX.utils.book_append_sheet(wb, ws, 'Selected Module Rows');
  XLSX.writeFile(wb, 'TW_Status_Tracker_Selected_Modules.xlsx');
  showSummaryToast('Downloaded ' + rows.length + ' selected row(s).');
}

function statusPill(value) {
  const text = value || '-';
  const tone = value === 'Yes' ? 'yes' : value === 'No' ? 'no' : 'blank';
  return `<span class="summary-pill ${tone}">${escapeHtml(text)}</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Toast ──
function showSummaryToast(msg) {
  const t = document.getElementById('summaryToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3400);
}

// ── Import on Summary page ──
function handleSummaryImport(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const wb = XLSX.read(event.target.result, { type: 'array', cellDates: true });
      const entries = importWorkbookToEntries(wb);
      if (!entries.length) {
        showSummaryToast('No project rows found. Check the Excel column headers.');
        return;
      }

      // Save to main store
      localStorage.setItem('tw_tracker_v9', JSON.stringify(entries));
      // Sync to permanent store
      mergeToPermanent(entries);
      // Re-render
      renderSummary();
      showSummaryToast('Imported ' + entries.length + ' project(s) from Excel.');
    } catch (err) {
      console.error(err);
      showSummaryToast('Could not import this file. Please check the format.');
    } finally {
      input.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Import helpers (shared logic, same as script.js) ──
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

  rows.slice(headerRowIndex + 1).forEach((row) => {
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
    .sort((a, b) => a.entryNum - b.entryNum)
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
      entryNum: findHeaderIndex(normalized, ['entryno', 'entrynum', 'entry', 'index']),
      moduleNum: findHeaderIndex(normalized, ['rowno', 'rownum', 'moduleno', 'srno']),
      projectName: findHeaderIndex(normalized, ['projectname', 'project', 'projectid']),
      moduleName: findHeaderIndex(normalized, ['modulename', 'module', 'modules']),
      fwDocs: findHeaderIndex(normalized, ['fwdocs', 'fwdoc', 'fwdocument']),
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
  return headers.findIndex(h => names.includes(h));
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

function pad2(v) { return String(v).padStart(2, '0'); }

function normalizeChoice(value) {
  const text = String(value || '').trim().toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(text)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(text)) return 'No';
  return value || '';
}

renderSummary();

function doLogout() {
  sessionStorage.removeItem('tw_auth_session');
  window.location.href = 'login.html';
}
