// uncaught exception - suynchronous code
process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');

  process.exit(1);
});

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

// mongodb configuration
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);
mongoose
  .connect(DB, { useNewUrlParser: true, useCreateIndex: true, useFindAndModify: false, useUnifiedTopology: true })
  .then(() => {
    // console.log(conObj.connections);
    console.log('database connection successful');
  });
// .catch((err) => console.log(`ERROR: ${err.message}`)); // handled database rejection

const port = process.env.PORT || 3000;

// server start
const server = app.listen(port, () => {
  console.log(`app is running at port ${port}`);
});

// error outside of express app, asynchronous code
process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('UNHANDLED REJECTION, shutting down....');
  server.close(() => {
    process.exit(1);
  });
});
