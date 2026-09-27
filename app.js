const STORAGE_KEYS = {
  inventory: 'jewel-inventory',
  sales: 'jewel-sales',
  customers: 'jewel-customers'
};

const defaultInventory = [
  { id: 'item-1', name: 'Diamond Ring', category: 'Ring', purity: '18K', weight: 2.4, price: 24500, stock: 4 },
  { id: 'item-2', name: 'Gold Necklace', category: 'Necklace', purity: '22K', weight: 12.5, price: 56000, stock: 2 },
  { id: 'item-3', name: 'Pearl Earrings', category: 'Earrings', purity: '14K', weight: 1.2, price: 8900, stock: 7 },
  { id: 'item-4', name: 'Silver Bangle', category: 'Bangle', purity: '925', weight: 6.8, price: 12800, stock: 1 }
];

const defaultCustomers = [
  { id: 'cust-1', name: 'Aisha Patel', phone: '9876543210', city: 'Chennai' },
  { id: 'cust-2', name: 'Rahul Nair', phone: '9123456780', city: 'Coimbatore' },
  { id: 'cust-3', name: 'Meera Iyer', phone: '9988776655', city: 'Madurai' }
];

const defaultSales = [
  { id: 'sale-1', customer: 'Aisha Patel', item: 'Diamond Ring', quantity: 1, amount: 24500, date: '2026-09-18' },
  { id: 'sale-2', customer: 'Rahul Nair', item: 'Pearl Earrings', quantity: 2, amount: 17800, date: '2026-09-22' },
  { id: 'sale-3', customer: 'Meera Iyer', item: 'Gold Necklace', quantity: 1, amount: 56000, date: '2026-09-26' }
];

function readStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getInventory() {
  return readStorage(STORAGE_KEYS.inventory, defaultInventory);
}

function getSales() {
  return readStorage(STORAGE_KEYS.sales, defaultSales);
}

