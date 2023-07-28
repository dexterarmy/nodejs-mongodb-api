const express = require('express');

// tourController is exports object now
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

// POST tours/22323232/reviews
// GET tours/232323232/reviews
// GET tours/32323232/reviews/232342323

// router
//   .route('/:tourId/reviews')
//   .post(authController.protect, authController.restrictTo('user'), reviewController.createReviews);

// RE-ROUTING
router.use('/:tourId/reviews', reviewRouter);

// router.param('id', tourController.checkId);
router.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlans
  );
router.route('/tour-stats').get(tourController.getTourStats);

// /tours-within?distance=23&center=40,45&unit=mi (using query string)
router.route('/tours-within/:distance/center/:latlon/unit/:unit').get(tourController.getToursWithin);

// aggregation pipeline
router.route('/distances/:latlon/unit/:unit').get(tourController.getDistances);

// general routes ??
router
  .route('/')
  .get(tourController.getAllTours)
  .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTour);
router
  .route('/:id')
  .get(tourController.getTour)
  .patch(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.updateTour)
  .delete(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.deleteTour);

module.exports = router;
