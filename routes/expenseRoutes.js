import express from 'express';
import {
  addExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';
import { AuthMiddleware } from '../middleware/authMiddleware.js';
import { imageUpload } from '../library/multer.js';

const router = express.Router();

// All expense routes are protected
router.use(AuthMiddleware);

router.post('/add', imageUpload.single('image'), addExpense);
router.get('/all', getExpenses);
router.get('/:id', getExpenseById);
router.put('/:id', imageUpload.single('image'), updateExpense);
router.delete('/:id', deleteExpense);

export default router;
