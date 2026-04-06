const router = require("express").Router();
const { z } = require("zod");
const { Parser } = require("json2csv");
const prisma = require("../prisma");
const { protect, allow } = require("../middleware/auth");
const validate = require("../middleware/validate");
const audit = require("../services/auditService");

const recordSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional()
});

const updateSchema = recordSchema.partial();

// EXPORT csv - must be before /:id
router.get("/export", protect, allow("ANALYST", "ADMIN"), async (req, res) => {
  try {
    const { type, category, from, to } = req.query;

    const where = {
      deletedAt: null,
      ...(type && { type }),
      ...(category && { category }),
      ...(from && to && {
        date: { gte: new Date(from), lte: new Date(to) }
      })
    };

    const records = await prisma.financialRecord.findMany({
      where,
      orderBy: { date: "desc" },
      include: { user: { select: { name: true, email: true } } }
    });

    if (records.length === 0)
      return res.status(404).json({ message: "No records found to export" });

    const data = records.map((r) => ({
      id: r.id,
      amount: r.amount,
      type: r.type,
      category: r.category,
      date: new Date(r.date).toISOString().split("T")[0],
      notes: r.notes || "",
      createdBy: r.user.name,
      createdAt: new Date(r.createdAt).toISOString().split("T")[0]
    }));

    const parser = new Parser({
      fields: ["id", "amount", "type", "category", "date", "notes", "createdBy", "createdAt"]
    });

    const csv = parser.parse(data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=records.csv");
    res.status(200).end(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET all records
router.get("/", protect, async (req, res) => {
  try {
    const { type, category, from, to, search, page = 1, limit = 10 } = req.query;

    const where = {
      deletedAt: null,
      ...(type && { type }),
      ...(category && { category: { contains: category, mode: "insensitive" } }),
      ...(search && {
        OR: [
          { notes: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } }
        ]
      }),
      ...(from && to && {
        date: { gte: new Date(from), lte: new Date(to) }
      })
    };

    const [records, total] = await Promise.all([
      prisma.financialRecord.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { date: "desc" },
        include: { user: { select: { name: true, email: true } } }
      }),
      prisma.financialRecord.count({ where })
    ]);

    res.json({
      records,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET single record
router.get("/:id", protect, async (req, res) => {
  try {
    const record = await prisma.financialRecord.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { user: { select: { name: true, email: true } } }
    });
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST create
router.post("/", protect, allow("ANALYST", "ADMIN"), validate(recordSchema), async (req, res) => {
  try {
    const record = await prisma.financialRecord.create({
      data: {
        amount: req.body.amount,
        type: req.body.type,
        category: req.body.category,
        date: new Date(req.body.date),
        notes: req.body.notes,
        userId: req.user.id
      }
    });
    await audit.log(req.user.id, "CREATE", "FinancialRecord", record.id, record);
    res.status(201).json({ message: "Record created", record });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH update
router.patch("/:id", protect, allow("ANALYST", "ADMIN"), validate(updateSchema), async (req, res) => {
  try {
    const record = await prisma.financialRecord.findFirst({
      where: { id: req.params.id, deletedAt: null }
    });
    if (!record) return res.status(404).json({ message: "Record not found" });

    const data = { ...req.body };
    if (data.date) data.date = new Date(data.date);

    const updated = await prisma.financialRecord.update({
      where: { id: req.params.id },
      data
    });
    await audit.log(req.user.id, "UPDATE", "FinancialRecord", req.params.id, req.body);
    res.json({ message: "Record updated", record: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE soft delete
router.delete("/:id", protect, allow("ADMIN"), async (req, res) => {
  try {
    const record = await prisma.financialRecord.findFirst({
      where: { id: req.params.id, deletedAt: null }
    });
    if (!record) return res.status(404).json({ message: "Record not found" });

    await prisma.financialRecord.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() }
    });
    await audit.log(req.user.id, "DELETE", "FinancialRecord", req.params.id, null);
    res.json({ message: "Record deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;