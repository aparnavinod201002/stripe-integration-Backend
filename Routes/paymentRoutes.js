const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");
const controller = require('../Controller/paymentController');
const auth = require('../Middleware/authMiddleware')

router.post('/user', controller.user);
router.post('/login', controller.login);
router.post('/paymentNew',controller.payment);
router.post('/payment',auth,controller.createCheckoutSession);
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  controller.stripeWebhook
);

module.exports = router