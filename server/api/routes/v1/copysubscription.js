const express = require("express");
const copysubscriptionController = require("../../controllers/Copysubscription");
const { validateSchema } = require("../../middlewares/validation");
const schema = require("../../validations/strategies.validation");
const { isLoggedIn } = require("../../middlewares/auth");
const router = express.Router();
/**
 * Auth routing
 */
router.get("/all-coins", isLoggedIn, copysubscriptionController.listCoin);
router.get("/all-orders", copysubscriptionController.getAllorders);
router.get("/subscription", isLoggedIn, copysubscriptionController.getSubscription);
router.post("/add", isLoggedIn, copysubscriptionController.add);
router.post("/copytrading", isLoggedIn, copysubscriptionController.copyTrading);
router.post("/place", isLoggedIn, copysubscriptionController.placeOrder);
router.post("/leverage", isLoggedIn, copysubscriptionController.leverage);
module.exports = router;