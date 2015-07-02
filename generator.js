sha = require("sha1")

var db = require('./model/db')
var cookieParser = require('cookie-parser')
var session = require('express-session')
var mongoose = require('mongoose')
var express = require('express');
var bodyParser = require('body-parser')
var app = module.exports = express();
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.static(__dirname + '/public'));
app.use(cookieParser())
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret: 'big secret',
  cookie: { maxAge: 1800000 } //30 min
}));
app.use(function(req,res,next){
    res.locals.session = req.session;
    next();
});

var Users = mongoose.model('Users');

var ADMIN_USER = 'admin'
var TIMEOUT = 10 * 1000 //ms



function getToken(username, password, expiration) {

  var msg = [username.toLowerCase(), expiration, password.toLowerCase()].join(":");
  var digest = sha(msg)

  var bin = "";
  for (var i = 0; i < digest.length; i += 2)
  	bin += String.fromCharCode(parseInt(digest.substr(i, 2), 16));

  token = sha(bin)
  return token;
}


app.get('/', function(req, res) {
  session = user = null

  if (req.session.auth) {
    user = req.session.auth.user
  }

  res.render('index', {
    'user': user
  })
})


app.get('/public', function(req, res) {
  res.render('public')
})
app.get('/private', function(req, res) {
  // Check if user used token.
  if (req.session.token)
    return res.render('private')
  else
    return res.redirect('/auth?redirect=' + req.originalUrl)
})

app.get('/auth', function(req, res) {
  if (!req.session.auth)
    return res.redirect('/login')

  res.render('auth', {
    'redirect': req.query.redirect,
    'ref':      req.query.ref
  })
})

app.post('/auth', function(req, res) {
  // Check if token expired
  Users.findOne({'user_name': req.session.auth.user}).exec(function(err, user) {
    if (!user) return res.redirect('/login?ref=private')

    // Check token date
    diff = Date.now() - user.date.getTime()
    if (diff < TIMEOUT && req.body.token == user.token) {
      // Set token
      req.session.token = req.body.token
      // Redirect back to private page
      return res.redirect(req.body.redirect)
    }

    return res.redirect('/auth?ref=expired&redirect=' + req.originalUrl)
  })
})


app.get('/add', function(req, res) {
  if (!req.session.auth || req.session.auth.user != ADMIN_USER)
    return res.redirect('/login')

  // Get all users
  Users.find().exec(function(err, all) {
    res.render('add', {
      'users': all,
      'ref':   req.query.ref
    })
  })
})
app.post('/add', function(req, res) {

  // Generate token
  date = Date.now()
  token = getToken(req.body.user, req.body.pin, date)

  // Add user to db
  new Users({
    'user_name': req.body.user,
    'pin':       req.body.pin,
    'token':     token,
    'date':      date
  }).save(function (err, user, count) {
    res.redirect('/add')
  });
})

app.get('/generate', function(req, res) {
  // Access page only if user is logged in
  if (!req.session.auth)
    return res.redirect('/login')

  res.render('generate', {
    'token': req.query.token,
    'ref':   req.query.ref
  })
})
app.post('/generate', function(req, res) {

  // Get user pin
  Users.findOne({'user_name': req.session.auth.user, 'pin': req.body.pin}).exec(function(err, user) {
    if (!user) return res.redirect('/generate?ref=wrong')

    // Generate token
    date = Date.now()
    user_name = req.session.auth.user
    token = getToken(user_name, user.pin, date)

    // Update user token
    var conditions = {'user_name': user.user_name};
    var update = {$set: {'token': token, 'date': date}};
    Users.update(conditions, update, function (err, num) {
      if(num) return res.redirect('/generate?token=' + token)
    })
  })
})

app.get('/login', function(req, res) {
  res.render('login', {
    'ref': req.query.ref
  })
})
app.post('/login', function(req, res) {
  req.session.regenerate(function (err) {

    Users.findOne({'user_name': req.body.user, 'pin': req.body.pin}).exec(function(err, user) {
      if (!user) return res.redirect('/login?ref=no_user')

      // Admin online
      if (req.body.user == ADMIN_USER)
        req.session.admin = true

      // Note that user is logged in
      req.session.loggedIn = true


      // Build user session
      req.session.auth = {}
      req.session.auth.user = req.body.user
      req.session.auth.token = req.body.pin
      res.redirect('/')
    })
  })
})
app.get('/logout', function(req, res) {
  // Reset all session variables
  req.session.token = null
  req.session.admin = false
  req.session.loggedIn = false
  req.session.auth = {}

  return res.redirect('/')
})


// Launch server
app.listen(process.env.PORT || 3000, function() {
console.log('Server listening on port 3000.');
});
