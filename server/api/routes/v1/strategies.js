const express = require("express");
const strategiesController = require("../../controllers/Strategies");
const { validateSchema } = require("../../middlewares/validation");
const schema = require("../../validations/strategies.validation");
const { isLoggedIn } = require("../../middlewares/auth");
const router = express.Router();
/**
 * Auth routing
 */

router.get("/public-list", isLoggedIn, strategiesController.publicList);
router.get("/private-list", isLoggedIn, strategiesController.list);
router.post("/add", isLoggedIn, validateSchema(schema['addStrategy']), strategiesController.add);
router.delete("/delete/:strategyId", isLoggedIn, strategiesController.deleteStrategy);
module.exports = router;