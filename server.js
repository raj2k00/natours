require("dotenv").config();
const mongoose = require("mongoose");

process.on("uncaughtException", (err) => {
  console.log(
    "uncaught Exception 💥💥 Server shutting down"
  );
  console.log(err.name, err.message);
  process.exit(1);
});

const app = require("./app");
// console.log(process.env);

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  // .connect(process.env.DATABASE_LOCAL){
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then(() => console.log("Connected to Cloud Database"));

const port = process.env.PORT;

const server = app.listen(port, () => {
  console.log(`server started on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log(
    "unhandled Rejection 💥💥 Server shutting down gracefully"
  );
  console.log(err.name, err.message);
  server.close(() => {
    process.exit();
  });
});
