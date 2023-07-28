const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'a tour must have a name'], // field is recquired
      unique: true,
      trim: true,
      maxlength: [40, 'a tour name should have less than or equal to 40 characters'],
      minlength: [10, 'a tour name should have more than or equal to 10 characters'],
      // validate: [validator.isAlpha, 'name should contain only characters'],
    },
    slug: String,
    duration: { type: Number, required: [true, 'a tour must have a duration'] },
    maxGroupSize: { type: Number, required: [true, 'a tour must have a group size'] },
    difficulty: {
      type: String,
      required: [true, 'a tour must have a difficulty'],
      enum: { values: ['easy', 'medium', 'difficult'], message: 'difficulty must be easy, medium or difficult' },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1.0, 'rating must be above 1.0'],
      max: [5.0, 'rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // setters mongoose
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'a tour must have a price'] },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'discounted price {VALUE} should be less than original price',
      },
    },
    summary: { type: String, trim: true, required: [true, 'a tour must have a summary'] },
    description: { type: String, trim: true },
    imageCover: { type: String, required: [true, 'a tour must have an image'] },
    images: [String],
    createdAt: { type: Date, default: Date.now(), select: false },
    startDates: [Date], // different dates at which instances of same tour starts
    secretTour: { type: Boolean, default: false },
    startLocation: {
      // geoJSON
      type: { type: String, default: 'Point', enum: ['Point'] },
      coordinates: [Number],
      description: String,
      address: String,
    },
    locations: [
      {
        type: { type: String, default: 'Point', enum: ['Point'] },
        coordinates: [Number],
        description: String,
        day: Number,
      },
    ],
    // guides: Array
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  // each time data outputted as JSON / object, virtuals to be part of output
  { toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// indexes, sorting the price index in ascending order
// tourSchema.index({ price: 1 });

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

// pre Document middleware: runs before .save() and .create() but not insertMany()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

/*
// embedding user data in tours
tourSchema.pre('save', async function (next) {
  let guidesPromise = this.guides.map(async (id) => await User.findById(id));
  this.guides = await Promise.all(guidesPromise);
  next();
});
*/

/*
tourSchema.pre('save', function (next) {
  console.log('will save document');
  next();
});

// post document middleware
tourSchema.post('save', function (doc, next) {
  console.log(doc);
  next();
});
*/

//Query middleware, middleware that modifies the query object
tourSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

/*
tourSchema.pre('findOne', function (next) {
  this.find({ secretTour: { $ne: true } });
  next();
});
*/

// middleware is run after the query is executed
tourSchema.post(/^find/, function (docs, next) {
  console.log(`query took ${Date.now() - this.start} milliseconds`);
  next();
});

// aggregation middleware, before the aggregation is executed
/*
tourSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  console.log(this.pipeline());
  next();
});
*/
tourSchema.pre('aggregate', function (next) {
  const things = this.pipeline()[0];
  if (Object.keys(things)[0] !== '$geoNear') {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

/*
const testTour = new Tour({ name: 'The Park Camper', price: 997 });

// save document to database
testTour
  .save()
  .then((doc) => console.log(doc))
  .catch((err) => console.log(err, 'error*******************'));
*/
