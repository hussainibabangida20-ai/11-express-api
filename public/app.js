import { request } from './api.js';

const productsBody = document.querySelector('#products-body');
const productCount = document.querySelector('#product-count');
const searchInput = document.querySelector('#search-input');
const categoryFilter = document.querySelector('#category-filter');
const sortFilter = document.querySelector('#sort-filter');
const productDialog = document.querySelector('#product-dialog');
const productForm = document.querySelector('#product-form');
const submitButton = document.querySelector('#submit-product');
const formError = document.querySelector('#form-error');
const toastRegion = document.querySelector('#toast-region');

const state = {
  products: [],
  search: '',
  category: '',
  sort: '',
  busyIds: new Set(),
  loadController: null,
  loadSequence: 0,
  searchTimer: null,
  toastTimer: null,
};

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' toast-error' : ''}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  toastRegion.replaceChildren(toast);

  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.remove(), 3600);
}

function setLoading() {
  productsBody.replaceChildren();
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.className = 'table-message';
  cell.colSpan = 5;
  cell.textContent = 'Loading products...';
  row.append(cell);
  productsBody.append(row);
  productCount.textContent = 'Loading catalog';
}

function makeMessageRow(message, isError = false) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.className = `table-message${isError ? ' error-message' : ''}`;
  cell.colSpan = 5;
  cell.textContent = message;
  row.append(cell);
  return row;
}

function renderProducts() {
  productsBody.replaceChildren();
  productCount.textContent = `${state.products.length} ${state.products.length === 1 ? 'product' : 'products'}`;

  if (state.products.length === 0) {
    productsBody.append(makeMessageRow('No products match your filters. Try another search or add a product.'));
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const product of state.products) {
    fragment.append(createProductRow(product));
  }
  productsBody.append(fragment);
}

function createProductRow(product) {
  const row = document.createElement('tr');
  const nameCell = document.createElement('td');
  const productCell = document.createElement('div');
  productCell.className = 'product-cell';

  const avatar = document.createElement('span');
  avatar.className = 'product-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = product.name.trim().charAt(0).toUpperCase();

  const info = document.createElement('div');
  info.className = 'product-info';
  const name = document.createElement('div');
  name.className = 'product-name';
  name.textContent = product.name;
  const sku = document.createElement('div');
  sku.className = 'product-sku';
  sku.textContent = product.sku;
  info.append(name, sku);
  productCell.append(avatar, info);
  nameCell.append(productCell);

  const categoryCell = document.createElement('td');
  const category = document.createElement('span');
  category.className = 'category-pill';
  category.textContent = product.category;
  categoryCell.append(category);

  const priceCell = document.createElement('td');
  priceCell.className = 'price-cell';
  priceCell.textContent = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(product.price);

  const stockCell = document.createElement('td');
  const stockControl = document.createElement('div');
  stockControl.className = 'stock-control';
  const decrement = document.createElement('button');
  decrement.className = 'stock-button';
  decrement.type = 'button';
  decrement.textContent = '−';
  decrement.setAttribute('aria-label', `Decrease stock for ${product.name}`);
  decrement.disabled = product.stock === 0 || state.busyIds.has(product.id);
  decrement.addEventListener('click', () => changeStock(product, -1));

  const stock = document.createElement('span');
  stock.className = `stock-value${product.stock <= 5 ? ' low-stock' : ''}`;
  stock.textContent = String(product.stock);
  stock.setAttribute('aria-label', `${product.stock} in stock`);

  const increment = document.createElement('button');
  increment.className = 'stock-button';
  increment.type = 'button';
  increment.textContent = '+';
  increment.setAttribute('aria-label', `Increase stock for ${product.name}`);
  increment.disabled = state.busyIds.has(product.id);
  increment.addEventListener('click', () => changeStock(product, 1));

  stockControl.append(decrement, stock, increment);
  stockCell.append(stockControl);

  const actionCell = document.createElement('td');
  actionCell.className = 'action-cell';
  const deleteButton = document.createElement('button');
  deleteButton.className = 'icon-button';
  deleteButton.type = 'button';
  deleteButton.setAttribute('aria-label', `Delete ${product.name}`);
  deleteButton.title = 'Delete product';
  deleteButton.disabled = state.busyIds.has(product.id);
  deleteButton.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 6h11M8 6V4.5h4V6m2.5 0-.7 9.2a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5.5 6m2.7 2.5v5m3.6-5v5"></path></svg>';
  deleteButton.addEventListener('click', () => deleteProduct(product));
  actionCell.append(deleteButton);

  row.append(nameCell, categoryCell, priceCell, stockCell, actionCell);
  return row;
}

