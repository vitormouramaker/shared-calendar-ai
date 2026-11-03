const express = require("express");
const rota = express.Router();
const execute = require("../services/execute");
const authMidd = require("../middleware/auth");
const utils = require("../utils/templates");

rota.use(authMidd);

rota.get("/home", async (req, res) => {
  try {
    const data = await execute.dashboard_home(req.userId);
    return res.json(utils.ok(data));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /dashboard/home"));
  }
});

module.exports = rota;
