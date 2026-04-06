const router = require("express").Router();
const prisma = require("../prisma");
const { protect } = require("../middleware/auth");

// Summary with optional date range
router.get("/summary", protect, async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter = from && to
      ? { date: { gte: new Date(from), lte: new Date(to) } }
      : {};

    const baseWhere = { deletedAt: null, ...dateFilter };

    const [income, expense, byCategory, recent, totalRecords] = await Promise.all([
      prisma.financialRecord.aggregate({
        where: { ...baseWhere, type: "INCOME" },
        _sum: { amount: true },
        _count: true
      }),
      prisma.financialRecord.aggregate({
        where: { ...baseWhere, type: "EXPENSE" },
        _sum: { amount: true },
        _count: true
      }),
      prisma.financialRecord.groupBy({
        by: ["category", "type"],
        where: baseWhere,
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: "desc" } }
      }),
      prisma.financialRecord.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true } } }
      }),
      prisma.financialRecord.count({ where: baseWhere })
    ]);

    const totalIncome = income._sum.amount || 0;
    const totalExpense = expense._sum.amount || 0;

    res.json({
      filters: { from: from || "all time", to: to || "all time" },
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      totalRecords,
      incomeCount: income._count,
      expenseCount: expense._count,
      byCategory,
      recentActivity: recent
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Monthly trends
router.get("/trends", protect, async (req, res) => {
  try {
    const records = await prisma.financialRecord.findMany({
      where: { deletedAt: null },
      select: { amount: true, type: true, date: true }
    });

    const trendsMap = {};
    records.forEach((r) => {
      const date = new Date(r.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleString("default", { month: "short", year: "numeric" });
      if (!trendsMap[key]) trendsMap[key] = { month: label, INCOME: 0, EXPENSE: 0 };
      trendsMap[key][r.type] += r.amount;
    });

    const trends = Object.entries(trendsMap)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([_, v]) => ({
        month: v.month,
        income: parseFloat(v.INCOME.toFixed(2)),
        expense: parseFloat(v.EXPENSE.toFixed(2)),
        net: parseFloat((v.INCOME - v.EXPENSE).toFixed(2))
      }));

    res.json({ trends });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Category breakdown
router.get("/categories", protect, async (req, res) => {
  try {
    const { type } = req.query;
    const data = await prisma.financialRecord.groupBy({
      by: ["category"],
      where: { deletedAt: null, ...(type && { type }) },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } }
    });
    res.json({ categories: data });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;