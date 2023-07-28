const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'review cannot be empty'],
    },
    rating: {
      type: Number,
      min: [1, 'rating cannot be below 1.0'],
      max: [5, 'rating cannot be above 5.0'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must have an author'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must belong to a tour'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ user: 1, tour: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({ path: 'user', select: 'name photo' }).populate({ path: 'tour', select: 'name ' });
  this.populate({ path: 'user', select: 'name photo' });
  console.log('----------------');
  next();
});

reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne() does not work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

// aggregation
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stat = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  console.log(stat);

  if (stat.length > 0) {
    // await because query is like a promise which we have to resolve
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stat[0].nRating,
      ratingsAverage: stat[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      // default to when there are no reviews
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // this points to current review document
  this.constructor.calcAverageRatings(this.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
