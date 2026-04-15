// ===== Supabase =====
const SB_URL = 'https://ftzkkdfvwwonciiavzxw.supabase.co';
const SB_KEY = 'sb_publishable_xIaWPCzl6AK_Q1PqD_AaQg_9fmFgsML';
const headers = { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

const sb = {
    async get(table, opts = '') {
        const r = await fetch(`${SB_URL}/rest/v1/${table}?${opts}`, { headers });
        return r.json();
    },
    async post(table, data) {
        const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
            method: 'POST', headers: { ...headers, 'Prefer': 'return=representation' }, body: JSON.stringify(data)
        });
        return r.json();
    },
    async patch(table, id, data) {
        const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH', headers: { ...headers, 'Prefer': 'return=representation' }, body: JSON.stringify(data)
        });
        return r.json();
    },
    async del(table, id) {
        await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: 'DELETE', headers });
    }
};

// ===== Helpers =====
const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '—';
const fmtDateShort = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '—';
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6', '#6366F1', '#F97316'];
const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6', '#6366F1'];
const budgetColors = ['orange', 'teal', 'red', 'blue', 'green', 'purple'];
const initials = (f, l) => ((f || '')[0] + (l || '')[0]).toUpperCase();

let chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

// ===== Date =====
const now = new Date();
const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
document.getElementById('currentDate').textContent =
    now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase());

// ===== Navigation =====
const pageTitles = {
    dashboard: 'Vue d\'ensemble',
    tresorerie: 'Trésorerie',
    banque: 'Banque',
    budgets: 'Budgets',
    rh: 'Équipe RH',
    conges: 'Congés',
    fichiers: 'Importer un fichier'
};

function navigate(page) {
    Object.keys(pageTitles).forEach(p => document.getElementById(`page-${p}`).classList.toggle('hidden', p !== page));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    document.getElementById('pageTitle').textContent = pageTitles[page];
    document.getElementById('sidebar').classList.remove('open');
    const loaders = { dashboard: loadDashboard, tresorerie: loadTresorerie, fichiers: loadFichiers, banque: loadBank, budgets: loadBudgets, rh: loadRH, conges: loadLeaves };
    if (loaders[page]) loaders[page]();
}

window.addEventListener('hashchange', () => navigate(location.hash.replace('#', '') || 'dashboard'));
document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

// ===== MODAL =====
function openModal(title, html) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('active');
}
function closeModal() { document.getElementById('modal').classList.remove('active'); }
window.closeModal = closeModal;
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

// ===========================================
//  DASHBOARD
// ===========================================
async function loadDashboard() {
    const [tx, budgets, emps] = await Promise.all([
        sb.get('transactions', 'order=date.desc&limit=50'),
        sb.get('budgets'),
        sb.get('employees')
    ]);

    // KPI: Trésorerie
    const credits = tx.filter(t => t.type === 'credit').reduce((s, t) => s + +t.amount, 0);
    const debits = tx.filter(t => t.type === 'debit').reduce((s, t) => s + +t.amount, 0);
    const treasury = credits - debits;
    document.getElementById('kpi-treasury').textContent = fmt(treasury);
    document.getElementById('kpi-treasury-sub').textContent = '+12%';

    // KPI: Budget restant
    const totBudget = budgets.reduce((s, b) => s + +b.total_amount, 0);
    const totSpent = budgets.reduce((s, b) => s + +b.spent_amount, 0);
    const remaining = totBudget - totSpent;
    document.getElementById('kpi-budget').textContent = fmt(remaining);
    const pct = totBudget ? Math.round((remaining / totBudget) * 100) : 0;
    document.getElementById('kpi-budget-sub').textContent = pct + '%';
    document.getElementById('kpi-budget-sub').className = 'kpi-sub ' + (pct > 50 ? 'positive' : pct > 20 ? 'warning' : 'neutral');

    // KPI: Collaborateurs
    document.getElementById('kpi-employees').textContent = emps.length;

    // Transactions list
    document.getElementById('dash-transactions').innerHTML = tx.slice(0, 5).map(t => `
        <div class="tx-row">
            <div class="tx-dot ${t.type}"></div>
            <span class="tx-label">${t.label}</span>
            <span class="tx-amount ${t.type}">${t.type === 'credit' ? '+' : '-'}${fmt(t.amount)}</span>
        </div>`).join('') || '<div class="empty-state">Aucune transaction</div>';

    // Budgets list
    document.getElementById('dash-budgets').innerHTML = budgets.map((b, i) => {
        const p = Math.round(b.spent_amount / b.total_amount * 100);
        const c = p >= 90 ? 'red' : budgetColors[i % budgetColors.length];
        return `<div class="budget-row"><div class="budget-top"><span class="budget-name">${b.name}</span><span class="budget-numbers">${fmt(b.spent_amount)} / ${fmt(b.total_amount)}</span></div><div class="progress-bar"><div class="progress-fill progress-${c}" style="width:${p}%"></div></div><span class="budget-pct ${p >= 90 ? 'danger' : p >= 70 ? 'warn' : 'ok'}">${p}%</span></div>`;
    }).join('') || '<div class="empty-state">Aucun budget</div>';

    // Chart — Flux de trésorerie (soft purple bars)
    destroyChart('dashChart');
    const monthly = {};
    const txSorted = [...tx].sort((a, b) => a.date.localeCompare(b.date));
    txSorted.forEach(t => {
        const k = t.date.substring(0, 7);
        if (!monthly[k]) monthly[k] = { in: 0, out: 0 };
        if (t.type === 'credit') monthly[k].in += +t.amount; else monthly[k].out += +t.amount;
    });
    const months = Object.keys(monthly).sort();
    if (months.length) {
        const flux = months.map(m => monthly[m].in - monthly[m].out);
        const currentMonth = now.toISOString().substring(0, 7);
        chartInstances['dashChart'] = new Chart(document.getElementById('dashChart'), {
            type: 'bar',
            data: {
                labels: months.map(m => new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short' })),
                datasets: [{
                    data: flux,
                    backgroundColor: months.map(m => m === currentMonth ? '#4F46E5' : '#C7D2FE'),
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 48
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { display: false },
                    x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 12 } } }
                }
            }
        });
    }
}

