import {
  createProduct,
  deleteProduct,
  findProductById,
  findProducts,
  replaceProduct,
  updateProduct,
} from '../services/products.service.js';
import HttpError from '../errors/http-error.js';

export async function getProducts(req, res) {
  const products = await findProducts(req.query);
  res.json({ data: products });
}

export async function getProduct(req, res) {
  const product = await findProductById(req.params.id);

  if (!product) {
    throw new HttpError(404, 'Product not found.');
  }

  return res.json({ data: product });
}

export async function postProduct(req, res) {
  const product = await createProduct(req.body);

  res.location(`/api/products/${product.id}`).status(201).json({ data: product });
}

export async function putProduct(req, res) {
  const product = await replaceProduct(req.params.id, req.body);
  if (!product) {
    throw new HttpError(404, 'Product not found.');
  }

  res.json({ data: product });
}

export async function patchProduct(req, res) {
  const product = await updateProduct(req.params.id, req.body);
  if (!product) {
    throw new HttpError(404, 'Product not found.');
  }

  res.json({ data: product });
}

export async function removeProduct(req, res) {
  const deleted = await deleteProduct(req.params.id);
  if (!deleted) {
    throw new HttpError(404, 'Product not found.');
  }

  res.status(204).end();
}
