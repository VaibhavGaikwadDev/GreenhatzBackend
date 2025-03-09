// ideaRoutes.js
const express = require("express");
const router = express.Router();
const { Idea } = require("../models/ideaModel");
const { Admin, User } = require("../models/userModel");
const transporter = require("../config/email");

// Middleware to validate MongoDB ObjectId
const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(id);

// Get all ideas
router.get("/ideas", async (req, res) => {
  try {
    const ideas = await Idea.find();
    res.json(ideas);
  } catch (error) {
    res.status(500).json({ error: "Error fetching ideas", details: error.message });
  }
});

// Get all rejected ideas
router.get("/rejected-ideas", async (req, res) => {
  try {
    const rejectedIdeas = await Idea.find({ status: "rejected" });
    res.json(rejectedIdeas);
  } catch (error) {
    res.status(500).json({ error: "Error fetching rejected ideas", details: error.message });
  }
});

// Update idea status (Approve / Recommend to L2 / Reject) with emailing
router.put("/update-status/:id", async (req, res) => {
  try {
    const { status, comment, adminId, adminRole, adminName } = req.body;

    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid Idea ID" });
    }

    // Fetch admin name if not provided
    let updatedAdminName = adminName;
    if (!adminName || adminName === "Unknown") {
      const admin = await Admin.findOne({ corporateId: adminId });
      updatedAdminName = admin ? admin.employeeName : "Unknown Admin";
    }

    const formattedStatus = `${status}By${adminRole}`; // e.g., "ApprovedByL1Admin"

    const updatedIdea = await Idea.findByIdAndUpdate(
      req.params.id,
      {
        status: formattedStatus,
        adminName: updatedAdminName,
        comment,
      },
      { new: true }
    );

    if (!updatedIdea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    // Send response immediately
    res.status(200).json(updatedIdea);
    console.log(`✅ Idea ${req.params.id} updated: ${formattedStatus}, adminName: ${updatedAdminName}`);

    // Fetch submitter's email and send email asynchronously
    const submitter = await User.findOne({ corporateId: updatedIdea.employeeId });
    const employeeEmail = submitter ? submitter.email : null;

    if (!employeeEmail) {
      console.warn(`No email found for employeeId ${updatedIdea.employeeId} for idea ${req.params.id}`);
      return;
    }

    const isRejected = formattedStatus.toLowerCase().includes("rejected");
    const subject = isRejected ? "Your Idea Has Been Rejected" : "Your Idea Has Been Accepted";
    const text = isRejected
      ? `Your idea "${updatedIdea.ideaTheme}" has been rejected by ${adminRole}. Reason: ${comment || "No reason provided."}`
      : `Your idea "${updatedIdea.ideaTheme}" is accepted by ${adminRole}.`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: employeeEmail,
      subject,
      text,
    };

    // Non-blocking email sending
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(`❌ Email failed for idea ${req.params.id}: ${error.message}`);
      } else {
        console.log(`✅ Email sent to ${employeeEmail} for idea ${req.params.id}: ${info.response}`);
      }
    });
  } catch (error) {
    console.error("Error updating idea status:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

// Bookmark or Unbookmark Idea
router.put("/bookmark/:ideaId", async (req, res) => {
  const { ideaId } = req.params;
  const { adminId } = req.body;

  if (!isValidObjectId(ideaId)) {
    return res.status(400).json({ error: "Invalid Idea ID" });
  }

  if (!adminId) {
    return res.status(400).json({ error: "Admin ID is required" });
  }

  try {
    const idea = await Idea.findById(ideaId);

    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    // Toggle bookmark
    if (idea.bookmarkedBy.includes(adminId)) {
      idea.bookmarkedBy = idea.bookmarkedBy.filter((id) => id !== adminId);
    } else {
      idea.bookmarkedBy.push(adminId);
    }

    await idea.save();
    res.json({ message: "Bookmark updated successfully", bookmarkedBy: idea.bookmarkedBy });
  } catch (error) {
    res.status(500).json({ error: "Error updating bookmark", details: error.message });
  }
});

module.exports = router;