const AppError = require('./../utils/appError');

// handle invalid token error
const handleJwtError = (err) => new AppError('INVALID TOKEN, please login again', 401);

// handle token expired error
const handleJwtExpiredError = (err) => new AppError('token expired, please log in again', 401);

// handle cast error
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use anothe value!`;
  // const message = `duplicate field value: "${err.keyValue.name}", Please use another value`;
  return new AppError(message, 400);
};

// validation error
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((val) => val.message);
  const message = `invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const sendErrorDev = (res, err) => {
  res.status(err.statusCode).json({ status: err.status, message: err.message, error: err, stack: err.stack });
};

const sendErrorProd = (res, err) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({ status: err.status, message: err.message });

    // Programming or other unknown error: don't leak error details to the client
  } else {
    // LOG ERROR
    console.error('ERROR: ', err);

    // SEND GENERIC MESSAGE
    res.status(500).json({ status: 'error', message: 'something went wrong' });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(res, err);
  } else if (process.env.NODE_ENV === 'Production') {
    // for prototypal inheritance

    let error = Object.assign(err);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJwtError(error);
    if (error.name === 'TokenExpiredError') error = handleJwtExpiredError(error);
    sendErrorProd(res, error);
  }
};
