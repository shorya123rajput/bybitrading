const express = require("express");
const authController = require("../../controllers/User");
const { validateSchema } = require("../../middlewares/validation");
const schema = require("../../validations/auth.validation");
const { isLoggedIn } = require("../../middlewares/auth");
const router = express.Router();
/**
 * Auth routing
 */

router.get("/user/:userId", isLoggedIn, authController.getUser);
router.get("/users/profile", isLoggedIn, authController.getUserProfile);
router.get("/users/list", isLoggedIn, authController.list);



router.post("/signup", validateSchema(schema['signupUser']), authController.signup);
router.post("/login", validateSchema(schema['loginUser']), authController.authentication);
router.post("/forgot-password", validateSchema(schema['forgot']), authController.forgotPassword);
router.post("/reset", validateSchema(schema['reset']), authController.reset);

router.put("/user/update", isLoggedIn, authController.updateUser);
router.put("/user/updatedata", isLoggedIn, authController.updateUserData);
router.delete("/user/delete/:userId", isLoggedIn, authController.deleteUser);
// router.post("/forgot", authController.forgot);
// router.post("/reset", authController.reset);

module.exports = router;