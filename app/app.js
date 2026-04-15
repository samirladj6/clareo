// ===== Supabase Config =====
const SUPABASE_URL = 'https://ftzkkdfvwwonciiavzxw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_xIaWPCzl6AK_Q1PqD_AaQg_9fmFgsML';

const supabase = {
    async query(table, { select = '*', order, filter, limit } = {}) {
        let url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
        if (order) url += `&order=${order}`;
        if (filter) url += `&${filter}`;
        if (limit) url += `&limit=${limit}`;
        const res = await fetch(url, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        });
        if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
        return res.json();
    },
    async insert(table, data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
        return res.json();
    },
    async update(table, id, data) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
        return res.json();
    }
};

// ===== Helpers =====
const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtShort = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
const avatarColors = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6', '#6366F1'];
const getAvatarColor = (i) => avatarColors[i % avatarColors.length];
const initials = (f, l) => (f[0] + l[0]).toUpperCase();

// ===== Date display =====
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});

// ===== Navigation =====
const pages = ['dashboard', 'tresorerie', 'banque', 'budgets', 'rh', 'conges'];
const pageTitles = {
    dashboard: 'Tableau de bord',
    tresorerie: 'Trésorerie',
    banque: 'Banque',
    budgets: 'Budgets',
    rh: 'Équipe RH',
    conges: 'Congés'
};

function navigate(page) {
    pages.forEach(p => {
        document.getElementById(`page-${p}`).classList.toggle('hidden', p !== page);
    });
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });
    document.getElementById('pageTitle').textContent = pageTitles[page] || page;

    // Load page data
    if (page === 'dashboard') loadDashboard();
    if (page === 'tresorerie') loadTreasury();
    if (page === 'banque') loadBank();
    if (page === 'budgets') loadBudgets();
    if (page === 'rh') loadRH();
    if (page === 'conges') loadLeaves();
}

// Hash routing
function handleHash() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigate(hash);
}
window.addEventListener('hashchange', handleHash);

document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
    });
});

