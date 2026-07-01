import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    expenseName: {
      type: String,
      required: [true, 'Expense name is required'],
      trim: true,
    },

    expenseType: {
      type: String,
      required: [true, 'Expense type is required'],
      enum: [
        'Daily Expense',
        'Food',
        'Transport',
        'Shopping',
        'Entertainment',
        'Health',
        'Education',
        'Bills',
        'Other',
      ],
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    image: {
      type: String,
      default: null,
    },

    expenseDate: {
      type: String,
      required: [true, 'Expense date is required'],
    },
  },
  { timestamps: true }
);

// Supports the paginated per-user feed and its stable newest-first sort.
expenseSchema.index({ userId: 1, createdAt: -1, _id: -1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