// ===========================================
//  TRÉSORERIE
// ===========================================
async function loadTresorerie() {
    const tx = await sb.get('transactions', 'order=date.asc');

    const credits = tx.filter(t => t.type === 'credit').reduce((s, t) => s + +t.amount, 0);
    const debits = tx.filter(t => t.type === 'debit').reduce((s, t) => s + +t.amount, 0);
    const solde = credits - debits;

    document.getElementById('treso-solde').textContent = fmt(solde);
    // Simple forecast: current trend projected +30 days
    const forecast = Math.round(solde * 1.12);
    document.getElementById('treso-forecast').textContent = fmt(forecast);

    // Monthly cumulative balance for chart
    const monthly = {};
    tx.forEach(t => {
        const k = t.date.substring(0, 7);
        if (!monthly[k]) monthly[k] = 0;
        monthly[k] += t.type === 'credit' ? +t.amount : -t.amount;
    });
    const months = Object.keys(monthly).sort();
    let cumulative = 0;
    const balances = months.map(m => { cumulative += monthly[m]; return cumulative; });

    // Add forecast point
    const lastMonth = months[months.length - 1];
    const [y, mo] = lastMonth.split('-').map(Number);
    const nextMonth = `${y}-${String(mo + 1).padStart(2, '0')}`;
    months.push(nextMonth);
    balances.push(forecast);

    // Line chart with gradient fill
    destroyChart('tresoChart');
    const canvas = document.getElementById('tresoChart');
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.15)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.01)');

    chartInstances['tresoChart'] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: months.map(m => new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short' })),
            datasets: [{
                data: balances,
                borderColor: '#4F46E5',
                backgroundColor: gradient,
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 5,
                borderWidth: 2.5,
                segment: {
                    borderDash: (ctx2) => ctx2.p0DataIndex >= months.length - 2 ? [6, 4] : undefined
                }
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false },
                x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 12 } } }
            }
        }
    });

    // Entrées / Sorties du mois
    const currentMonth = now.toISOString().substring(0, 7);
    const monthTx = tx.filter(t => t.date.startsWith(currentMonth));
    const monthCredits = monthTx.filter(t => t.type === 'credit');
    const monthDebits = monthTx.filter(t => t.type === 'debit');

    document.getElementById('treso-credits').innerHTML = monthCredits.map(t => `
        <div class="tx-row">
            <div class="tx-dot credit"></div>
            <span class="tx-label">${t.label}</span>
            <span class="tx-amount credit">+${fmt(t.amount)}</span>
        </div>`).join('') || '<div class="empty-state">Aucune entrée ce mois</div>';

    document.getElementById('treso-debits').innerHTML = monthDebits.map(t => `
        <div class="tx-row">
            <div class="tx-dot debit"></div>
            <span class="tx-label">${t.label}</span>
            <span class="tx-amount debit">-${fmt(t.amount)}</span>
        </div>`).join('') || '<div class="empty-state">Aucune sortie ce mois</div>';
}

