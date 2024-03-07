const express = require("express");
const orderPlaceController = require("../../controllers/Orderplace");
const { isLoggedIn } = require("../../middlewares/auth");
const router = express.Router();
/**
 * Auth routing
 */
router.get("/current", isLoggedIn, orderPlaceController.orderCurrentList);
router.get("/position", isLoggedIn, orderPlaceController.orderPositionList);
router.get("/history", isLoggedIn, orderPlaceController.orderHistoryList);

router.post("/cancel", isLoggedIn, orderPlaceController.orderCancel);
router.put("/edit", isLoggedIn, orderPlaceController.orderEdit);

router.put("/position/edit", isLoggedIn, orderPlaceController.orderPositionEdit);
router.put("/position/close", isLoggedIn, orderPlaceController.orderPositionClose);
module.exports = router;