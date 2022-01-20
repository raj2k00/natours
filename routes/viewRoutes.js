const express = require("express");

const router = express.Router();
const {
  getAllTours,
  getTour,
  login,
  getAccount,
  updateUserData,
  getMyTours,
} = require("../controllers/viewController");
const {
  isLoggedIn,
  protect,
} = require("../controllers/authController");
const {
  createBookingCheckout,
} = require("../controllers/bookingController");

router.get(
  "/",
  createBookingCheckout,
  isLoggedIn,
  getAllTours
);

router.get("/tour/:slug", isLoggedIn, getTour);

router.get("/login", isLoggedIn, login);

router.get("/me", protect, getAccount);

router.get("/my-tours", protect, getMyTours);

router.post("/submit-user-data", protect, updateUserData);

module.exports = router;
