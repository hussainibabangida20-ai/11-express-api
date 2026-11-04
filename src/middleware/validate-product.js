import { findProducts } from '../services/products.service.js';
import HttpError from '../errors/http-error.js';

const allowedCategories = ['Home', 'Outdoors', 'Electronics', 'Stationery'];
const fields = ['name', 'sku', 'category', 'price', 'stock'];
const skuPattern = /^[A-Z]{3}-\d{4}$/;

export default function validateProduct({ partial = false } = {}) {
  return async (req, res, next) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return next(new HttpError(422, 'Invalid product', { body: 'Must be a JSON object.' }));
    }

    const errors = {};
    const keys = Object.keys(body);

    for (const key of keys) {
      if (!fields.includes(key)) {
        errors[key] = 'Unknown or unsupported field.';
      }
    }

    if (partial && keys.length === 0) {
      errors.body = 'Must include at least one product field.';
    }

    for (const field of fields) {
      const value = body[field];
      const present = Object.hasOwn(body, field);

      if (!present) {
        if (!partial) {
          errors[field] = 'Is required.';
        }
        continue;
      }

      if (field === 'name' && (typeof value !== 'string' || value.trim().length < 2 || value.trim().length > 100)) {
        errors.name = 'Must be a string between 2 and 100 characters.';
      } else if (field === 'sku' && (typeof value !== 'string' || !skuPattern.test(value))) {
        errors.sku = 'Must match the pattern AAA-0000.';
      } else if (field === 'category' && (typeof value !== 'string' || !allowedCategories.includes(value))) {
        errors.category = `Must be one of: ${allowedCategories.join(', ')}.`;
      } else if (field === 'price' && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)) {
        errors.price = 'Must be a number greater than 0.';
      } else if (field === 'stock' && (!Number.isInteger(value) || value < 0)) {
        errors.stock = 'Must be an integer greater than or equal to 0.';
      }
    }

    if (Object.keys(errors).length > 0) {
      return next(new HttpError(422, 'Product validation failed.', errors));
    }

    if (Object.hasOwn(body, 'name')) {
      body.name = body.name.trim();
    }

    if (Object.hasOwn(body, 'sku')) {
      const products = await findProducts();
      const duplicate = products.some(
        (product) => product.sku === body.sku && product.id !== req.params.id,
      );

      if (duplicate) {
        return next(new HttpError(422, 'Product validation failed.', {
          sku: 'Must be unique.',
        }));
      }
    }

    next();
  };
}
