import express from 'express';
import { 
  getOrders, 
  getLastPrice, 
  updateOrderShipped, 
  deleteOrder 
} from '../controllers/orderController.js';

const router = express.Router();

router.route('/')
  .get(getOrders);

router.route('/lastprice')
  .get(getLastPrice);

router.route('/:id/shipped')
  .post(updateOrderShipped);

router.route('/:id')
  .delete(deleteOrder);

export default router; 