function getCustomers() {
  return readStorage(STORAGE_KEYS.customers, defaultCustomers);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function renderStockBadge(stock) {
  if (stock <= 0) return `<span class="badge badge-out">${stock}</span>`;
  if (stock <= 2) return `<span class="badge badge-low">${stock}</span>`;
  return `<span class="badge badge-ok">${stock}</span>`;
}

function setCountLabel(elementId, count, singular, plural) {
  document.getElementById(elementId).textContent = `${count} ${count === 1 ? singular : plural}`;
}

function renderStats() {
  const inventory = getInventory();
  const customers = getCustomers();
  const sales = getSales();

  const inventoryValue = inventory.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const monthlySales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const lowStockCount = inventory.filter((item) => item.stock <= 2).length;

  document.getElementById('inventoryValue').textContent = formatCurrency(inventoryValue);
  document.getElementById('monthlySales').textContent = formatCurrency(monthlySales);
  document.getElementById('customerCount').textContent = String(customers.length);
  document.getElementById('lowStockCount').textContent = String(lowStockCount);
}

function renderInventory() {
  const inventory = getInventory();
  const tableBody = document.getElementById('inventoryTableBody');
  setCountLabel('inventoryCountLabel', inventory.length, 'item', 'items');

  if (!inventory.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No items yet.</td></tr>';
    return;
  }

  tableBody.innerHTML = inventory
    .map(
      (item) => `
        <tr>
          <td data-label="Item" class="cell-strong">${item.name}</td>
          <td data-label="Category"><span class="tag">${item.category}</span></td>
          <td data-label="Purity">${item.purity}</td>
          <td data-label="Weight" class="num">${item.weight} g</td>
          <td data-label="Price" class="num cell-strong">${formatCurrency(item.price)}</td>
          <td data-label="Stock" class="num">${renderStockBadge(item.stock)}</td>
          <td class="actions"><button type="button" class="small-btn" data-delete-item="${item.id}">Delete</button></td>
        </tr>
      `
    )
    .join('');

  document.querySelectorAll('[data-delete-item]').forEach((button) => {
    button.addEventListener('click', () => {
      const itemId = button.getAttribute('data-delete-item');
      const inventoryAfterRemoval = getInventory().filter((item) => item.id !== itemId);
      writeStorage(STORAGE_KEYS.inventory, inventoryAfterRemoval);
      renderAll();
    });
  });
}

function renderSales() {
  const sales = getSales();
  const tableBody = document.getElementById('salesTableBody');
  setCountLabel('salesCountLabel', sales.length, 'sale', 'sales');

  if (!sales.length) {
    tableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No sales recorded.</td></tr>';
    return;
  }

  tableBody.innerHTML = sales
    .slice()
    .reverse()
    .map(
      (sale) => `
        <tr>
          <td data-label="Customer" class="cell-strong">${sale.customer}</td>
          <td data-label="Item">${sale.item}</td>
          <td data-label="Qty" class="num">${sale.quantity}</td>
          <td data-label="Amount" class="num cell-strong">${formatCurrency(sale.amount)}</td>
          <td data-label="Date" class="cell-muted">${sale.date}</td>
        </tr>
      `
    )
    .join('');
}

function renderCustomers() {
  const customers = getCustomers();
  const tableBody = document.getElementById('customersTableBody');
  setCountLabel('customersCountLabel', customers.length, 'customer', 'customers');

  if (!customers.length) {
    tableBody.innerHTML = '<tr><td colspan="3" class="empty-state">No customers yet.</td></tr>';
    return;
  }

  tableBody.innerHTML = customers
    .map(
      (customer) => `
        <tr>
          <td data-label="Name" class="cell-strong">${customer.name}</td>
          <td data-label="Phone" class="cell-muted">${customer.phone}</td>
          <td data-label="City">${customer.city}</td>
        </tr>
      `
    )
    .join('');
}

function populateSelectionOptions() {
  const inventory = getInventory();
  const customers = getCustomers();

  const itemSelect = document.getElementById('saleItem');
  const customerSelect = document.getElementById('saleCustomer');

  itemSelect.innerHTML = '<option value="">Item</option>' +
    inventory
      .map((item) => `<option value="${item.id}">${item.name} - ${item.stock} in stock</option>`)
      .join('');

  customerSelect.innerHTML = '<option value="">Customer</option>' +
    customers
      .map((customer) => `<option value="${customer.id}">${customer.name}</option>`)
      .join('');
}

function renderAll() {
  renderStats();
  renderInventory();
  renderSales();
  renderCustomers();
  populateSelectionOptions();
}

function addInventoryItem(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  const item = {
    id: `item-${Date.now()}`,
    name: String(formData.get('name')).trim(),
    category: String(formData.get('category')).trim(),
    purity: String(formData.get('purity')).trim(),
    weight: Number(formData.get('weight')),
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock'))
  };

  const inventory = getInventory();
  inventory.push(item);
  writeStorage(STORAGE_KEYS.inventory, inventory);
  form.reset();
  renderAll();
}

function addCustomer(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  const customer = {
    id: `cust-${Date.now()}`,
    name: String(formData.get('name')).trim(),
    phone: String(formData.get('phone')).trim(),
    city: String(formData.get('city')).trim()
  };

  const customers = getCustomers();
  customers.push(customer);
  writeStorage(STORAGE_KEYS.customers, customers);
  form.reset();
  renderAll();
}

function addSale(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const itemId = String(formData.get('item'));
  const customerId = String(formData.get('customer'));
  const quantity = Number(formData.get('quantity'));
  const amount = Number(formData.get('amount'));

  const inventory = getInventory();
  const selectedItem = inventory.find((item) => item.id === itemId);
  const customers = getCustomers();
  const selectedCustomer = customers.find((customer) => customer.id === customerId);

  if (!selectedItem || !selectedCustomer) {
    return;
  }

  if (quantity <= 0 || quantity > selectedItem.stock) {
    alert('Requested quantity exceeds available stock.');
    return;
  }

  selectedItem.stock -= quantity;

  const sale = {
    id: `sale-${Date.now()}`,
    customer: selectedCustomer.name,
    item: selectedItem.name,
    quantity,
    amount,
    date: new Date().toISOString().slice(0, 10)
  };

  const sales = getSales();
  sales.push(sale);
  writeStorage(STORAGE_KEYS.inventory, inventory);
  writeStorage(STORAGE_KEYS.sales, sales);
  form.reset();
  renderAll();
}

function init() {
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  document.getElementById('inventory-form').addEventListener('submit', addInventoryItem);
  document.getElementById('customer-form').addEventListener('submit', addCustomer);
  document.getElementById('sale-form').addEventListener('submit', addSale);

  renderAll();
}

window.addEventListener('DOMContentLoaded', init);
