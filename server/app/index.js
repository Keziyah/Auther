'use strict';

var app = require('express')();
var path = require('path');
var session = require('express-session');
var User = require('../api/users/user.model');
var passport = require('passport')
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
// "Enhancing" middleware (does not send response, server-side effects only)

app.use(require('./logging.middleware'));

app.use(require('./body-parsing.middleware'));

//express-sessions
app.use(session({
  // this mandatory configuration ensures that session IDs are not predictable
  secret: 'tongiscool', // or whatever you like
  // these options are recommended and reduce session concurrency issues
  resave: false,
  saveUninitialized: false
}));

app.use(function (req, res, next) {
  console.log('session', req.session);
  next();
});

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy({
    clientID: '611827263805-8pmd7fls2p0n922ctdgqldcn2f7oud9i.apps.googleusercontent.com',
    clientSecret: '9aVS1TYZMt5N_kXv99iZ7CEz',
    callbackURL: '/auth/google/callback'
  },
  // Google will send back the token and profile
  function (token, refreshToken, profile, done) {
    // the callback will pass back user profile information and each service (Facebook, Twitter, and Google) will pass it back a different way. Passport standardizes the information that comes back in its profile object.
  var info = {
  name: profile.displayName,
  email: profile.emails[0].value,
  photo: profile.photos ? profile.photos[0].value : undefined
};
User.findOrCreate({
  where: {googleId: profile.id},
  defaults: info
})
.spread(function (user) {
  done(null, user);
})
.catch(done);
  })
);
app.get('/auth/google', passport.authenticate('google', { scope: 'email' }));

// handle the callback after Google has authenticated the user
app.get('/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/', // or wherever
    failureRedirect: '/' // or wherever
  })
);


app.post('/login', function (req, res, next) {
  User.findOne({
    where: req.body
  })
    .then(function (user) {
      if (!user) {
        res.sendStatus(401);
      } else {
        req.session.userId = user.id;
        res.status(200).json(user);
        console.log(user)
        console.log('logged in: ', req.session)
      }
    })
    .catch(next);
});

app.get('/logout', function (req, res, next) {
  req.session.destroy()
    console.log("logged out: ", req.session)

  res.status(204).send("hello")
})

app.use('/api', function (req, res, next) {
  if (!req.session.counter) req.session.counter = 0;
  console.log('counter', ++req.session.counter);
  next();
});

// "Responding" middleware (may send a response back to client)

app.use('/api', require('../api/api.router'));

var validFrontendRoutes = ['/', '/stories', '/users', '/stories/:id', '/users/:id', '/signup', '/login'];
var indexPath = path.join(__dirname, '..', '..', 'browser', 'index.html');
validFrontendRoutes.forEach(function (stateRoute) {
  app.get(stateRoute, function (req, res) {
    res.sendFile(indexPath);
  });
});



app.use(require('./statics.middleware'));

app.use(require('./error.middleware'));

module.exports = app;
