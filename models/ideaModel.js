// ideaModel.js
const mongoose = require("mongoose");

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
    status: { type: String, default: "Pending" }, // e.g., "ApprovedByL1Admin"
    adminName: { type: String }, // Add Admin name who accept or reject
    comment: { type: String, default: "" },
    bookmarkedBy: { type: [String], default: [] },
  },
  { collection: "idea_submissions" }
);

const Idea = mongoose.model("Idea", ideaSchema);
module.exports = { Idea };