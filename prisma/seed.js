const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const analystPass = await bcrypt.hash("analyst123", 10);
  const viewerPass = await bcrypt.hash("viewer123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@finance.com" },
    update: {},
    create: { name: "Admin User", email: "admin@finance.com", password: adminPass, role: "ADMIN" }
  });

  const analyst = await prisma.user.upsert({
    where: { email: "analyst@finance.com" },
    update: {},
    create: { name: "Analyst User", email: "analyst@finance.com", password: analystPass, role: "ANALYST" }
  });

  await prisma.user.upsert({
    where: { email: "viewer@finance.com" },
    update: {},
    create: { name: "Viewer User", email: "viewer@finance.com", password: viewerPass, role: "VIEWER" }
  });

  const categories = ["Salary", "Food", "Transport", "Utilities", "Freelance", "Entertainment", "Healthcare"];

  for (let i = 0; i < 40; i++) {
    const type = i % 3 === 0 ? "INCOME" : "EXPENSE";
    const category = categories[Math.floor(Math.random() * categories.length)];
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 180));

    await prisma.financialRecord.create({
      data: {
        amount: parseFloat((Math.random() * 5000 + 100).toFixed(2)),
        type,
        category,
        date,
        notes: `${type === "INCOME" ? "Received" : "Spent"} on ${category}`,
        userId: i % 2 === 0 ? admin.id : analyst.id
      }
    });
  }

  console.log("Database seeded successfully");
  console.log("Admin: admin@finance.com / admin123");
  console.log("Analyst: analyst@finance.com / analyst123");
  console.log("Viewer: viewer@finance.com / viewer123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());