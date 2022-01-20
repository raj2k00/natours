const path = require("path");
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
// eslint-disable-next-line import/no-unresolved
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/appError");
const GlobalErrorController = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRoutes");
const bookingRouter = require("./routes/bookingRoutes");
const viewRouter = require("./routes/viewRoutes");

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
//MIDDLEWARE to get the data from the body
// console.log(app.get("env"));
// app.use(helmet());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: [
//           "'self'",
//           "data:",
//           "blob:",
//           "https:",
//           "ws:",
//         ],
//         baseUri: ["'self'"],
//         fontSrc: ["'self'", "https:", "data:"],
//         scriptSrc: [
//           "'self'",
//           "https:",
//           "http:",
//           "blob:",
//           "https://*.mapbox.com",
//           "https://js.stripe.com",
//           "https://m.stripe.network",
//           "https://*.cloudflare.com",
//         ],
//         frameSrc: ["'self'", "https://js.stripe.com"],
//         objectSrc: ["'none'"],
//         styleSrc: ["'self'", "https:", "'unsafe-inline'"],
//         workerSrc: [
//           "'self'",
//           "data:",
//           "blob:",
//           "https://*.tiles.mapbox.com",
//           "https://api.mapbox.com",
//           "https://events.mapbox.com",
//           "https://m.stripe.network",
//         ],
//         childSrc: ["'self'", "blob:"],
//         imgSrc: ["'self'", "data:", "blob:"],
//         formAction: ["'self'"],
//         connectSrc: [
//           "'self'",
//           "'unsafe-inline'",
//           "data:",
//           "blob:",
//           "https://*.stripe.com",
//           "https://*.mapbox.com",
//           "https://*.cloudflare.com/",
//           "https://bundle.js:*",
//           "ws://127.0.0.1:*/",
//         ],
//         upgradeInsecureRequests: [],
//       },
//     },
//   })
// );
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message:
    "Too many request from this IP please try again after one hour",
});
app.use("/api", limiter);

app.use(express.json({ limit: "10kb" }));
app.use(
  express.urlencoded({ extended: true, limit: "10kb" })
);
app.use(cookieParser());
// to prevent against NoSQL query injection
app.use(mongoSanitize());
//to prevent against xss attacks
app.use(xss());
// to prevent prameter pollution
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingsAverage",
      "ratingsQuantity",
      "difficulty",
      "maxGroupSize",
      "price",
    ],
  })
);

//our OWN MIDDLEWARE  that gets added to the middleware stack remember to add next()!
app.use((req, res, next) => {
  console.log("Hi from the server 😜");
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

//APP ROUTES
app.use("/", viewRouter);
// API ROUTES
// app.get("/", (req, res) => {
//   res.status(200).json({
//     message: "Hi from the server",
//     app: "natours use this uri'/api/v1/tours or /api/v1/users'",
//   });
// });

// app.get("/api/v1/tours", getAllTours);
// app.get("/api/v1/tours/:id", getTour);
// app.post("/api/v1/tours", createTour);
// app.patch("/api/v1/tours/:id", updateTour);
// app.delete("/api/v1/tours/:id", deleteTour);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

app.all("*", (req, res, next) => {
  const err = new AppError(
    `Can't find ${req.originalUrl} that you requested`,
    404
  );
  next(err);
});

app.use(GlobalErrorController);
module.exports = app;