// ===========================================
//  FICHIERS / IMPORT EXCEL
// ===========================================
let parsedData = null;
let parsedColumns = null;
let parsedFileName = '';

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => { e.preventDefault(); uploadZone.classList.remove('dragover'); handleFile(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });

function handleFile(file) {
    if (!file) return;
    parsedFileName = file.name;
    const reader = new FileReader();
    reader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) return alert('Le fichier est vide.');
        parsedColumns = Object.keys(json[0]);
        parsedData = json;
        showPreview();
    };
    reader.readAsArrayBuffer(file);
}

function formatCell(v) {
    if (v instanceof Date) return v.toLocaleDateString('fr-FR');
    if (v === null || v === undefined) return '';
    return String(v);
}

function showPreview() {
    document.getElementById('filePreview').classList.remove('hidden');
    document.getElementById('previewTitle').textContent = `${parsedFileName} — ${parsedData.length} lignes, ${parsedColumns.length} colonnes`;

    // Table preview
    const maxRows = Math.min(parsedData.length, 20);
    let html = '<table class="data-table"><thead><tr>' + parsedColumns.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    for (let i = 0; i < maxRows; i++) {
        html += '<tr>' + parsedColumns.map(c => `<td>${formatCell(parsedData[i][c])}</td>`).join('') + '</tr>';
    }
    html += '</tbody></table>';
    if (parsedData.length > 20) html += `<p style="padding:12px;color:var(--text-lighter);font-size:0.8rem">Aperçu des 20 premières lignes sur ${parsedData.length}</p>`;
    document.getElementById('previewTable').innerHTML = html;

    // Reset mapping
    document.getElementById('importType').value = '';
    document.getElementById('mappingFields').classList.add('hidden');
    document.getElementById('importActions').classList.add('hidden');
    document.getElementById('importStatus').innerHTML = '';

    // Auto-detect type
    autoDetectType();
}

// ===== Auto-detect import type from column names =====
function autoDetectType() {
    const colsLower = parsedColumns.map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));

    // Check for transaction-like columns
    const hasMontant = colsLower.some(c => c.includes('montant') || c.includes('amount') || c.includes('total') || c.includes('prix') || c.includes('ca'));
    const hasDate = colsLower.some(c => c.includes('date') || c.includes('mois') || c.includes('jour'));
    const hasLabel = colsLower.some(c => c.includes('libelle') || c.includes('label') || c.includes('description') || c.includes('client') || c.includes('produit'));

    // Check for employee-like columns
    const hasPrenom = colsLower.some(c => c.includes('prenom') || c.includes('first'));
    const hasNom = colsLower.some(c => c.includes('nom') || c.includes('last') || c.includes('name'));
    const hasEmail = colsLower.some(c => c.includes('email') || c.includes('mail'));

    // Check for budget-like columns
    const hasBudget = colsLower.some(c => c.includes('budget') || c.includes('enveloppe'));
    const hasDepense = colsLower.some(c => c.includes('depense') || c.includes('spent') || c.includes('consomme'));

    const sel = document.getElementById('importType');
    if (hasPrenom || (hasNom && hasEmail)) {
        sel.value = 'employees';
    } else if (hasBudget || hasDepense) {
        sel.value = 'budgets';
    } else if (hasMontant || hasDate || hasLabel) {
        sel.value = 'transactions';
    }

    if (sel.value) showMappingFields(sel.value);
}

// ===== Mapping field definitions =====
const MAPPINGS = {
    transactions: [
        { key: 'label', label: 'Libellé', required: true, hints: ['libelle', 'label', 'description', 'client', 'intitule', 'objet', 'produit'] },
        { key: 'amount', label: 'Montant', required: true, hints: ['montant', 'amount', 'total', 'prix unitaire', 'somme', 'valeur', 'ca total', 'ca'] },
        { key: 'type', label: 'Type (entrée/sortie)', required: false, hints: ['type', 'sens', 'direction', 'credit', 'debit'] },
        { key: 'category', label: 'Catégorie', required: false, hints: ['categorie', 'category', 'rubrique', 'produit', 'commercial'] },
        { key: 'date', label: 'Date', required: false, hints: ['date', 'jour', 'mois', 'period'] }
    ],
    employees: [
        { key: 'first_name', label: 'Prénom', required: true, hints: ['prenom', 'first', 'prénom'] },
        { key: 'last_name', label: 'Nom', required: true, hints: ['nom', 'last', 'name', 'famille'] },
        { key: 'email', label: 'Email', required: false, hints: ['email', 'mail', 'courriel'] },
        { key: 'role', label: 'Poste', required: false, hints: ['poste', 'role', 'fonction', 'titre', 'job'] },
        { key: 'department', label: 'Département', required: false, hints: ['departement', 'department', 'service', 'equipe', 'dept'] },
        { key: 'phone', label: 'Téléphone', required: false, hints: ['telephone', 'phone', 'tel', 'mobile', 'portable'] },
        { key: 'start_date', label: 'Date d\'entrée', required: false, hints: ['date', 'entree', 'start', 'debut', 'embauche'] }
    ],
    budgets: [
        { key: 'name', label: 'Nom du budget', required: true, hints: ['nom', 'name', 'budget', 'intitule', 'libelle', 'poste'] },
        { key: 'department', label: 'Département', required: false, hints: ['departement', 'department', 'service'] },
        { key: 'total_amount', label: 'Montant total', required: true, hints: ['total', 'montant', 'budget', 'enveloppe', 'prevu', 'alloue'] },
        { key: 'spent_amount', label: 'Montant dépensé', required: false, hints: ['depense', 'spent', 'consomme', 'utilise', 'reel'] },
        { key: 'period', label: 'Période', required: false, hints: ['periode', 'period', 'annee', 'year', 'mois'] }
    ]
};

