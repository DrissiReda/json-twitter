var User= require('./server/models/user');
// MongoDB connection information
 exports.isTotp= function(username){
  var ret;
  User.findOne({'username' : username})
    .then(function (err, result) {
        ret=result.key;
      }).then(()=>{db.close();});
  return ret;
}
exports.ensureTotp= function(req, res, next) {
    console.log("ensure totp"+req.user);
    if((req.user.key && req.session.method == 'totp') ||
       (!req.user.key && req.session.method == 'plain')) {
         console.log("method is "+ req.session.method);
        next();
    } else {
      console.log("no totp cuz "+req.session.method);
        res.redirect('/');
    }
}
exports.enableTotp= function( email, key) {
  User.findOne({'email' : email})
    .then(function (result) {
      console.log("we found this in db ");
      //console.log(result);
      //if this is not the first time it means there is no setup
        if(result.key === key)
          return 0;
          result.key=key;
          User.replaceOne({'email' : email},result, true).then(()=>{db.close();});
    });
}
exports.disableTotp= function(email){
  enableTotp(email,null);
}
// route middleware to ensure user is logged in
exports.isLoggedIn= function(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/');
}
