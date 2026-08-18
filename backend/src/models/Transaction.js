const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['payout', 'premium_deduction', 'refund'],
      required: true,
    },
    amount: {
      type: Number,
      required: true, 
    },
    relatedClaim: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClaimEvent',
      default: null,
    },
    relatedSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    balanceAfter: {
      type: Number,
      required: true, 
    },
    description: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index(
  { relatedClaim: 1 },
  { unique: true, partialFilterExpression: { relatedClaim: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Transaction', transactionSchema);