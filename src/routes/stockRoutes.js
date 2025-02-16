import express from 'express';
import { 
  getAllStocks, 
  createStock, 
  updateStock, 
  searchStocks, 
  clearStocks, 
  createStockOrder, 
  uploadStock 
} from '../controllers/stockController.js';

const router = express.Router();

router.route('/')
  .get(getAllStocks)
  .post(createStock)
  .delete(clearStocks);

router.route('/update')
  .put(updateStock);

router.route('/search')
  .get(searchStocks);

router.route('/order')
  .post(createStockOrder);

router.route('/upload')
  .post(uploadStock);

export default router; 