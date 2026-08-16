const mongoose = require('mongoose');

const claimEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
    },
    triggerType: {
      type: String,
      enum: ['rainfall', 'temperature', 'aqi', 'storeClosure', 'appDowntime'],
      required: true,
    },
    zone: {
      type: String,
      required: true,
    },
    claimedLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    payoutAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'flagged'],
      default: 'pending',
    },
    fraudCheck: {
      score: { type: Number, default: null }, // 0-100, higher = more suspicious
      flags: [{ type: String }], // list of reasons this claim was flagged, if any
      checkedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClaimEvent', claimEventSchema);