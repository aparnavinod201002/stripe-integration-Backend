// models/Subscription.js
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // reference to User model
      required: true,
    },

    stripeCustomerId: {
      type: String,
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
    },
    stripePriceId: {
      type: String, // which plan price (3m/6m/1y)
      required: true,
    },

    plan: {
      type: String,
            required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "canceled", "trialing", "past_due"],
      default: "inactive",
    },

    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },

    latestInvoiceId: {
      type: String,
    },
    paymentIntentId: {
      type: String,
    },
  },
  {
    timestamps: true, // auto add createdAt, updatedAt
  }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
