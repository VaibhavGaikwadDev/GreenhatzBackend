const express = require("express");
const router = express.Router();
const { Idea } = require("../models/ideaModel");
const { Admin } = require("../models/userModel");

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

// Get all rejected ideas (Filtered from idea_submissions)
router.get("/rejected-ideas", async (req, res) => {
  try {
    const rejectedIdeas = await Idea.find({ status: "rejected" });
    res.json(rejectedIdeas);
  } catch (error) {
    res.status(500).json({ error: "Error fetching rejected ideas", details: error.message });
  }
});

// Update idea status (Approve / Recommend to L2 / Reject)
router.put("/update-status/:id", async (req, res) => {
  try {
    const { status, comment, adminId, adminRole, adminName } = req.body;

    // Fetch admin name if not provided
    let updatedAdminName = adminName;
    if (!adminName && adminId) {
      const admin = await Admin.findOne({ corporateId: adminId });
      updatedAdminName = admin ? admin.employeeName : "Unknown Admin";
    }

    const formattedStatus = `${status}By${adminRole}`; // e.g., "ApprovedByL1Admin"

    const updatedIdea = await Idea.findByIdAndUpdate(
      req.params.id,
      {
        status: formattedStatus,
        adminName: updatedAdminName, // Store name separately
        comment,
      },
      { new: true }
    );

    if (!updatedIdea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    res.status(200).json(updatedIdea);
  } catch (error) {
    console.error("Error updating idea status:", error);
    res.status(500).json({ error: "Internal server error" });
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
