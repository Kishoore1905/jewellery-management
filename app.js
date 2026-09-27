const STORAGE_KEYS = {
  inventory: 'jewel-inventory',
  sales: 'jewel-sales',
  customers: 'jewel-customers',
  productImages: 'jewel-product-images',
  productLayout: 'jewel-product-layout'
};

// Shown on invoices. Fill in your shop's details here.
const SHOP_DETAILS = {
  name: 'Jewellery Shop',
  tagline: 'Gold · Diamond · Silver',
  address: '',
  phone: '',
  email: '',
  gstin: ''
};

const PRODUCT_ID_PREFIX = 'JW-';
const CUSTOMER_ID_PREFIX = 'CUS-';
const INVOICE_PREFIX = 'INV-';
const LOW_STOCK_LIMIT = 2;
const DEFAULT_TAX_RATE = 3;
const PRODUCT_IMAGE_MAX_SIZE = 480; // px, longest side after resizing
const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;

const defaultInventory = [
  { id: 'item-1', productId: 'JW-0001', name: 'Diamond Ring', category: 'Ring', material: 'Diamond', purity: '18K', weight: 2.4, price: 24500, stock: 4 },
  { id: 'item-2', productId: 'JW-0002', name: 'Gold Necklace', category: 'Necklace', material: 'Gold', purity: '22K', weight: 12.5, price: 56000, stock: 2 },
  { id: 'item-3', productId: 'JW-0003', name: 'Pearl Earrings', category: 'Earrings', material: 'Pearl', purity: '14K', weight: 1.2, price: 8900, stock: 7 },
  { id: 'item-4', productId: 'JW-0004', name: 'Silver Bangle', category: 'Bangle', material: 'Silver', purity: '925', weight: 6.8, price: 12800, stock: 1 }
];

const defaultCustomers = [
  { id: 'cust-1', customerId: 'CUS-0001', name: 'Aisha Patel', phone: '9876543210', email: 'aisha.patel@example.com', address: 'Anna Nagar, Chennai' },
  { id: 'cust-2', customerId: 'CUS-0002', name: 'Rahul Nair', phone: '9123456780', email: '', address: 'RS Puram, Coimbatore' },
  { id: 'cust-3', customerId: 'CUS-0003', name: 'Meera Iyer', phone: '9988776655', email: 'meera.iyer@example.com', address: 'KK Nagar, Madurai' }
];

const defaultSales = [
  {
    id: 'sale-1', invoiceNo: 'INV-0001', date: '2026-09-18', customerId: 'cust-1',
    customer: 'Aisha Patel', customerDetails: { customerId: 'CUS-0001', name: 'Aisha Patel', phone: '9876543210', email: 'aisha.patel@example.com', address: 'Anna Nagar, Chennai' },
    items: [{ itemId: 'item-1', productId: 'JW-0001', name: 'Diamond Ring', material: 'Diamond', purity: '18K', weight: 2.4, price: 24500, quantity: 1, lineTotal: 24500 }],
    subtotal: 24500, discountType: 'amount', discountValue: 0, discount: 0, taxRate: 0, tax: 0, amount: 24500
  },
  {
    id: 'sale-2', invoiceNo: 'INV-0002', date: '2026-09-22', customerId: 'cust-2',
    customer: 'Rahul Nair', customerDetails: { customerId: 'CUS-0002', name: 'Rahul Nair', phone: '9123456780', email: '', address: 'RS Puram, Coimbatore' },
    items: [{ itemId: 'item-3', productId: 'JW-0003', name: 'Pearl Earrings', material: 'Pearl', purity: '14K', weight: 1.2, price: 8900, quantity: 2, lineTotal: 17800 }],
    subtotal: 17800, discountType: 'amount', discountValue: 0, discount: 0, taxRate: 0, tax: 0, amount: 17800
  },
  {
    id: 'sale-3', invoiceNo: 'INV-0003', date: '2026-09-26', customerId: 'cust-3',
    customer: 'Meera Iyer', customerDetails: { customerId: 'CUS-0003', name: 'Meera Iyer', phone: '9988776655', email: 'meera.iyer@example.com', address: 'KK Nagar, Madurai' },
    items: [{ itemId: 'item-2', productId: 'JW-0002', name: 'Gold Necklace', material: 'Gold', purity: '22K', weight: 12.5, price: 56000, quantity: 1, lineTotal: 56000 }],
    subtotal: 56000, discountType: 'amount', discountValue: 0, discount: 0, taxRate: 0, tax: 0, amount: 56000
  }
];

// UI state
const productView = {
  search: '',
  category: '',
  sort: 'id',
  lowStockOnly: false,
  layout: 'table',
  editingId: null,
  viewingId: null,
  imageDraft: undefined, // undefined = unchanged, null = remove, string = new image
  imagePending: null
};
const customerView = { search: '', editingId: null };
const salesView = { search: '' };
const billState = { lines: [] }; // { itemId, price, quantity }

/* ---------- Storage & helpers ---------- */

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function codeNumber(prefix, code) {
  const match = new RegExp(`^${prefix}(\\d+)$`, 'i').exec(String(code || ''));
  return match ? Number(match[1]) : 0;
}

function nextCode(prefix, list, key) {
  const highest = list.reduce((max, entry) => Math.max(max, codeNumber(prefix, entry[key])), 0);
  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}

function nextProductId(inventory) {
  return nextCode(PRODUCT_ID_PREFIX, inventory, 'productId');
}

function localDateString(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDate(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-').map(Number);
  if (!year || !month || !day) return String(isoDate || '');
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatWeight(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return '—';
  return `${round2(value)} g`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function wordsBelowThousand(n) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const restWords = rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? ` ${ONES[rest % 10]}` : ''}`;
  return [hundreds ? `${ONES[hundreds]} Hundred` : '', restWords].filter(Boolean).join(' ');
}

// Indian numbering: crore, lakh, thousand
function indianNumberWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${indianNumberWords(crore)} Crore`);
  if (lakh) parts.push(`${wordsBelowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${wordsBelowThousand(thousand)} Thousand`);
  if (rest) parts.push(wordsBelowThousand(rest));
  return parts.join(' ');
}

function amountInWords(amount) {
  const totalPaise = Math.round(Number(amount) * 100);
  const rupees = Math.floor(totalPaise / 100);
  const paise = totalPaise % 100;
  const rupeeWords = `Rupees ${indianNumberWords(rupees)}`;
  return paise ? `${rupeeWords} and ${wordsBelowThousand(paise)} Paise Only` : `${rupeeWords} Only`;
}

function setCountLabel(elementId, count, singular, plural) {
  document.getElementById(elementId).textContent = `${count} ${count === 1 ? singular : plural}`;
}

function showMessage(elementId, message) {
  const messageEl = document.getElementById(elementId);
  messageEl.textContent = message;
  messageEl.hidden = !message;
}

/* ---------- Data access (with upgrades for older saved data) ---------- */

function inferMaterial(purity) {
  const text = String(purity || '');
  if (/925|silver/i.test(text)) return 'Silver';
  if (/950|plat|pt/i.test(text)) return 'Platinum';
  return 'Gold';
}

function getInventory() {
  const stored = readStorage(STORAGE_KEYS.inventory, defaultInventory);
  const inventory = stored.map((item) => ({ ...item }));
  let changed = false;

  inventory.forEach((item) => {
    if (!item.material) {
      item.material = inferMaterial(item.purity);
      changed = true;
    }
  });

  inventory.forEach((item) => {
    if (!item.productId) {
      item.productId = nextProductId(inventory);
      changed = true;
    }
  });

  if (changed && stored !== defaultInventory) {
    writeStorage(STORAGE_KEYS.inventory, inventory);
  }

  return inventory;
}

