const prisma = require("../prisma");

const log = async (userId, action, entity, entityId, changes = null) => {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, changes }
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
};

module.exports = { log };