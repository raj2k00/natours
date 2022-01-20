const mongoose = require("mongoose");
const slugify = require("slugify");
// const User = require("./userModel");
// const validator = require("validator");

const tourSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A tour must have a name"],
      unique: true,
      trim: true,
      maxlength: [
        40,
        "A tour name must have less or equal then 40 characters",
      ],
      minlength: [
        10,
        "A tour name must have more or equal then 10 characters",
      ],
      // validate: [
      //   validator.isAlpha,
      //   "Tour name must only contain characters",
      // ],
    },
    slug: {
      type: String,
      // unique: true,
      // required: true,
    },
    duration: {
      type: Number,
      required: [true, "A tour must have a duration"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "A tour must have a group size"],
    },
    difficulty: {
      type: String,
      required: [true, "A tour must have a difficulty"],
      enum: {
        values: ["easy", "medium", "difficult"],
        message:
          "Difficulty is either easy,medium or difficult only",
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "A tour must have a price"],
    },
    priceDiscount: {
      type: Number,
      // Does'nt work with updating documents :(
      validate: {
        validator: function (value) {
          return value < this.price;
        },
        message:
          "Discount must be less than total price of the tour",
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "A tour must have a description"],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, "A tour must have a cover image"],
    },
    secretTour: {
      type: Boolean,
      default: false,
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "user",
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });
// VIRTUAL PROPERTY NOT VISIBLE OUTSIDE (BUSINESSS LOGIC)
tourSchema.virtual("durationWeeks").get(function () {
  return this.duration / 7;
});

tourSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "tour",
  localField: "_id",
});

// DOCUMENT MIDDLEWARE
//this - keyword represents current document
tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// This code will embedd the users as guides in tour document if we specify id in the array
// tourSchema.pre("save", async function (next) {
//   const guidePromises = this.guides.map(
//     async (id) => await User.findById(id)
//   );
//   this.guides = await Promise.all(guidePromises);
//   next();
// });

//QUERY MIDDLEWARE regular expression is used to use all find methods
// this -keyword represents current query
tourSchema.pre(/^find/, function (next) {
  this.options.runValidators = true;
  this.start = Date.now();
  this.find({ secretTour: { $ne: true } });
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: "guides",
    select: "-__v -passwordChangedAt",
  });
  next();
});
tourSchema.post(/^find/, function (doc, next) {
  console.log(
    `this query hook took ${
      Date.now() - this.start
    } milliseconds`
  );
  next();
});

//AGGREGATION MIDDLEWARE
//this -keyword represents currert aggregation pipeline
// tourSchema.pre("aggregate", function (next) {
//   // unshift add element as the first element
//   this.pipeline().unshift({
//     $match: { secretTour: { $ne: true } },
//   });
//   console.log(this.pipeline());
//   next();
// });

const Tour = mongoose.model("Tour", tourSchema);

module.exports = Tour;
