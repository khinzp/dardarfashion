/* ============================================
   pages.js — Page renderers
   ============================================ */

const Pages = {

  // ================= DASHBOARD =================
  dashboard() {
    const orders = DB.data.orders;
    const todayOrders = orders.filter(o => fmt.isToday(o.orderDate));
    const pending = orders.filter(o => o.status === 'new' || o.status === 'sewing');
    const completed = orders.filter(o => o.status === 'delivered');

    // Today's income = payments made today
    const todayIncome = DB.data.payments
      .filter(p => fmt.isToday(p.date))
      .reduce((s, p) => s + (p.amount || 0), 0);

    // Unpaid = sum of remaining on all non-delivered + delivered unpaid
    const unpaid = orders.reduce((s, o) => s + Math.max(0, (o.total || 0) - (o.paid || 0)), 0);

    // Recent orders (5)
    const recent = [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    return `
      <div class="page-head">
        <h2>📊 Dashboard</h2>
        <button class="btn" data-action="new-order">+ New Order</button>
      </div>

      <div class="stats">
        <div class="stat blue"><div class="label">Today's Orders</div><div class="value">${todayOrders.length}</div></div>
        <div class="stat orange"><div class="label">Pending</div><div class="value">${pending.length}</div></div>
        <div class="stat green"><div class="label">Completed</div><div class="value">${completed.length}</div></div>
        <div class="stat green"><div class="label">Today's Income</div><div class="value">${fmt.money(todayIncome)}</div></div>
        <div class="stat red"><div class="label">Unpaid Amount</div><div class="value">${fmt.money(unpaid)}</div></div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:12px;">Recent Orders</h3>
        ${recent.length ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Order#</th><th>Customer</th><th>Type</th><th>Status</th><th>Total</th></tr></thead>
              <tbody>
                ${recent.map(o => {
                  const c = DB.getCustomer(o.customerId);
                  return `<tr>
                    <td><b>${o.orderNo}</b></td>
                    <td>${c ? c.name : '-'}</td>
                    <td>${o.clothingType || '-'}</td>
                    <td><span class="badge ${o.status}">${o.status}</span></td>
                    <td>${fmt.money(o.total)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty"><div class="icon">📭</div><p>No orders yet. Tap "+ New Order" to start.</p></div>`}
      </div>
    `;
  },

  // ================= CUSTOMERS =================
  customers() {
    const q = (window._search || '').toLowerCase();
    const list = DB.data.customers.filter(c => {
      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q)
          || (c.phone || '').toLowerCase().includes(q)
          || (c.address || '').toLowerCase().includes(q);
    });

    return `
      <div class="page-head">
        <h2>👥 Customers</h2>
        <button class="btn" data-action="new-customer">+ Add Customer</button>
      </div>

      <div class="searchbar">
        <input type="text" id="customerSearch" placeholder="🔍 Search by name, phone, or address..." value="${window._search || ''}" />
      </div>

      ${list.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Address</th><th>Orders</th><th></th></tr>
            </thead>
            <tbody>
              ${list.map(c => {
                const orders = DB.data.orders.filter(o => o.customerId === c.id);
                return `<tr>
                  <td><b>${c.name}</b></td>
                  <td>${c.phone || '-'}</td>
                  <td>${c.address || '-'}</td>
                  <td>${orders.length}</td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button class="btn small secondary" data-action="view-customer" data-id="${c.id}">View</button>
                    <button class="btn small secondary" data-action="edit-customer" data-id="${c.id}">Edit</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty"><div class="icon">👤</div><p>No customers yet.</p></div>`}
    `;
  },

  // ================= MEASUREMENTS =================
  measurements() {
    const q = (window._search || '').toLowerCase();
    const list = DB.data.customers.filter(c => !q || (c.name || '').toLowerCase().includes(q));

    return `
      <div class="page-head">
        <h2>📏 Measurements</h2>
      </div>
      <div class="searchbar">
        <input type="text" id="measurementSearch" placeholder="🔍 Search customer by name..." value="${window._search || ''}" />
      </div>

      ${list.length ? `
        <div class="card">
          ${list.map(c => {
            const ms = DB.getMeasurements(c.id);
            const latest = ms[0];
            return `
              <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;">
                <div>
                  <b>${c.name}</b> ${latest ? `<span class="badge new" style="margin-left:8px;">${ms.length} record${ms.length>1?'s':''}</span>` : ''}
                  <div style="color:var(--muted);font-size:0.85rem;">${c.phone || ''}</div>
                </div>
                <div style="display:flex;gap:8px;">
                  ${latest ? `<button class="btn small secondary" data-action="view-measurement" data-id="${latest.id}">View Latest</button>` : ''}
                  <button class="btn small" data-action="new-measurement" data-cid="${c.id}">+ Add</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `<div class="empty"><div class="icon">📏</div><p>No customers yet. Add a customer first.</p></div>`}
    `;
  },

  // ================= ORDERS =================
  orders() {
    const filter = window._orderFilter || 'all';
    let list = [...DB.data.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (filter !== 'all') list = list.filter(o => o.status === filter);

    const tabs = ['all', 'new', 'sewing', 'ready', 'delivered'];

    return `
      <div class="page-head">
        <h2>🧾 Orders</h2>
        <button class="btn" data-action="new-order">+ New Order</button>
      </div>

      <div class="searchbar" style="gap:8px;">
        ${tabs.map(t => `
          <button class="btn small ${filter === t ? '' : 'secondary'}" data-action="filter-orders" data-filter="${t}">
            ${t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        `).join('')}
      </div>

      ${list.length ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Order#</th><th>Customer</th><th>Due</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              ${list.map(o => {
                const c = DB.getCustomer(o.customerId);
                const remaining = Math.max(0, (o.total || 0) - (o.paid || 0));
                return `<tr>
                  <td><b>${o.orderNo}</b></td>
                  <td>${c ? c.name : '-'}</td>
                  <td>${fmt.date(o.dueDate)}</td>
                  <td>${fmt.money(o.total)}</td>
                  <td>${fmt.money(o.paid)}</td>
                  <td>${remaining > 0 ? `<span style="color:var(--danger);font-weight:600;">${fmt.money(remaining)}</span>` : `<span style="color:var(--success);">Paid</span>`}</td>
                  <td><span class="badge ${o.status}">${o.status}</span></td>
                  <td style="text-align:right;white-space:nowrap;">
                    <button class="btn small secondary" data-action="view-order" data-id="${o.id}">View</button>
                    <button class="btn small secondary" data-action="edit-order" data-id="${o.id}">Edit</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty"><div class="icon">🧾</div><p>No orders in this filter.</p></div>`}
    `;
  },

  // ================= PAYMENTS =================
  payments() {
    const list = [...DB.data.payments].sort((a, b) => new Date(b.date) - new Date(a.date));

    return `
      <div class="page-head">
        <h2>💰 Payments</h2>
        <button class="btn" data-action="new-payment">+ Add Payment</button>
      </div>

      ${list.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Order#</th><th>Customer</th><th>Amount</th><th>Method</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              ${list.map(p => {
                const o = DB.getOrder(p.orderId);
                const c = o ? DB.getCustomer(o.customerId) : null;
                return `<tr>
                  <td>${fmt.date(p.date)}</td>
                  <td><b>${o ? o.orderNo : '-'}</b></td>
                  <td>${c ? c.name : '-'}</td>
                  <td><b>${fmt.money(p.amount)}</b></td>
                  <td>${p.method || '-'}</td>
                  <td>${p.notes || '-'}</td>
                  <td style="text-align:right;">
                    <button class="btn small danger" data-action="delete-payment" data-id="${p.id}">Delete</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty"><div class="icon">💰</div><p>No payments recorded yet.</p></div>`}
    `;
  },

  // ================= EXPENSES =================
  expenses() {
    const list = [...DB.data.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
    const total = list.reduce((s, e) => s + (e.amount || 0), 0);

    return `
      <div class="page-head">
        <h2>📉 Expenses</h2>
        <button class="btn" data-action="new-expense">+ Add Expense</button>
      </div>

      <div class="stat red" style="margin-bottom:16px;">
        <div class="label">Total Expenses</div>
        <div class="value">${fmt.money(total)}</div>
      </div>

      ${list.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              ${list.map(e => `
                <tr>
                  <td>${fmt.date(e.date)}</td>
                  <td>${e.description}</td>
                  <td>${e.category || '-'}</td>
                  <td><b>${fmt.money(e.amount)}</b></td>
                  <td>${e.notes || '-'}</td>
                  <td style="text-align:right;">
                    <button class="btn small danger" data-action="delete-expense" data-id="${e.id}">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty"><div class="icon">📉</div><p>No expenses recorded.</p></div>`}
    `;
  },

  // ================= REPORTS =================
  reports() {
    // Daily income (today)
    const todayPay = DB.data.payments.filter(p => fmt.isToday(p.date));
    const todayIncome = todayPay.reduce((s, p) => s + p.amount, 0);
    const todayExpense = DB.data.expenses.filter(e => fmt.isToday(e.date)).reduce((s, e) => s + e.amount, 0);

    // Monthly
    const monthPay = DB.data.payments.filter(p => fmt.isSameMonth(p.date));
    const monthIncome = monthPay.reduce((s, p) => s + p.amount, 0);
    const monthExpense = DB.data.expenses.filter(e => fmt.isSameMonth(e.date)).reduce((s, e) => s + e.amount, 0);

    // Outstanding
    const outstanding = DB.data.orders
      .map(o => ({ ...o, remaining: Math.max(0, (o.total || 0) - (o.paid || 0)) }))
      .filter(o => o.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);

    const totalOutstanding = outstanding.reduce((s, o) => s + o.remaining, 0);

    return `
      <div class="page-head"><h2>📈 Reports</h2></div>

      <div class="stats">
        <div class="stat green">
          <div class="label">Today's Income</div>
          <div class="value">${fmt.money(todayIncome)}</div>
        </div>
        <div class="stat red">
          <div class="label">Today's Expenses</div>
          <div class="value">${fmt.money(todayExpense)}</div>
        </div>
        <div class="stat blue">
          <div class="label">This Month Income</div>
          <div class="value">${fmt.money(monthIncome)}</div>
        </div>
        <div class="stat orange">
          <div class="label">This Month Expenses</div>
          <div class="value">${fmt.money(monthExpense)}</div>
        </div>
        <div class="stat green">
          <div class="label">Monthly Profit</div>
          <div class="value">${fmt.money(monthIncome - monthExpense)}</div>
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:12px;">Outstanding Payments <span style="color:var(--danger);">(${fmt.money(totalOutstanding)})</span></h3>
        ${outstanding.length ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Order#</th><th>Customer</th><th>Total</th><th>Paid</th><th>Remaining</th></tr></thead>
              <tbody>
                ${outstanding.map(o => {
                  const c = DB.getCustomer(o.customerId);
                  return `<tr>
                    <td><b>${o.orderNo}</b></td>
                    <td>${c ? c.name : '-'}</td>
                    <td>${fmt.money(o.total)}</td>
                    <td>${fmt.money(o.paid)}</td>
                    <td style="color:var(--danger);font-weight:600;">${fmt.money(o.remaining)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty"><div class="icon">✅</div><p>All payments cleared!</p></div>`}
      </div>
    `;
  }
};