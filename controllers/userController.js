const multer = require("multer");
const Jimp = require("jimp");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
// const APIFeatures = require("../utils/apiFeatures");
const AppError = require("../utils/appError");
const factory = require("./factoryHandler");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//Multer configs
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "public/img/users");
//   },
//   filename: (req, file, cb) => {
//     const extention = file.mimetype.split("/")[1];
//     cb(
//       null,
//       `user-${req.user.id}-${Date.now()}.${extention}`
//       // filename looks like user-5fdj23i4skdlf3d-12345678.jpeg (unique userid and timestamp)
//     );
//   },
// });

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
exports.userPhotoUpload = upload.single("photo");

exports.resizeUserPhoto = catchAsync(
  async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `user-${
      req.user.id
    }-${Date.now()}.jpg`;

    Jimp.read(req.file.buffer, async (err, image) => {
      if (err) throw err;
      await image
        .cover(500, 500) // resize
        .quality(60) // set JPEG quality
        .writeAsync(
          `public/img/users/${req.file.filename}`
        ); // save
    });
    next();
  }
);

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // console.log(req.body);
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        "Please use /updatePassword for updating password",
        400
      )
    );
  const filteredBody = filterObj(req.body, "name", "email");
  if (req.file) filteredBody.photo = req.file.filename;
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteAccount = catchAsync(
  async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, {
      active: false,
    });
    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

exports.createUser = (req, res) => {
  res.status(500).json({
    message:
      "this route is not defined please use /signup instead",
  });
};

exports.getAllUsers = factory.getAllDoc(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
