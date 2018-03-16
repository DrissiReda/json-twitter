// load all the things we need
var LocalStrategy    = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy  = require('passport-twitter').Strategy;
var GoogleStrategy   = require('passport-google-oauth').OAuth2Strategy;
var TotpStrategy     = require('passport-totp').Strategy;
var base32           = require('thirty-two');
var request          = require('sync-request');
var gravatar         = require('gravatar');
// load up the user model
var User       = require('./models/user');

// load the auth variables
var configAuth = require('../config/auth'); // use this one for testing

module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-signin', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching
        console.log("logging in "+req.body.email);
        // asynchronous
        process.nextTick(function() {
            User.findOne({ 'email' :  email }, function(err, user) {
                // if there are any errors, return the error
                if (err)
                    return done(err);

                // if no user is found, return the message
                if (!user){
                    req.session.error='No user found';
                    return done(null, false);
                }

                if (!user.validPassword(password)){
                    req.session.error='Wrong password';
                    return done(null, false);
                }

                // all is well, return user
                else {
                    req.session.success='You are successefully logged in ! '+user.username;
                    return done(null, user);
                }
            });
        });

    }));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'email',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    },
    function(req, email, password, done) {
        if (email)
            email = email.toLowerCase(); // Use lower-case e-mails to avoid case-sensitive e-mail matching

        // asynchronous
        process.nextTick(function() {
            // if the user is not already logged in:
            if (!req.user) {
                User.findOne({ 'email' :  email }, function(err, user) {
                    // if there are any errors, return the error
                    if (err)
                        return done(err);

                    // check to see if theres already a user with that email
                    if (user) {
                        req.session.error="Email already taken";
                        return done(null, false);
                    } else {

                        // create the user
                        console.log("CREATING LOCAL USER "+req.body.username);
                        req.session.method='plain';
                        var newUser            = new User();
                        newUser.username       = req.body.username;
                        newUser.email          = email;
                        newUser.key            = null;
                        newUser.avatar         = gravatar.url(email,{s:'100',r: 'x', d: 'identicon'},true);
                        newUser.local.password = newUser.generateHash(password);
                        newUser.local.email    = email;

                        newUser.save(function(err) {
                            if (err)
                                return done(err);

                            return done(null, newUser);
                        });
                    }

                });
            // if the user is logged in but has no local account...
            } else if ( !req.user.local.email ) {
                // ...presumably they're trying to connect a local account
                // BUT let's check if the email used to connect a local account is being used by another user
                User.findOne({ 'email' :  email }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {
                        req.session.error='That email is already taken.';
                        return done(null, false);
                        // Using 'loginMessage instead of signupMessage because it's used by /connect/local'
                    } else {
                        var user = req.user;
                        user.local.email = email;
                        user.local.password = user.generateHash(password);
                        user.save(function (err) {
                            if (err)
                                return done(err);

                            return done(null,user);
                        });
                    }
                });
            } else {
                // user is logged in and already has a local account. Ignore signup. (You should log out before trying to create a new account, user!)
                return done(null, req.user);
            }

        });

    }));

    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    var fbStrategy = configAuth.facebookAuth;
    fbStrategy.passReqToCallback = true;  // allows us to pass in the req from our route (lets us check if a user is logged in or not)
    fbStrategy.profileFields=['email','name'];
    passport.use(new FacebookStrategy(fbStrategy,
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);
                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.facebook.token) {
                            user.facebook.token = token;
                            user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                            user.facebook.email = ((profile.emails)?profile.emails[0].value:profile.id).toLowerCase();

                            user.save(function(err) {
                                if (err)
                                    return done(err);

                                return done(null, user);
                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                       //generating photo
                        req.session.avatarurl = JSON.parse(request('GET',"https://graph.facebook.com/"+profile.id+"/picture?height=1024&redirect=false")
                                                  .body.toString('utf-8')).data.url;
                        console.log(" finally p is "+req.session.avatarurl);
                        var newUser            = new User();
                        newUser.username       = profile.name.givenName+' '+profile.name.familyName;
                        newUser.email          = ((profile.emails)?profile.emails[0].value:profile.id).toLowerCase();
                        newUser.key            = null;
                        newUser.avatar         = req.session.avatarurl;
                        newUser.facebook.id    = profile.id;
                        newUser.facebook.token = token;
                        newUser.facebook.name  = newUser.username;
                        console.log(profile);
                        //if no email we need a unique parameter like the id to identify people
                        newUser.facebook.email = newUser.email;
                        console.log("CREATING FB USER "+newUser.username);
                        req.session.method='plain';
                        newUser.save(function(err) {
                            if (err)
                                return done(err);

                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user            = req.user; // pull the user out of the session
                console.log(profile);

                user.facebook.id    = profile.id;
                user.facebook.token = token;
                user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                user.facebook.email = ((profile.emails)?profile.emails[0].value:profile.id).toLowerCase();
                console.log("LOGGING IN FB USER "+profile.name.givenName);
                req.session.method=(user.key)?'totp':'plain';
                user.save(function(err) {
                    if (err)
                        return done(err);

                    return done(null, user);
                });

            }
        });

    }));

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

        consumerKey     : configAuth.twitterAuth.consumerKey,
        consumerSecret  : configAuth.twitterAuth.consumerSecret,
        callbackURL     : configAuth.twitterAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, tokenSecret, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {

                User.findOne({ 'twitter.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.twitter.token) {
                            user.twitter.token       = token;
                            user.twitter.username    = profile.username;
                            user.twitter.displayName = profile.displayName;

                            user.save(function(err) {
                                if (err)
                                    return done(err);

                                return done(null, user);
                            });
                        }

                        return done(null, user); // user found, return that user
                    } else {
                        // if there is no user, create them
                        console.log("twitter profile is ");
                        console.log(profile.email);
                        var newUser                 = new User();
                        newUser.username            = profile.username;
                        newUser.email               = profile.id;
                        newUser.key                 = null;
                        newUser.avatar              = profile.photos[0].value;
                        newUser.twitter.id          = profile.id;
                        newUser.twitter.token       = token;
                        newUser.twitter.username    = profile.username;
                        newUser.twitter.displayName = profile.displayName;
                        console.log("CREATING TWITTER USER "+profile.displayName);
                        req.session.method='plain';
                        newUser.save(function(err) {
                            if (err)
                                return done(err);

                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user                 = req.user; // pull the user out of the session

                user.twitter.id          = profile.id;
                user.twitter.token       = token;
                user.twitter.username    = profile.username;
                user.twitter.displayName = profile.displayName;
                console.log("LOGGING IN TWITTER USER "+profile.username);
                req.session.method=(user.key)?'totp':'plain';
                user.save(function(err) {
                    if (err)
                        return done(err);

                    return done(null, user);
                });
            }

        });

    }));

    // =========================================================================
    // GOOGLE ==================================================================
    // =========================================================================
    passport.use(new GoogleStrategy({

        clientID        : configAuth.googleAuth.clientID,
        clientSecret    : configAuth.googleAuth.clientSecret,
        callbackURL     : configAuth.googleAuth.callbackURL,
        passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)

    },
    function(req, token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // check if the user is already logged in
            if (!req.user) {
                console.log("already here");
                User.findOne({ 'google.id' : profile.id }, function(err, user) {
                    if (err)
                        return done(err);

                    if (user) {
                        console.log("google returns ");
                        // if there is a user id already but no token (user was linked at one point and then removed)
                        if (!user.google.token) {
                            user.google.token = token;
                            user.google.name  = profile.displayName;
                            user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email

                            user.save(function(err) {
                                if (err)
                                    return done(err);

                                return done(null, user);
                            });
                        }

                        return done(null, user);
                    } else {
                        var newUser          = new User();
                        console.log(profile);
                        newUser.username       = profile.displayName;
                        newUser.email          = (profile.emails[0].value || '').toLowerCase();
                        newUser.key            = null;
                        newUser.avatar         = profile._json.image.url;
                        newUser.google.id      = profile.id;
                        newUser.google.token   = token;
                        newUser.google.name    = profile.displayName;
                        newUser.google.email   = (profile.emails[0].value || '').toLowerCase(); // pull the first email
                        console.log("CREATING GOOGLE USER "+profile.displayName);
                        req.session.method='plain';
                        newUser.save(function(err) {
                            if (err)
                                return done(err);

                            return done(null, newUser);
                        });
                    }
                });

            } else {
                // user already exists and is logged in, we have to link accounts
                var user               = req.user; // pull the user out of the session

                user.google.id    = profile.id;
                user.google.token = token;
                user.google.name  = profile.displayName;
                user.google.email = (profile.emails[0].value || '').toLowerCase(); // pull the first email
                console.log("LOGGING GOOGLE USER "+profile.displayName);
                req.session.method=(user.key)?'totp':'plain';
                user.save(function(err) {
                    if (err)
                        return done(err);

                    return done(null, user);
                });

            }

        });

    }));

    // =========================================================================
    // TOTP ====================================================================
    // =========================================================================

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
// FUNCTIONS ====================================================
    function getJSON(url, callback) {
      request({
        url: url,
        json: true
      }, function (error, response, body) {
        if (error || response.statusCode !== 200) {
          return callback(error || {statusCode: response.statusCode});
        }
        callback(null, JSON.parse(JSON.stringify(body)));
      });
    }

};
