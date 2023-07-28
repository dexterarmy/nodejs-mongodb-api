const { promisify } = require('util');
const catchAsync = require('./../utils/catchAsync');
const User = require('./../models/userModel');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const sendEmail = require('./../utils/email');
const crypto = require('crypto');

// generate JWT token
const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  // remove password from output
  user.password = undefined;

  res.status(statusCode).json({ status: 'success', token, data: { user } });
};

// SIGN UP
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendToken(newUser, 201, res);
});

//LOG IN
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1). check if email and password exist
  if (!email || !password) {
    return next(new AppError('please provide email and password', 400));
  }

  // 2) check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  // if (!user || !(await user.correctPassword(password))) {
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('incorrect email or password', 401));
  }

  // 3) if eveything is ok then send token to client
  createSendToken(user, 200, res);
});

// AUTHENTICATION
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token, check if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('You are not loggen in, please log in', 401));
  }
  // 2) Verification of token
  // const verify = promisify(jwt.verify);
  // const decoded = await verify(token, process.env.JWT_SECRET);
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exists
  const foundUser = await User.findById(decoded.id);
  if (!foundUser) {
    return next(new AppError('user belonging to this token no longer exist', 401));
  }

  // 4) Check if user changed password after the token was issued
  if (foundUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('user recently changed password, please login again', 401));
  }

  // If the token passes all of these checks, the user is authenticated

  // GRANT ACCESS TO PROTECTED ROUTE
  // put the entire user data on the request
  req.user = foundUser;
  next();
});

// AUTHORISATION
exports.restrictTo = (...roles) => {
  console.log(roles);
  return (req, res, next) => {
    // roles -> ['admin','lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(new AppError('you do not have permission to perform this action', 403));
    }
    next();
  };
};

// PASSWORD RESET
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email address.', 404));
  }
  // generate random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // send the reset token to the user via email
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\n If you didn't forget your password, please ignore this email.`;

  try {
    await sendEmail({ email: user.email, subject: 'your password reset token(valid for 10 minutes)', message });

    res.status(200).json({ status: 'success', message: 'token sent to email' });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an error sending the email. Try again later!', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpires: { $gt: Date.now() } });

  // 2) Set the new password, so long as there is a user and the token has not expired
  if (!user) {
    return next(new AppError('token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined; // delete  field from the document in database
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update the changedPasswordAT property for the user(in user model)
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // 2) Check if posted password is correct
  if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
    return next(new AppError('Inputted password does not match current password.', 401));
  }
  // 3) If so, update password
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.confirmNewPassword;
  await user.save();
  // User.findByIdAndUpdate() will not work as intended

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
