const express = require("express");
const { Idea, RejectedIdea } = require("../models/ideaModel");

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

// Get all rejected ideas
router.get("/rejected-ideas", async (req, res) => {
  try {
    const rejectedIdeas = await RejectedIdea.find();
    res.json(rejectedIdeas);
  } catch (error) {
    res.status(500).json({ error: "Error fetching rejected ideas", details: error.message });
  }
});

// Update idea status (Approve / Recommend to L2 / Reject)
router.put("/update-status/:id", async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid Idea ID" });
  }

  try {
    const idea = await Idea.findById(id);
    if (!idea) {
      return res.status(404).json({ error: "Idea not found" });
    }

    if (status && status.toLowerCase().startsWith("rejected")) {
      const reason = rejectionReason || "No reason provided";

      // Move to rejected_ideas
      const rejectedIdea = new RejectedIdea({
        ...idea.toObject(),
        status: "Rejected",
        rejectionReason: reason,
        rejectedAt: new Date(),
      });
      await rejectedIdea.save();

      // Delete from idea_submissions
      await Idea.findByIdAndDelete(id);

      return res.json({ message: "Idea rejected and moved to rejected_ideas" });
    }

    // Update status for other cases
    idea.status = status || idea.status;
    await idea.save();

    res.json({ message: "Idea status updated", idea });
  } catch (error) {
    res.status(500).json({ error: "Error updating status", details: error.message });
  }
});

// Reject idea (Move to rejected_ideas and remove from idea_submissions)
router.delete("/reject-idea/:id", async (req, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid Idea ID" });
  }

  try {
    const ideaToReject = await Idea.findById(id);

    if (!ideaToReject) {
      return res.status(404).json({ error: "Idea not found" });
    }

    // Move idea to rejected_ideas
    const rejectedIdea = new RejectedIdea({
      ...ideaToReject.toObject(),
      status: "Rejected",
      rejectionReason: rejectionReason || "No reason provided",
      rejectedAt: new Date(),
    });
    await rejectedIdea.save();

    // Remove idea from idea_submissions
    await Idea.findByIdAndDelete(id);

    res.json({ message: "Idea rejected and moved to rejected_ideas" });
  } catch (error) {
    res.status(500).json({ error: "Error rejecting idea", details: error.message });
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
