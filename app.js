var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var api = require('./routes/api.route')

var mongoose = require('mongoose');
var bluebird = require('bluebird')

// mongoose.Promise = bluebird
// mongoose.connect('mongodb://127.0.0.1:27017/todoapp')
// .then(()=> { console.log(`Succesfully Connected to the Mongodb Database  at URL : mongodb://127.0.0.1:27017/todoapp`)})
// .catch(()=> { console.log(`Error Connecting to the Mongodb Database at URL : mongodb://127.0.0.1:27017/todoapp`)})

var app = express();

// allow-cors
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  // allow preflight
  if (req.method === 'OPTIONS') {
      res.sendStatus(200);
  } else {
      next();
  }
});

app.use(cors());

// Socket
var server = require('http').Server(app);
var io = require('socket.io')(server);

//server.listen(80)
server.listen(process.env.PORT || 80);

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
//Use the API routes for all routes matching /api
app.use(function(req,res,next){
  req.io = io;
  next();
});
app.use('/api', api);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
