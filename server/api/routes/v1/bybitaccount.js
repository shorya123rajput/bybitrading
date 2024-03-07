const express = require("express");
const bybitconnectionController = require("../../controllers/Bybitconnection");
const { validateSchema } = require("../../middlewares/validation");
const schema = require("../../validations/bybitaccount.validation");
const { isLoggedIn } = require("../../middlewares/auth");
const router = express.Router();
/**
 * Auth routing
 */

router.get("/list", isLoggedIn, bybitconnectionController.listAccount);
router.get("/apidata", isLoggedIn, bybitconnectionController.apiAccountdata);

router.post("/add", isLoggedIn, validateSchema(schema['addAccount']), bybitconnectionController.addAccount);
router.put("/edit", isLoggedIn, bybitconnectionController.updateBybitaccount);
router.delete("/delete/:bybitaccountId", isLoggedIn, bybitconnectionController.deleteBybitaccount);

module.exports = router;