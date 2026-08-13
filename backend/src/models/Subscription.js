const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    riskTier: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    premiumAmount: {
      type: Number,
      required: true,
    },
    zone: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true, 
    },
    scoringSnapshot: {
      rainfallMm: Number,
      temperatureC: Number,
      aqi: Number,
      activityScore: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);