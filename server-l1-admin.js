require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(cors());

// Load environment variables
const MONGO_URI_FORMS = process.env.MONGO_URI_FORMS || "mongodb://localhost:27017/Forms";
const MONGO_URI_USERS = process.env.MONGO_URI_USERS || "mongodb://localhost:27017/Aadhar_Housing_Finance";
const PORT = process.env.PORT || 5000;

// Connect to Forms Database (For Idea Submissions)
mongoose
  .connect(MONGO_URI_FORMS, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ Forms DB Connection Error:", err));

// Connect to Users Database (For User Credentials)
const userDB = mongoose.createConnection(MONGO_URI_USERS, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
userDB.on("error", (err) => console.error("❌ Users DB Connection Error:", err));

const ObjectId = mongoose.Types.ObjectId; // Fix for Invalid ID errors

// Define Schemas
const ideaSchema = new mongoose.Schema(
  {
    employeeName: String,
    employeeId: String,
    employeeFunction: String,
    location: String,
    ideaTheme: String,
    department: String,
    benefitsCategory: String,
    ideaDescription: String,
    impactedProcess: String,
    expectedBenefitsValue: String,
    attachment: String,
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, default: "Pending" },
    comment: { type: String, default: "" },
    rejectedAt: { type: String, default: null }, // Stores rejection timestamp in IST
    recommendedAt: { type: String, default: null }, // Stores approval timestamp in IST
  },
  { collection: "idea_submissions" }
);


const userCredentialSchema = new mongoose.Schema(
  {
    corporateId: String, // Matches employeeId
    email: String,
    role: String,
  },
  { collection: "user_credentials" }
);

// Models
const Idea = mongoose.model("Idea", ideaSchema);
const UserCredential = userDB.model("UserCredential", userCredentialSchema);

// Nodemailer Transporter (For Sending Emails)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ------------------ API Routes ------------------ //

// Get all ideas (Excludes only rejected ideas)
app.get('/ideas', async (req, res) => {
  try {
      const ideas = await Idea.find({ status: { $ne: "Rejected" } });
      res.json(ideas);
  } catch (error) {
      res.status(500).json({ error: "Failed to fetch ideas" });
  }
});

// Get idea details by ID
app.get("/idea/:id", async (req, res) => {
  try {
    const ideaId = req.params.id;
    if (!ObjectId.isValid(ideaId)) {
      return res.status(400).json({ error: "Invalid Idea ID format" });
    }
    const idea = await Idea.findById(ideaId);
    if (!idea) return res.status(404).json({ error: "Idea not found" });
    res.json(idea);
  } catch (error) {
    res.status(500).json({ error: "Error fetching idea details" });
  }
});

// Get all rejected ideas (Querying Idea collection for status "Rejected")
app.get("/rejected-ideas", async (req, res) => {
  try {
      const rejectedIdeas = await Idea.find({ status: "Rejected" }); // Ensure status matches your DB
      res.json(rejectedIdeas);
  } catch (error) {
      console.error("Error fetching rejected ideas:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});


// Update idea status (Approve / Recommend to L2)
app.put("/update-status/:id", async (req, res) => {
  const { status } = req.body;
  const ideaId = req.params.id;
  if (!ObjectId.isValid(ideaId)) {
    return res.status(400).json({ error: "Invalid Idea ID format" });
  }
  try {
    const updatedIdea = await Idea.findByIdAndUpdate(ideaId, { status }, { new: true });
    if (!updatedIdea) {
      return res.status(404).json({ error: "Idea not found" });
    }
    res.json({ message: "Idea status updated", idea: updatedIdea });
  } catch (error) {
    res.status(500).json({ error: "Error updating status" });
  }
});



// Approve Idea and Recommend to L2 (Update UI and notify user)
app.post("/approveIdea", async (req, res) => {
  try {
    const { ideaId, message } = req.body; // Destructure message from request body
    if (!ObjectId.isValid(ideaId)) {
      return res.status(400).send({ message: "Invalid Idea ID format" });
    }

    const recommendedAtIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Find the idea
    const idea = await Idea.findById(ideaId);
    if (!idea) return res.status(404).send({ message: "Idea not found" });

    // Update status, recommendedAt timestamp, and message
    const updatedIdea = await Idea.findByIdAndUpdate(
      ideaId,
      { 
        status: status, 
        recommendedAt: recommendedAtIST,
        comment: message // Add this line to store the message
      },
      { new: true }
    );

    if (!updatedIdea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    
    // Fetch user email and send approval email
    const user = await UserCredential.findOne({ corporateId: idea.employeeId });
    if (user?.email) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your Idea Has Been Approved and Recommended to L2!",
        text: `Dear ${idea.employeeName},\n\nCongratulations! Your idea titled "${idea.ideaTheme}" has been approved and recommended to L2.\n\nApproved At: ${recommendedAtIST}\n\nMessage from L1 Admin: ${message}\n\nBest regards,\nAadhar Housing Finance Team`
      };
      transporter.sendMail(mailOptions, (error) => {
        if (error) console.error("❌ Email error:", error);
      });
    }

    res.status(200).send({ message: "Idea approved, timestamp stored, and email sent.", idea: updatedIdea });

  } catch (error) {
    res.status(500).send({ message: "Internal Server Error", error: error.message });
  }
});

// Reject idea (Update status and notify user)
app.put("/reject-idea/:id", async (req, res) => {
  try {
    const ideaId = req.params.id;
    const { reason } = req.body;
    if (!ObjectId.isValid(ideaId)) {
      return res.status(400).json({ error: "Invalid Idea ID format" });
    }
    if (!reason) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const rejectedAtIST = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    // Update the idea with rejection status, reason, and timestamp
    const updatedIdea = await Idea.findByIdAndUpdate(
      ideaId,
      { status: "Rejected", rejectionReason: reason, rejectedAt: rejectedAtIST },
      { new: true }
    );
    if (!updatedIdea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    // Fetch user email and send rejection email
    const user = await UserCredential.findOne({ corporateId: updatedIdea.employeeId });
    if (user?.email) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Your Idea Has Been Rejected",
        text: `Dear ${updatedIdea.employeeName},\n\nUnfortunately, your idea submission titled "${updatedIdea.ideaTheme}" has been rejected.\n\nReason: ${reason}\nRejected At: ${rejectedAtIST}\n\nBest regards,\nAadhar Housing Finance Team`
      };
      transporter.sendMail(mailOptions, (error) => {
        if (error) console.error("❌ Email error:", error);
      });
    }

    res.json({ message: "Idea rejected and timestamp stored", idea: updatedIdea });

  } catch (error) {
    console.error("Error rejecting idea:", error);
    res.status(500).json({ error: "Error rejecting idea" });
  }
});


// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});