function bestMatch(hints, usedCols = []) {
    const colsNorm = parsedColumns.map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim());
    for (const hint of hints) {
        const hintNorm = hint.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const idx = colsNorm.findIndex((c, i) => c.includes(hintNorm) && !usedCols.includes(parsedColumns[i]));
        if (idx !== -1) return parsedColumns[idx];
    }
    return '';
}

function showMappingFields(type) {
    const fields = MAPPINGS[type];
    if (!fields) return;

    const container = document.getElementById('mappingFields');
    const options = parsedColumns.map(c => `<option value="${c}">${c}</option>`).join('');

    // Match columns avoiding duplicates
    const usedCols = [];
    const matches = {};
    fields.forEach(f => {
        const matched = bestMatch(f.hints, usedCols);
        matches[f.key] = matched;
        if (matched) usedCols.push(matched);
    });

    container.innerHTML = `
        <p style="font-size:0.82rem;color:var(--text-light);margin-bottom:14px">Faites correspondre les colonnes de votre fichier aux champs Clareo :</p>
        <div class="mapping-grid">
            ${fields.map(f => {
                return `<div class="mapping-group">
                    <label class="${f.required ? 'mapping-required' : ''}">${f.label}</label>
                    <select id="map-${f.key}" data-key="${f.key}">
                        <option value="">— Ignorer —</option>
                        ${parsedColumns.map(c => `<option value="${c}" ${c === matches[f.key] ? 'selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>`;
            }).join('')}
        </div>`;

    container.classList.remove('hidden');
    document.getElementById('importActions').classList.remove('hidden');
}

document.getElementById('importType').addEventListener('change', e => {
    if (e.target.value) {
        showMappingFields(e.target.value);
    } else {
        document.getElementById('mappingFields').classList.add('hidden');
        document.getElementById('importActions').classList.add('hidden');
    }
});

// ===== Do the actual import =====
document.getElementById('doImportBtn').addEventListener('click', async () => {
    const type = document.getElementById('importType').value;
    if (!type || !parsedData) return;

    const fields = MAPPINGS[type];
    const mapping = {};
    let missingRequired = false;

    fields.forEach(f => {
        const val = document.getElementById(`map-${f.key}`)?.value || '';
        mapping[f.key] = val;
        if (f.required && !val) missingRequired = true;
    });

    if (missingRequired) {
        document.getElementById('importStatus').innerHTML = '<div class="import-error">Veuillez remplir tous les champs obligatoires (*)</div>';
        return;
    }

    const btn = document.getElementById('doImportBtn');
    btn.textContent = 'Import en cours...';
    btn.disabled = true;

    try {
        let count = 0;
        const batchSize = 50;

        if (type === 'transactions') {
            const rows = parsedData.map(r => {
                const amount = Math.abs(Number(String(r[mapping.amount] || 0).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0);
                if (amount === 0) return null;

                // Detect type: check mapped type column, or check sign of amount
                let txType = 'credit';
                if (mapping.type && r[mapping.type]) {
                    const typeVal = String(r[mapping.type]).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    if (typeVal.includes('debit') || typeVal.includes('sortie') || typeVal.includes('depense') || typeVal.includes('charge')) {
                        txType = 'debit';
                    }
                } else {
                    const rawAmount = Number(String(r[mapping.amount] || 0).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0;
                    if (rawAmount < 0) txType = 'debit';
                }

                // Date: try to parse from column or use today
                let txDate = new Date().toISOString().split('T')[0];
                if (mapping.date && r[mapping.date]) {
                    const dVal = r[mapping.date];
                    if (dVal instanceof Date) {
                        txDate = dVal.toISOString().split('T')[0];
                    } else {
                        // Try common date month name → approximate date
                        const monthMap = { 'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04', 'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'jan': '01', 'fev': '02', 'mar': '03', 'avr': '04', 'jui': '06', 'jul': '07', 'aou': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12' };
                        const dStr = String(dVal).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        const foundMonth = Object.keys(monthMap).find(m => dStr.includes(m));
                        if (foundMonth) {
                            txDate = `2026-${monthMap[foundMonth]}-15`;
                        } else {
                            const parsed = new Date(dVal);
                            if (!isNaN(parsed)) txDate = parsed.toISOString().split('T')[0];
                        }
                    }
                }

                return {
                    label: String(r[mapping.label] || 'Sans libellé'),
                    amount,
                    type: txType,
                    category: mapping.category ? String(r[mapping.category] || '') : '',
                    date: txDate,
                    account: 'Compte courant'
                };
            }).filter(Boolean);

            // Insert in batches
            for (let i = 0; i < rows.length; i += batchSize) {
                await sb.post('transactions', rows.slice(i, i + batchSize));
                count += Math.min(batchSize, rows.length - i);
            }

            document.getElementById('importStatus').innerHTML = `<div class="import-success">${count} transactions importées avec succès</div>`;
            setTimeout(() => { window.location.hash = '#banque'; }, 1500);

        } else if (type === 'employees') {
            const rows = parsedData.map(r => {
                const firstName = String(r[mapping.first_name] || '').trim();
                const lastName = String(r[mapping.last_name] || '').trim();
                if (!firstName && !lastName) return null;

                const emp = {
                    first_name: firstName,
                    last_name: lastName,
                    status: 'En poste'
                };
                if (mapping.email && r[mapping.email]) emp.email = String(r[mapping.email]);
                if (mapping.role && r[mapping.role]) emp.role = String(r[mapping.role]);
                if (mapping.department && r[mapping.department]) emp.department = String(r[mapping.department]);
                if (mapping.phone && r[mapping.phone]) emp.phone = String(r[mapping.phone]);
                if (mapping.start_date && r[mapping.start_date]) {
                    const d = r[mapping.start_date];
                    if (d instanceof Date) emp.start_date = d.toISOString().split('T')[0];
                    else { const p = new Date(d); if (!isNaN(p)) emp.start_date = p.toISOString().split('T')[0]; }
                }
                return emp;
            }).filter(Boolean);

            for (let i = 0; i < rows.length; i += batchSize) {
                await sb.post('employees', rows.slice(i, i + batchSize));
                count += Math.min(batchSize, rows.length - i);
            }

            document.getElementById('importStatus').innerHTML = `<div class="import-success">${count} collaborateurs importés avec succès</div>`;
            setTimeout(() => { window.location.hash = '#rh'; }, 1500);

        } else if (type === 'budgets') {
            const rows = parsedData.map(r => {
                const totalAmount = Math.abs(Number(String(r[mapping.total_amount] || 0).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0);
                if (totalAmount === 0) return null;

                const budget = {
                    name: String(r[mapping.name] || 'Sans nom'),
                    total_amount: totalAmount,
                    spent_amount: 0
                };
                if (mapping.department && r[mapping.department]) budget.department = String(r[mapping.department]);
                if (mapping.spent_amount && r[mapping.spent_amount]) {
                    budget.spent_amount = Math.abs(Number(String(r[mapping.spent_amount]).replace(/[^\d.,-]/g, '').replace(',', '.')) || 0);
                }
                if (mapping.period && r[mapping.period]) budget.period = String(r[mapping.period]);
                return budget;
            }).filter(Boolean);

            for (let i = 0; i < rows.length; i += batchSize) {
                await sb.post('budgets', rows.slice(i, i + batchSize));
                count += Math.min(batchSize, rows.length - i);
            }

            document.getElementById('importStatus').innerHTML = `<div class="import-success">${count} budgets importés avec succès</div>`;
            setTimeout(() => { window.location.hash = '#budgets'; }, 1500);
        }

        // Also save as dataset for history
        await sb.post('datasets', {
            name: parsedFileName.replace(/\.(xlsx|xls|csv)$/i, ''),
            file_name: parsedFileName,
            columns: parsedColumns,
            data: parsedData.slice(0, 100),
            row_count: parsedData.length
        });
        loadDatasets();

    } catch (err) {
        document.getElementById('importStatus').innerHTML = `<div class="import-error">Erreur lors de l'import : ${err.message}</div>`;
    }

    btn.textContent = 'Importer les données';
    btn.disabled = false;
});

