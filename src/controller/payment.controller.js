const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();

async function rzorder(req, res) {
  try {
    const { amount, currency, receipt, notes } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({
        status: 400,
        message: "Amount or currency is missing",
      });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RZPAY_API_KEY,
      key_secret: process.env.RZPAY_SECRET_KEY,
    });
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes,
    });
    if (!order) {
      return res.status(500).json({
        status: 500,
        message: "Order can not be created.",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Order created.",
      order,
    });
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: error.message || "Something went wrong!",
    });
  }
}

async function rzverifypaymanet(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        status: 400,
        message: "Parameters missing.",
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RZPAY_SECRET_KEY)
      .update(body)
      .digest("hex");

    const isValid = generatedSignature === razorpay_signature;
    if (!isValid) {
      return res.status(400).json({
        status: 400,
        message: "Payment verification failed.",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Payment verified!",
    });
    
  } catch (error) {
    return res.status(500).json({
      status: 500,
      message: error || "Something went wring!",
    });
  }
}

module.exports = { rzorder, rzverifypaymanet };
