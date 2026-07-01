import Expense from '../models/expenseModel.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getQueryValue = (query, ...keys) => {
  for (const key of keys) {
    const value = query[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

export const addExpense = async (req, res) => {
  try {
    const { expenseName, expenseType, amount, expenseDate } = req.body;

    if (!expenseName || !expenseType || !amount || !expenseDate) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required' });
    }

    const newExpense = await Expense.create({
      userId: req.user.id,
      expenseName,
      expenseType,
      amount: Number(amount),
      expenseDate,
      image: req.file ? req.file.filename : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Expense added successfully',
      expense: newExpense,
    });
  } catch (error) {
    console.error('Add expense error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to add expense' });
  }
};

export const getExpenses = async (req, res) => {
  try {
    const name = getQueryValue(req.query, 'expenseName', 'name');
    const type = getQueryValue(req.query, 'expenseType', 'type');
    const amount = getQueryValue(req.query, 'amount');
    const date = getQueryValue(req.query, 'expenseDate', 'date');
    const requestedPage = Number(req.query.page);
    const requestedPageSize = Number(req.query.pageSize ?? req.query.limit);

    const parsedPage =
      Number.isSafeInteger(requestedPage) && requestedPage > 0
        ? requestedPage
        : 1;

    const pageSize = [5, 10, 25, 50, 100].includes(requestedPageSize)
      ? requestedPageSize
      : 5;
    const filter = {
      userId: req.user.id,
    };

    if (name) {
      filter.expenseName = {
        $regex: escapeRegex(name),
        $options: 'i',
      };
    }

    if (type) {
      filter.expenseType = {
        $regex: type,
        $options: 'i',
      };
    }

    if (date) {
      filter.expenseDate = {
        $regex: escapeRegex(date),
        $options: 'i',
      };
    }

    if (amount) {
      filter.$expr = {
        $regexMatch: {
          input: { $toString: '$amount' },
          regex: escapeRegex(amount),
          options: 'i',
        },
      };
    }

    const totalRecords = await Expense.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    const currentPage = Math.min(parsedPage, totalPages);

    const [expenses, totals] = await Promise.all([
      Expense.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Expense.aggregate([
        { $match: filter },
        { $group: { _id: null, amount: { $sum: '$amount' } } },
      ]),
    ]);

    const totalAmount = totals[0]?.amount || 0;

    return res.status(200).json({
      success: true,
      message: 'Expenses fetched successfully',
      data: expenses,
      expenses,
      totalAmount,
      currentPage,
      pageSize,
      totalPages,
      totalRecords,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1 && totalPages > 0,
    });
  } catch (error) {
    console.error('Get expenses error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
    });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: 'Expense not found' });
    }

    return res.status(200).json({ success: true, expense });
  } catch (error) {
    console.error('Get expense error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch expense' });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { expenseName, expenseType, amount, expenseDate } = req.body;

    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: 'Expense not found' });
    }

    const updateData = {
      expenseName: expenseName || expense.expenseName,
      expenseType: expenseType || expense.expenseType,
      amount: amount ? Number(amount) : expense.amount,
      expenseDate: expenseDate || expense.expenseDate,
    };

    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      expense: updated,
    });
  } catch (error) {
    console.error('Update expense error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!expense) {
      return res
        .status(404)
        .json({ success: false, message: 'Expense not found' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    return res
      .status(200)
      .json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to delete expense' });
  }
};
