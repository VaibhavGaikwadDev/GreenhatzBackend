require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");

const upload = multer({ dest: "uploads/" }); // Configure multer for file uploads
const app = express();
app.use(express.json()); // Middleware for JSON parsing
app.use(cors()); // Enable CORS for cross-origin requests

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI_FORMS || "mongodb://localhost:27017/Forms";

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Define Schema for `idea_submissions`
const ideaSchema = new mongoose.Schema(
  {
    // Employee Details
    employeeName: { type: String}, // Employee's name
    employeeId: { type: String }, // Unique employee ID
    employeeFunction: { type: String }, // Function or role
    location: { type: String }, // Office location

    // Idea Details
    ideaTheme: { type: String}, // Selected theme of the idea
    department: { type: String}, // Department affected by the idea
    benefitsCategory: { type: String}, // Type of benefit
    ideaDescription: { type: String}, // Description of the idea
    impactedProcess: { type: String}, // Processes impacted by the idea
    expectedBenefitsValue: { type: String }, // Estimated value of benefits
    status: { 
      type: String, 
      default: "Pending",
    },
    submittedAt: { type: Date, default: Date.now }, // Submission timestamp
    attachments: [
      {
        fileName: { type: String }, // Original file name
        filePath: { type: String }, // Path to the stored file
        fileSize: { type: Number }, // Size of the file in bytes
        uploadedAt: { type: Date, default: Date.now }, // Timestamp of upload
      }
    ],
  },
  { collection: "idea_submissions" }
);

const Idea = mongoose.model("Idea", ideaSchema);

// Import User model
const { User } = require("./models/userModel");

// -------------------- API Endpoints -------------------- //

// Get user details by corporateId
app.post("/getUserDetails", async (req, res) => {
  const { corporateId } = req.body;

  if (!corporateId) {
    return res.status(400).json({ error: "Corporate ID is required" });
  }

  try {
    const user = await User.findOne({ corporateId });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      employeeName: user.employeeName,
      employeeFunction: user.employeeFunction,
      location: user.location,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Submit form
app.post("/submit-form", upload.array("attachment"), async (req, res) => {
  try {
    const {
      employeeName,
      employeeId,
      employeeFunction,
      ideaDescription,
      location,
      ideaTheme,
      department,
      benefitsCategory,
      impactedProcess,
      expectedBenefitsValue,
    } = req.body;

    if (!employeeName || !employeeId || !ideaDescription) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newIdea = new Idea({
      employeeName,
      employeeId,
      employeeFunction,
      ideaDescription,
      location,
      ideaTheme,
      department,
      benefitsCategory,
      impactedProcess,
      expectedBenefitsValue,
    });

    await newIdea.save();
    res.status(201).json({ message: "Form submitted successfully", idea: newIdea });
  } catch (error) {
    console.error("Error submitting form:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get all ideas (Exclude rejected ones)
app.get("/ideas", async (req, res) => {
  try {
    const ideas = await Idea.find({ status: { $ne: "Rejected" } }).select("-__v");
    res.json(ideas);
  } catch (error) {
    console.error("Error fetching ideas:", error);
    res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

// Get idea details by ID
app.get("/idea/:id", async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id).select("-__v");
    if (!idea) return res.status(404).json({ error: "Idea not found" });

    res.json(idea);
  } catch (error) {
    console.error("Error fetching idea details:", error);
    res.status(500).json({ error: "Error fetching idea details" });
  }
});

// Get total, approved, and rejected ideas for a specific employee
app.get("/user-ideas/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ error: "Employee ID is required" });

    const ideas = await Idea.find({ employeeId }).select("-__v");

    const approvedCount = ideas.filter((idea) => idea.status === "Approved").length;
    const rejectedCount = ideas.filter((idea) => idea.status === "Rejected").length;

    res.json({
      totalIdeas: ideas.length,
      approvedCount,
      rejectedCount,
      ideas,
    });
  } catch (error) {
    console.error("Error fetching user ideas:", error);
    res.status(500).json({ error: "Error fetching user ideas" });
  }
});

// Update idea status (Approve / Reject)
app.put("/update-status/:id", async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const updateData = { status };
    if (status === "Rejected" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    const idea = await Idea.findByIdAndUpdate(req.params.id, updateData, { new: true }).select("-__v");

    if (!idea) return res.status(404).json({ error: "Idea not found" });

    res.json({ message: "Idea status updated", idea });
  } catch (error) {
    console.error("Error updating idea status:", error);
    res.status(500).json({ error: "Error updating status" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
