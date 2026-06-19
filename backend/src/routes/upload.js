const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Images only"));
    cb(null, true);
  },
});

router.post("/", verifyToken, requireAdmin, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "File too large. Maximum size is 20MB." });
      }
      return res.status(400).json({ message: err.message || "Upload failed" });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.json({ url });
  });
});

module.exports = router;
