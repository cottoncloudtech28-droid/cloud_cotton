const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");
const { verifyToken, JWT_SECRET } = require("../middleware/auth");

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
});

const toClient = (user, token) => ({
  token,
  user: { id: user._id.toString(), email: user.email, name: user.name || "", role: user.role },
});

router.post("/signup", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
  const { email, password } = parsed.data;
  try {
    if (await User.findOne({ email })) return res.status(400).json({ message: "Email already in use" });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, name: (req.body.name || "").trim().slice(0, 80) });
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json(toClient(user, token));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.post("/signin", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
  const { email, password } = parsed.data;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: "Invalid email or password" });
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json(toClient(user, token));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password_hash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ id: user._id.toString(), email: user.email, name: user.name || "", role: user.role });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

router.patch("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, currentPassword, newPassword } = req.body;

    if (name !== undefined) user.name = String(name).trim().slice(0, 80);

    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ message: "Current password is required to set a new one" });
      const ok = await bcrypt.compare(currentPassword, user.password_hash);
      if (!ok) return res.status(401).json({ message: "Incorrect current password" });
      if (newPassword.length < 6)
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      user.password_hash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    res.json({ id: user._id.toString(), email: user.email, name: user.name || "", role: user.role });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