async function loadFichiers() { loadDatasets(); }

async function loadDatasets() {
    const datasets = await sb.get('datasets', 'order=created_at.desc');
    const el = document.getElementById('datasetsList');
    if (!datasets.length) { el.innerHTML = '<div class="empty-state">Aucun fichier importé pour le moment.</div>'; return; }
    el.innerHTML = datasets.map(d => `
        <div class="dataset-row">
            <div class="dataset-info">
                <h4>${d.name}</h4>
                <p>${d.row_count} lignes &middot; ${d.columns?.length || 0} colonnes &middot; ${fmtDate(d.created_at)}</p>
            </div>
            <div class="dataset-actions">
                <button class="action-btn reject" onclick="deleteDataset(${d.id})">Supprimer</button>
            </div>
        </div>`).join('');
}

window.deleteDataset = async function(id) {
    if (!confirm('Supprimer ce fichier ?')) return;
    await sb.del('datasets', id);
    loadDatasets();
};

// ===========================================
//  BANQUE
// ===========================================
async function loadBank() {
    const tx = await sb.get('transactions', 'order=date.desc');

    // Compute balances
    const credits = tx.filter(t => t.type === 'credit').reduce((s, t) => s + +t.amount, 0);
    const debits = tx.filter(t => t.type === 'debit').reduce((s, t) => s + +t.amount, 0);
    const balance = credits - debits;
    document.getElementById('bank-balance-courant').textContent = fmt(balance);
    document.getElementById('bank-balance-epargne').textContent = fmt(12800);

    const cats = [...new Set(tx.map(t => t.category))].sort();
    const f = document.getElementById('bankFilter');
    const cur = f.value;
    f.innerHTML = '<option value="all">Toutes catégories</option>' + cats.map(c => `<option ${c === cur ? 'selected' : ''}>${c}</option>`).join('');
    f.onchange = () => renderBankTable(tx, f.value);
    renderBankTable(tx, cur);
}

