const router = require("express").Router();
const prisma = require("../prisma");
const { protect, allow } = require("../middleware/auth");

router.get("/", protect, allow("ADMIN"), async (req, res) => {
  try {
    const { page = 1, limit = 20, entity, action } = req.query;

    const where = {
      ...(entity && { entity }),
      ...(action && { action })
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true, role: true } }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;