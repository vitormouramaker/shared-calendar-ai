const express = require("express");
const rota = express.Router();
const authMidd = require("../middleware/auth");
const execute = require("../services/execute");
const utils = require("../utils/templates");

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

rota.use(authMidd);

rota.get("/", async (req, res) => {
  try {
    const categories = await execute.get_user_categories(req.userId);
    return res.json(utils.ok(categories));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "GET /categories"));
  }
});

rota.post("/", async (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const color = String(req.body?.color ?? "").trim();

    if (!name || !color) {
      return res.status(400).json(utils.fail("Nome e cor são obrigatórios."));
    }

    if (!HEX_COLOR_REGEX.test(color)) {
      return res
        .status(400)
        .json(utils.fail("Informe uma cor hexadecimal válida."));
    }

    const existing = await execute.find_user_category_by_name(req.userId, name);
    if (existing) {
      return res
        .status(409)
        .json(utils.fail("Você já possui uma categoria com esse nome."));
    }

    const category = await execute.create_user_category(
      req.userId,
      name,
      color,
    );
    return res.status(201).json(utils.ok(category, "Categoria criada."));
  } catch (error) {
    return res.status(500).json(utils.errorHandle(error, "POST /categories"));
  }
});

rota.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const name = String(req.body?.name ?? "").trim();
    const color = String(req.body?.color ?? "").trim();

    if (!Number.isFinite(id)) {
      return res.status(400).json(utils.fail("Categoria inválida."));
    }

    if (!name || !color) {
      return res.status(400).json(utils.fail("Nome e cor são obrigatórios."));
    }

    if (!HEX_COLOR_REGEX.test(color)) {
      return res
        .status(400)
        .json(utils.fail("Informe uma cor hexadecimal válida."));
    }

    const existingById = await execute.find_user_category_by_id(id, req.userId);
    if (!existingById) {
      return res.status(404).json(utils.fail("Categoria não encontrada."));
    }

    const existingByName = await execute.find_user_category_by_name(
      req.userId,
      name,
    );
    if (existingByName && existingByName.id !== id) {
      return res
        .status(409)
        .json(utils.fail("Você já possui uma categoria com esse nome."));
    }

    const category = await execute.update_user_category(
      id,
      req.userId,
      name,
      color,
    );
    return res.json(utils.ok(category, "Categoria atualizada."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "PUT /categories/:id"));
  }
});

rota.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json(utils.fail("Categoria inválida."));
    }

    const deleted = await execute.delete_user_category(id, req.userId);

    if (!deleted) {
      return res.status(404).json(utils.fail("Categoria não encontrada."));
    }

    return res.json(utils.ok(null, "Categoria removida."));
  } catch (error) {
    return res
      .status(500)
      .json(utils.errorHandle(error, "DELETE /categories/:id"));
  }
});

module.exports = rota;
