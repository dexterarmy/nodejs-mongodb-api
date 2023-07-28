const express = require('express');
const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');

const router = express.Router();

// technically all the blow are middlewares

// authentication routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// PASSWORD
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// this runs after above four middleware (V V V V IMPORTANT)
// protects all routes after this middleware
router.use(authController.protect);

// so all the below routes(technically middlewares) that come after router.use() are protected
router.patch('/updateMyPassword', authController.updatePassword);

// /me endpoint
router.get('/me', userController.getMe, userController.getUser);

// update user data
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

// below routes only be accessible by the administrator
router.use(authController.restrictTo('admin'));

//ROUTES, endpoint resource, parameters, update, delete
router.route('/').get(userController.getAllUsers).post(userController.createUser);
router.route('/:id').get(userController.getUser).patch(userController.updateUser).delete(userController.deleteUser);

module.exports = router;
