const crypto = require("crypto");
const mongooose = require("mongoose");
const validator = require("validator");
const bcrpypt = require("bcryptjs");

const userSchema = mongooose.Schema({
  name: {
    type: String,
    required: [true, "Please provide your name!"],
  },
  email: {
    type: String,
    required: [true, "Please provide your Email"],
    unique: true,
    lowercase: true,
    validate: [
      validator.isEmail,
      "Please provide a valid Email ",
    ],
  },
  photo: {
    type: String,
    default: "default.jpg",
  },
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"],
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please provide the password"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm the password"],
    validate: {
      // This only works on Create and Save
      validator: function (el) {
        return el === this.password;
      },
      message: "Password does'nt match",
    },
  },
  passwordChangedAt: {
    type: String,
    select: false,
  },
  passwordResetToken: String,
  passwordResetTokenExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  // Only this function works when the password is modified
  if (!this.isModified("password")) return next();
  // Hashing the password
  this.password = await bcrpypt.hash(this.password, 10);
  // Delete password confirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || this.isNew)
    return next();
  // decreasing 1 second (1000 millisec) to ensure jwt issued after the password change
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.methods.checkPassword = async function (
  givenPassword,
  storedPassword
) {
  return await bcrpypt.compare(
    givenPassword,
    storedPassword
  );
};

userSchema.methods.changedPasswordAfter = function (
  JWTTimestamp
) {
  if (this.passwordChangedAt) {
    const changedTimeInSec = parseInt(
      this.passwordChangedAt / 1000,
      10
    );
    return JWTTimestamp < changedTimeInSec;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(64).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  // console.log(resetToken, this.passwordResetToken);
  this.passwordResetTokenExpires =
    Date.now() + 5 * 60 * 1000; // Expire-Time 5 minutes after issuing

  return resetToken;
};

const User = mongooose.model("user", userSchema);

module.exports = User;
