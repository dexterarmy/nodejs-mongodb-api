const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');

// app is an object now
const app = express();

// GLOBAL MIDDLEWARES

// set security http headers
app.use(helmet());

// development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit request from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP. Please try again in an hour.',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // if body > 10kb it will not be accepted

// data sanitization against Nosql query injection
app.use(mongoSanitize());

// data sanitization against xss
app.use(xss());

// serving static files
app.use(express.static(`${__dirname}/public`));

// middleware for all the routes
// app.use((req, res, next) => {
//   console.log('Time:', Date.now());
//   next();
// });

//manipulate the request, test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  next();
});

// mounting the two new routers
app.use('/api/v1/tours', tourRouter); // tourRouter middleware for this route
app.use('/api/v1/users', userRouter); // userRouter middleware for this route
app.use('/api/v1/reviews', reviewRouter);

// if the request reaches here then that means it was not handled by any of our above routers
app.all('*', (req, res, next) => {
  // res.status(404).json({ status: 'fail', message: `cannot find ${req.originalUrl} route` });

  // const err = new Error(`cannot find ${req.originalUrl} route`);
  // err.status = 'fail';
  // err.statusCode = 404;

  next(new AppError(`cannot find ${req.originalUrl} route`, 404));
});

// global error handling middleware
app.use(globalErrorHandler);

// export our application from this file
module.exports = app;
