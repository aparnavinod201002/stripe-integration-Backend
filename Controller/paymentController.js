const bcrypt = require('bcryptjs');
const User = require('../Model/user');
const jwt = require('jsonwebtoken');
const Payment  = require('../Model/paymentDetails')

exports.user = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10); // 10 rounds is safe default
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with hashed password
    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email
        // Do not return password hash in response
      }
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


//
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, existingUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: existingUser._id, email: existingUser.email },
      process.env.JWT_SECRET
, // 🔑 keep secret in .env
      { expiresIn: "1h" } // token validity (1 hour)
    );
  res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
});

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email
      }
    });

  } catch (error) {
    console.error("Error logging in:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
//
exports.payment = () =>{
    
}

// controllers/paymentController.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Map your plans to Stripe price IDs
const planPrices = {
  "counselor_1m": process.env.PRICE_COUNSELOR_3M,
  "counselor_6m": process.env.PRICE_COUNSELOR_6M,
  "counselor_1y": process.env.PRICE_COUNSELOR_1Y,
  "university_1m": process.env.PRICE_UNIVERSITY_3M,
  "university_6m": process.env.PRICE_UNIVERSITY_6M,
  "university_1y": process.env.PRICE_UNIVERSITY_1Y,
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { planId, role } = req.body; // plan = "counselor_1m" (key, not Stripe ID)
    const userId = req.user;
    console.log("inside");
  

    if (!planId || !planPrices[planId]) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    const priceId = planPrices[planId]; // ✅ Get actual Stripe Price ID

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId, // ✅ Stripe Price ID from env
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: { userId, role, planId },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ message: "Server error",error:error.message });
  }
};
//
// controllers/webhookController.js

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, // 👈 raw body is required, not parsed JSON
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout session
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // Save payment in DB
     const payment = new Payment({
      userId: session.metadata.userId,
      plan: session.metadata.plan,
      stripeSessionId: session.id,
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      stripePriceId: session.metadata.priceId,
      paymentIntentId: session.payment_intent,
      status: "completed",
      startDate: new Date(),
      rawStripeResponse: session, // optional
    });
      await payment.save();

      // (Optional) Update user details after payment
      await User.findByIdAndUpdate(session.metadata.userId, {
        subscriptionPlan: session.metadata.plan,
        subscriptionStatus: "active",
      });

      console.log("✅ Payment saved in DB:", payment);
    } catch (error) {
      console.error("❌ Error saving payment:", error);
    }
  }

  res.json({ received: true });
};