function renderBankTable(tx, filter) {
    const data = filter === 'all' ? tx : tx.filter(t => t.category === filter);
    document.getElementById('bank-table-body').innerHTML = data.map(t => `
        <tr>
            <td>${fmtDateShort(t.date)}</td>
            <td><strong>${t.label}</strong></td>
            <td><span class="status status-${slug(t.category)}">${t.category}</span></td>
            <td class="text-right"><span class="tx-amount ${t.type}">${t.type === 'credit' ? '+' : '-'}${fmt(t.amount)}</span></td>
            <td><button class="action-btn reject" onclick="deleteTx(${t.id})">&#10005;</button></td>
        </tr>`).join('') || '<tr><td colspan="5" class="empty-state">Aucune transaction</td></tr>';
}

document.getElementById('addTransactionBtn').addEventListener('click', () => {
    openModal('Nouvelle transaction', `
        <form id="txForm">
            <div class="form-group"><label>Libellé</label><input type="text" name="label" required placeholder="Ex : Virement client Dupont"></div>
            <div class="form-row">
                <div class="form-group"><label>Montant (€)</label><input type="number" name="amount" step="0.01" required></div>
                <div class="form-group"><label>Type</label><select name="type"><option value="credit">Entrée (+)</option><option value="debit">Sortie (-)</option></select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Catégorie</label><input type="text" name="category" placeholder="Ex : Clients, Loyer, Salaires"></div>
                <div class="form-group"><label>Date</label><input type="date" name="date" value="${new Date().toISOString().split('T')[0]}"></div>
            </div>
            <div class="form-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Ajouter</button></div>
        </form>`);
    document.getElementById('txForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await sb.post('transactions', { label: fd.get('label'), amount: +fd.get('amount'), type: fd.get('type'), category: fd.get('category'), date: fd.get('date') });
        closeModal(); loadBank();
    };
});

window.deleteTx = async function(id) { if (confirm('Supprimer cette transaction ?')) { await sb.del('transactions', id); loadBank(); } };