// Mobile menu
document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// ===== DASHBOARD =====
async function loadDashboard() {
    try {
        const [transactions, budgets, employees] = await Promise.all([
            supabase.query('transactions', { order: 'date.desc', limit: 50 }),
            supabase.query('budgets'),
            supabase.query('employees')
        ]);

        // KPI: Treasury (sum credits - sum debits)
        const totalCredits = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
        const totalDebits = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
        document.getElementById('kpi-treasury').textContent = fmt(totalCredits - totalDebits);

        // KPI: Income this month
        const now = new Date();
        const thisMonth = transactions.filter(t => {
            const d = new Date(t.date);
            return t.type === 'credit' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        document.getElementById('kpi-income').textContent = fmt(thisMonth.reduce((s, t) => s + Number(t.amount), 0));

        // KPI: Budget
        const totalBudget = budgets.reduce((s, b) => s + Number(b.total_amount), 0);
        const totalSpent = budgets.reduce((s, b) => s + Number(b.spent_amount), 0);
        const pct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        document.getElementById('kpi-budget').textContent = `${pct}%`;

        // KPI: Employees
        document.getElementById('kpi-employees').textContent = employees.length;

        // Last 5 transactions
        const container = document.getElementById('dash-transactions');
        container.innerHTML = transactions.slice(0, 6).map(t => `
            <div class="tx-row">
                <div class="tx-cat tx-cat-${t.category}"></div>
                <span class="tx-label">${t.label}</span>
                <span class="tx-date">${fmtShort(t.date)}</span>
                <span class="tx-amount ${t.type}">${t.type === 'credit' ? '+' : '-'}${fmt(t.amount)}</span>
            </div>
        `).join('');

        // Budgets summary
        const budgetContainer = document.getElementById('dash-budgets');
        budgetContainer.innerHTML = budgets.map(b => {
            const p = Math.round((b.spent_amount / b.total_amount) * 100);
            const color = p >= 90 ? 'red' : p >= 70 ? 'orange' : 'green';
            const cls = p >= 90 ? 'danger' : p >= 70 ? 'warn' : 'ok';
            return `
                <div class="budget-row">
                    <div class="budget-top">
                        <span class="budget-name">${b.name}</span>
                        <span class="budget-numbers">${fmt(b.spent_amount)} / ${fmt(b.total_amount)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill progress-${color}" style="width:${p}%"></div>
                    </div>
                    <span class="budget-pct ${cls}">${p}% consommé</span>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Dashboard error:', e);
    }
}

// ===== TRÉSORERIE =====
async function loadTreasury() {
    try {
        const transactions = await supabase.query('transactions', { order: 'date.asc' });

        const totalIn = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0);
        const totalOut = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0);
        document.getElementById('treasury-balance').textContent = fmt(totalIn - totalOut);
        document.getElementById('treasury-in').textContent = fmt(totalIn);
        document.getElementById('treasury-out').textContent = fmt(totalOut);

        // Chart
        drawTreasuryChart(transactions);

        // Categories
        const categories = {};
        transactions.filter(t => t.type === 'debit').forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
        });
        const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]);
        const maxCat = sorted.length > 0 ? sorted[0][1] : 1;

        document.getElementById('treasury-categories').innerHTML = sorted.map(([cat, amount]) => `
            <div class="cat-row">
                <span class="cat-name">${cat}</span>
                <div class="cat-bar-wrap">
                    <div class="cat-bar" style="width:${(amount / maxCat * 100).toFixed(0)}%"></div>
                </div>
                <span class="cat-amount">${fmt(amount)}</span>
            </div>
        `).join('');
    } catch (e) {
        console.error('Treasury error:', e);
    }
}

function drawTreasuryChart(transactions) {
    const canvas = document.getElementById('treasuryChart');
    const ctx = canvas.getContext('2d');
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 250;

    // Group by month
    const monthly = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthly[key]) monthly[key] = { credits: 0, debits: 0 };
        if (t.type === 'credit') monthly[key].credits += Number(t.amount);
        else monthly[key].debits += Number(t.amount);
    });

    const months = Object.keys(monthly).sort();
    let balance = 0;
    const points = months.map(m => {
        balance += monthly[m].credits - monthly[m].debits;
        return { month: m, balance };
    });

    if (points.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 70 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const minVal = Math.min(...points.map(p => p.balance)) * 0.9;
    const maxVal = Math.max(...points.map(p => p.balance)) * 1.1;
    const range = maxVal - minVal || 1;

    const getX = (i) => pad.left + (i / (points.length - 1 || 1)) * cw;
    const getY = (v) => pad.top + ch - ((v - minVal) / range) * ch;

    ctx.clearRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = pad.top + (ch / 4) * i;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(w - pad.right, y);
        ctx.stroke();

        const val = maxVal - (range / 4) * i;
        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(fmt(val), pad.left - 8, y + 4);
    }

    // Area fill
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].balance));
    points.forEach((p, i) => ctx.lineTo(getX(i), getY(p.balance)));
    ctx.lineTo(getX(points.length - 1), h - pad.bottom);
    ctx.lineTo(getX(0), h - pad.bottom);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.15)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0].balance));
    points.forEach((p, i) => ctx.lineTo(getX(i), getY(p.balance)));
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots + labels
    points.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(getX(i), getY(p.balance), 4, 0, Math.PI * 2);
        ctx.fillStyle = '#4F46E5';
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(getX(i), getY(p.balance), 2, 0, Math.PI * 2);
        ctx.fill();

        // Month label
        const mLabel = new Date(p.month + '-01').toLocaleDateString('fr-FR', { month: 'short' });
        ctx.fillStyle = '#94A3B8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mLabel, getX(i), h - pad.bottom + 20);
    });
}

// ===== BANQUE =====
async function loadBank() {
    try {
        const transactions = await supabase.query('transactions', { order: 'date.desc' });

        // Populate filter
        const cats = [...new Set(transactions.map(t => t.category))].sort();
        const filterEl = document.getElementById('bankFilter');
        const currentVal = filterEl.value;
        filterEl.innerHTML = '<option value="all">Toutes catégories</option>' +
            cats.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('');

        filterEl.onchange = () => renderBankTable(transactions, filterEl.value);
        renderBankTable(transactions, filterEl.value);
    } catch (e) {
        console.error('Bank error:', e);
    }
}

function renderBankTable(transactions, filter) {
    const filtered = filter === 'all' ? transactions : transactions.filter(t => t.category === filter);
    document.getElementById('bank-table-body').innerHTML = filtered.map(t => `
        <tr>
            <td>${fmtDate(t.date)}</td>
            <td>${t.label}</td>
            <td><span class="status status-${slugify(t.category)}">${t.category}</span></td>
            <td class="text-right">
                <span class="tx-amount ${t.type}">${t.type === 'credit' ? '+' : '-'}${fmt(t.amount)}</span>
            </td>
        </tr>
    `).join('');
}

// ===== BUDGETS =====
async function loadBudgets() {
    try {
        const budgets = await supabase.query('budgets', { order: 'spent_amount.desc' });
        const container = document.getElementById('budgets-list');

        container.innerHTML = budgets.map(b => {
            const p = Math.round((b.spent_amount / b.total_amount) * 100);
            const color = p >= 90 ? 'red' : p >= 70 ? 'orange' : 'green';
            const cls = p >= 90 ? 'danger' : p >= 70 ? 'warn' : 'ok';
            return `
                <div class="budget-row">
                    <div class="budget-top">
                        <div>
                            <span class="budget-name">${b.name}</span>
                            <span class="budget-dept">${b.department}</span>
                        </div>
                        <span class="budget-numbers">${fmt(b.spent_amount)} / ${fmt(b.total_amount)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill progress-${color}" style="width:${p}%"></div>
                    </div>
                    <span class="budget-pct ${cls}">${p}% consommé — reste ${fmt(b.total_amount - b.spent_amount)}</span>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Budgets error:', e);
    }
}

// Add budget
document.getElementById('addBudgetBtn').addEventListener('click', () => {
    openModal('Nouveau budget', `
        <form id="budgetForm">
            <div class="form-group">
                <label>Nom du budget</label>
                <input type="text" name="name" required placeholder="Ex : Marketing Q2">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Département</label>
                    <input type="text" name="department" placeholder="Ex : Marketing">
                </div>
                <div class="form-group">
                    <label>Période</label>
                    <input type="text" name="period" placeholder="Ex : 2026">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Montant total (€)</label>
                    <input type="number" name="total_amount" required placeholder="10000">
                </div>
                <div class="form-group">
                    <label>Déjà dépensé (€)</label>
                    <input type="number" name="spent_amount" value="0" placeholder="0">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-danger" onclick="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-primary">Créer le budget</button>
            </div>
        </form>
    `);
    document.getElementById('budgetForm').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await supabase.insert('budgets', {
            name: fd.get('name'),
            department: fd.get('department'),
            period: fd.get('period'),
            total_amount: Number(fd.get('total_amount')),
            spent_amount: Number(fd.get('spent_amount'))
        });
        closeModal();
        loadBudgets();
    };
});

// ===== RH =====
async function loadRH() {
    try {
        const employees = await supabase.query('employees', { order: 'last_name.asc' });
        document.getElementById('rh-table-body').innerHTML = employees.map((emp, i) => `
            <tr>
                <td>
                    <div class="employee-cell">
                        <div class="emp-avatar" style="background:${getAvatarColor(i)}">${initials(emp.first_name, emp.last_name)}</div>
                        <div>
                            <strong>${emp.first_name} ${emp.last_name}</strong><br>
                            <span style="font-size:0.72rem;color:var(--text-lighter)">${emp.email || ''}</span>
                        </div>
                    </div>
                </td>
                <td>${emp.role || '—'}</td>
                <td>${emp.department || '—'}</td>
                <td><span class="status status-${slugify(emp.status)}">${emp.status}</span></td>
                <td>${emp.start_date ? fmtDate(emp.start_date) : '—'}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('RH error:', e);
    }
}

// Add employee
document.getElementById('addEmployeeBtn').addEventListener('click', () => {
    openModal('Nouveau collaborateur', `
        <form id="employeeForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Prénom</label>
                    <input type="text" name="first_name" required>
                </div>
                <div class="form-group">
                    <label>Nom</label>
                    <input type="text" name="last_name" required>
                </div>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Poste</label>
                    <input type="text" name="role">
                </div>
                <div class="form-group">
                    <label>Département</label>
                    <select name="department">
                        <option value="Commercial">Commercial</option>
                        <option value="Technique">Technique</option>
                        <option value="Finance">Finance</option>
                        <option value="RH">RH</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Direction">Direction</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Date d'entrée</label>
                    <input type="date" name="start_date">
                </div>
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="tel" name="phone">
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-danger" onclick="closeModal()">Annuler</button>
                <button type="submit" class="btn btn-primary">Ajouter</button>
            </div>
        </form>
    `);
    document.getElementById('employeeForm').onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await supabase.insert('employees', {
            first_name: fd.get('first_name'),
            last_name: fd.get('last_name'),
            email: fd.get('email'),
            role: fd.get('role'),
            department: fd.get('department'),
            start_date: fd.get('start_date') || null,
            phone: fd.get('phone'),
            status: 'En poste'
        });
        closeModal();
        loadRH();
    };
});

// ===== CONGÉS =====
async function loadLeaves() {
    try {
        const [leaves, employees] = await Promise.all([
            supabase.query('leaves', { order: 'start_date.desc' }),
            supabase.query('employees')
        ]);

        const empMap = {};
        employees.forEach(e => empMap[e.id] = e);

        document.getElementById('conges-table-body').innerHTML = leaves.map(l => {
            const emp = empMap[l.employee_id];
            const name = emp ? `${emp.first_name} ${emp.last_name}` : 'Inconnu';
            const canAction = l.status === 'En attente';
            return `
                <tr>
                    <td><strong>${name}</strong></td>
                    <td>${l.type}</td>
                    <td>${fmtDate(l.start_date)}</td>
                    <td>${fmtDate(l.end_date)}</td>
                    <td><span class="status status-${slugify(l.status)}">${l.status}</span></td>
                    <td>
                        ${canAction ? `
                            <div class="action-btns">
                                <button class="action-btn approve" onclick="updateLeave(${l.id}, 'Approuvé')">Approuver</button>
                                <button class="action-btn reject" onclick="updateLeave(${l.id}, 'Refusé')">Refuser</button>
                            </div>
                        ` : '—'}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Leaves error:', e);
    }
}

window.updateLeave = async function(id, status) {
    await supabase.update('leaves', id, { status });
    loadLeaves();
};

// ===== Modal =====
function openModal(title, html) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}
window.closeModal = closeModal;

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal')) closeModal();
});

// ===== Init =====
handleHash();
