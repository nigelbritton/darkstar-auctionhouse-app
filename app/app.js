/**
 * Created on 29/05/2018.
 */

'use strict';

let createError = require('http-errors'),
    express = require('express'),
    debug = require('debug')('darkstar-auctionhouse-app'),
    path = require('path'),
    cookieParser = require('cookie-parser'),
    logger = require('morgan'),
    hbs = require('hbs');

let indexRouter = require('./routes/index'),
    apiRouter = require('./routes/api');

let app = express();

let applicationStatus = {
    version: require('../package.json').version,
    name: require('../package.json').name,
    serverPort: process.env.PORT || 5000,
    environment: process.env.NODE_ENV || 'development',
    started: new Date()
};

hbs.registerPartials(__dirname + '/views/partials');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 3600 }));

app.use(function (req, res, next) {
    res.removeHeader("x-powered-by");
    res.setHeader('X-Frame-Options' , 'deny' );
    res.setHeader('X-Content-Type-Options' , 'nosniff' );
    res.setHeader('X-Permitted-Cross-Domain-Policies' , 'none' );
    res.setHeader('X-XSS-Protection' , '1; mode=block' );
    res.setHeader('Cache-Control', 'private, max-age=' + 3600 + ', must-revalidate');
    next();
});

app.use('/', indexRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

app.listen(applicationStatus.serverPort, function () {
    debug('');
    debug('############################################################');
    debug('##              darkstar-auctionhouse-stockist            ##');
    debug('############################################################');
    debug('');
    debug('Version: ' + applicationStatus.version);
    debug('Started: ' + applicationStatus.started);
    debug('Running environment: ' + applicationStatus.environment);
    debug('Listening on port: ' + applicationStatus.serverPort);
    debug('');
    debug('Application ready and listening... ');
    debug('');
});