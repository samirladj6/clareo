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
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6', '#6366F1', '#F97316'];
const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6', '#6366F1'];
const initials = (f, l) => ((f || '')[0] + (l || '')[0]).toUpperCase();

let chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

// ===== Date =====
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// ===== Navigation =====
const pageTitles = { dashboard: 'Tableau de bord', fichiers: 'Importer un fichier', banque: 'Banque', budgets: 'Budgets', rh: 'Équipe RH', conges: 'Congés' };

function navigate(page) {
    Object.keys(pageTitles).forEach(p => document.getElementById(`page-${p}`).classList.toggle('hidden', p !== page));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    document.getElementById('pageTitle').textContent = pageTitles[page];
    document.getElementById('sidebar').classList.remove('open');
    const loaders = { dashboard: loadDashboard, fichiers: loadFichiers, banque: loadBank, budgets: loadBudgets, rh: loadRH, conges: loadLeaves };
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
    const credits = tx.filter(t => t.type === 'credit').reduce((s, t) => s + +t.amount, 0);
    const debits = tx.filter(t => t.type === 'debit').reduce((s, t) => s + +t.amount, 0);
    document.getElementById('kpi-treasury').textContent = fmt(credits - debits);

    const now = new Date();
    const monthCredits = tx.filter(t => t.type === 'credit' && new Date(t.date).getMonth() === now.getMonth()).reduce((s, t) => s + +t.amount, 0);
    document.getElementById('kpi-income').textContent = fmt(monthCredits);

    const totBudget = budgets.reduce((s, b) => s + +b.total_amount, 0);
    const totSpent = budgets.reduce((s, b) => s + +b.spent_amount, 0);
    document.getElementById('kpi-budget').textContent = totBudget ? Math.round(totSpent / totBudget * 100) + '%' : '—';
    document.getElementById('kpi-employees').textContent = emps.length;

    // Transactions
    document.getElementById('dash-transactions').innerHTML = tx.slice(0, 6).map(t => `
        <div class="tx-row">
            <div class="tx-cat tx-cat-${t.category}"></div>
            <span class="tx-label">${t.label}</span>
            <span class="tx-date">${fmtDate(t.date)}</span>
            <span class="tx-amount ${t.type}">${t.type === 'credit' ? '+' : '-'}${fmt(t.amount)}</span>
        </div>`).join('') || '<div class="empty-state">Aucune transaction</div>';

    // Budgets
    document.getElementById('dash-budgets').innerHTML = budgets.map(b => {
        const p = Math.round(b.spent_amount / b.total_amount * 100);
        const c = p >= 90 ? 'red' : p >= 70 ? 'orange' : 'green';
        return `<div class="budget-row"><div class="budget-top"><span class="budget-name">${b.name}</span><span class="budget-numbers">${fmt(b.spent_amount)} / ${fmt(b.total_amount)}</span></div><div class="progress-bar"><div class="progress-fill progress-${c}" style="width:${p}%"></div></div><span class="budget-pct ${p >= 90 ? 'danger' : p >= 70 ? 'warn' : 'ok'}">${p}%</span></div>`;
    }).join('') || '<div class="empty-state">Aucun budget</div>';

    // Chart
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
        chartInstances['dashChart'] = new Chart(document.getElementById('dashChart'), {
            type: 'bar',
            data: {
                labels: months.map(m => new Date(m + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })),
                datasets: [
                    { label: 'Entrées', data: months.map(m => monthly[m].in), backgroundColor: '#10B981' },
                    { label: 'Sorties', data: months.map(m => monthly[m].out), backgroundColor: '#EF4444' }
                ]
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
        });
    }
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

function showPreview() {
    document.getElementById('filePreview').classList.remove('hidden');
    document.getElementById('previewTitle').textContent = `${parsedFileName} — ${parsedData.length} lignes, ${parsedColumns.length} colonnes`;

    // Table
    const maxRows = Math.min(parsedData.length, 50);
    let html = '<table class="data-table"><thead><tr>' + parsedColumns.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    for (let i = 0; i < maxRows; i++) {
        html += '<tr>' + parsedColumns.map(c => `<td>${formatCell(parsedData[i][c])}</td>`).join('') + '</tr>';
    }
    html += '</tbody></table>';
    if (parsedData.length > 50) html += `<p style="padding:12px;color:var(--text-lighter);font-size:0.8rem">Affichage limité aux 50 premières lignes sur ${parsedData.length}</p>`;
    document.getElementById('previewTable').innerHTML = html;

    // Auto charts
    generateAutoCharts();
}

