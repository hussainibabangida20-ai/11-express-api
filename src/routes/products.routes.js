import { Router } from 'express';
import {
  getProduct,
  getProducts,
  patchProduct,
  postProduct,
  putProduct,
  removeProduct,
} from '../controllers/products.controller.js';
import validateProduct from '../middleware/validate-product.js';

const router = Router();

router.get('/', getProducts);
router.post('/', validateProduct(), postProduct);
router.get('/:id', getProduct);
router.put('/:id', validateProduct(), putProduct);
router.patch('/:id', validateProduct({ partial: true }), patchProduct);
router.delete('/:id', removeProduct);

export default router;