function getCustomers() {
  const stored = readStorage(STORAGE_KEYS.customers, defaultCustomers);
  const customers = stored.map((customer) => ({ ...customer }));
  let changed = false;

  customers.forEach((customer) => {
    if (customer.address === undefined) {
      customer.address = customer.city || '';
      changed = true;
    }
    if (customer.email === undefined) {
      customer.email = '';
      changed = true;
    }
  });

  customers.forEach((customer) => {
    if (!customer.customerId) {
      customer.customerId = nextCode(CUSTOMER_ID_PREFIX, customers, 'customerId');
      changed = true;
    }
  });

  if (changed && stored !== defaultCustomers) {
    writeStorage(STORAGE_KEYS.customers, customers);
  }

  return customers;
}

function summarizeItems(items) {
  if (!items.length) return '';
  const first = `${items[0].name} × ${items[0].quantity}`;
  return items.length > 1 ? `${first} +${items.length - 1} more` : first;
}

// Older sales were a single line: { customer, item, quantity, amount, date }
function getSales() {
  const stored = readStorage(STORAGE_KEYS.sales, defaultSales);
  const sales = stored.map((sale) => ({ ...sale }));
  let changed = false;

  sales.forEach((sale) => {
    if (!Array.isArray(sale.items)) {
      const quantity = Number(sale.quantity) || 1;
      const amount = Number(sale.amount) || 0;
      sale.items = [{
        itemId: '', productId: '', name: sale.item || 'Item', material: '', purity: '',
        weight: null, price: round2(amount / quantity), quantity, lineTotal: amount
      }];
      sale.subtotal = amount;
      sale.discountType = 'amount';
      sale.discountValue = 0;
      sale.discount = 0;
      sale.taxRate = 0;
      sale.tax = 0;
      changed = true;
    }
  });

  sales.forEach((sale) => {
    if (!sale.invoiceNo) {
      sale.invoiceNo = nextCode(INVOICE_PREFIX, sales, 'invoiceNo');
      changed = true;
    }
  });

  if (changed && stored !== defaultSales) {
    writeStorage(STORAGE_KEYS.sales, sales);
  }

  return sales.map((sale) => ({
    ...sale,
    quantity: sale.items.reduce((sum, line) => sum + line.quantity, 0),
    item: summarizeItems(sale.items)
  }));
}

// New sales link by customerId; older sales only stored the customer's name.
function salesForCustomer(customer, sales) {
  return sales.filter((sale) => (sale.customerId ? sale.customerId === customer.id : sale.customer === customer.name));
}

/* ---------- Stats ---------- */

function renderStockBadge(stock) {
  if (stock <= 0) return `<span class="badge badge-out">${stock}</span>`;
  if (stock <= LOW_STOCK_LIMIT) return `<span class="badge badge-low">${stock}</span>`;
  return `<span class="badge badge-ok">${stock}</span>`;
}

function renderStats() {
  const inventory = getInventory();
  const customers = getCustomers();
  const sales = getSales();

  const inventoryValue = inventory.reduce((sum, item) => sum + (item.price * item.stock), 0);
  const monthlySales = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const lowStockCount = inventory.filter((item) => item.stock <= LOW_STOCK_LIMIT).length;

  document.getElementById('inventoryValue').textContent = formatCurrency(inventoryValue);
  document.getElementById('monthlySales').textContent = formatCurrency(monthlySales);
  document.getElementById('customerCount').textContent = String(customers.length);
  document.getElementById('lowStockCount').textContent = String(lowStockCount);
}

/* ---------- Product images ---------- */

// Images live under their own key ({ [itemId]: dataUrl }) so product lists stay small.
let productImageCache = null;

function getProductImages() {
  if (!productImageCache) {
    const stored = readStorage(STORAGE_KEYS.productImages, {});
    productImageCache = stored && typeof stored === 'object' ? stored : {};
  }
  return productImageCache;
}

// Returns false when the browser storage is full.
function saveProductImage(itemId, dataUrl) {
  const images = { ...getProductImages() };
  if (dataUrl) {
    images[itemId] = dataUrl;
  } else {
    delete images[itemId];
  }

  try {
    writeStorage(STORAGE_KEYS.productImages, images);
    productImageCache = images;
    return true;
  } catch (error) {
    return false;
  }
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) {
      reject(new Error('Please choose an image file (JPG, PNG or WebP).'));
      return;
    }
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      reject(new Error('That image is larger than 10 MB. Please choose a smaller one.'));
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, PRODUCT_IMAGE_MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff'; // JPEG has no transparency
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read. Please try a different file.'));
    };
    image.src = url;
  });
}

