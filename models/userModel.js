const mongoose = require("mongoose");
const { otpDb } = require("../config/db"); // Ensure otpDb is correctly configured

// User Schema
const UserSchema = new mongoose.Schema({
  corporateId: { type: String, required: true, unique: true }, // Corporate ID
  email: { type: String, required: true, unique: true }, // Email
  role: { type: String, required: true }, // Role
  otp: { type: String }, // One-Time Password
  otpExpiry: { type: Date }, // OTP Expiry Date
  employeeName: { type: String, default: "N/A" }, // Employee Name
  employeeFunction: { type: String, default: "N/A" }, // Employee Function/Role
  location: { type: String, default: "Unknown" }, // Location
});

// Create Models
const User = otpDb.model("user_credentials", UserSchema);
const Admin = otpDb.model("admin_credentials", UserSchema);

module.exports = { User, Admin };
