const router = require("express").Router();
const prisma = require("../prisma");
const { protect, allow } = require("../middleware/auth");

// Get all users
router.get("/", protect, allow("ADMIN"), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        role: true, status: true, createdAt: true,
        _count: { select: { records: true } }
      }
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update role
router.patch("/:id/role", protect, allow("ADMIN"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["VIEWER", "ANALYST", "ADMIN"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    if (req.params.id === req.user.id)
      return res.status(400).json({ message: "Cannot change your own role" });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });
    res.json({ message: "Role updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update status
router.patch("/:id/status", protect, allow("ADMIN"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["ACTIVE", "INACTIVE"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    if (req.params.id === req.user.id)
      return res.status(400).json({ message: "Cannot deactivate your own account" });

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, name: true, email: true, status: true }
    });
    res.json({ message: "Status updated", user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get single user
router.get("/:id", protect, allow("ADMIN"), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true,
        role: true, status: true, createdAt: true,
        records: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