const PLACEHOLDER_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6 3h12l4 6-10 12L2 9z" />
    <path d="M2 9h20M12 21 8 9l4-6 4 6-4 12" />
  </svg>`;

function renderProductImage(item, className) {
  const src = getProductImages()[item.id];
  if (src) {
    return `<span class="${className}"><img src="${escapeHtml(src)}" alt="${escapeHtml(item.name)}" loading="lazy" /></span>`;
  }
  return `<span class="${className} is-placeholder" aria-hidden="true">${PLACEHOLDER_ICON}</span>`;
}

function setImagePreview(dataUrl) {
  const preview = document.getElementById('productImagePreview');
  preview.innerHTML = dataUrl ? `<img src="${escapeHtml(dataUrl)}" alt="Selected product image" />` : PLACEHOLDER_ICON;
  preview.classList.toggle('is-placeholder', !dataUrl);
  document.getElementById('removeProductImage').hidden = !dataUrl;
  document.getElementById('productImageButtonLabel').textContent = dataUrl ? 'Change' : 'Choose image';
}

function handleProductImageChange(event) {
  const input = event.target;
  const file = input.files && input.files[0];
  if (!file) return;

  showProductMessage('');
  productView.imagePending = resizeImageFile(file)
    .then((dataUrl) => {
      productView.imageDraft = dataUrl;
      setImagePreview(dataUrl);
    })
    .catch((error) => {
      showProductMessage(error.message);
    })
    .finally(() => {
      productView.imagePending = null;
      input.value = '';
    });
}

function removeProductImageDraft() {
  productView.imageDraft = null; // null = remove on save
  setImagePreview('');
}

/* ---------- Products ---------- */

const PRODUCT_SORTERS = {
  id: (a, b) => a.productId.localeCompare(b.productId, undefined, { numeric: true }),
  newest: () => 0, // handled by reversing the stored order
  'name-asc': (a, b) => a.name.localeCompare(b.name),
  'name-desc': (a, b) => b.name.localeCompare(a.name),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  'stock-asc': (a, b) => a.stock - b.stock,
  'stock-desc': (a, b) => b.stock - a.stock,
  'weight-desc': (a, b) => b.weight - a.weight
};

function sortProducts(products) {
  if (productView.sort === 'newest') return products.slice().reverse();
  const sorter = PRODUCT_SORTERS[productView.sort] || PRODUCT_SORTERS.id;
  return products.slice().sort(sorter);
}

function productMatchesView(item) {
  if (productView.category && item.category !== productView.category) {
    return false;
  }

  if (productView.lowStockOnly && item.stock > LOW_STOCK_LIMIT) {
    return false;
  }

  const query = productView.search.trim().toLowerCase();
  if (!query) return true;

  return [item.productId, item.name, item.category, item.material, item.purity]
    .some((field) => String(field || '').toLowerCase().includes(query));
}

function stockStatusText(stock) {
  if (stock <= 0) return 'Out of stock';
  if (stock <= LOW_STOCK_LIMIT) return 'Low stock';
  return 'In stock';
}

function renderLowStockAlert(inventory) {
  const alert = document.getElementById('lowStockAlert');
  const lowItems = inventory.filter((item) => item.stock <= LOW_STOCK_LIMIT).sort((a, b) => a.stock - b.stock);

  if (!lowItems.length) {
    alert.hidden = true;
    return;
  }

  const outCount = lowItems.filter((item) => item.stock <= 0).length;
  const names = lowItems.slice(0, 3).map((item) => `${escapeHtml(item.name)} (${item.stock})`).join(', ');
  const more = lowItems.length > 3 ? ` and ${lowItems.length - 3} more` : '';
  const outText = outCount ? ` <strong>${outCount} out of stock.</strong>` : '';

  document.getElementById('lowStockAlertText').innerHTML =
    `<strong>${lowItems.length} ${lowItems.length === 1 ? 'product is' : 'products are'} low on stock:</strong> ${names}${more}.${outText}`;
  document.getElementById('showLowStock').textContent = productView.lowStockOnly ? 'Show all products' : 'Show them';
  alert.hidden = false;
}

function productActionButtons(item) {
  return `
    <div class="row-actions">
      <button type="button" class="small-btn" data-view-item="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.name)}">View</button>
      <button type="button" class="small-btn" data-edit-item="${escapeHtml(item.id)}" aria-label="Edit ${escapeHtml(item.name)}">Edit</button>
      <button type="button" class="small-btn small-btn-danger" data-delete-item="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name)}">Delete</button>
    </div>`;
}

function renderProductTable(visible) {
  document.getElementById('inventoryTableBody').innerHTML = visible
    .map(
      (item) => `
        <tr class="${item.id === productView.editingId ? 'is-editing' : ''}">
          <td data-label="Image" class="image-cell">
            <button type="button" class="thumb-btn" data-view-item="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.name)}">
              ${renderProductImage(item, 'product-thumb')}
            </button>
          </td>
          <td data-label="Product ID"><span class="code">${escapeHtml(item.productId)}</span></td>
          <td data-label="Product" class="cell-strong">${escapeHtml(item.name)}</td>
          <td data-label="Category"><span class="tag">${escapeHtml(item.category)}</span></td>
          <td data-label="Material">${escapeHtml(item.material)}</td>
          <td data-label="Purity">${escapeHtml(item.purity)}</td>
          <td data-label="Weight" class="num">${escapeHtml(item.weight)} g</td>
          <td data-label="Price" class="num cell-strong">${formatCurrency(item.price)}</td>
          <td data-label="Stock" class="num">${renderStockBadge(item.stock)}</td>
          <td class="actions">${productActionButtons(item)}</td>
        </tr>
      `
    )
    .join('');
}

function renderProductCards(visible) {
  document.getElementById('productCards').innerHTML = visible
    .map(
      (item) => `
        <article class="product-card${item.id === productView.editingId ? ' is-editing' : ''}">
          <button type="button" class="product-card-media" data-view-item="${escapeHtml(item.id)}" aria-label="View ${escapeHtml(item.name)}">
            ${renderProductImage(item, 'product-card-image')}
            ${item.stock <= LOW_STOCK_LIMIT ? `<span class="card-flag ${item.stock <= 0 ? 'is-out' : ''}">${stockStatusText(item.stock)}</span>` : ''}
          </button>
          <div class="product-card-body">
            <div class="product-card-top">
              <span class="code">${escapeHtml(item.productId)}</span>
              <span class="tag">${escapeHtml(item.category)}</span>
            </div>
            <h3 class="product-card-title">${escapeHtml(item.name)}</h3>
            <div class="cell-sub">${escapeHtml(item.material)} · ${escapeHtml(item.purity)} · ${escapeHtml(item.weight)} g</div>
            <div class="product-card-foot">
              <strong class="product-card-price">${formatCurrency(item.price)}</strong>
              <span class="product-card-stock">Stock ${renderStockBadge(item.stock)}</span>
            </div>
            ${productActionButtons(item)}
          </div>
        </article>
      `
    )
    .join('');
}

function renderInventory() {
  const inventory = getInventory();
  const visible = sortProducts(inventory.filter(productMatchesView));
  const isFiltered = Boolean(productView.search.trim() || productView.category || productView.lowStockOnly);
  const showCards = productView.layout === 'cards';
  const tableWrap = document.getElementById('productTableWrap');
  const cards = document.getElementById('productCards');
  const emptyState = document.getElementById('productEmptyState');

  setCountLabel('inventoryCountLabel', inventory.length, 'product', 'products');
  document.getElementById('productResultInfo').textContent = isFiltered ? `Showing ${visible.length} of ${inventory.length}` : '';
  document.getElementById('clearProductFilters').hidden = !isFiltered;
  document.getElementById('lowStockOnly').checked = productView.lowStockOnly;
  document.querySelectorAll('[data-layout]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.layout === productView.layout));
  });
  renderLowStockAlert(inventory);

  let emptyMessage = '';
  if (!inventory.length) emptyMessage = 'No products yet. Add your first product above.';
  else if (!visible.length) emptyMessage = 'No products match your search or filters.';

  emptyState.textContent = emptyMessage;
  emptyState.hidden = !emptyMessage;
  tableWrap.hidden = showCards || Boolean(emptyMessage);
  cards.hidden = !showCards || Boolean(emptyMessage);

  if (emptyMessage) {
    document.getElementById('inventoryTableBody').innerHTML = '';
    cards.innerHTML = '';
    return;
  }

  if (showCards) {
    renderProductCards(visible);
  } else {
    renderProductTable(visible);
  }
}

function showProductMessage(message) {
  showMessage('productFormMessage', message);
}

function resetProductForm() {
  const form = document.getElementById('inventory-form');
  form.reset();
  productView.editingId = null;
  productView.imageDraft = undefined;
  form.elements.productId.value = nextProductId(getInventory());
  setImagePreview('');

  document.getElementById('productFormTitle').textContent = 'Add new product';
  document.getElementById('productSubmitLabel').textContent = 'Add product';
  document.getElementById('cancelProductEdit').hidden = true;
  form.classList.remove('is-editing');
  showProductMessage('');
}

function startProductEdit(itemId) {
  const item = getInventory().find((product) => product.id === itemId);
  if (!item) return;

  const form = document.getElementById('inventory-form');
  productView.editingId = item.id;
  productView.imageDraft = undefined;

  form.elements.productId.value = item.productId;
  form.elements.name.value = item.name;
  form.elements.category.value = item.category;
  form.elements.material.value = item.material;
  form.elements.purity.value = item.purity;
  form.elements.weight.value = item.weight;
  form.elements.price.value = item.price;
  form.elements.stock.value = item.stock;
  setImagePreview(getProductImages()[item.id] || '');

  document.getElementById('productFormTitle').textContent = `Editing ${item.productId}`;
  document.getElementById('productSubmitLabel').textContent = 'Save changes';
  document.getElementById('cancelProductEdit').hidden = false;
  form.classList.add('is-editing');
  showProductMessage('');

  renderInventory();
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.elements.name.focus({ preventScroll: true });
}

function readProductForm(form) {
  const formData = new FormData(form);
  return {
    productId: String(formData.get('productId')).trim().toUpperCase(),
    name: String(formData.get('name')).trim(),
    category: String(formData.get('category')).trim(),
    material: String(formData.get('material')).trim(),
    purity: String(formData.get('purity')).trim(),
    weight: Number(formData.get('weight')),
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock'))
  };
}

function validateProduct(product, inventory, editingId) {
  if (!product.productId) return 'Product ID is required.';
  if (!/^[A-Z0-9-]+$/.test(product.productId)) return 'Product ID can only contain letters, numbers and dashes.';
  if (!product.name) return 'Product name is required.';
  if (!product.category) return 'Please choose a category.';
  if (!product.material) return 'Please choose a material.';
  if (!product.purity) return 'Purity is required.';
  if (!Number.isFinite(product.weight) || product.weight <= 0) return 'Weight must be greater than 0.';
  if (!Number.isFinite(product.price) || product.price < 0) return 'Price cannot be negative.';
  if (!Number.isInteger(product.stock) || product.stock < 0) return 'Stock must be a whole number (0 or more).';

  const duplicate = inventory.find(
    (item) => item.id !== editingId && item.productId.toUpperCase() === product.productId
  );
  if (duplicate) return `Product ID ${product.productId} is already used by "${duplicate.name}".`;

  return '';
}

async function saveProduct(event) {
  event.preventDefault();
  // Wait for an image that is still being resized
  if (productView.imagePending) await productView.imagePending;

  const form = document.getElementById('inventory-form');
  const product = readProductForm(form);
  const inventory = getInventory();
  const editingId = productView.editingId;

  const error = validateProduct(product, inventory, editingId);
  if (error) {
    showProductMessage(error);
    return;
  }

  let itemId = editingId;
  if (editingId) {
    const index = inventory.findIndex((item) => item.id === editingId);
    if (index === -1) {
      showProductMessage('This product no longer exists. It may have been deleted.');
      return;
    }
    inventory[index] = { ...inventory[index], ...product };
  } else {
    itemId = `item-${Date.now()}`;
    inventory.push({ id: itemId, ...product });
  }

  writeStorage(STORAGE_KEYS.inventory, inventory);

  let imageSaved = true;
  if (productView.imageDraft !== undefined) {
    imageSaved = saveProductImage(itemId, productView.imageDraft);
  }

  resetProductForm();
  renderAll();

  if (!imageSaved) {
    showProductMessage('Product saved, but the image could not be stored because browser storage is full. Try a smaller image or remove images from other products.');
  }
}

function deleteProduct(itemId) {
  const inventory = getInventory();
  const item = inventory.find((product) => product.id === itemId);
  if (!item) return;

  if (!confirm(`Delete ${item.productId} "${item.name}"? This cannot be undone.`)) {
    return;
  }

  writeStorage(STORAGE_KEYS.inventory, inventory.filter((product) => product.id !== itemId));
  if (getProductImages()[itemId]) saveProductImage(itemId, null);

  if (productView.editingId === itemId) {
    resetProductForm();
  }

  const productDialog = document.getElementById('productDialog');
  if (productDialog.open && productView.viewingId === itemId) productDialog.close();

  renderAll();
}

function handleProductListClick(event) {
  const viewButton = event.target.closest('[data-view-item]');
  if (viewButton) {
    openProductView(viewButton.getAttribute('data-view-item'));
    return;
  }

  const editButton = event.target.closest('[data-edit-item]');
  if (editButton) {
    startProductEdit(editButton.getAttribute('data-edit-item'));
    return;
  }

  const deleteButton = event.target.closest('[data-delete-item]');
  if (deleteButton) {
    deleteProduct(deleteButton.getAttribute('data-delete-item'));
  }
}

function populateCategoryFilter() {
  const categories = Array.from(document.querySelector('#inventory-form select[name="category"]').options)
    .map((option) => option.value)
    .filter(Boolean);

  document.getElementById('categoryFilter').innerHTML = '<option value="">All categories</option>' +
    categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
}

function clearProductFilters() {
  productView.search = '';
  productView.category = '';
  productView.lowStockOnly = false;
  document.getElementById('productSearch').value = '';
  document.getElementById('categoryFilter').value = '';
  renderInventory();
}

function setProductLayout(layout) {
  productView.layout = layout === 'cards' ? 'cards' : 'table';
  try {
    localStorage.setItem(STORAGE_KEYS.productLayout, productView.layout);
  } catch (error) {
    // Layout preference is optional
  }
  renderInventory();
}

function loadProductLayout() {
  try {
    productView.layout = localStorage.getItem(STORAGE_KEYS.productLayout) === 'cards' ? 'cards' : 'table';
  } catch (error) {
    productView.layout = 'table';
  }
}

/* ---------- Product view & stock ---------- */

function unitsSold(itemId) {
  return getSales().reduce(
    (sum, sale) => sum + sale.items.filter((line) => line.itemId === itemId).reduce((lineSum, line) => lineSum + line.quantity, 0),
    0
  );
}

function renderProductView(itemId, message = '') {
  const item = getInventory().find((product) => product.id === itemId);
  if (!item) return false;

  const inBill = billState.lines.find((line) => line.itemId === item.id);
  const statusClass = item.stock <= 0 ? 'badge-out' : item.stock <= LOW_STOCK_LIMIT ? 'badge-low' : 'badge-ok';

  document.getElementById('productDialogTitle').textContent = `${item.productId} · ${item.name}`;
  document.getElementById('productDialogContent').innerHTML = `
    <div class="product-view">
      ${renderProductImage(item, 'product-view-image')}
      <div class="product-view-info">
        <div class="product-view-heading">
          <h3>${escapeHtml(item.name)}</h3>
          <div class="product-view-price">${formatMoney(item.price)}</div>
        </div>
        <dl class="detail-grid">
          <div><dt>Product ID</dt><dd><span class="code">${escapeHtml(item.productId)}</span></dd></div>
          <div><dt>Category</dt><dd>${escapeHtml(item.category)}</dd></div>
          <div><dt>Material</dt><dd>${escapeHtml(item.material)}</dd></div>
          <div><dt>Purity</dt><dd>${escapeHtml(item.purity)}</dd></div>
          <div><dt>Weight</dt><dd>${escapeHtml(item.weight)} g</dd></div>
          <div><dt>Stock value</dt><dd>${formatCurrency(item.price * item.stock)}</dd></div>
          <div><dt>Units sold</dt><dd>${unitsSold(item.id)}</dd></div>
          <div><dt>Status</dt><dd><span class="badge ${statusClass}">${stockStatusText(item.stock)}</span></dd></div>
        </dl>

        <div class="stock-control">
          <div class="stock-control-head">
            <span class="label">Stock quantity</span>
            ${inBill ? `<span class="cell-sub">${inBill.quantity} on the current bill</span>` : ''}
          </div>
          <div class="stock-stepper">
            <button type="button" class="stepper-btn" data-stock-step="-1" aria-label="Decrease stock by 1"${item.stock <= 0 ? ' disabled' : ''}>−</button>
            <input type="number" id="productStockInput" value="${item.stock}" min="0" step="1" aria-label="Stock quantity" />
            <button type="button" class="stepper-btn" data-stock-step="1" aria-label="Increase stock by 1">+</button>
            <button type="button" class="btn btn-secondary" data-stock-set>Update stock</button>
          </div>
          ${item.stock <= LOW_STOCK_LIMIT ? `<p class="stock-warning">${item.stock <= 0 ? 'This product is out of stock and cannot be billed.' : `Only ${item.stock} left. Consider restocking soon.`}</p>` : ''}
          <p class="form-message" id="productStockMessage" role="alert"${message ? '' : ' hidden'}>${escapeHtml(message)}</p>
        </div>

        <div class="product-view-actions">
          <button type="button" class="btn btn-primary" data-edit-item="${escapeHtml(item.id)}">Edit product</button>
        </div>
      </div>
    </div>
  `;
  return true;
}

function openProductView(itemId) {
  productView.viewingId = itemId;
  if (!renderProductView(itemId)) return;
  const dialog = document.getElementById('productDialog');
  if (!dialog.open) dialog.showModal();
}

function updateProductStock(itemId, newStock) {
  const inventory = getInventory();
  const item = inventory.find((product) => product.id === itemId);
  if (!item) return 'This product no longer exists.';
  if (!Number.isInteger(newStock) || newStock < 0) return 'Stock must be a whole number (0 or more).';

  const inBill = billState.lines.find((line) => line.itemId === itemId);
  if (inBill && newStock < inBill.quantity) {
    return `${inBill.quantity} of this product are on the current bill. Remove them from the bill first, or keep stock at ${inBill.quantity} or more.`;
  }

  item.stock = newStock;
  writeStorage(STORAGE_KEYS.inventory, inventory);
  if (productView.editingId === itemId) {
    document.getElementById('inventory-form').elements.stock.value = newStock;
  }
  renderAll();
  return '';
}

function handleProductDialogClick(event) {
  const itemId = productView.viewingId;

  const stepButton = event.target.closest('[data-stock-step]');
  if (stepButton) {
    const current = getInventory().find((product) => product.id === itemId);
    if (!current) return;
    const error = updateProductStock(itemId, current.stock + Number(stepButton.dataset.stockStep));
    renderProductView(itemId, error);
    const sameButton = document.querySelector(`#productDialog [data-stock-step="${stepButton.dataset.stockStep}"]`);
    if (sameButton && !sameButton.disabled) sameButton.focus();
    return;
  }

  if (event.target.closest('[data-stock-set]')) {
    applyStockInput();
    return;
  }

  const editButton = event.target.closest('[data-edit-item]');
  if (editButton) {
    document.getElementById('productDialog').close();
    startProductEdit(editButton.getAttribute('data-edit-item'));
  }
}

