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
router.post("/verify-otp", async (req, res) => {
  const { corporateId, otp } = req.body;
  try {
    let user = await User.findOne({ corporateId, otp });
    let collection = User;

    if (!user) {
      user = await Admin.findOne({ corporateId, otp });
      collection = Admin;
    }

    if (!user) return res.status(400).json({ message: "Invalid OTP" });
    if (user.otpExpiry < new Date()) return res.status(400).json({ message: "OTP expired" });

    await collection.updateOne({ corporateId }, { $unset: { otp: 1, otpExpiry: 1 } });
    res.status(200).json({ message: "Login successful", role: user.role });
  } catch (error) {
    console.error("Error in /verify-otp:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

module.exports = router;
