const express = require("express");
const rota = express.Router();
const execute = require("../services/execute");
const authMidd = require("../middleware/auth");
const utils = require("../utils/templates");

rota.use(authMidd);

// GET /notifications — lista todas as notificações do usuário
rota.get("/", async (req, res) => {
  try {
    const notifications = await execute.get_notifications(req.userId);
    return res.json(utils.ok(notifications));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /notifications"));
  }
});

// PATCH /notifications/:id/read — marca uma notificação como lida
rota.patch("/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json(utils.fail("ID inválido"));
    const updated = await execute.mark_notification_read(id, req.userId);
    if (!updated) return res.status(404).json(utils.fail("Notificação não encontrada ou já lida"));
    return res.json(utils.ok(updated));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "PATCH /notifications/:id/read"));
  }
});

// PATCH /notifications/read-all — marca todas como lidas
rota.patch("/read-all", async (req, res) => {
  try {
    const count = await execute.mark_all_notifications_read(req.userId);
    return res.json(utils.ok({ updated: count }));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "PATCH /notifications/read-all"));
  }
});

module.exports = rota;