// ===========================================
//  BUDGETS
// ===========================================
async function loadBudgets() {
    const budgets = await sb.get('budgets', 'order=name.asc');
    document.getElementById('budgets-list').innerHTML = budgets.map((b, i) => {
        const p = Math.round(b.spent_amount / b.total_amount * 100);
        const c = p >= 90 ? 'red' : budgetColors[i % budgetColors.length];
        return `
        <div class="budget-row">
            <div class="budget-top">
                <div><span class="budget-name">${b.name}</span><span class="budget-dept">${b.department || ''}</span></div>
                <div class="card-actions">
                    <span class="budget-numbers">${fmt(b.spent_amount)} / ${fmt(b.total_amount)}</span>
                    <button class="action-btn approve" onclick="editBudget(${b.id}, '${b.name}', ${b.spent_amount})">Modifier</button>
                    <button class="action-btn reject" onclick="delBudget(${b.id})">&#10005;</button>
                </div>
            </div>
            <div class="progress-bar"><div class="progress-fill progress-${c}" style="width:${p}%"></div></div>
            <span class="budget-pct ${p >= 90 ? 'danger' : p >= 70 ? 'warn' : 'ok'}">${p}%</span>
        </div>`;
    }).join('') || '<div class="empty-state">Aucun budget</div>';
}

document.getElementById('addBudgetBtn').addEventListener('click', () => {
    openModal('Nouveau budget', `
        <form id="budgetForm">
            <div class="form-group"><label>Nom du budget</label><input type="text" name="name" required placeholder="Ex : Marketing Q2"></div>
            <div class="form-row"><div class="form-group"><label>Département</label><input type="text" name="department" placeholder="Ex : Marketing"></div><div class="form-group"><label>Période</label><input type="text" name="period" placeholder="2026"></div></div>
            <div class="form-row"><div class="form-group"><label>Montant total (€)</label><input type="number" name="total_amount" required></div><div class="form-group"><label>Déjà dépensé (€)</label><input type="number" name="spent_amount" value="0"></div></div>
            <div class="form-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Créer</button></div>
        </form>`);
    document.getElementById('budgetForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await sb.post('budgets', { name: fd.get('name'), department: fd.get('department'), period: fd.get('period'), total_amount: +fd.get('total_amount'), spent_amount: +fd.get('spent_amount') });
        closeModal(); loadBudgets();
    };
});

window.editBudget = function(id, name, spent) {
    openModal('Modifier les dépenses', `
        <form id="editBudgetForm">
            <p style="margin-bottom:16px">Budget : <strong>${name}</strong></p>
            <div class="form-group"><label>Montant dépensé (€)</label><input type="number" name="spent" value="${spent}" required></div>
            <div class="form-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div>
        </form>`);
    document.getElementById('editBudgetForm').onsubmit = async e => {
        e.preventDefault();
        await sb.patch('budgets', id, { spent_amount: +new FormData(e.target).get('spent') });
        closeModal(); loadBudgets();
    };
};

window.delBudget = async function(id) { if (confirm('Supprimer ce budget ?')) { await sb.del('budgets', id); loadBudgets(); } };

// ===========================================
//  RH
// ===========================================
async function loadRH() {
    const emps = await sb.get('employees', 'order=last_name.asc');
    document.getElementById('rh-table-body').innerHTML = emps.map((e, i) => `
        <tr>
            <td><div class="employee-cell"><div class="emp-avatar" style="background:${avatarColors[i % 8]}">${initials(e.first_name, e.last_name)}</div><div><strong>${e.first_name} ${e.last_name}</strong><br><span style="font-size:0.72rem;color:var(--text-lighter)">${e.email || ''}</span></div></div></td>
            <td>${e.role || '—'}</td>
            <td>${e.department || '—'}</td>
            <td><span class="status status-${slug(e.status)}">${e.status}</span></td>
            <td>${fmtDate(e.start_date)}</td>
            <td>
                <div class="action-btns">
                    <button class="action-btn approve" onclick='editEmp(${JSON.stringify(e).replace(/'/g, "&#39;")})'>Modifier</button>
                    <button class="action-btn reject" onclick="delEmp(${e.id})">&#10005;</button>
                </div>
            </td>
        </tr>`).join('') || '<tr><td colspan="6" class="empty-state">Aucun collaborateur</td></tr>';
}

function empForm(e = {}) {
    return `
        <div class="form-row"><div class="form-group"><label>Prénom</label><input type="text" name="first_name" value="${e.first_name || ''}" required></div><div class="form-group"><label>Nom</label><input type="text" name="last_name" value="${e.last_name || ''}" required></div></div>
        <div class="form-group"><label>Email</label><input type="email" name="email" value="${e.email || ''}"></div>
        <div class="form-row"><div class="form-group"><label>Poste</label><input type="text" name="role" value="${e.role || ''}"></div><div class="form-group"><label>Département</label><select name="department"><option ${e.department === 'Commercial' ? 'selected' : ''}>Commercial</option><option ${e.department === 'Technique' ? 'selected' : ''}>Technique</option><option ${e.department === 'Finance' ? 'selected' : ''}>Finance</option><option ${e.department === 'RH' ? 'selected' : ''}>RH</option><option ${e.department === 'Marketing' ? 'selected' : ''}>Marketing</option><option ${e.department === 'Direction' ? 'selected' : ''}>Direction</option></select></div></div>
        <div class="form-row"><div class="form-group"><label>Date d'entrée</label><input type="date" name="start_date" value="${e.start_date || ''}"></div><div class="form-group"><label>Téléphone</label><input type="tel" name="phone" value="${e.phone || ''}"></div></div>`;
}

