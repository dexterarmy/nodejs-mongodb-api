const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// filter input fields while updating user data
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/******************************************************************************************* */
// ROUTE HANDLERS

exports.getAllUsers = factory.getAll(User);

/*
exports.getAllUsers = async (req, res) => {
  const users = await User.find();

  res.status(200).json({ status: 'error', message: users });
};
*/

/****************************************************************************************** */

exports.createUser = (req, res) => {
  res.status(500).json({ status: 'error', message: 'this route is not implemented, please use /signup instead' });
};

exports.getUser = factory.getOne(User);

// do not update password with this function, update by admin
exports.updateUser = factory.updateOne(User);

// factory function, delete by admin
exports.deleteUser = factory.deleteOne(User);

// update user data, by the user
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) create error is user POST password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('this route is not for password updates', 400));
  }
  // 2) Filter out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, { new: true, runValidators: true });

  res.status(200).json({ status: 'success', data: { user: updatedUser } });
});

// delete by user
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: 'null',
  });
});

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
