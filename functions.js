var User= require('./server/models/user');
// MongoDB connection information
 exports.isTotp= function(email){
  var ret;
  console.log("verifying if "+email+" has it");
  User.findOne({'email' : email}, function(err, user) {
        ret=user.key;
        console.log("We found this :"+ user);
      });
  return ret;
}

exports.enableTotp= function( user, key) {
  console.log("looking for "+user.email);
  user.key=key;
  console.log("key will be "+user.key);
  User.findOneAndUpdate({ 'email' : user.email },user,{upsert:true}, function(err, doc) {
    if(err)
      console.log(err);
  });
}
exports.disableTotp= function(user){
  enableTotp(user,null);
}
// route middleware to ensure user is logged in
