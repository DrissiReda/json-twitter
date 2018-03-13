

var bcrypt = require('bcryptjs'),
    Q = require('q'),
    config = require('./config.js'); //config file contains all tokens and other private info

// MongoDB connection information
var mongodbUrl = 'mongodb://' +config.mongodbUser+':'+config.mongodbPass+'@'+config.mongodbHost + ':11309/aws-web';
var MongoClient = require('mongodb').MongoClient

//used in local-signup strategy
exports.localReg = function (req, username, password, email) {
  var deferred = Q.defer();
  MongoClient.connect(mongodbUrl, function (err, db) {
    if (err)
    {
      console.log(err);
    }
    var collection = db.collection('localUsers');

    //check if username is already assigned in our database
    collection.findOne({'username' : username})
      .then(function (result) {
        if (null != result) {
          console.log("USERNAME ALREADY EXISTS:", result.username);
          deferred.resolve(false); // username exists
        }
        else  {
          var hash = bcrypt.hashSync(password, 8);
          var user = {
            "username"  : username,
            "password"  : hash,
            "email"     : req.body.email,
            "avatar"    : "https://avatars3.githubusercontent.com/u/16291156?s=400&v=4",
            "key"       : null,
            "group"     : 'localUsers' //to know which database the user is in
           }

          console.log("CREATING USER:", username);

          collection.insert(user)
            .then(function () {
              db.close();
              deferred.resolve(user);
            });
        }
      });
  });

  return deferred.promise;
};


//check if user exists
    //if user exists check if passwords match (use bcrypt.compareSync(password, hash); // true where 'hash' is password in DB)
      //if password matches take into website
  //if user doesn't exist or password doesn't match tell them it failed
exports.localAuth = function (username, password) {
  var deferred = Q.defer();

  MongoClient.connect(mongodbUrl, function (err, db) {
    var collection = db.collection('localUsers');
    collection.findOne({'username' : username})
      .then(function (result) {
        if (null == result) {
          console.log("USERNAME NOT FOUND:", username);
          deferred.resolve(false);
        }

        else {
          var hash = result.password;
          console.log("FOUND USER: " + result.username);
          if (bcrypt.compareSync(password, hash)) {
            deferred.resolve(result);
          } else {
            console.log("AUTHENTICATION FAILED");
            deferred.resolve(false);
            }
        }
        db.close();
      });
  });
  return deferred.promise;
}
exports.enableTotp = function ( username, key, group) {
  MongoClient.connect(mongodbUrl, function (err, db) {
    if(err){
      console.log("enableTotp error");
      console.log(err);
    }
    else {
  var collection = db.collection(group);
  collection.findOne({'username' : username})
    .then(function (result) {
      console.log("we found this in db ");
      //console.log(result);
      //if this is not the first time it means there is no setup
        if(result.key === key)
          return 0;
          result.key=key;
          collection.replaceOne({'username' : username},result, true).then(()=>{db.close();});
    });
  }
});
// MongoClient.connect(mongodbUrl, function(err, db) {
//   var collection = db.collection('localUsers');
//   collection.findOne({'username' : username})
//     .then(function (result){
//       console.log("did it change");
//       console.log(result);
//       db.close();
//     });
// });
}
exports.disableTotp= function(username,group){
  exports.enableTotp(username,null,group);
}
exports.isTotp= function(username){
  var ret;
  MongoClient.connect(mongodbUrl, function (err, db) {
    if(err){
      console.log("enableTotp error");
      console.log(err);
    }
    else {
      var collection = db.collection('localUsers');
      collection.findOne({'username' : username})
      .then(function (result) {
        ret=result.key;
      }).then(()=>{db.close();});
    }
  });
  return ret;
}
exports.ensureTotp = function (req, res, next) {
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
