const APIFeatures = require('./../utils/APIFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

// factory function
exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) return next(new AppError('no document found for this id', 404));

    res.status(204).json({ status: 'success', data: null });
  });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) return next(new AppError('no tour found for this id', 404));

//   res.status(204).json({ status: 'success', data: null });
// });

/***************************************************************************************************** */

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // id check
    // if (req.params.id * 1 > tours.length) {
    //   return res.status(404).json({ status: 'fail', message: 'invalid id' });
    // }

    const document = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

    if (!document) return next(new AppError('no document found for this id', 404));

    res.status(200).json({ status: 'success', data: { data: document } });
  });

/*************************************************************************************************** */

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.create(req.body);

    res.status(201).json({ status: 'success', data: { data: document } });
  });

/*************************************************************************************************** */

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query;
    query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const document = await query;
    // Tour.findOne({_id: req.params.id});

    if (!document) return next(new AppError('no document found for this id', 404));

    res.status(200).json({ status: 'success', data: { data: document } });
  });

/*********************************************************************************************** */

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // to allow for nested GET reviews on tour(hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    // object from a class
    const features = new APIFeatures(Model.find(filter), req.query).filter().sort().limitFields().paginate();

    // EXECUTE QUERY
    // const document = await features.query.explain();
    const document = await features.query;

    // SEND RESPONSE
    // automatically content type application/json
    res
      .status(200)
      .json({ status: 'success', results: document.length, requestedAt: req.requestTime, data: { data: document } });
  });
