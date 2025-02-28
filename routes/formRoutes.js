const express = require("express");
const multer = require("multer");
const {Idea} = require("../models/ideaModel");

const router = express.Router();

// File Upload Setup
const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    if (!req.body.employeeId) return cb(new Error("Missing employeeId"));
    const sanitizedFilename = file.originalname.replace(/\s+/g, "_");
    cb(null, `${req.body.employeeId}_${sanitizedFilename}`);
  },
});
const upload = multer({ storage });

// Submit Form
router.post("/submit-form", upload.single("attachment"), async (req, res) => {
  try {
    if (!req.body.employeeId) return res.status(400).json({ message: "❌ Employee ID is required" });

    const newIdea = new Idea({
      ...req.body,
      attachment: req.file ? req.file.filename : null,
    });

    await newIdea.save();
    res.status(201).json({ message: "✅ Form Submitted Successfully!" });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ message: "❌ Error submitting form", error: error.message });
  }
});

// Get all Submissions
router.get("/submissions", async (req, res) => {
  try {
    const ideas = await Idea.find();
    res.status(200).json(ideas);
  } catch (error) {
    res.status(500).json({ message: "❌ Error fetching submissions", error: error.message });
  }
});

module.exports = router;