async function loadProducts() {
  if (state.loadController) {
    state.loadController.abort();
  }

  const controller = new AbortController();
  state.loadController = controller;
  const sequence = ++state.loadSequence;
  const params = new URLSearchParams();
  if (state.search.trim()) params.set('q', state.search.trim());
  if (state.category) params.set('category', state.category);
  if (state.sort) params.set('sort', state.sort);

  setLoading();
  try {
    const query = params.size ? `?${params}` : '';
    state.products = await request(`/products${query}`, { signal: controller.signal });
    if (sequence === state.loadSequence) {
      renderProducts();
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    if (sequence === state.loadSequence) {
      productsBody.replaceChildren(makeMessageRow('Could not load products. Please try again.', true));
      productCount.textContent = 'Catalog unavailable';
      showToast(error.message, 'error');
    }
  } finally {
    if (state.loadController === controller) {
      state.loadController = null;
    }
  }
}

function clearFieldErrors() {
  for (const errorElement of productForm.querySelectorAll('[data-error-for]')) {
    errorElement.textContent = '';
  }
  for (const input of productForm.querySelectorAll('[name]')) {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
  formError.textContent = '';
}

function showFieldErrors(fields = {}) {
  let hasUnmappedErrors = false;
  for (const [field, message] of Object.entries(fields)) {
    const errorElement = productForm.querySelector(`[data-error-for="${CSS.escape(field)}"]`);
    const input = productForm.elements.namedItem(field);
    if (errorElement && input instanceof HTMLElement) {
      errorElement.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', errorElement.id || `error-${field}`);
    } else {
      hasUnmappedErrors = true;
    }
  }
  if (hasUnmappedErrors) {
    formError.textContent = 'Please check the product details and try again.';
  }
}

function openDialog() {
  productForm.reset();
  clearFieldErrors();
  productDialog.showModal();
  productForm.elements.namedItem('name').focus();
}

async function submitProduct(event) {
  event.preventDefault();
  clearFieldErrors();
  submitButton.disabled = true;
  submitButton.textContent = 'Creating...';

  const formData = new FormData(productForm);
  const product = {
    name: String(formData.get('name') ?? ''),
    sku: String(formData.get('sku') ?? '').trim(),
    category: String(formData.get('category') ?? ''),
    price: Number(formData.get('price')),
    stock: Number(formData.get('stock')),
  };

  try {
    await request('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    productDialog.close();
    showToast('Product added to your catalog.');
    await loadProducts();
  } catch (error) {
    showFieldErrors(error.fields);
    showToast(error.message || 'Could not create product.', 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<span class="button-plus" aria-hidden="true">+</span> Create product';
  }
}

async function changeStock(product, delta) {
  const stock = product.stock + delta;
  if (stock < 0 || state.busyIds.has(product.id)) return;

  state.busyIds.add(product.id);
  renderProducts();
  try {
    await request(`/products/${encodeURIComponent(product.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ stock }),
    });
    showToast(`${product.name} stock updated.`);
    await loadProducts();
  } catch (error) {
    showToast(error.message || 'Could not update stock.', 'error');
  } finally {
    state.busyIds.delete(product.id);
    renderProducts();
  }
}

async function deleteProduct(product) {
  const confirmed = window.confirm(`Delete “${product.name}” from the catalog? This cannot be undone.`);
  if (!confirmed || state.busyIds.has(product.id)) return;

  state.busyIds.add(product.id);
  renderProducts();
  try {
    await request(`/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
    showToast(`${product.name} deleted.`);
    await loadProducts();
  } catch (error) {
    showToast(error.message || 'Could not delete product.', 'error');
  } finally {
    state.busyIds.delete(product.id);
    renderProducts();
  }
}

function scheduleSearch() {
  state.search = searchInput.value;
  window.clearTimeout(state.searchTimer);
  state.searchTimer = window.setTimeout(loadProducts, 300);
}

function applyFilters() {
  window.clearTimeout(state.searchTimer);
  state.search = searchInput.value;
  state.category = categoryFilter.value;
  state.sort = sortFilter.value;
  loadProducts();
}

document.querySelector('#open-product-dialog').addEventListener('click', openDialog);
document.querySelector('#close-product-dialog').addEventListener('click', () => productDialog.close());
document.querySelector('#cancel-product').addEventListener('click', () => productDialog.close());
productForm.addEventListener('submit', submitProduct);
searchInput.addEventListener('input', scheduleSearch);
categoryFilter.addEventListener('change', applyFilters);
sortFilter.addEventListener('change', applyFilters);

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
});

loadProducts();
