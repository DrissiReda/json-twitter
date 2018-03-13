var mongoose = require('mongoose');

var userSchema= mongoose.Schema({
      username     : String,
      password     : String,
      email        : String,
      group        : String,
      key          : String,
      google :{
        id    : String,
        token : String
      }
});

module.exports = mongoose.model('User', userSchema);
