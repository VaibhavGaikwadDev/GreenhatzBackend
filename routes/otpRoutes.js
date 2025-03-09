const express = require("express");
const { User, Admin } = require("../models/userModel");
const transporter = require("../config/email");

const router = express.Router();

// Function to send OTP
const sendOtp = async (corporateId, res) => {
  try {
    let user = await User.findOne({ corporateId });
    let collection = User;

    if (!user) {
      user = await Admin.findOne({ corporateId });
      collection = Admin;
    }

    if (!user) return res.status(404).json({ message: "Corporate ID not found" });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date(Date.now() + 300 * 1000);
    await collection.updateOne({ corporateId }, { $set: { otp, otpExpiry } });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error in sendOtp:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// OTP Request
router.post("/request-otp", async (req, res) => {
  const { corporateId } = req.body;
  await sendOtp(corporateId, res);
});

// OTP Resend
router.post("/resend-otp", async (req, res) => {
  const { corporateId } = req.body;
  await sendOtp(corporateId, res);
});

// OTP Verification
// otpRoutes.js (assumed)
router.post("/verify-otp", async (req, res) => {
  const { corporateId, otp } = req.body;
  const admin = await Admin.findOne({ corporateId, otp });
  if (!admin) {
    return res.status(400).json({ error: "Invalid OTP" });
  }
  if (admin.otpExpiry < Date.now()) {
    return res.status(400).json({ error: "OTP expired" });
  }

  // Clear OTP after successful verification
  admin.otp = undefined;
  admin.otpExpiry = undefined;
  await admin.save();

  res.status(200).json({
    message: "Login successful",
    role: admin.role, // e.g., "adminL1"
    name: admin.employeeName // e.g., "Admin Name"
  });
});

module.exports = router;
