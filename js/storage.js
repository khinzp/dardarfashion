/* ============================================
   storage.js — Data layer (localStorage)
   ============================================ */

const DB = {
  KEY: 'sewingShopDB_v1',

  data: {
    customers: [],
    measurements: [],   // { id, customerId, shoulder, chest, waist, hip, sleeve, shirtLength, pantsLength, other, notes, date }
    orders: [],         // { id, orderNo, customerId, orderDate, dueDate, clothingType, quantity, price, discount, total, paid, status, notes }
    payments: [],       // { id, date, orderId, amount, method, notes }
    expenses: [],       // { id, date, description, category, amount, notes }
    counters: { order: 0 }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // merge to ensure all keys exist
        this.data = { ...this.data, ...parsed };
        this.data.counters = { order: 0, ...(parsed.counters || {}) };
      }
    } catch (e) {
      console.error('Load error:', e);
    }
  },

  save() {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Save error:', e);
    }
  },

  // ID generator
  uid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  },

  nextOrderNo() {
    this.data.counters.order = (this.data.counters.order || 0) + 1;
    this.save();
    return 'ORD-' + String(this.data.counters.order).padStart(4, '0');
  },

  // ---------- Customers ----------
  addCustomer(c) {
    const item = { id: this.uid('cus'), createdAt: new Date().toISOString(), ...c };
    this.data.customers.push(item);
    this.save();
    return item;
  },
  updateCustomer(id, patch) {
    const idx = this.data.customers.findIndex(x => x.id === id);
    if (idx > -1) {
      this.data.customers[idx] = { ...this.data.customers[idx], ...patch };
      this.save();
    }
  },
  deleteCustomer(id) {
    this.data.customers = this.data.customers.filter(x => x.id !== id);
    this.data.measurements = this.data.measurements.filter(m => m.customerId !== id);
    this.save();
  },
  getCustomer(id) {
    return this.data.customers.find(x => x.id === id);
  },

  // ---------- Measurements ----------
  addMeasurement(m) {
    const item = { id: this.uid('m'), date: new Date().toISOString(), ...m };
    this.data.measurements.push(item);
    this.save();
    return item;
  },
  getMeasurements(customerId) {
    return this.data.measurements
      .filter(m => m.customerId === customerId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  deleteMeasurement(id) {
    this.data.measurements = this.data.measurements.filter(x => x.id !== id);
    this.save();
  },

  // ---------- Orders ----------
  addOrder(o) {
    const total = (Number(o.price) || 0) * (Number(o.quantity) || 0) - (Number(o.discount) || 0);
    const item = {
      id: this.uid('ord'),
      orderNo: this.nextOrderNo(),
      status: 'new',
      paid: 0,
      createdAt: new Date().toISOString(),
      ...o,
      total,
      paid: Number(o.paid) || 0
    };
    this.data.orders.push(item);
    this.save();
    return item;
  },
  updateOrder(id, patch) {
    const idx = this.data.orders.findIndex(x => x.id === id);
    if (idx > -1) {
      const o = { ...this.data.orders[idx], ...patch };
      o.total = (Number(o.price) || 0) * (Number(o.quantity) || 0) - (Number(o.discount) || 0);
      this.data.orders[idx] = o;
      this.save();
      return o;
    }
  },
  deleteOrder(id) {
    this.data.orders = this.data.orders.filter(x => x.id !== id);
    this.data.payments = this.data.payments.filter(p => p.orderId !== id);
    this.save();
  },
  getOrder(id) {
    return this.data.orders.find(x => x.id === id);
  },

  // ---------- Payments ----------
  addPayment(p) {
    const item = { id: this.uid('pay'), ...p, amount: Number(p.amount) || 0 };
    this.data.payments.push(item);
    // Update order paid amount
    const order = this.data.orders.find(o => o.id === p.orderId);
    if (order) {
      order.paid = (Number(order.paid) || 0) + item.amount;
      this.save();
    }
    this.save();
    return item;
  },
  deletePayment(id) {
    const p = this.data.payments.find(x => x.id === id);
    if (!p) return;
    const order = this.data.orders.find(o => o.id === p.orderId);
    if (order) {
      order.paid = Math.max(0, (Number(order.paid) || 0) - p.amount);
    }
    this.data.payments = this.data.payments.filter(x => x.id !== id);
    this.save();
  },

  // ---------- Expenses ----------
  addExpense(e) {
    const item = { id: this.uid('exp'), ...e, amount: Number(e.amount) || 0 };
    this.data.expenses.push(item);
    this.save();
    return item;
  },
  deleteExpense(id) {
    this.data.expenses = this.data.expenses.filter(x => x.id !== id);
    this.save();
  }
};

// ---------- Helpers ----------
const fmt = {
  money(n) {
    return (Number(n) || 0).toLocaleString('en-US') + ' Ks';
  },
  date(d) {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt)) return '-';
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  today() {
    const t = new Date();
    return t.toISOString().slice(0, 10);
  },
  isToday(dateStr) {
    if (!dateStr) return false;
    return dateStr.slice(0, 10) === fmt.today();
  },
  isSameMonth(dateStr, ref = new Date()) {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
  }
};

DB.load();