//displays our homepage
var funct  = require('../functions.js'), //funct file contains our helper functions for our Passport and database work
strings = require('../views/strings.json');
base32 = require('thirty-two'),
crypto = require('crypto'),
sprintf = require('sprintf');

module.exports= function(app, passport){
app.get('/', function(req, res){

  res.render('home', {user: req.user});
});
app.post('/', function(req, res){
  console.log(req.user);
  if(req.user && req.user.username)
  {
    if(!funct.isTotp(req.user.username))
    {
      req.session.method='plain';
      req.user.key=null;
    }
  }
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
  failureRedirect: '/signin'
  }),function(req, res) {
        if(req.user.key) {
            console.log(" this is totp");
            req.session.method = 'totp';
            res.redirect('/totp-input');
        } else {
            console.log(" this is plain ");
            req.session.method = 'plain';
            res.redirect('/');
        }
    }
);
// totp setup routes
app.get('/totp-setup',
    isLoggedIn,
    funct.ensureTotp,
    function(req, res) {
        var url = null;
        if(req.user.key) {
            var qrData = sprintf('otpauth://totp/%s?secret=%s',
                                 req.user.username, req.user.key);
            url = "https://chart.googleapis.com/chart?chs=166x166&chld=L|0&cht=qr&chl=" +
                   qrData;

        }
        console.log(url);
        //console.log(req.user);
        console.log("rendering "+req.user.key);
        res.render('totp', {
            strings: strings,
            username: req.user.username,
            key : req.user.key,
            Url: url
        });
    }
);

app.post('/totp-setup',
    isLoggedIn,
    funct.ensureTotp,
    function(req, res) {
      console.log("totp post");
        if(req.body.totp) {
            req.session.method = 'totp';
            console.log("Setting to totp");
            var secret = base32.encode(crypto.randomBytes(16));
            //Discard equal signs (part of base32,
            //not required by Google Authenticator)
            //Base32 encoding is required by Google Authenticator.
            //Other applications
            //may place other restrictions on the shared key format.
            secret = secret.toString().replace(/=/g, '');
            //setting the req.user.key but not the value on the database
            //we will update the db value after the user successfully verifies the code
            //that way he will not be locked out of his account if he doesn't finish the setup
            //process
            req.user.key = secret;

        } else {
            req.session.method = 'plain';
            console.log("Setting to plain");
            req.user.key = null;
        }
        res.redirect('/totp-setup');
    }
);
//totp input routes
app.get('/totp-input', isLoggedIn, function(req, res) {
    if(!req.user.key) {
        console.log("Logic error, totp-input requested with no key set");
        res.redirect('/login');
    }

    res.render('totp-input', {
        strings: strings
    });
});
//TODO add enableTotp here at success
app.post('/totp-input', isLoggedIn, passport.authenticate('totp', {
    failureRedirect: '/totp-input',
}), function (req, res) {
    //if the user succeeds for the first time we will set his key value
    console.log("notice is "+req.user.disable);
    if(req.user.disable){
        req.user.key=null;
        funct.disableTotp(req.user.username,req.user.group);
        req.session.notice="Your otp is disabled";
        req.session.method="plain";
        res.redirect('/');
    }
    else {
      enableTotp(req.user.username,req.user.key,req.user.group);
      req.session.success="Your otp is valid !";
      res.redirect('/');
    }
});
//disables totp
app.get('/totp-disable', isLoggedIn, function(req,res){
    req.session.notice="Please enter the code generated on your app to disable 2FA";
    req.user.disable=1;
    res.redirect('/totp-input');
});
//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});
app.get('/test', function(req, res){
  enableTotp("sd",null,"localUsers");

});

//============FUNCTIONS===============
function isLoggedIn(req, res, next) {
    console.log("isloggedin");
    console.log(req.body);
    if(req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/');
    }
}
}
