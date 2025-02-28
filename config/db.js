const mongoose = require("mongoose");
require("dotenv").config();

// OTP Database
const otpDb = mongoose.createConnection(process.env.OTP_MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
otpDb.on("connected", () => console.log("✅ OTP Database Connected"));
otpDb.on("error", (err) => console.error("❌ OTP DB Connection Error:", err));

// Forms Database
const formDb = mongoose.createConnection(process.env.FORM_MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
formDb.on("connected", () => console.log("✅ Forms Database Connected"));
formDb.on("error", (err) => console.error("❌ Forms DB Connection Error:", err));

// Ideas Database (Main MongoDB)
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Forms";
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

module.exports = { otpDb, formDb };
