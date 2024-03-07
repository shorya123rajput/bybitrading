const express = require("express") // import express
const morgan = require("morgan") //import morgan
const { log } = require("mercedlogger") // import mercedlogger's log function
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require('helmet');
const routes = require("../api/routes/v1");
const app = express();
const error = require("../api/middlewares/error");
const compression = require('compression');

// GLOBAL MIDDLEWARE
app.use(cors()) // add cors headers
app.use(morgan("tiny")) // log the request for debugging

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// secure apps by setting various HTTP headers
app.use(helmet());
app.use(cors());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// mount api v1 routes
app.use("/api/v1", routes);

//if error is not an instanceOf APIError, convert it.
app.use(error.converter);

// catch 404 and forward to error handler
app.use(error.notFound);

// error handler, send stacktrace only during development
app.use(error.handler);



module.exports = app;