function formatCell(v) {
    if (v instanceof Date) return v.toLocaleDateString('fr-FR');
    if (v === null || v === undefined) return '';
    return String(v);
}

function generateAutoCharts() {
    const container = document.getElementById('autoCharts');
    container.innerHTML = '';
    // Destroy old charts
    Object.keys(chartInstances).filter(k => k.startsWith('auto-')).forEach(k => destroyChart(k));

    // Detect column types
    const numCols = [];
    const textCols = [];
    const dateCols = [];

    parsedColumns.forEach(col => {
        const sample = parsedData.slice(0, 20).map(r => r[col]).filter(v => v !== '' && v !== null);
        if (sample.every(v => v instanceof Date)) dateCols.push(col);
        else if (sample.every(v => !isNaN(Number(v)) && v !== '')) numCols.push(col);
        else textCols.push(col);
    });

    let chartCount = 0;

    // Chart 1: If text + numeric cols → bar chart (top categories)
    if (textCols.length && numCols.length) {
        const labelCol = textCols[0];
        const valueCol = numCols[0];
        const aggregated = {};
        parsedData.forEach(r => {
            const k = String(r[labelCol]);
            aggregated[k] = (aggregated[k] || 0) + Number(r[valueCol] || 0);
        });
        const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1]).slice(0, 10);

        const id = `auto-${chartCount++}`;
        const box = document.createElement('div');
        box.className = 'auto-chart-box';
        box.innerHTML = `<h4>${valueCol} par ${labelCol}</h4><canvas id="${id}"></canvas>`;
        container.appendChild(box);

        chartInstances[id] = new Chart(document.getElementById(id), {
            type: 'bar',
            data: { labels: sorted.map(s => s[0]), datasets: [{ label: valueCol, data: sorted.map(s => s[1]), backgroundColor: colors.slice(0, sorted.length) }] },
            options: { responsive: true, plugins: { legend: { display: false } }, indexAxis: sorted.length > 6 ? 'y' : 'x' }
        });
    }

    // Chart 2: Pie chart if text col
    if (textCols.length) {
        const col = textCols[0];
        const counts = {};
        parsedData.forEach(r => { const k = String(r[col]); counts[k] = (counts[k] || 0) + 1; });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);

        const id = `auto-${chartCount++}`;
        const box = document.createElement('div');
        box.className = 'auto-chart-box';
        box.innerHTML = `<h4>Répartition par ${col}</h4><canvas id="${id}"></canvas>`;
        container.appendChild(box);

        chartInstances[id] = new Chart(document.getElementById(id), {
            type: 'doughnut',
            data: { labels: sorted.map(s => s[0]), datasets: [{ data: sorted.map(s => s[1]), backgroundColor: colors }] },
            options: { responsive: true, plugins: { legend: { position: 'right' } } }
        });
    }

    // Chart 3: Line chart if multiple numeric cols
    if (numCols.length >= 2) {
        const id = `auto-${chartCount++}`;
        const box = document.createElement('div');
        box.className = 'auto-chart-box';
        box.innerHTML = `<h4>Évolution des valeurs numériques</h4><canvas id="${id}"></canvas>`;
        container.appendChild(box);

        const labels = parsedData.slice(0, 30).map((_, i) => i + 1);
        chartInstances[id] = new Chart(document.getElementById(id), {
            type: 'line',
            data: {
                labels,
                datasets: numCols.slice(0, 4).map((col, i) => ({
                    label: col, data: parsedData.slice(0, 30).map(r => Number(r[col]) || 0),
                    borderColor: colors[i], backgroundColor: colors[i] + '20', fill: true, tension: 0.3
                }))
            },
            options: { responsive: true, plugins: { legend: { position: 'top' } } }
        });
    }

    // Chart 4: Summary stats
    if (numCols.length) {
        const id = `auto-${chartCount++}`;
        const box = document.createElement('div');
        box.className = 'auto-chart-box';
        let statsHtml = `<h4>Résumé des colonnes numériques</h4><table class="data-table"><thead><tr><th>Colonne</th><th class="text-right">Somme</th><th class="text-right">Moyenne</th><th class="text-right">Min</th><th class="text-right">Max</th></tr></thead><tbody>`;
        numCols.forEach(col => {
            const vals = parsedData.map(r => Number(r[col]) || 0);
            const sum = vals.reduce((a, b) => a + b, 0);
            statsHtml += `<tr><td><strong>${col}</strong></td><td class="text-right">${sum.toLocaleString('fr-FR')}</td><td class="text-right">${(sum / vals.length).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</td><td class="text-right">${Math.min(...vals).toLocaleString('fr-FR')}</td><td class="text-right">${Math.max(...vals).toLocaleString('fr-FR')}</td></tr>`;
        });
        statsHtml += '</tbody></table>';
        box.innerHTML = statsHtml;
        container.appendChild(box);
    }

    if (chartCount === 0) {
        container.innerHTML = '<div class="empty-state">Pas assez de données pour générer des graphiques automatiquement.</div>';
    }
}

