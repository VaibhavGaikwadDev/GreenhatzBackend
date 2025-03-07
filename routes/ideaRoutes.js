const express = require("express");
const { Idea } = require("../models/ideaModel");

const router = express.Router();

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
  const { id } = req.params;
  const { status, comment } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid Idea ID" });
  }

  try {
    const idea = await Idea.findById(id);
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    // ✅ Always update comment (even if empty)
    idea.status = status || idea.status;
    if (comment !== undefined) {
      idea.comment = comment;
    }

    if (status.toLowerCase() === "rejected") {
      idea.rejectedAt = new Date();
    }

    await idea.save();
    res.json({ message: "Idea status updated successfully", idea });
  } catch (error) {
    console.error("❌ Error updating idea status:", error);
    res.status(500).json({ error: "Error updating status", details: error.message });
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
