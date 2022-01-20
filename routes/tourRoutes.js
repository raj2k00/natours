const express = require("express");

const router = express.Router();
const {
  protect,
  restrictTo,
} = require("../controllers/authController");

const {
  getMonthlyPlan,
  getTourStats,
  aliasTopTours,
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  getTourNearMe,
  getDistance,
  uploadTourImages,
  resizeTourImages,
} = require("../controllers/tourController");

const reviewRouter = require("./reviewRoutes");

router.use("/:tourId/reviews", reviewRouter);

router
  .route("/top-5-cheap")
  .get(aliasTopTours, getAllTours);

router.route("/get-tour-stats").get(getTourStats);

router
  .route("/tour-nearme/:distance/center/:latlng/unit/:unit")
  .get(getTourNearMe);

router
  .route("/distance/:latlng/unit/:unit")
  .get(getDistance);

router
  .route("/get-monthly-plan/:year")
  .get(
    protect,
    restrictTo("admin", "lead-guide", "guide"),
    getMonthlyPlan
  );

router
  .route("/")
  .get(getAllTours)
  .post(
    protect,
    restrictTo("admin", "lead-guide"),
    createTour
  );

router
  .route("/:id")
  .get(getTour)
  .patch(
    protect,
    restrictTo("lead-guide", "admin"),
    uploadTourImages,
    resizeTourImages,
    updateTour
  )
  .delete(
    protect,
    restrictTo("lead-guide", "admin"),
    deleteTour
  );

module.exports = router;
