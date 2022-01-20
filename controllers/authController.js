const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const crypto = require("crypto");

const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

const signedToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createTokenSend = (user, statusCode, req, res) => {
  const token = signedToken(user._id);
  const cookieOption = {
    expires: new Date(
      Date.now() +
        process.env.JWT_COOKIE_EXPIRES_IN *
          24 *
          60 *
          60 *
          1000
    ),
    httpOnly: true,
    secure:
      req.secure ||
      req.headers["x-forwarded-proto" === "https"],
  };
  res.cookie("jwt", token, cookieOption);

  // removing the password
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token: token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });
  const url = `${req.protocol}://${req.get("host")}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();
  createTokenSend(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 1.check if email and password are provided
  if (!email || !password)
    return next(
      new AppError("Please Provide Email and Password", 400)
    );
  // 2. Check user exists and given password is correct
  const user = await User.findOne({ email }).select(
    "+password"
  );

  if (
    !user ||
    !(await user.checkPassword(password, user.password))
  ) {
    return next(
      new AppError("Incorrect Username or Password", 401)
    );
  }
  // 3. if everthing ok then send success status
  createTokenSend(user, 200, res);
});
exports.logOut = (req, res) => {
  res.cookie("jwt", "LoggedOut", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

// Only for frontend !
exports.isLoggedIn = async (req, res, next) => {
  // Getting cookies from browser
  if (req.cookies.jwt) {
    try {
      // console.log(token);
      // 2. Token verification
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      // 3.Check if the user is active(not deleted by admin)
      const activeUser = await User.findById(decoded.id);
      if (!activeUser) {
        return next();
      }
      //4. Check that user does'nt changed his password after the token given
      if (activeUser.changedPasswordAfter(decoded.iat))
        return next();

      // Passed all conditions response to the pug template with locals variable
      res.locals.user = activeUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1. Getting token and checking if it is there.
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  // console.log(token);
  if (!token)
    return next(
      new AppError("Please Log in to access this page", 401)
    );
  // 2. Token verification
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );
  // 3.Check if the user is active(not deleted by admin)
  const activeUser = await User.findById(decoded.id);
  if (!activeUser) {
    return next(
      new AppError("User is no longer exist", 401)
    );
  }
  //4. Check that user does'nt changed his password after the token given
  if (activeUser.changedPasswordAfter(decoded.iat))
    return next(
      new AppError(
        "You recently changed your password. Please log in again",
        401
      )
    );
  // Passed all conditions proced to next middleware with req.user document
  res.locals.user = activeUser;
  req.user = activeUser;

  next();
});

exports.restrictTo =
  (...roles) =>
  // roles consists ['lead-guide','admin']
  (req, res, next) => {
    // allow next middle if and only if user role has above two roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permissions to perform this action",
          403
        )
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(
  async (req, res, next) => {
    const { email } = req.body;
    // 1. Check the email is entered
    if (!email)
      return next(
        new AppError("Please provide email address", 404)
      );
    // 2.Check if the user exists with that email address
    const user = await User.findOne({ email: email });
    if (!user)
      return next(
        new AppError(
          "There is no user with that email address",
          404
        )
      );
    // 2. Generate random token for that user
    const resetToken = user.createPasswordResetToken();
    // saving the user document with the hashed token
    // !NOTE remove all validator before saving (because user forgot his password)
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}users/resetPassword/${resetToken}`;

    try {
      await new Email(user, resetUrl).sendPasswordReset();
      res.status(200).json({
        status: "success",
        message: "Reset token sent to your mail",
      });
    } catch (error) {
      this.passwordResetToken = undefined;
      this.passwordResetTokenExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError(
          "There was an error sending password recovery Email. Please try again later",
          500
        )
      );
    }
  }
);

exports.resetPassword = catchAsync(
  async (req, res, next) => {
    // 1. Get the user token and change it into hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpires: { $gt: Date.now() },
    });
    // 2. If there is user and token does'nt expire then set new password
    if (!user)
      return next(
        new AppError("Token is invalid or expired", 400)
      );
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save();
    // 3. Log the user and send new JWT token
    createTokenSend(user, 200, res);
  }
);

exports.updatePassword = catchAsync(
  async (req, res, next) => {
    // 1. Get user from the collection ! update password is only for logged in users
    const user = await User.findById(req.user.id).select(
      "+password"
    );

    // 2. Check if the posted password matches with existing password
    if (
      !(await user.checkPassword(
        req.body.password,
        user.password
      ))
    ) {
      return next(new AppError("Incorrect Password", 400));
    }

    //3. Update the password
    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // 4 success and generate new jwt token
    createTokenSend(user, 200, res);
  }
);
