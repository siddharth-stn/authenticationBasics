const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mongoDb =
  "mongodb+srv://m001-student:mongodb-basics@sandbox.ed9rkru.mongodb.net/authenticationBasics?retryWrites=true&w=majority";

mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlparser: true });
const db = mongoose.connection;

db.on("error", () => {
  console.error("mongo connection error");
});

mongoose.set("strictQuery", false);

const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
  })
);

const app = express();
app.set("views", __dirname);
app.set("view engine", "pug");

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res, next) => res.render("index"));
app.get("/sign-up", (req, res, next) => res.render("sign-up-form"));
app.post("/sign-up", (req, res, next) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  user.save((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.listen(3000, () => {
  console.log("App is listening on PORT 3000...");
});
