const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises; // For file system operations
const Document = require("../models/Document");
const router = express.Router();

// Multer Disk Storage
const diskStorage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`
    );
  },
});

// Multer Memory Storage (for MongoDB)
const memoryStorage = multer.memoryStorage();

// File Filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, Word, and Excel are allowed."));
  }
};

// Multer Instances
const uploadToDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Upload to File System
router.post(
  "/upload-disk",
  uploadToDisk.single("document"),
  async (req, res) => {
    try {
      const { file } = req;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const document = new Document({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
      });

      await document.save();
      res.status(201).json({ message: "File uploaded successfully", document });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Upload to MongoDB
router.post(
  "/upload-db",
  uploadToMemory.single("document"),
  async (req, res) => {
    try {
      const { file } = req;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const document = new Document({
        filename: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: file.buffer,
      });

      await document.save();
      res.status(201).json({ message: "File uploaded successfully", document });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// Get All Documents
router.get("/", async (req, res) => {
  try {
    const documents = await Document.find();
    res.json(documents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Download File from MongoDB
router.get("/download/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || !document.data) {
      return res.status(404).json({ message: "File not found" });
    }

    res.set("Content-Type", document.mimeType);
    res.set(
      "Content-Disposition",
      `attachment; filename="${document.originalName}"`
    );
    res.send(document.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete Document
router.delete("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // If stored on disk, delete the file from the file system
    if (document.path) {
      try {
        await fs.unlink(document.path);
      } catch (err) {
        console.error(`Failed to delete file: ${document.path}`, err);
      }
    }

    // Delete the document from MongoDB
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
