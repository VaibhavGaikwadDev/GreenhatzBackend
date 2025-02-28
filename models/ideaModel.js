const mongoose = require("mongoose");

// Idea Submission Schema
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
    status: { type: String, default: "Pending" }, // Default status
    message: { type: String, default: "" }, // Add message field
    submittedAt: { type: Date, default: Date.now },
    bookmarkedBy: { type: [String], default: [] }, // Admins who bookmarked the idea
    l2Message: { type: String, default: "" } // Add this field to store the message
  },
  { collection: "idea_submissions" }
);

// Rejected Idea Schema
const rejectedIdeaSchema = new mongoose.Schema(
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
    status: { type: String, default: "Rejected" },
    rejectionReason: String,
    rejectedAt: { type: Date, default: Date.now },
    rejectedBy: String,
    rejectedByRole: String,
  },
  { collection: "rejected_ideas" }
);

const Idea = mongoose.model("Idea", ideaSchema);
const RejectedIdea = mongoose.model("RejectedIdea", rejectedIdeaSchema);

module.exports = { Idea, RejectedIdea };
