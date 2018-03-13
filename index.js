//FIXME redirect buttons to proxy routes in order to add instructions before
// redirection

var express = require('express'),
    exphbs = require('express-handlebars'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    loggedin = require('connect-ensure-login'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport');

var app = express();

//===============EXPRESS================
// Configure Express
app.use(logger('combined'));
app.use(cookieParser('supernova'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'doesthisreallymatterdoesthislifereallymatter', saveUninitialized: true, resave: true}));
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

require('./server/passport')(passport);

//===============ROUTES===============
require('./server/routes.js')(app,passport);

//===============PORT=================
var port = process.env.PORT || 5000;
app.listen(port);
console.log("listening on " + port + "!");
