const bcrypt = require('bcryptjs');
const User = require('../Model/user');
const jwt = require('jsonwebtoken');

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
    console.log("inside hook");
  

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
// controller/webhookController.js

const Subscription = require("../Model/paymentDetails");

// exports.stripeWebhook = async (req, res) => {
//   const sig = req.headers['stripe-signature'];

//   let event;
//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     console.error("⚠️ Webhook signature verification failed.", err.message);
//     return res.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object;

//     try {
//       const subscription = new Subscription({
//         userId: session.metadata.userId,
//         role: session.metadata.role,
//         plan: session.metadata.planId,   // ✅ Save plan (your key like counselor_1m)
//         stripePriceId: session.line_items?.[0]?.price || null, // ✅ Save actual priceId
//         stripeSessionId: session.id,
//         paymentStatus: session.payment_status,
//       });

//       await subscription.save();
//       console.log("✅ Subscription saved to DB:", subscription);
//     } catch (err) {
//       console.error("Error saving subscription:", err);
//     }
//   }

//   res.json({ received: true });
// };

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    try {
      // ✅ Fetch line items (Stripe does not include them by default)
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 1,
      });

      const priceId = lineItems.data[0]?.price?.id || null;

      // ✅ Save subscription to DB
     // ✅ Save subscription to DB
const subscription = new Subscription({
  userId: session.metadata.userId,
  plan: session.metadata.planId, // your internal plan key
  stripePriceId: priceId,        // actual Stripe Price ID
  stripeSubscriptionId: session.subscription,   // ✅ correct way (from session)
  stripeSessionId: session.id, 
  stripeCustomerId: session.customer,           // ✅ customer id
  status: "active",     
   
});
await subscription.save();


      await subscription.save();
      console.log("✅ Subscription saved to DB:", subscription);
    } catch (err) {
      console.error("❌ Error saving subscription:", err);
    }
  }

  res.json({ received: true });
};