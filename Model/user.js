// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // New fields for subscription
    subscriptionPlan: {
      type: String,
      enum: ["3_months", "6_months", "1_year", "none"],
      default: "none",
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "canceled", "trialing", "past_due"],
      default: "inactive",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("User", userSchema);
