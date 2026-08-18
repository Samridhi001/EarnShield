const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const processPayout = async (userId, claimId, amount, description) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = user.walletBalance + amount;

    const transaction = await Transaction.create(
      [
        {
          user: userId,
          type: 'payout',
          amount,
          relatedClaim: claimId,
          balanceAfter: newBalance,
          description,
        },
      ],
      { session }
    );

    user.walletBalance = newBalance;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { success: true, newBalance, transaction: transaction[0] };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (error.code === 11000) {
      return { success: false, reason: 'duplicate', message: 'This claim has already been paid out' };
    }

    throw error;
  }
};

const deductPremium = async (userId, subscriptionId, amount, description) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = user.walletBalance - amount;

    const transaction = await Transaction.create(
      [
        {
          user: userId,
          type: 'premium_deduction',
          amount: -amount,
          relatedSubscription: subscriptionId,
          balanceAfter: newBalance,
          description,
        },
      ],
      { session }
    );

    user.walletBalance = newBalance;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    return { success: true, newBalance, transaction: transaction[0] };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getTransactionHistory = async (userId) => {
  return Transaction.find({ user: userId }).sort({ createdAt: -1 });
};

module.exports = { processPayout, deductPremium, getTransactionHistory };