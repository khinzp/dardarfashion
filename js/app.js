/* ============================================
   app.js — Main application logic
   ============================================ */

const App = {
  currentPage: 'dashboard',

  init() {
    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.go(btn.dataset.page));
    });

    // Mobile menu
    document.getElementById('menuBtn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('overlay').classList.add('show');
    });
    document.getElementById('overlay').addEventListener('click', () => this.closeSidebar());

    // Modal close
    document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') this.closeModal();
    });

    // Global click delegation
    document.body.addEventListener('click', (e) => this.handleClick(e));
    document.body.addEventListener('input', (e) => this.handleInput(e));

    this.go('dashboard');
  },

  closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  },

  go(page) {
    this.currentPage = page;
    window._search = '';
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.page === page);
    });
    const content = document.getElementById('content');
    content.innerHTML = Pages[page] ? Pages[page]() : '<p>Page not found</p>';
    this.closeSidebar();
  },

  refresh() {
    const content = document.getElementById('content');
    content.innerHTML = Pages[this.currentPage]();
  },

  // ==================== MODAL ====================
  openModal(title, html) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modal').classList.add('show');
  },
  closeModal() {
    document.getElementById('modal').classList.remove('show');
  },

  toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.className = 'toast', 2200);
  },

  // ==================== EVENTS ====================
  handleInput(e) {
    if (e.target.id === 'customerSearch') {
      window._search = e.target.value;
      const content = document.getElementById('content');
      content.innerHTML = Pages.customers();
      document.getElementById('customerSearch').focus();
    }
    if (e.target.id === 'measurementSearch') {
      window._search = e.target.value;
      const content = document.getElementById('content');
      content.innerHTML = Pages.measurements();
      document.getElementById('measurementSearch').focus();
    }
  },

  handleClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    const id = el.dataset.id;

    switch (action) {
      case 'new-customer': return this.customerForm();
      case 'edit-customer': return this.customerForm(id);
      case 'view-customer': return this.viewCustomer(id);
      case 'save-customer': return this.saveCustomer();

      case 'new-measurement': return this.measurementForm(el.dataset.cid);
      case 'view-measurement': return this.viewMeasurement(id);
      case 'save-measurement': return this.saveMeasurement();

      case 'new-order': return this.orderForm();
      case 'edit-order': return this.orderForm(id);
      case 'view-order': return this.viewOrder(id);
      case 'save-order': return this.saveOrder();
      case 'update-order-status': return this.updateOrderStatus(el.dataset.id, el.dataset.status);
      case 'delete-order': return this.deleteOrder(id);
      case 'filter-orders':
        window._orderFilter = el.dataset.filter;
        this.refresh();
        return;

      case 'new-payment': return this.paymentForm(el.dataset.oid);
      case 'save-payment': return this.savePayment();
      case 'delete-payment':
        if (confirm('Delete this payment? Order paid amount will be adjusted.')) {
          DB.deletePayment(id);
          this.toast('Payment deleted');
          this.refresh();
        }
        return;

      case 'new-expense': return this.expenseForm();
      case 'save-expense': return this.saveExpense();
      case 'delete-expense':
        if (confirm('Delete this expense?')) {
          DB.deleteExpense(id);
          this.toast('Expense deleted');
          this.refresh();
        }
        return;
    }
  },

  // ==================== CUSTOMER FORMS ====================
  customerForm(id) {
    const c = id ? DB.getCustomer(id) : {};
    this.openModal(id ? 'Edit Customer' : 'Add Customer', `
      <form id="customerForm" onsubmit="event.preventDefault(); App.saveCustomer('${id || ''}')">
        <div class="form-grid">
          <div class="field full">
            <label>Name *</label>
            <input name="name" required value="${c.name || ''}" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input name="phone" value="${c.phone || ''}" />
          </div>
          <div class="field">
            <label>Address</label>
            <input name="address" value="${c.address || ''}" />
          </div>
          <div class="field full">
            <label>Notes</label>
            <textarea name="notes">${c.notes || ''}</textarea>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button type="submit" class="btn success full">Save</button>
          <button type="button" class="btn secondary full" onclick="App.closeModal()">Cancel</button>
        </div>
      </form>
    `);
  },

  saveCustomer(id) {
    const fd = new FormData(document.getElementById('customerForm'));
    const data = Object.fromEntries(fd.entries());
    if (id) {
      DB.updateCustomer(id, data);
      this.toast('Customer updated');
    } else {
      DB.addCustomer(data);
      this.toast('Customer added');
    }
    this.closeModal();
    this.refresh();
  },

  viewCustomer(id) {
    const c = DB.getCustomer(id);
    if (!c) return;
    const orders = DB.data.orders.filter(o => o.customerId === id);
    const measurements = DB.getMeasurements(id);
    const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalPaid = orders.reduce((s, o) => s + (o.paid || 0), 0);

    this.openModal(`👤 ${c.name}`, `
      <div style="margin-bottom:14px;">
        <div><b>Phone:</b> ${c.phone || '-'}</div>
        <div><b>Address:</b> ${c.address || '-'}</div>
        <div><b>Notes:</b> ${c.notes || '-'}</div>
        <div style="margin-top:10px;padding:10px;background:var(--primary-light);border-radius:8px;">
          <b>Total Orders:</b> ${orders.length} &nbsp;|&nbsp;
          <b>Total Spent:</b> ${fmt.money(totalSpent)} &nbsp;|&nbsp;
          <b>Paid:</b> ${fmt.money(totalPaid)} &nbsp;|&nbsp;
          <b>Balance:</b> ${fmt.money(totalSpent - totalPaid)}
        </div>
      </div>

      <h4 style="margin:14px 0 8px;">Order History</h4>
      ${orders.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order#</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              ${orders.map(o => `
                <tr><td>${o.orderNo}</td><td>${fmt.date(o.orderDate)}</td><td>${fmt.money(o.total)}</td>
                <td><span class="badge ${o.status}">${o.status}</span></td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p style="color:var(--muted);">No orders yet.</p>'}

      <h4 style="margin:14px 0 8px;">Measurements</h4>
      ${measurements.length ? `
        <p>${measurements.length} record(s). Latest: ${fmt.date(measurements[0].date)}</p>
      ` : '<p style="color:var(--muted);">No measurements saved.</p>'}

      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
        <button class="btn" onclick="App.closeModal();App.orderForm();">+ New Order</button>
        <button class="btn secondary" onclick="App.closeModal();App.measurementForm('${id}')">+ Measurement</button>
      </div>
    `);
  },

  // ==================== MEASUREMENT FORMS ====================
  measurementForm(customerId) {
    const c = DB.getCustomer(customerId);
    this.openModal('📏 Add Measurement - ' + (c ? c.name : ''), `
      <form id="measurementForm" onsubmit="event.preventDefault(); App.saveMeasurement('${customerId}')">
        <div class="form-grid">
          <div class="field"><label>Shoulder</label><input name="shoulder" /></div>
          <div class="field"><label>Chest</label><input name="chest" /></div>
          <div class="field"><label>Waist</label><input name="waist" /></div>
          <div class="field"><label>Hip</label><input name="hip" /></div>
          <div class="field"><label>Sleeve</label><input name="sleeve" /></div>
          <div class="field"><label>Shirt Length</label><input name="shirtLength" /></div>
          <div class="field"><label>Pants Length</label><input name="pantsLength" /></div>
          <div class="field full"><label>Other Measurements</label><input name="other" placeholder="e.g. Neck 15, Thigh 22" /></div>
          <div class="field full"><label>Notes</label><textarea name="notes"></textarea></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button type="submit" class="btn success full">Save</button>
          <button type="button" class="btn secondary full" onclick="App.closeModal()">Cancel</button>
        </div>
      </form>
    `);
  },

  saveMeasurement(customerId) {
    const fd = new FormData(document.getElementById('measurementForm'));
    const data = Object.fromEntries(fd.entries());
    data.customerId = customerId;
    DB.addMeasurement(data);
    this.toast('Measurement saved');
    this.closeModal();
    this.refresh();
  },

  viewMeasurement(id) {
    const m = DB.data.measurements.find(x => x.id === id);
    if (!m) return;
    const c = DB.getCustomer(m.customerId);
    const rows = [
      ['Shoulder', m.shoulder], ['Chest', m.chest], ['Waist', m.waist],
      ['Hip', m.hip], ['Sleeve', m.sleeve], ['Shirt Length', m.shirtLength],
      ['Pants Length', m.pantsLength], ['Other', m.other]
    ].filter(r => r[1]);

    this.openModal('📏 ' + (c ? c.name : '') + ' - ' + fmt.date(m.date), `
      <div class="form-grid">
        ${rows.map(r => `<div class="field"><label>${r[0]}</label><div style="padding:10px;background:#f9fafb;border-radius:8px;"><b>${r[1]}</b></div></div>`).join('')}
      </div>
      ${m.notes ? `<div class="field full" style="margin-top:12px;"><label>Notes</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${m.notes}</div></div>` : ''}
      <button class="btn danger full" style="margin-top:16px;" onclick="if(confirm('Delete?')){DB.deleteMeasurement('${m.id}');App.closeModal();App.refresh();App.toast('Deleted');}">Delete</button>
    `);
  },

  // ==================== ORDER FORMS ====================
  orderForm(id) {
    const o = id ? DB.getOrder(id) : {};
    const customers = DB.data.customers;
    if (!customers.length) {
      this.toast('Please add a customer first', 'error');
      return;
    }
    const clothingTypes = ['Shirt', 'Pants', 'Dress', 'Blouse', 'Skirt', 'Jacket', 'Suit', 'Traditional', 'Other'];

    this.openModal(id ? 'Edit Order' : 'New Order', `
      <form id="orderForm" onsubmit="event.preventDefault(); App.saveOrder('${id || ''}')">
        <div class="form-grid">
          <div class="field full">
            <label>Customer *</label>
            <select name="customerId" required>
              <option value="">-- Select Customer --</option>
              ${customers.map(c => `<option value="${c.id}" ${o.customerId === c.id ? 'selected' : ''}>${c.name} (${c.phone || 'no phone'})</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Order Date *</label><input type="date" name="orderDate" required value="${o.orderDate || fmt.today()}" /></div>
          <div class="field"><label>Due Date *</label><input type="date" name="dueDate" required value="${o.dueDate || fmt.today()}" /></div>
          <div class="field">
            <label>Clothing Type</label>
            <select name="clothingType">
              ${clothingTypes.map(t => `<option ${o.clothingType === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Quantity *</label><input type="number" name="quantity" min="1" required value="${o.quantity || 1}" /></div>
          <div class="field"><label>Price (per piece) *</label><input type="number" name="price" min="0" required value="${o.price || 0}" /></div>
          <div class="field"><label>Discount</label><input type="number" name="discount" min="0" value="${o.discount || 0}" /></div>
          <div class="field"><label>Advance Paid</label><input type="number" name="paid" min="0" value="${o.paid || 0}" ${id ? 'readonly' : ''} /></div>
          <div class="field full">
            <label>Notes</label>
            <textarea name="notes">${o.notes || ''}</textarea>
          </div>
        </div>
        <p style="color:var(--muted);font-size:0.85rem;margin-top:8px;">💡 Total = Price × Quantity − Discount. ${id ? 'To add more payments, use the Payments page.' : ''}</p>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button type="submit" class="btn success full">Save Order</button>
          <button type="button" class="btn secondary full" onclick="App.closeModal()">Cancel</button>
        </div>
      </form>
    `);
  },

  saveOrder(id) {
    const fd = new FormData(document.getElementById('orderForm'));
    const data = Object.fromEntries(fd.entries());
    data.quantity = Number(data.quantity) || 0;
    data.price = Number(data.price) || 0;
    data.discount = Number(data.discount) || 0;
    data.paid = Number(data.paid) || 0;

    if (id) {
      DB.updateOrder(id, data);
      this.toast('Order updated');
    } else {
      DB.addOrder(data);
      this.toast('Order created');
    }
    this.closeModal();
    this.refresh();
  },

  viewOrder(id) {
    const o = DB.getOrder(id);
    if (!o) return;
    const c = DB.getCustomer(o.customerId);
    const remaining = Math.max(0, (o.total || 0) - (o.paid || 0));
    const payments = DB.data.payments.filter(p => p.orderId === id);

    const statuses = ['new', 'sewing', 'ready', 'delivered'];

    this.openModal('🧾 ' + o.orderNo, `
      <div class="form-grid">
        <div class="field"><label>Customer</label><div style="padding:10px;background:#f9fafb;border-radius:8px;"><b>${c ? c.name : '-'}</b></div></div>
        <div class="field"><label>Phone</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${c ? c.phone || '-' : '-'}</div></div>
        <div class="field"><label>Order Date</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${fmt.date(o.orderDate)}</div></div>
        <div class="field"><label>Due Date</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${fmt.date(o.dueDate)}</div></div>
        <div class="field"><label>Clothing</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${o.clothingType}</div></div>
        <div class="field"><label>Quantity</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${o.quantity}</div></div>
        <div class="field"><label>Price</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${fmt.money(o.price)}</div></div>
        <div class="field"><label>Discount</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${fmt.money(o.discount)}</div></div>
        <div class="field"><label>Total</label><div style="padding:10px;background:var(--primary-light);border-radius:8px;"><b>${fmt.money(o.total)}</b></div></div>
        <div class="field"><label>Paid</label><div style="padding:10px;background:#d1fae5;border-radius:8px;"><b>${fmt.money(o.paid)}</b></div></div>
        <div class="field"><label>Remaining</label><div style="padding:10px;background:${remaining > 0 ? '#fee2e2' : '#d1fae5'};border-radius:8px;"><b>${fmt.money(remaining)}</b></div></div>
        <div class="field"><label>Status</label><div style="padding:10px;"><span class="badge ${o.status}">${o.status}</span></div></div>
        ${o.notes ? `<div class="field full"><label>Notes</label><div style="padding:10px;background:#f9fafb;border-radius:8px;">${o.notes}</div></div>` : ''}
      </div>

      <h4 style="margin:16px 0 8px;">Change Status</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${statuses.map(s => `<button class="btn small ${o.status === s ? '' : 'secondary'}" data-action="update-order-status" data-id="${o.id}" data-status="${s}">${s}</button>`).join('')}
      </div>

      <h4 style="margin:16px 0 8px;">Payment History</h4>
      ${payments.length ? `
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th></tr></thead>
            <tbody>
              ${payments.map(p => `<tr><td>${fmt.date(p.date)}</td><td>${fmt.money(p.amount)}</td><td>${p.method || '-'}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : '<p style="color:var(--muted);">No payments yet.</p>'}

      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;">
        ${remaining > 0 ? `<button class="btn success" data-action="new-payment" data-oid="${o.id}">+ Add Payment</button>` : ''}
        <button class="btn secondary" data-action="edit-order" data-id="${o.id}">Edit Order</button>
        <button class="btn danger" data-action="delete-order" data-id="${o.id}">Delete</button>
      </div>
    `);
  },

  updateOrderStatus(id, status) {
    DB.updateOrder(id, { status });
    this.toast('Status: ' + status);
    this.closeModal();
    this.refresh();
  },

  deleteOrder(id) {
    if (!confirm('Delete this order and its payments?')) return;
    DB.deleteOrder(id);
    this.toast('Order deleted');
    this.closeModal();
    this.refresh();
  },

  // ==================== PAYMENT FORMS ====================
  paymentForm(orderId) {
    const orders = DB.data.orders.filter(o => {
      const remaining = (o.total || 0) - (o.paid || 0);
      return remaining > 0;
    });
    if (!orders.length) {
      this.toast('No outstanding orders', 'error');
      return;
    }
    const methods = ['Cash', 'KBZPay', 'Wave Money', 'AYA Pay', 'Bank Transfer', 'Other'];

    this.openModal('💰 Add Payment', `
      <form id="paymentForm" onsubmit="event.preventDefault(); App.savePayment()">
        <div class="form-grid">
          <div class="field full">
            <label>Order *</label>
            <select name="orderId" required>
              <option value="">-- Select Order --</option>
              ${orders.map(o => {
                const c = DB.getCustomer(o.customerId);
                const rem = (o.total || 0) - (o.paid || 0);
                return `<option value="${o.id}" ${orderId === o.id ? 'selected' : ''}>${o.orderNo} - ${c ? c.name : '?'} (Due: ${fmt.money(rem)})</option>`;
              }).join('')}
            </select>
          </div>
          <div class="field"><label>Date *</label><input type="date" name="date" required value="${fmt.today()}" /></div>
          <div class="field"><label>Amount *</label><input type="number" name="amount" min="1" required /></div>
          <div class="field">
            <label>Method</label>
            <select name="method">${methods.map(m => `<option>${m}</option>`).join('')}</select>
          </div>
          <div class="field full"><label>Notes</label><textarea name="notes"></textarea></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button type="submit" class="btn success full">Save Payment</button>
          <button type="button" class="btn secondary full" onclick="App.closeModal()">Cancel</button>
        </div>
      </form>
    `);
  },

  savePayment() {
    const fd = new FormData(document.getElementById('paymentForm'));
    const data = Object.fromEntries(fd.entries());
    if (!data.orderId) return this.toast('Select an order', 'error');
    data.amount = Number(data.amount) || 0;
    if (data.amount <= 0) return this.toast('Enter a valid amount', 'error');

    const order = DB.getOrder(data.orderId);
    const remaining = (order.total || 0) - (order.paid || 0);
    if (data.amount > remaining) {
      if (!confirm(`Amount exceeds remaining (${fmt.money(remaining)}). Continue?`)) return;
    }

    DB.addPayment(data);
    this.toast('Payment saved');
    this.closeModal();
    this.refresh();
  },

  // ==================== EXPENSE FORMS ====================
  expenseForm() {
    const categories = ['Thread & Materials', 'Electricity', 'Rent', 'Transport', 'Salary', 'Tools', 'Other'];
    this.openModal('📉 Add Expense', `
      <form id="expenseForm" onsubmit="event.preventDefault(); App.saveExpense()">
        <div class="form-grid">
          <div class="field"><label>Date *</label><input type="date" name="date" required value="${fmt.today()}" /></div>
          <div class="field full"><label>Description *</label><input name="description" required /></div>
          <div class="field">
            <label>Category</label>
            <select name="category">${categories.map(c => `<option>${c}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Amount *</label><input type="number" name="amount" min="1" required /></div>
          <div class="field full"><label>Notes</label><textarea name="notes"></textarea></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px;">
          <button type="submit" class="btn success full">Save</button>
          <button type="button" class="btn secondary full" onclick="App.closeModal()">Cancel</button>
        </div>
      </form>
    `);
  },

  saveExpense() {
    const fd = new FormData(document.getElementById('expenseForm'));
    const data = Object.fromEntries(fd.entries());
    data.amount = Number(data.amount) || 0;
    DB.addExpense(data);
    this.toast('Expense saved');
    this.closeModal();
    this.refresh();
  }
};

// ==================== BOOT ====================
document.addEventListener('DOMContentLoaded', () => App.init());