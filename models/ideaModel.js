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
    comment: { type: String, default: "" },
    // message: { type: String, default: "" }, // Add message field
    submittedAt: { type: Date, default: Date.now },
    bookmarkedBy: { type: [String], default: [] }, // Admins who bookmarked the idea
  },
  { collection: "idea_submissions" }
);

const Idea = mongoose.model("Idea", ideaSchema);
// const RejectedIdea = mongoose.model("RejectedIdea", rejectedIdeaSchema);

module.exports = { Idea };
