var mongoose = require( 'mongoose' );
var Schema   = mongoose.Schema;

var Users = new Schema({
  user_name:       String,
  pin:             String,
  token:           String,
  date:            Date
});

mongoose.model('Users', Users);
mongoose.connect( 'mongodb://localhost/tokenapp' );