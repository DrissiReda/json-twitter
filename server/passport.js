var LocalStrategy = require('passport-local'),
TotpStrategy = require('passport-totp').Strategy,
FacebookStrategy = require('passport-facebook').Strategy,
TwitterStrategy  = require('passport-twitter').Strategy,
GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// load up the user model
var User       = require('./models/user');

// load the auth variable
var configAuth = require('../auth');

var funct  = require('../functions.js'); //funct file contains our helper functions for our Passport and database work
module.exports =  function(passport){

  // Passport session setup.
  passport.serializeUser(function(user, done) {
    console.log("serializing " + user.username);
    done(null, user);
  });


  // Use the LocalStrategy within Passport to login/"signin" users.
  passport.use('local-signin', new LocalStrategy(
    {passReqToCallback : true}, //allows us to pass back the request to the callback
    function(req, username, password, done) {
      funct.localAuth(username, password)
      .then(function (user) {
        if (user) { // success
          console.log("LOGGED IN AS: " + user.username);
          console.log(user);
          if(user.key)
            req.session.success = 'You are successfully logged in ' + user.username +' now enter your otp ';
          else {
            req.session.success = 'You are successfully logged in ' + user.username ;
          }
          done(null, user);
        }
        if (!user) {
          console.log("COULD NOT LOG IN");
          req.session.error = 'Could not log user in. Please try again.'; //inform user could not log them in
          done(null, user);
        }
      })
      .fail(function (err){
        console.log(err.body);
      });
    }
  ));
  // Use the LocalStrategy within Passport to register/"signup" users.
  passport.use('local-signup', new LocalStrategy(
    {passReqToCallback : true}, //allows us to pass back the request to the callback
    function(req, username, password, done) {
      funct.localReg(req, username, password)
      .then(function (user) {
        if (user) {
          console.log("REGISTERED: " + user.username);
          req.session.success = 'You are successfully registered and logged in ' + user.username + '!';
          done(null, user);
        }
        if (!user) {
          console.log("COULD NOT REGISTER");
          req.session.error = 'That username is already in use, please try a different one.'; //inform user could not log them in
          done(null, user);
        }
      })
      .fail(function (err){
        console.log(err.body);
      });
    }
  ));
  //Added Totp strategy
  passport.use(new TotpStrategy(
      function(user, done) {
          // The user object carries all user related information, including
          // the shared-secret (key) and password.
          console.log("This is totp strategy");
          console.log("the user key is "+ user.key);
          var key = user.key;
          if(!key) {
              return done(new Error('No key'));
          } else {
              return done(null, base32.decode(key), 30); //30 = valid key period
          }
      })
  );
  //Added Google Strategy
  passport.use(new GoogleStrategy({
          clientID        : configAuth.googleAuth.clientID,
          clientSecret    : configAuth.googleAuth.clientSecret,
          callbackURL     : configAuth.googleAuth.callbackURL,
      },
      function(token, refreshToken, profile, done) {
          // make the code asynchronous
          // User.findOne won't fire until we have all our data back from Google
          process.nextTick(function() {
              // try to find the user based on their google id
              User.findOne({ 'google.id' : profile.id }, function(err, user) {
                console.log("we got to findOne before "+err);
                  if (err)
                      return done(err);
                  if (user) {
                      // if a user is found, log them in
                      console.log("we found him?");
                      return done(null, user);
                  } else {
                      // if the user isnt in our database, create a new user
                      console.log("registering gooGLE");
                      var RegUser= new User();
                        // set all of the relevant information
                        RegUser.google.id    = profile.id;
                        RegUser.google.token = token;
                        RegUser.username     = profile.displayName;
                        RegUser.email        = profile.emails[0].value; // pull the first email
                        RegUser.key          = null;
                        RegUser.group        = google;
                      // save the user

                      RegUser.save(function(err) {
                          if (err)
                              throw err;
                          return done(null, newUser);
                      });
                  }
              });
          });
      }));

  passport.deserializeUser(function(obj, done) {
    console.log("deserializing " + obj);
    done(null, obj);
  });
}
