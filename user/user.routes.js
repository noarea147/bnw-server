const express = require("express");
const UserController = require("./user.controller");
const jwt = require("../middleware/jwt");

const router = express.Router();

router.post("/register", UserController.Register);
router.get(
  "/verify-email/:userId/:VerificationKey",
  UserController.EmailVerification
);
router.post("/login", UserController.Login);
router.post("/update", jwt.authenticateToken, UserController.Update);
router.post("/send-verification-sms", UserController.SendVerificationSMS);
router.post(
  "/verify-account",
  jwt.authenticateToken,
  UserController.VerifyAccount
);
router.post("/forgot-password", UserController.ForgotPassword);
router.post("/reset-password", UserController.ResetPassword);
router.post("/refresh", UserController.Refresh);
router.post("/delete", jwt.authenticateToken, UserController.DeleteUser);
module.exports = router;
