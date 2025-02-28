require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const otpRoutes = require("./routes/otpRoutes");
const formRoutes = require("./routes/formRoutes");
const ideaRoutes = require("./routes/ideaRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("uploads"));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/Forms";
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Import Models
const { Idea, RejectedIdea } = require("./models/ideaModel");

// ------------------ API Routes ------------------ //
app.use("/", otpRoutes);
app.use("/", formRoutes);
app.use("/", ideaRoutes);

// Get idea details by ID
app.get("/idea/:id", async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ error: "Idea not found" });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ error: "Error fetching idea details" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
