import { findProductById, findProducts } from '../services/products.service.js';

export async function getProducts(req, res) {
  const products = await findProducts(req.query);
  res.json({ data: products });
}

export async function getProduct(req, res) {
  const product = await findProductById(req.params.id);

  if (!product) {
    return res.status(404).json({ error: { message: 'Product not found' } });
  }

  res.json({ data: product });
}
