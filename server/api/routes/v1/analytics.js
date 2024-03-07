const express = require("express");
const analyticsController = require("../../controllers/Analytics");
const { isLoggedIn } = require("../../middlewares/auth");
const router = express.Router();
/**
 * Auth routing
 */

router.get("/withdraw", isLoggedIn, analyticsController.withdrawClosingtrade);

router.get("/main-trade/:strategies", isLoggedIn, analyticsController.maintradeList);
router.get("/close-trade/:strategies", isLoggedIn, analyticsController.closetradeList);
router.post("/subscriber", isLoggedIn, analyticsController.subscriberTradeList);



module.exports = router;