const express = require("express");

const router = express.Router();
const {
  getAllUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateMe,
  deleteAccount,
  getMe,
  userPhotoUpload,
  resizeUserPhoto,
} = require("../controllers/userController");

const {
  signup,
  login,
  protect,
  forgotPassword,
  resetPassword,
  updatePassword,
  restrictTo,
  logOut,
} = require("../controllers/authController");

//Get/POST ROUTES
router.post("/signup", signup);
router.post("/login", login);
router.get("/logout", logOut);
router.post("/forgotPassword", forgotPassword);

// PATCH ROUTES
router.patch("/resetPassword/:token", resetPassword);

//below routes are protected so use protect middle ware before calling them
router.use(protect);

router.patch("/updatePassword", updatePassword);
router.get("/aboutMe", getMe, getUser);
router.patch(
  "/updateProfile",
  userPhotoUpload,
  resizeUserPhoto,
  updateMe
);
router.delete("/deleteAccount", deleteAccount);

router.use(restrictTo("admin"));

router.route("/").get(getAllUsers).post(createUser);

router
  .route("/:id")
  .get(getUser)
  .patch(updateUser)
  .delete(deleteUser);

module.exports = router;
