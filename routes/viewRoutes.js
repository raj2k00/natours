const express = require("express");

const router = express.Router();
const {
  getAllTours,
  getTour,
  login,
  getAccount,
  updateUserData,
  getMyTours,
  alerts,
} = require("../controllers/viewController");
const {
  isLoggedIn,
  protect,
} = require("../controllers/authController");

router.use(alerts);

router.get("/", isLoggedIn, getAllTours);
router.get("/tour/:slug", isLoggedIn, getTour);
router.get("/login", isLoggedIn, login);
router.get("/me", protect, getAccount);
router.get("/my-tours", protect, getMyTours);
router.post("/submit-user-data", protect, updateUserData);

module.exports = router;
