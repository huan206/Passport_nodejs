var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UserSchema = new Schema(
  {
    username: {type: String, required: true, maxLength: 100},
    email: {type: String, required: false, maxLength: 100},
    password: {type: String, required: false, minLength: 6},
    googleID: {type: String, required: false},
    facebookID: {type: String, required: false}
  }
);

// Virtual for author's URL
UserSchema
.virtual('url')
.get(function () {
  return '/user' + this._id;
});

//Export model
module.exports = mongoose.model('User', UserSchema);