// Save dataset
document.getElementById('saveDatasetBtn').addEventListener('click', async () => {
    if (!parsedData) return;
    const btn = document.getElementById('saveDatasetBtn');
    btn.textContent = 'Sauvegarde...';
    btn.disabled = true;
    await sb.post('datasets', {
        name: parsedFileName.replace(/\.(xlsx|xls|csv)$/i, ''),
        file_name: parsedFileName,
        columns: parsedColumns,
        data: parsedData.slice(0, 500), // Limit to 500 rows for Supabase
        row_count: parsedData.length
    });
    btn.textContent = 'Sauvegardé !';
    setTimeout(() => { btn.textContent = 'Sauvegarder dans Clareo'; btn.disabled = false; }, 2000);
    loadDatasets();
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
                <button class="btn btn-sm btn-primary" onclick="viewDataset(${d.id})">Voir</button>
                <button class="action-btn reject" onclick="deleteDataset(${d.id})">Supprimer</button>
            </div>
        </div>`).join('');
}

window.viewDataset = async function(id) {
    const [ds] = await sb.get('datasets', `id=eq.${id}`);
    if (!ds) return;
    parsedData = ds.data;
    parsedColumns = ds.columns;
    parsedFileName = ds.file_name;
    showPreview();
};

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
            <td>${fmtDate(t.date)}</td>
            <td>${t.label}</td>
            <td><span class="status">${t.category}</span></td>
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
            <div class="form-actions"><button type="button" class="btn btn-danger" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Ajouter</button></div>
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
    document.getElementById('budgets-list').innerHTML = budgets.map(b => {
        const p = Math.round(b.spent_amount / b.total_amount * 100);
        const c = p >= 90 ? 'red' : p >= 70 ? 'orange' : 'green';
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
            <span class="budget-pct ${p >= 90 ? 'danger' : p >= 70 ? 'warn' : 'ok'}">${p}% consommé — reste ${fmt(b.total_amount - b.spent_amount)}</span>
        </div>`;
    }).join('') || '<div class="empty-state">Aucun budget</div>';
}

document.getElementById('addBudgetBtn').addEventListener('click', () => {
    openModal('Nouveau budget', `
        <form id="budgetForm">
            <div class="form-group"><label>Nom du budget</label><input type="text" name="name" required placeholder="Ex : Marketing Q2"></div>
            <div class="form-row"><div class="form-group"><label>Département</label><input type="text" name="department" placeholder="Ex : Marketing"></div><div class="form-group"><label>Période</label><input type="text" name="period" placeholder="2026"></div></div>
            <div class="form-row"><div class="form-group"><label>Montant total (€)</label><input type="number" name="total_amount" required></div><div class="form-group"><label>Déjà dépensé (€)</label><input type="number" name="spent_amount" value="0"></div></div>
            <div class="form-actions"><button type="button" class="btn btn-danger" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Créer</button></div>
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
            <div class="form-actions"><button type="button" class="btn btn-danger" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div>
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
    openModal('Nouveau collaborateur', `<form id="empForm">${empForm()}<div class="form-actions"><button type="button" class="btn btn-danger" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Ajouter</button></div></form>`);
    document.getElementById('empForm').onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await sb.post('employees', { first_name: fd.get('first_name'), last_name: fd.get('last_name'), email: fd.get('email'), role: fd.get('role'), department: fd.get('department'), start_date: fd.get('start_date') || null, phone: fd.get('phone'), status: 'En poste' });
        closeModal(); loadRH();
    };
});

window.editEmp = function(emp) {
    openModal('Modifier le collaborateur', `<form id="empForm">${empForm(emp)}<div class="form-group"><label>Statut</label><select name="status"><option ${emp.status === 'En poste' ? 'selected' : ''}>En poste</option><option ${emp.status === 'En congé' ? 'selected' : ''}>En congé</option></select></div><div class="form-actions"><button type="button" class="btn btn-danger" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Enregistrer</button></div></form>`);
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
            <div class="form-actions"><button type="button" class="btn btn-danger" onclick="closeModal()">Annuler</button><button type="submit" class="btn btn-primary">Envoyer</button></div>
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