document.getElementById('addEmployeeBtn').addEventListener('click', () => {
    openModal('Nouveau collaborateur', `<form id="empForm">${empForm()}<div class="form-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Ajouter</button></div></form>`);
    document.getElementById('empForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await sb.post('employees', { first_name: fd.get('first_name'), last_name: fd.get('last_name'), email: fd.get('email'), role: fd.get('role'), department: fd.get('department'), start_date: fd.get('start_date') || null, phone: fd.get('phone'), status: 'En poste' });
        closeModal(); loadRH();
    };
});

window.editEmp = function(emp) {
    openModal('Modifier le collaborateur', `<form id="empForm">${empForm(emp)}<div class="form-group"><label>Statut</label><select name="status"><option ${emp.status === 'En poste' ? 'selected' : ''}>En poste</option><option ${emp.status === 'En congé' ? 'selected' : ''}>En congé</option></select></div><div class="form-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div></form>`);
    document.getElementById('empForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await sb.patch('employees', emp.id, { first_name: fd.get('first_name'), last_name: fd.get('last_name'), email: fd.get('email'), role: fd.get('role'), department: fd.get('department'), start_date: fd.get('start_date') || null, phone: fd.get('phone'), status: fd.get('status') });
        closeModal(); loadRH();
    };
};

window.delEmp = async function(id) { if (confirm('Supprimer ce collaborateur ?')) { await sb.del('employees', id); loadRH(); } };

// ===========================================
//  CONGÉS
// ===========================================
async function loadLeaves() {
    const [leaves, emps] = await Promise.all([sb.get('leaves', 'order=start_date.desc'), sb.get('employees')]);
    const map = {};
    emps.forEach(e => map[e.id] = `${e.first_name} ${e.last_name}`);
    document.getElementById('conges-table-body').innerHTML = leaves.map(l => {
        const pending = l.status === 'En attente';
        return `<tr>
            <td><strong>${map[l.employee_id] || 'Inconnu'}</strong></td>
            <td>${l.type}</td><td>${fmtDate(l.start_date)}</td><td>${fmtDate(l.end_date)}</td>
            <td><span class="status status-${slug(l.status)}">${l.status}</span></td>
            <td>${pending ? `<div class="action-btns"><button class="action-btn approve" onclick="updLeave(${l.id},'Approuvé')">Approuver</button><button class="action-btn reject" onclick="updLeave(${l.id},'Refusé')">Refuser</button></div>` : `<button class="action-btn reject" onclick="delLeave(${l.id})">&#10005;</button>`}</td>
        </tr>`;
    }).join('') || '<tr><td colspan="6" class="empty-state">Aucune demande</td></tr>';
}

document.getElementById('addLeaveBtn').addEventListener('click', async () => {
    const emps = await sb.get('employees', 'order=last_name.asc');
    openModal('Nouvelle demande de congé', `
        <form id="leaveForm">
            <div class="form-group"><label>Collaborateur</label><select name="employee_id">${emps.map(e => `<option value="${e.id}">${e.first_name} ${e.last_name}</option>`).join('')}</select></div>
            <div class="form-group"><label>Type</label><select name="type"><option>Congé payé</option><option>RTT</option><option>Congé maladie</option><option>Télétravail</option><option>Congé sans solde</option></select></div>
            <div class="form-row"><div class="form-group"><label>Du</label><input type="date" name="start_date" required></div><div class="form-group"><label>Au</label><input type="date" name="end_date" required></div></div>
            <div class="form-actions"><button type="button" class="btn btn-ghost" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Envoyer</button></div>
        </form>`);
    document.getElementById('leaveForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await sb.post('leaves', { employee_id: +fd.get('employee_id'), type: fd.get('type'), start_date: fd.get('start_date'), end_date: fd.get('end_date'), status: 'En attente' });
        closeModal(); loadLeaves();
    };
});

window.updLeave = async function(id, status) { await sb.patch('leaves', id, { status }); loadLeaves(); };
window.delLeave = async function(id) { if (confirm('Supprimer ?')) { await sb.del('leaves', id); loadLeaves(); } };

// ===== INIT =====
navigate(location.hash.replace('#', '') || 'dashboard');