function applyStockInput() {
  const input = document.getElementById('productStockInput');
  const value = input.value === '' ? NaN : Number(input.value);
  const error = updateProductStock(productView.viewingId, value);
  renderProductView(productView.viewingId, error);
}

/* ---------- Customers ---------- */

function customerMatchesView(customer) {
  const query = customerView.search.trim().toLowerCase();
  if (!query) return true;

  return [customer.customerId, customer.name, customer.phone, customer.email, customer.address]
    .some((field) => String(field || '').toLowerCase().includes(query));
}

function renderCustomers() {
  const customers = getCustomers();
  const sales = getSales();
  const visible = customers.filter(customerMatchesView);
  const tableBody = document.getElementById('customersTableBody');
  const isFiltered = Boolean(customerView.search.trim());

  setCountLabel('customersCountLabel', customers.length, 'customer', 'customers');
  document.getElementById('customerResultInfo').textContent = isFiltered ? `Showing ${visible.length} of ${customers.length}` : '';
  document.getElementById('clearCustomerSearch').hidden = !isFiltered;

  if (!customers.length) {
    tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No customers yet. Add your first customer above.</td></tr>';
    return;
  }

  if (!visible.length) {
    tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No customers match your search.</td></tr>';
    return;
  }

  tableBody.innerHTML = visible
    .map((customer) => {
      const purchases = salesForCustomer(customer, sales);
      const totalSpent = purchases.reduce((sum, sale) => sum + sale.amount, 0);
      return `
        <tr class="${customer.id === customerView.editingId ? 'is-editing' : ''}">
          <td data-label="Customer ID"><span class="code">${escapeHtml(customer.customerId)}</span></td>
          <td data-label="Name" class="cell-strong cell-nowrap">${escapeHtml(customer.name)}</td>
          <td data-label="Phone" class="cell-muted">${escapeHtml(customer.phone)}</td>
          <td data-label="Email" class="cell-muted">${customer.email ? escapeHtml(customer.email) : '—'}</td>
          <td data-label="Address" class="cell-wrap">${customer.address ? escapeHtml(customer.address) : '—'}</td>
          <td data-label="Purchases" class="num">${purchases.length}</td>
          <td data-label="Total spent" class="num cell-strong">${formatCurrency(totalSpent)}</td>
          <td class="actions">
            <div class="row-actions">
              <button type="button" class="small-btn" data-history-customer="${escapeHtml(customer.id)}" aria-label="Purchase history for ${escapeHtml(customer.name)}">History</button>
              <button type="button" class="small-btn" data-edit-customer="${escapeHtml(customer.id)}" aria-label="Edit ${escapeHtml(customer.name)}">Edit</button>
              <button type="button" class="small-btn small-btn-danger" data-delete-customer="${escapeHtml(customer.id)}" aria-label="Delete ${escapeHtml(customer.name)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

function resetCustomerForm() {
  const form = document.getElementById('customer-form');
  form.reset();
  customerView.editingId = null;
  form.elements.customerId.value = nextCode(CUSTOMER_ID_PREFIX, getCustomers(), 'customerId');

  document.getElementById('customerFormTitle').textContent = 'Add new customer';
  document.getElementById('customerSubmitLabel').textContent = 'Add customer';
  document.getElementById('cancelCustomerEdit').hidden = true;
  form.classList.remove('is-editing');
  showMessage('customerFormMessage', '');
}

function startCustomerEdit(customerRecordId) {
  const customer = getCustomers().find((entry) => entry.id === customerRecordId);
  if (!customer) return;

  const form = document.getElementById('customer-form');
  customerView.editingId = customer.id;

  form.elements.customerId.value = customer.customerId;
  form.elements.name.value = customer.name;
  form.elements.phone.value = customer.phone;
  form.elements.email.value = customer.email;
  form.elements.address.value = customer.address;

  document.getElementById('customerFormTitle').textContent = `Editing ${customer.customerId}`;
  document.getElementById('customerSubmitLabel').textContent = 'Save changes';
  document.getElementById('cancelCustomerEdit').hidden = false;
  form.classList.add('is-editing');
  showMessage('customerFormMessage', '');

  renderCustomers();
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.elements.name.focus({ preventScroll: true });
}

function readCustomerForm(form) {
  const formData = new FormData(form);
  return {
    customerId: String(formData.get('customerId')).trim().toUpperCase(),
    name: String(formData.get('name')).trim(),
    phone: String(formData.get('phone')).trim(),
    email: String(formData.get('email')).trim(),
    address: String(formData.get('address')).trim()
  };
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function validateCustomer(customer, customers, editingId) {
  if (!customer.customerId) return 'Customer ID is required.';
  if (!/^[A-Z0-9-]+$/.test(customer.customerId)) return 'Customer ID can only contain letters, numbers and dashes.';
  if (!customer.name) return 'Customer name is required.';
  if (!customer.phone) return 'Phone number is required.';
  if (!/^\+?[\d\s-]+$/.test(customer.phone) || digitsOnly(customer.phone).length < 10 || digitsOnly(customer.phone).length > 13) {
    return 'Enter a valid phone number (10 digits, optional country code).';
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return 'Enter a valid email address, or leave it blank.';
  if (!customer.address) return 'Address is required.';

  const others = customers.filter((entry) => entry.id !== editingId);
  const duplicateId = others.find((entry) => entry.customerId.toUpperCase() === customer.customerId);
  if (duplicateId) return `Customer ID ${customer.customerId} is already used by ${duplicateId.name}.`;

  const phoneDigits = digitsOnly(customer.phone).slice(-10);
  const duplicatePhone = others.find((entry) => digitsOnly(entry.phone).slice(-10) === phoneDigits);
  if (duplicatePhone) return `This phone number is already registered to ${duplicatePhone.name} (${duplicatePhone.customerId}).`;

  return '';
}

function saveCustomer(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const customer = readCustomerForm(form);
  const customers = getCustomers();
  const editingId = customerView.editingId;

  const error = validateCustomer(customer, customers, editingId);
  if (error) {
    showMessage('customerFormMessage', error);
    return;
  }

  if (editingId) {
    const index = customers.findIndex((entry) => entry.id === editingId);
    if (index === -1) {
      showMessage('customerFormMessage', 'This customer no longer exists. They may have been deleted.');
      return;
    }

    // Link older name-only sales to this customer before a rename, so history is kept.
    const previousName = customers[index].name;
    if (previousName !== customer.name) {
      getSales(); // make sure older sales are upgraded first
      const sales = readStorage(STORAGE_KEYS.sales, defaultSales).map((sale) => ({ ...sale }));
      let linked = false;
      sales.forEach((sale) => {
        if (!sale.customerId && sale.customer === previousName) {
          sale.customerId = editingId;
          linked = true;
        }
      });
      if (linked) writeStorage(STORAGE_KEYS.sales, sales);
    }

    customers[index] = { ...customers[index], ...customer };
  } else {
    customers.push({ id: `cust-${Date.now()}`, ...customer });
  }

  writeStorage(STORAGE_KEYS.customers, customers);
  resetCustomerForm();
  renderAll();
}

function deleteCustomer(customerRecordId) {
  const customers = getCustomers();
  const customer = customers.find((entry) => entry.id === customerRecordId);
  if (!customer) return;

  const purchaseCount = salesForCustomer(customer, getSales()).length;
  const historyNote = purchaseCount ? `\n\nTheir ${purchaseCount} past invoice(s) will stay in Sales History.` : '';
  if (!confirm(`Delete ${customer.customerId} ${customer.name}? This cannot be undone.${historyNote}`)) {
    return;
  }

  writeStorage(STORAGE_KEYS.customers, customers.filter((entry) => entry.id !== customerRecordId));

  if (customerView.editingId === customerRecordId) {
    resetCustomerForm();
  }

  renderAll();
}

function openCustomerHistory(customerRecordId) {
  const customer = getCustomers().find((entry) => entry.id === customerRecordId);
  if (!customer) return;

  const purchases = salesForCustomer(customer, getSales()).slice().reverse();
  const totalSpent = purchases.reduce((sum, sale) => sum + sale.amount, 0);
  const itemsBought = purchases.reduce((sum, sale) => sum + sale.quantity, 0);
  const lastPurchase = purchases.length ? formatDate(purchases[0].date) : '—';

  document.getElementById('customerDialogTitle').textContent = `${customer.name} · Purchase history`;
  document.getElementById('customerDialogContent').innerHTML = `
    <div class="customer-profile">
      <div><span class="label">Customer ID</span><span class="code">${escapeHtml(customer.customerId)}</span></div>
      <div><span class="label">Phone</span><span>${escapeHtml(customer.phone)}</span></div>
      <div><span class="label">Email</span><span>${customer.email ? escapeHtml(customer.email) : '—'}</span></div>
      <div><span class="label">Address</span><span>${customer.address ? escapeHtml(customer.address) : '—'}</span></div>
    </div>
    <div class="mini-stats">
      <div><span class="label">Invoices</span><strong>${purchases.length}</strong></div>
      <div><span class="label">Items bought</span><strong>${itemsBought}</strong></div>
      <div><span class="label">Total spent</span><strong>${formatCurrency(totalSpent)}</strong></div>
      <div><span class="label">Last purchase</span><strong>${escapeHtml(lastPurchase)}</strong></div>
    </div>
    ${purchases.length ? `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Invoice</th><th>Date</th><th>Items</th><th class="num">Grand total</th><th class="actions-col"><span class="visually-hidden">View</span></th></tr>
          </thead>
          <tbody>
            ${purchases.map((sale) => `
              <tr>
                <td data-label="Invoice"><span class="code">${escapeHtml(sale.invoiceNo)}</span></td>
                <td data-label="Date" class="cell-muted">${escapeHtml(formatDate(sale.date))}</td>
                <td data-label="Items">${escapeHtml(sale.item)}</td>
                <td data-label="Grand total" class="num cell-strong">${formatMoney(sale.amount)}</td>
                <td class="actions"><button type="button" class="small-btn" data-view-invoice="${escapeHtml(sale.id)}">View invoice</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<p class="empty-note">No purchases yet.</p>'}
  `;

  document.getElementById('customerDialog').showModal();
}

function handleCustomerTableClick(event) {
  const historyButton = event.target.closest('[data-history-customer]');
  if (historyButton) {
    openCustomerHistory(historyButton.getAttribute('data-history-customer'));
    return;
  }

  const editButton = event.target.closest('[data-edit-customer]');
  if (editButton) {
    startCustomerEdit(editButton.getAttribute('data-edit-customer'));
    return;
  }

  const deleteButton = event.target.closest('[data-delete-customer]');
  if (deleteButton) {
    deleteCustomer(deleteButton.getAttribute('data-delete-customer'));
  }
}

function clearCustomerSearch() {
  customerView.search = '';
  document.getElementById('customerSearch').value = '';
  renderCustomers();
}

/* ---------- Billing ---------- */

function populateBillingOptions() {
  const inventory = getInventory();
  const customers = getCustomers();
  const customerSelect = document.getElementById('billCustomer');
  const productSelect = document.getElementById('billProduct');
  const selectedCustomer = customerSelect.value;
  const selectedProduct = productSelect.value;

  customerSelect.innerHTML = '<option value="">Select customer</option>' +
    customers
      .map((customer) => `<option value="${escapeHtml(customer.id)}">${escapeHtml(customer.customerId)} · ${escapeHtml(customer.name)} (${escapeHtml(customer.phone)})</option>`)
      .join('');

  productSelect.innerHTML = '<option value="">Select product</option>' +
    inventory
      .map((item) => {
        const inBill = billState.lines.find((line) => line.itemId === item.id);
        const available = item.stock - (inBill ? inBill.quantity : 0);
        const label = `${item.productId} · ${item.name} (${item.material} ${item.purity}) — ${available > 0 ? `${available} available` : 'out of stock'}`;
        return `<option value="${escapeHtml(item.id)}"${available > 0 ? '' : ' disabled'}>${escapeHtml(label)}</option>`;
      })
      .join('');

  if (customers.some((customer) => customer.id === selectedCustomer)) customerSelect.value = selectedCustomer;
  if (inventory.some((item) => item.id === selectedProduct)) productSelect.value = selectedProduct;
  if (productSelect.selectedOptions[0]?.disabled) productSelect.value = '';
}

function handleBillProductChange() {
  const item = getInventory().find((product) => product.id === document.getElementById('billProduct').value);
  document.getElementById('billPrice').value = item ? item.price : '';
  document.getElementById('billWeight').value = item ? formatWeight(item.weight) : '';
  document.getElementById('billQty').value = 1;
  showMessage('billLineMessage', '');
}

function readBillAdjustments() {
  return {
    discountValue: Number(document.getElementById('billDiscount').value || 0),
    discountType: document.getElementById('billDiscountType').value,
    taxRate: Number(document.getElementById('billTaxRate').value || 0)
  };
}

function calculateBill(inventory = getInventory()) {
  const { discountValue, discountType, taxRate } = readBillAdjustments();

  const lines = billState.lines.map((line) => {
    const item = inventory.find((product) => product.id === line.itemId);
    return {
      ...line,
      item,
      lineTotal: round2(line.price * line.quantity),
      totalWeight: item ? round2(item.weight * line.quantity) : 0
    };
  });

  const subtotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
  const rawDiscount = discountType === 'percent' ? (subtotal * discountValue) / 100 : discountValue;
  const discount = round2(Math.min(Math.max(rawDiscount, 0) || 0, subtotal));
  const taxable = round2(subtotal - discount);
  const safeTaxRate = Number.isFinite(taxRate) && taxRate > 0 ? taxRate : 0;
  const tax = round2((taxable * safeTaxRate) / 100);

  return {
    lines,
    subtotal,
    discountValue,
    discountType,
    discount,
    taxable,
    taxRate: safeTaxRate,
    tax,
    total: round2(taxable + tax),
    totalWeight: round2(lines.reduce((sum, line) => sum + line.totalWeight, 0))
  };
}

function renderBill() {
  const bill = calculateBill();
  const tableBody = document.getElementById('billLinesBody');
  const pieceCount = bill.lines.reduce((sum, line) => sum + line.quantity, 0);

  document.getElementById('billLineCount').textContent = bill.lines.length ? `${pieceCount} ${pieceCount === 1 ? 'piece' : 'pieces'}` : '';

  if (!bill.lines.length) {
    tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No items on this bill yet. Choose a product above and click “Add to bill”.</td></tr>';
  } else {
    tableBody.innerHTML = bill.lines
      .map((line) => `
        <tr>
          <td data-label="Product">
            <div class="cell-strong">${escapeHtml(line.item ? line.item.name : 'Removed product')}</div>
            <div class="cell-sub">${line.item ? `${escapeHtml(line.item.productId)} · ${escapeHtml(line.item.material)} ${escapeHtml(line.item.purity)}` : 'No longer in inventory'}</div>
          </td>
          <td data-label="Weight" class="num">${formatWeight(line.totalWeight)}</td>
          <td data-label="Price" class="num">${formatMoney(line.price)}</td>
          <td data-label="Qty" class="num">${line.quantity}</td>
          <td data-label="Amount" class="num cell-strong">${formatMoney(line.lineTotal)}</td>
          <td class="actions"><button type="button" class="small-btn small-btn-danger" data-remove-line="${escapeHtml(line.itemId)}" aria-label="Remove ${escapeHtml(line.item ? line.item.name : 'item')}">Remove</button></td>
        </tr>
      `)
      .join('');
  }

  const discountLabel = bill.discountType === 'percent' && bill.discountValue > 0 ? ` (${round2(bill.discountValue)}%)` : '';
  document.getElementById('billTotalWeight').textContent = formatWeight(bill.totalWeight);
  document.getElementById('billSubtotal').textContent = formatMoney(bill.subtotal);
  document.getElementById('billDiscountAmount').textContent = `− ${formatMoney(bill.discount)}${discountLabel}`;
  document.getElementById('billTaxable').textContent = formatMoney(bill.taxable);
  document.getElementById('billTaxLabel').textContent = `GST @ ${round2(bill.taxRate)}%`;
  document.getElementById('billTax').textContent = formatMoney(bill.tax);
  document.getElementById('billGrandTotal').textContent = formatMoney(bill.total);
  document.getElementById('generateInvoice').disabled = !bill.lines.length;
}

function addBillLine(event) {
  event.preventDefault();
  const itemId = document.getElementById('billProduct').value;
  const price = Number(document.getElementById('billPrice').value);
  const quantity = Number(document.getElementById('billQty').value);
  const item = getInventory().find((product) => product.id === itemId);

  if (!item) {
    showMessage('billLineMessage', 'Please select a product.');
    return;
  }
  if (document.getElementById('billPrice').value === '' || !Number.isFinite(price) || price < 0) {
    showMessage('billLineMessage', 'Enter a valid product price.');
    return;
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    showMessage('billLineMessage', 'Quantity must be a whole number of at least 1.');
    return;
  }

  const existing = billState.lines.find((line) => line.itemId === itemId);
  const alreadyInBill = existing ? existing.quantity : 0;
  if (alreadyInBill + quantity > item.stock) {
    const available = item.stock - alreadyInBill;
    showMessage('billLineMessage', `Only ${available} more of ${item.name} available (stock ${item.stock}${alreadyInBill ? `, ${alreadyInBill} already on this bill` : ''}).`);
    return;
  }

  if (existing) {
    existing.quantity += quantity;
    existing.price = price;
  } else {
    billState.lines.push({ itemId, price, quantity });
  }

  showMessage('billLineMessage', '');
  showMessage('billMessage', '');
  document.getElementById('billProduct').value = '';
  handleBillProductChange();
  populateBillingOptions();
  renderBill();
}

function removeBillLine(itemId) {
  billState.lines = billState.lines.filter((line) => line.itemId !== itemId);
  populateBillingOptions();
  renderBill();
}

function clearBill() {
  billState.lines = [];
  document.getElementById('bill-line-form').reset();
  document.getElementById('billDiscount').value = 0;
  document.getElementById('billDiscountType').value = 'amount';
  document.getElementById('billTaxRate').value = DEFAULT_TAX_RATE;
  handleBillProductChange();
  showMessage('billLineMessage', '');
  showMessage('billMessage', '');
  populateBillingOptions();
  renderBill();
}

function validateBill(bill, customer) {
  if (!customer) return 'Please select a customer for this bill.';
  if (!bill.lines.length) return 'Add at least one product to the bill.';

  for (const line of bill.lines) {
    if (!line.item) return 'A product on this bill no longer exists. Remove it and try again.';
    if (line.quantity > line.item.stock) return `Only ${line.item.stock} of ${line.item.name} left in stock. Please reduce the quantity.`;
  }

  if (!Number.isFinite(bill.discountValue) || bill.discountValue < 0) return 'Discount cannot be negative.';
  if (bill.discountType === 'percent' && bill.discountValue > 100) return 'Discount cannot be more than 100%.';
  if (bill.discountType === 'amount' && bill.discountValue > bill.subtotal) return 'Discount cannot be more than the subtotal.';

  const { taxRate } = readBillAdjustments();
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return 'Tax rate must be between 0 and 100%.';

  return '';
}

function generateInvoice() {
  const inventory = getInventory();
  const customer = getCustomers().find((entry) => entry.id === document.getElementById('billCustomer').value);
  const bill = calculateBill(inventory);

  const error = validateBill(bill, customer);
  if (error) {
    showMessage('billMessage', error);
    return;
  }

  const sales = getSales();
  const sale = {
    id: `sale-${Date.now()}`,
    invoiceNo: nextCode(INVOICE_PREFIX, sales, 'invoiceNo'),
    date: localDateString(),
    createdAt: new Date().toISOString(),
    customerId: customer.id,
    customer: customer.name,
    customerDetails: {
      customerId: customer.customerId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address
    },
    items: bill.lines.map((line) => ({
      itemId: line.item.id,
      productId: line.item.productId,
      name: line.item.name,
      category: line.item.category,
      material: line.item.material,
      purity: line.item.purity,
      weight: line.item.weight,
      price: line.price,
      quantity: line.quantity,
      lineTotal: line.lineTotal
    })),
    subtotal: bill.subtotal,
    discountType: bill.discountType,
    discountValue: bill.discountValue,
    discount: bill.discount,
    taxRate: bill.taxRate,
    tax: bill.tax,
    amount: bill.total
  };

  bill.lines.forEach((line) => {
    const item = inventory.find((product) => product.id === line.itemId);
    item.stock -= line.quantity;
  });

  // Store only the saved fields; quantity/item summaries are derived on read.
  const storedSales = readStorage(STORAGE_KEYS.sales, defaultSales).map((entry) => ({ ...entry }));
  storedSales.push(sale);
  writeStorage(STORAGE_KEYS.inventory, inventory);
  writeStorage(STORAGE_KEYS.sales, storedSales);

  clearBill();
  document.getElementById('billCustomer').value = '';
  renderAll();
  openInvoice(sale.id);
}

function handleBillTableClick(event) {
  const removeButton = event.target.closest('[data-remove-line]');
  if (removeButton) {
    removeBillLine(removeButton.getAttribute('data-remove-line'));
  }
}

/* ---------- Invoice ---------- */

function renderInvoiceHtml(sale) {
  const details = sale.customerDetails || { name: sale.customer };
  const shopLines = [
    SHOP_DETAILS.address,
    [SHOP_DETAILS.phone && `Phone: ${SHOP_DETAILS.phone}`, SHOP_DETAILS.email].filter(Boolean).join(' · '),
    SHOP_DETAILS.gstin && `GSTIN: ${SHOP_DETAILS.gstin}`
  ].filter(Boolean);
  const totalWeight = sale.items.reduce((sum, line) => sum + (Number.isFinite(line.weight) ? line.weight * line.quantity : 0), 0);
  const discountLabel = sale.discountType === 'percent' && sale.discountValue > 0 ? ` (${round2(sale.discountValue)}%)` : '';

  return `
    <header class="invoice-header">
      <div>
        <div class="invoice-shop">${escapeHtml(SHOP_DETAILS.name)}</div>
        ${SHOP_DETAILS.tagline ? `<div class="invoice-tagline">${escapeHtml(SHOP_DETAILS.tagline)}</div>` : ''}
        ${shopLines.map((line) => `<div class="invoice-muted">${escapeHtml(line)}</div>`).join('')}
      </div>
      <div class="invoice-meta">
        <div class="invoice-title">Tax Invoice</div>
        <div><span>Invoice no.</span><strong>${escapeHtml(sale.invoiceNo)}</strong></div>
        <div><span>Date</span><strong>${escapeHtml(formatDate(sale.date))}</strong></div>
      </div>
    </header>

    <section class="invoice-billto">
      <div class="invoice-label">Bill to</div>
      <div class="invoice-customer">${escapeHtml(details.name || sale.customer)}</div>
      ${details.customerId ? `<div class="invoice-muted">Customer ID: ${escapeHtml(details.customerId)}</div>` : ''}
      ${details.phone ? `<div class="invoice-muted">Phone: ${escapeHtml(details.phone)}</div>` : ''}
      ${details.email ? `<div class="invoice-muted">Email: ${escapeHtml(details.email)}</div>` : ''}
      ${details.address ? `<div class="invoice-muted">${escapeHtml(details.address)}</div>` : ''}
    </section>

    <table class="invoice-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th class="num">Weight</th>
          <th class="num">Qty</th>
          <th class="num">Rate</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${sale.items.map((line, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>
              <div class="invoice-item">${escapeHtml(line.name)}</div>
              <div class="invoice-muted">${[line.productId, [line.material, line.purity].filter(Boolean).join(' ')].filter(Boolean).map(escapeHtml).join(' · ')}</div>
            </td>
            <td class="num">${Number.isFinite(line.weight) ? formatWeight(line.weight * line.quantity) : '—'}</td>
            <td class="num">${line.quantity}</td>
            <td class="num">${formatMoney(line.price)}</td>
            <td class="num">${formatMoney(line.lineTotal)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="invoice-bottom">
      <div class="invoice-words">
        <div class="invoice-label">Amount in words</div>
        <div>${escapeHtml(amountInWords(sale.amount))}</div>
        ${totalWeight ? `<div class="invoice-muted invoice-weight">Total weight: ${formatWeight(totalWeight)}</div>` : ''}
      </div>
      <dl class="invoice-totals">
        <div><dt>Subtotal</dt><dd>${formatMoney(sale.subtotal)}</dd></div>
        <div><dt>Discount${escapeHtml(discountLabel)}</dt><dd>− ${formatMoney(sale.discount)}</dd></div>
        <div><dt>Taxable value</dt><dd>${formatMoney(round2(sale.subtotal - sale.discount))}</dd></div>
        <div><dt>GST @ ${round2(sale.taxRate)}%</dt><dd>${formatMoney(sale.tax)}</dd></div>
        <div class="invoice-grand"><dt>Grand total</dt><dd>${formatMoney(sale.amount)}</dd></div>
      </dl>
    </div>

    <footer class="invoice-footer">
      <div>Thank you for shopping with us!</div>
      <div class="invoice-sign">Authorised signatory</div>
    </footer>
  `;
}

function openInvoice(saleId) {
  const sale = getSales().find((entry) => entry.id === saleId);
  if (!sale) return;

  document.getElementById('invoiceDialogTitle').textContent = `Invoice ${sale.invoiceNo}`;
  document.getElementById('invoiceContent').innerHTML = renderInvoiceHtml(sale);

  const customerDialog = document.getElementById('customerDialog');
  if (customerDialog.open) customerDialog.close();
  document.getElementById('invoiceDialog').showModal();
}

/* ---------- Sales history ---------- */

function saleMatchesView(sale) {
  const query = salesView.search.trim().toLowerCase();
  if (!query) return true;

  const fields = [sale.invoiceNo, sale.customer, sale.date, formatDate(sale.date)];
  sale.items.forEach((line) => fields.push(line.name, line.productId));
  return fields.some((field) => String(field || '').toLowerCase().includes(query));
}

function renderSales() {
  const sales = getSales();
  const visible = sales.filter(saleMatchesView);
  const tableBody = document.getElementById('salesTableBody');
  const isFiltered = Boolean(salesView.search.trim());

  setCountLabel('salesCountLabel', sales.length, 'invoice', 'invoices');
  document.getElementById('salesResultInfo').textContent = isFiltered ? `Showing ${visible.length} of ${sales.length}` : '';

  if (!sales.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No sales recorded yet.</td></tr>';
    return;
  }

  if (!visible.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No invoices match your search.</td></tr>';
    return;
  }

  tableBody.innerHTML = visible
    .slice()
    .reverse()
    .map(
      (sale) => `
        <tr>
          <td data-label="Invoice"><span class="code">${escapeHtml(sale.invoiceNo)}</span></td>
          <td data-label="Date" class="cell-muted">${escapeHtml(formatDate(sale.date))}</td>
          <td data-label="Customer" class="cell-strong">${escapeHtml(sale.customer)}</td>
          <td data-label="Items">${escapeHtml(sale.item)}</td>
          <td data-label="Qty" class="num">${sale.quantity}</td>
          <td data-label="Grand total" class="num cell-strong">${formatMoney(sale.amount)}</td>
          <td class="actions"><button type="button" class="small-btn" data-view-invoice="${escapeHtml(sale.id)}">View invoice</button></td>
        </tr>
      `
    )
    .join('');
}

function handleInvoiceLinkClick(event) {
  const viewButton = event.target.closest('[data-view-invoice]');
  if (viewButton) {
    openInvoice(viewButton.getAttribute('data-view-invoice'));
  }
}

/* ---------- App ---------- */

function renderAll() {
  renderStats();
  renderInventory();
  populateBillingOptions();
  renderBill();
  renderSales();
  renderCustomers();
}

function setupDialogs() {
  document.querySelectorAll('dialog.modal').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      // Clicking the backdrop (outside the dialog box) closes it
      if (event.target === dialog) dialog.close();
      if (event.target.closest('[data-close-dialog]')) dialog.close();
    });
  });

  document.getElementById('customerDialog').addEventListener('click', handleInvoiceLinkClick);
  document.getElementById('printInvoice').addEventListener('click', () => window.print());
}

function init() {
  document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Products
  document.getElementById('inventory-form').addEventListener('submit', saveProduct);
  document.getElementById('cancelProductEdit').addEventListener('click', () => {
    resetProductForm();
    renderInventory();
  });
  document.getElementById('inventoryTableBody').addEventListener('click', handleProductListClick);
  document.getElementById('productCards').addEventListener('click', handleProductListClick);
  document.getElementById('productImageInput').addEventListener('change', handleProductImageChange);
  document.getElementById('removeProductImage').addEventListener('click', removeProductImageDraft);
  document.getElementById('productSort').addEventListener('change', (event) => {
    productView.sort = event.target.value;
    renderInventory();
  });
  document.getElementById('lowStockOnly').addEventListener('change', (event) => {
    productView.lowStockOnly = event.target.checked;
    renderInventory();
  });
  document.getElementById('showLowStock').addEventListener('click', () => {
    productView.lowStockOnly = !productView.lowStockOnly;
    renderInventory();
    if (productView.lowStockOnly) document.getElementById('lowStockAlert').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  document.querySelectorAll('[data-layout]').forEach((button) => {
    button.addEventListener('click', () => setProductLayout(button.dataset.layout));
  });
  document.getElementById('productDialog').addEventListener('click', handleProductDialogClick);
  document.getElementById('productDialog').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.id === 'productStockInput') {
      event.preventDefault();
      applyStockInput();
    }
  });
  document.getElementById('productSearch').addEventListener('input', (event) => {
    productView.search = event.target.value;
    renderInventory();
  });
  document.getElementById('categoryFilter').addEventListener('change', (event) => {
    productView.category = event.target.value;
    renderInventory();
  });
  document.getElementById('clearProductFilters').addEventListener('click', clearProductFilters);

  // Billing
  document.getElementById('bill-line-form').addEventListener('submit', addBillLine);
  document.getElementById('billProduct').addEventListener('change', handleBillProductChange);
  document.getElementById('billLinesBody').addEventListener('click', handleBillTableClick);
  ['billDiscount', 'billDiscountType', 'billTaxRate'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      showMessage('billMessage', '');
      renderBill();
    });
  });
  document.getElementById('billCustomer').addEventListener('change', () => showMessage('billMessage', ''));
  document.getElementById('generateInvoice').addEventListener('click', generateInvoice);
  document.getElementById('clearBill').addEventListener('click', clearBill);

  // Sales history
  document.getElementById('salesTableBody').addEventListener('click', handleInvoiceLinkClick);
  document.getElementById('salesSearch').addEventListener('input', (event) => {
    salesView.search = event.target.value;
    renderSales();
  });

  // Customers
  document.getElementById('customer-form').addEventListener('submit', saveCustomer);
  document.getElementById('cancelCustomerEdit').addEventListener('click', () => {
    resetCustomerForm();
    renderCustomers();
  });
  document.getElementById('customersTableBody').addEventListener('click', handleCustomerTableClick);
  document.getElementById('customerSearch').addEventListener('input', (event) => {
    customerView.search = event.target.value;
    renderCustomers();
  });
  document.getElementById('clearCustomerSearch').addEventListener('click', clearCustomerSearch);

  setupDialogs();
  loadProductLayout();
  populateCategoryFilter();
  resetProductForm();
  resetCustomerForm();
  document.getElementById('billTaxRate').value = DEFAULT_TAX_RATE;
  renderAll();
}

window.addEventListener('DOMContentLoaded', init);
