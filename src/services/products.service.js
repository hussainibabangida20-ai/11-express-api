import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import HttpError from '../errors/http-error.js';

const productsFile = fileURLToPath(new URL('../data/products.json', import.meta.url));
let writeQueue = Promise.resolve();

async function readProducts() {
  const contents = await readFile(productsFile, 'utf8');
  return JSON.parse(contents);
}

async function writeProductsAtomically(products) {
  const temporaryFile = `${productsFile}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(products, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    });
    await rename(temporaryFile, productsFile);
  } catch (error) {
    try {
      await unlink(temporaryFile);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        throw new AggregateError([error, cleanupError], 'Failed to replace the products file.');
      }
    }
    throw error;
  }
}

function withSerializedWrite(operation) {
  const result = writeQueue.then(operation);
  writeQueue = result.then(() => undefined, () => undefined);
  return result;
}

function ensureUniqueSku(products, sku, currentId) {
  if (products.some((product) => product.sku === sku && product.id !== currentId)) {
    throw new HttpError(422, 'Product validation failed.', { sku: 'Must be unique.' });
  }
}

export async function findProducts({ category, q, sort } = {}) {
  let products = await readProducts();

  if (typeof category === 'string' && category.trim()) {
    const normalizedCategory = category.trim().toLowerCase();
    products = products.filter(
      (product) => product.category.toLowerCase() === normalizedCategory,
    );
  }

  if (typeof q === 'string' && q.trim()) {
    const searchTerm = q.trim().toLowerCase();
    products = products.filter((product) =>
      [product.name, product.sku, product.category]
        .some((value) => value.toLowerCase().includes(searchTerm)),
    );
  }

  if (sort === 'price' || sort === '-price') {
    const direction = sort === 'price' ? 1 : -1;
    products.sort((a, b) => direction * (a.price - b.price));
  }

  return products;
}

export async function findProductById(id) {
  const products = await readProducts();
  return products.find((product) => product.id === id) ?? null;
}

export function createProduct(product) {
  return withSerializedWrite(async () => {
    const products = await readProducts();
    ensureUniqueSku(products, product.sku);
    const createdProduct = {
      id: randomUUID(),
      ...product,
      createdAt: new Date().toISOString(),
    };

    await writeProductsAtomically([...products, createdProduct]);
    return createdProduct;
  });
}

export function replaceProduct(id, replacement) {
  return withSerializedWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) {
      return null;
    }

    ensureUniqueSku(products, replacement.sku, id);
    const updatedProduct = {
      id,
      ...replacement,
      createdAt: products[index].createdAt,
    };
    products[index] = updatedProduct;
    await writeProductsAtomically(products);
    return updatedProduct;
  });
}

export function updateProduct(id, changes) {
  return withSerializedWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) {
      return null;
    }

    if (Object.hasOwn(changes, 'sku')) {
      ensureUniqueSku(products, changes.sku, id);
    }

    const updatedProduct = { ...products[index], ...changes };
    products[index] = updatedProduct;
    await writeProductsAtomically(products);
    return updatedProduct;
  });
}

export function deleteProduct(id) {
  return withSerializedWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((product) => product.id === id);
    if (index === -1) {
      return false;
    }

    products.splice(index, 1);
    await writeProductsAtomically(products);
    return true;
  });
}
