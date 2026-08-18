const User = require('../models/User');
const { getTransactionHistory } = require('../services/payoutService');

const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('walletBalance');
    res.status(200).json({ walletBalance: user.walletBalance });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wallet', error: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const transactions = await getTransactionHistory(req.user._id);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
  }
};

module.exports = { getWallet, getTransactions };