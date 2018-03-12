var express = require('express'),
    exphbs = require('express-handlebars'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    GoogleStrategy = require('passport-google'),
    FacebookStrategy = require('passport-facebook');
    TotpStrategy = require('passport-totp').Strategy;
    //TOTP
    var speakeasy = require('speakeasy');
    var QRCode = require('qrcode'); //required for converting otp-url to dataUrl

var config = require('./config.js'), //config file contains all tokens and other private info
    funct  = require('./functions.js'); //funct file contains our helper functions for our Passport and database work

var app = express();

//===============EXPRESS================
// Configure Express
app.use(logger('combined'));
app.use(cookieParser('supernova'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

// Configuring express to use handlebars templates
var hbs = exphbs.create({
    defaultLayout: 'main',
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

//===============PASSPORT===============

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
      if (user) {
        console.log("LOGGED IN AS: " + user.username);
        req.session.success = 'You are successfully logged in ' + user.username + '!';
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
        console.log(user);
        var key = user.key;
        if(!key) {
            return done(new Error('No key'));
        } else {
            return done(null, base32.decode(key), 30); //30 = valid key period
        }
    })
);
passport.deserializeUser(function(obj, done) {
  console.log("deserializing " + obj);
  done(null, obj);
});

//===============ROUTES===============

//displays our homepage
app.get('/', function(req, res){
  res.render('home', {user: req.user});
});

//displays our signup page
app.get('/signin', function(req, res){
  res.render('signin');
});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/signin', passport.authenticate('local-signin', {
  successRedirect: '/',
  failureRedirect: '/signin',
  session: true
  }),function(req, res) {
        if(req.user.key) {
            console.log(" this is totp");
            req.session.method = 'totp';
            res.redirect('/totp-input');
        } else {
            console.log(" this is plain ");
            req.session.method = 'plain';
            res.redirect('/totp-setup');
        }
    }
);
// totp setup routes
app.get('/totp-setup',
    isLoggedIn,
    ensureTotp,
    function(req, res) {
        var url = null;
        if(req.user.key) {
            var qrData = sprintf('otpauth://totp/%s?secret=%s',
                                 req.user.username, req.user.key);
            url = "https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=" +
                   qrData;
        }

        res.render('totp', {
            strings: strings,
            user: req.user,
            qrUrl: url
        });
    }
);

app.post('/totp-setup',
    isLoggedIn,
    ensureTotp,
    function(req, res) {
        if(req.body.totp) {
            req.session.method = 'totp';

            var secret = base32.encode(crypto.randomBytes(16));
            //Discard equal signs (part of base32,
            //not required by Google Authenticator)
            //Base32 encoding is required by Google Authenticator.
            //Other applications
            //may place other restrictions on the shared key format.
            secret = secret.toString().replace(/=/g, '');
            req.user.key = secret;
        } else {
            req.session.method = 'plain';

            req.user.key = null;
        }

        res.redirect('/totp-setup');
    }
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

//===============PORT=================
var port = process.env.PORT || 5000;
app.listen(port);
console.log("listening on " + port + "!");
//============FUNCTIONS===============
function isLoggedIn(req, res, next) {
    console.log("isloggedin");
    console.log(req.body);
    if(req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/signin');
    }
}

function ensureTotp(req, res, next) {
    console.log("ensure totp");
    if((req.user.key && req.session.method == 'totp') ||
       (!req.user.key && req.session.method == 'plain')) {
        next();
    } else {
        res.redirect('/signin');
    }
}
