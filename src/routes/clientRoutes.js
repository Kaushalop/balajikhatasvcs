import express from 'express';
import { 
  getAllClients, 
  createClient, 
  getClientById, 
  updateClient, 
  searchClients 
} from '../controllers/clientController.js';

const router = express.Router();

router.route('/')
  .get(getAllClients)
  .post(createClient);

router.route('/:id')
  .get(getClientById)
  .put(updateClient);

router.route('/search')
  .get(searchClients);

export default router; 