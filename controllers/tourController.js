const multer = require("multer");
const Jimp = require("jimp");

const Tour = require("../models/tourModel");
const AppError = require("../utils/appError");
// const APIFeatures = require("../utils/apiFeatures");
const catchAsync = require("../utils/catchAsync");
const factory = require("./factoryHandler");

//Handling multiple image uploads
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Please upload images", 400), false);
  }
};
const multerStorage = multer.memoryStorage();

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

// const upload = multer({ dest: "public/img/users" });
exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(
  async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images)
      return next();

    //1 for cover Image
    req.body.imageCover = `tour-${
      req.params.id
    }-${Date.now()}-cover.jpeg`;

    Jimp.read(
      req.files.imageCover[0].buffer,
      async (err, image) => {
        if (err)
          return next(
            new AppError(
              "Error occured while processing image",
              500
            )
          );
        await image
          .cover(2000, 1333) // resize
          .quality(90) // set JPEG quality
          .writeAsync(
            `public/img/tours/${req.body.imageCover}`
          ); // save
      }
    );

    // 2 images

    req.body.images = [];

    await Promise.all(
      req.files.images.map(async (file, index) => {
        const filename = `tour-${
          req.params.id
        }-${Date.now()}-${index + 1}.jpeg`;

        Jimp.read(file.buffer, async (err, image) => {
          if (err)
            return next(
              new AppError(
                "Error occured while processing image",
                500
              )
            );
          await image
            .cover(2000, 1333) // resize
            .quality(90) // set JPEG quality
            .writeAsync(`public/img/tours/${filename}`); // save
        });
        req.body.images.push(filename);
      })
    );

    next();
  }
);
////
exports.aliasTopTours = (req, res, next) => {
  req.query.sort = "-price,ratingsAverage";
  req.query.limit = "5";
  req.query.fields =
    "-_id,name,price,ratingsAverage,summary,difficulty";
  next();
};

exports.getAllTours = factory.getAllDoc(Tour);
exports.getTour = factory.getOne(Tour, { path: "reviews" });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(
  async (req, res, next) => {
    const stats = await Tour.aggregate([
      {
        $match: { ratingsAverage: { $gte: 4.5 } },
      },
      {
        $group: {
          _id: { $toUpper: "$difficulty" },
          totalTours: { $sum: 1 },
          totalRating: { $sum: "$ratingsQuantity" },
          avgRating: { $avg: "$ratingsAverage" },
          avgPrice: { $avg: "$price" },
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
      {
        $sort: { avgPrice: 1 },
      },
    ]);
    res.status(200).json({
      status: "success",
      total: stats.length,
      requestedAt: req.requestTime,
      data: {
        stats,
      },
    });
  }
);

exports.getMonthlyPlan = catchAsync(
  async (req, res, next) => {
    const year = req.params.year * 1; //2021
    const plan = await Tour.aggregate([
      {
        $unwind: "$startDates",
      },
      {
        $match: {
          startDates: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`),
          },
        },
      },
      {
        $group: {
          _id: { $month: "$startDates" },
          numTourStarts: { $sum: 1 },
          tour: { $push: "$name" },
        },
      },
      {
        $addFields: { month: "$_id" },
      },
      {
        $project: {
          _id: 0,
        },
      },
      {
        $sort: {
          numTourStarts: -1,
        },
      },
      {
        $limit: 6,
      },
    ]);
    // console.log(new Date(`${year}-01-01`));
    res.status(200).json({
      status: "success",
      total: plan.length,
      requestedAt: req.requestTime,
      data: {
        plan,
      },
    });
  }
);

exports.getTourNearMe = catchAsync(
  async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(",");
    const radius =
      unit === "km" ? distance / 6378.1 : distance / 3963.2;
    if (!lat || !lng)
      return next(
        new AppError(
          "Please provide latitude and longitude in lat,lng format",
          500
        )
      );
    // console.log(distance, lat, lng, unit);
    const tour = await Tour.find({
      startLocation: {
        $geoWithin: { $centerSphere: [[lng, lat], radius] },
      },
    });

    res.status(200).json({
      status: "success",
      results: tour.length,
      data: tour,
    });
  }
);

exports.getDistance = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const multilier = unit === "mi" ? 0.000621371 : 0.001;
  const [lat, lng] = latlng.split(",");
  if (!lat || !lng)
    return next(
      new AppError(
        "Please provide latitude and longitude in lat,lng format",
        500
      )
    );
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: "distance",
        distanceMultiplier: multilier,
      },
    },
    {
      $project: {
        _id: -1,
        distance: 1,
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: "success",
    results: distances.length,
    data: distances,
  });
});
