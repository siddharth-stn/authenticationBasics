require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt");

//Set up mongoose and connect to the mongoDb database
mongoose.set("strictQuery", false);

mongoose.connect(process.env.MONGO_KEY, {
  useUnifiedTopology: true,
  useNewUrlparser: true,
});

const db = mongoose.connection;

db.on("error", () => {
  console.error("mongo connection error");
});

// make a mongoose model(will become a collection in mongoDb) using schema
const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
  })
);

const app = express();
//setup pug to be used as the view engine and also tell express about the location of the pug files
app.set("views", __dirname);
app.set("view engine", "pug");

//* Configure passport

/* Step One(setting up the LocalStrategy):-
This function will be called by passport when we use the 
passport.authenticate() as a middleware in a route
** username and password will be supplied by the user who wants to login,
via an HTML form, in the req.body, and will be taken by the inner working of the passport 
and given to the LocalStrategy function/class*/
passport.use(
  new LocalStrategy((username, password, done) => {
    //findOne is a mongoose function which finds the associated document
    //from the mongoDb database and supplies it to the callback as second
    // argument or gives and error is there is some problem in finding the document in the database
    //the error (if there is) will be given to the first argument of the callback
    User.findOne({ username: username }, async (err, user) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        return done(null, false, { message: "Incorrect username" });
      }
      if (!(await bcrypt.compare(password, user.password))) {
        return done(null, false, { message: "Incorrect password" });
      }
      return done(null, user);
    });
    //here done is a callback function of the LocalStrategy funcition/class
  })
);

/* These two functions make sure 
that the user remains logged in after authentication, 
and stay logged in as the user moves around in the app(website).
Passport will use some data to create a cookie which is stored
in the user's browser. These two functions define the information 
which passport is looking for when it creates and then decodes the cookie. */
passport.serializeUser((user, done) => {
  // Here the user object is supplied by passport
  done(null, user.id); // This user id(given by database) is stored in the cookie in our browser
});

passport.deserializeUser((id, done) => {
  // Here the id is supplied by passport from the cookie in the browser
  User.findById(id, (err, user) => {
    done(err, user); // user is added to req as req.user by passport
  });
});

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.locals.currUser = req.user; // req.user is supplied by passport
  next();
});

app.get("/", (req, res, next) =>
  res.render("index", { user: res.locals.currUser })
); // This req.user is supplied by the passport middleware which runs on every route called.
app.get("/sign-up", (req, res, next) => res.render("sign-up-form"));
app.post(
  "/sign-up",
  async (req, res, next) => {
    const password = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      username: req.body.username,
      password,
    });
    user.save((err) => {
      if (err) {
        return next(err);
      }
      next();
    });
  },
  //now automatically login the user after register
  //this function authenticates the user with the supplied request body
  //with the html sign up form
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);

/* all we have to do is call passport.authenticate(). This middleware performs
numerous functions behind the scenes. Among other things, it looks at
the request body for parameters named username and password 
then runs the LocalStrategy function that we defined earlier to 
see if the username and password are in the database.*/
/* It then creates a session cookie that gets stored in the 
user’s browser, and that we can access in all future requests 
to see whether or not that user is logged in.   */
app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.listen(process.env.PORT, () => {
  console.log("App is listening on PORT 3000...");
});
