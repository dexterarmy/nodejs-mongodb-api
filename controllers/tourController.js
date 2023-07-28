const Tour = require('./../models/tourModel');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

/*
exports.checkId = (req, res, next, val) => {
  // id check
  if (val * 1 > tours.length) {
    return res.status(404).json({ status: 'fail', message: 'invalid id' });
  }
  next();
};
*/

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage, price';
  req.query.fields = 'name,ratingsAverage,price,difficulty';
  next();
};

/********************************************************************************************** */

exports.getAllTours = factory.getAll(Tour);

/*
exports.getAllTours = catchAsync(async (req, res, next) => {
  // object from a class
  const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate();

  // EXECUTE QUERY
  const tours = await features.query;

  // SEND RESPONSE
  // automatically content type application/json
  res.status(200).json({ status: 'success', results: tours.length, requestedAt: req.requestTime, data: { tours } });
});
*/

/*********************************************************************************************************** */

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

/*
exports.getTour = catchAsync(async (req, res, next) => {
  // console.log(req.params);

  // convert string that looks like a number to a number
  // const id = req.params.id * 1;
  // const tour = tours.find((tr) => tr.id === id);

  // // if (id > tours.length)
  // // if tour is undefined
  // if (!tour) {
  //   return res.status(404).json({ status: 'fail', message: 'invalid id' });
  // }

  const tour = await Tour.findById(req.params.id).populate('reviews');
  // Tour.findOne({_id: req.params.id});

  if (!tour) return next(new AppError('no tour found for this id', 404));

  res.status(200).json({ status: 'success', data: { tour } });
});

// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({ status: 'fail', message: 'incorrect data' });
//   }
// };
*/

/******************************************************************************************************* */

exports.createTour = factory.createOne(Tour);

/*
exports.createTour = catchAsync(async (req, res, next) => {
  // console.log(req.body);

  // const newId = tours[tours.length - 1].id + 1;
  // const newTour = Object.assign({ id: newId }, req.body);
  // tours.push(newTour);

  // fs.writeFile(`${__dirname}/dev-data/data/tours-simple.json`, JSON.stringify(tours), (err) => {
  //   res.status(201).json({ status: 'success', data: { tour: newTour } });
  // });

  // const newTour = new Tour({});
  // newTour.save();

  const newTour = await Tour.create(req.body);

  res.status(201).json({ status: 'success', data: { tour: newTour } });
});
*/

/************************************************************************************************************** */

exports.updateTour = factory.updateOne(Tour);

// exports.updateTour = catchAsync(async (req, res, next) => {
//   // id check
//   // if (req.params.id * 1 > tours.length) {
//   //   return res.status(404).json({ status: 'fail', message: 'invalid id' });
//   // }

//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

//   if (!tour) return next(new AppError('no tour found for this id', 404));

//   res.status(200).json({ status: 'success', data: { tour } });
// });
/********************************************************************************************************** */

// application of closures
exports.deleteTour = factory.deleteOne(Tour);
/*
exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndDelete(req.params.id);

  if (!tour) return next(new AppError('no tour found for this id', 404));

  res.status(204).json({ status: 'success', data: null });
});
*/
/******************************************************************************************************* */

// aggregation pipeline
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    { $sort: { avgPrice: 1 } },
    // { $match: { _id: { $ne: 'EASY' } } },
  ]);

  res.status(200).json({ status: 'success', data: { stats } });
});

// aggregation pipeline
exports.getMonthlyPlans = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    { $unwind: '$startDates' },
    { $match: { startDates: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
    { $group: { _id: { $month: '$startDates' }, numTourStart: { $sum: 1 }, tour: { $push: '$name' } } },
    { $addFields: { month: '$_id' } },
    { $project: { _id: 0 } },
    { $sort: { numTourStart: -1 } },
    { $limit: 12 },
  ]);

  res.status(200).json({ status: 'success', results: plan.length, data: { plan } });
});

// geo spatial query
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlon, unit } = req.params;
  const [lat, lon] = latlon.split(',');
  if (!lat || !lon) {
    return next(new AppError('Please provide latitude, longitude in the format lat,lon', 401));
  }

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  const tours = await Tour.find({ startLocation: { $geoWithin: { $centerSphere: [[lon, lat], radius] } } });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlon, unit } = req.params;
  const [lat, lon] = latlon.split(',');

  if (!lat || !lon) {
    next(new AppError('Please provide latitude and longitude in the format lat,lon', 401));
  }

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lon * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
