'use strict';

import express                    from 'express';
import session                    from 'express-session';
import cookieParser               from 'cookie-parser';
import Cookies                    from 'cookies';
import serialize                  from 'serialize-javascript'
import path                       from 'path';
import mongoose                   from 'mongoose';

import { renderToString }         from 'react-dom/server'
import { Provider }               from 'react-redux'
import React                      from 'react';
import { createMemoryHistory,
         RouterContext,
         match }                  from 'react-router';
import { syncHistoryWithStore }   from 'react-router-redux'
import {createLocation}           from 'history';
import cors                       from 'cors';
import passport                   from 'passport';
import favicon                    from 'serve-favicon';
import SocketIo                   from 'socket.io';
import bodyParser                 from 'body-parser'
import url                        from 'url'
import colors                     from 'colors'

// configurations
import setup                      from '../../setup';
import secrets                    from './secrets';
import configureStore             from '../common/store/configureStore'
import routes                     from '../common/routes';
import User                       from './models/User.js';
import {HTML}                     from '../html/index';


/////////////////////////////////////////////////////////////////////////////////////////////
////////Create our server object with configurations -- either in the cloud or local/////////
////////////////////////////////////////////////////////////////////////////////////////////
const app =         express();

const host =        setup.SERVER.HOST;
const port =        setup.SERVER.PORT;
const dbURI =       setup.SERVER.DB;


///////////////////////////////////////////////////////////////////////
///////////////////////// Middleware Config ////////////////////////////
//////////////////////////////////////////////////////////////////////
app.use('/', express.static(path.join(__dirname, '../..', 'static')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser(sessionSecret));
app.use(favicon(path.join(__dirname, '..', '..', '/static/favicon.ico')));

app.options('*', cors());
app.use(cors());

///////////////////////////////////////////////////////////////////////
///////////////////         db setup           ////////////////////////
//////////////////////////////////////////////////////////////////////
mongoose.connect(dbURI);

///////////////////////////////////////////////////////////////////////
/////////////////// session and session store setup ////////////////////////
//////////////////////////////////////////////////////////////////////

// security and oauth
require('../../config/passport')(passport);

// for express sessions and cookies
const sessionSecret = secrets.SECRETS.SESSIONSECRET;

const MongoDBStore = require('connect-mongo')(session);

const track = new MongoDBStore(
        { url: dbURI,
          collection: 'sessions'});

const sessionParms = {
  name: 'chaoticbots',
  secret: sessionSecret,
  saveUninitialized: true,
  resave: false,
  store: track,
  cookie: {
      path: '/',
      domain: 'localhost',
      secure: false,
      httpOnly: false,
      maxAge: 1000*60*24}
  }


// Catch errors
track.on('error', function(error) {
    console.log("error with session store = " + error);
});

app.use(session(sessionParms));

app.use(passport.initialize());
app.use(passport.session());

/*
//allows us to use secure cookies in production but still test in dev
// note cookie.secure is recommended but requires https enabled website
// trust proxy required if using nodejs behind a proxy (like ngnx)
if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    sessionParms.cookie.secure = true // serve secure cookies
   }
*/


/////////////////////////////////////////////////////////////////////////////////////////////
////////Component and Configuration Related to the Development Server             /////////
////////////////////////////////////////////////////////////////////////////////////////////
import DevTools                   from '../common/containers/DevTools';
import webpack                    from 'webpack';
import webpackConfig              from '../../webpack.config.dev'
const compiler =                  webpack(webpackConfig);

/////////////////////////////////////////////////////////////////////////////////////
///////////////////        Development Server Only        //////////////////////////
///////////////////////////////////////////////////////////////////////////////////

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: webpackConfig.output.publicPath
}));

//app.use(require('webpack-hot-middleware')(compiler));


/*
///////////////////////////////////////////////////////////////////////
///////////////    configure response headers for sessions    ////////
//////////////////////////////////////////////////////////////////////

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    next();
});
*/
//////////////////////////////////////////////////////////////////////////
///////////////////////////// API CATALOGUE /////////////////////////////
////////////////////////////////////////////////////////////////////////

const messageRouter = express.Router();
const watsonRouter = express.Router();
const usersRouter = express.Router();
const channelRouter = express.Router();

require('./routes/watson_routes')(watsonRouter);
require('./routes/message_routes')(messageRouter);
require('./routes/channel_routes')(channelRouter);
require('./routes/user_routes')(usersRouter, passport);

app.use('/api', watsonRouter);
app.use('/api', messageRouter);
app.use('/api', usersRouter);
app.use('/api', channelRouter);


///////////////////////////////////////////////////////////////////////
///////////////    configure webserver for sessions    ///////////////
//////////////////////////////////////////////////////////////////////

app.use(function(req, res, next){

	var keys;
	console.log('-----------incoming request -------------'.green);
	console.log('New ' + req.method + ' request for', req.url);

  if (req.session.count) {
    req.session.count++;
    console.log("session count = " + req.session.count);
  }
  else{
    req.session.count = 1;
    console.log("session count = " + req.session.count);
  }

  req.bag = req.session						//create my object for my stuff

  console.log({cookie: req.cookies});
  console.log({session: req.session});
  console.log({reqheadercookie: req.get('cookie')});
  console.log({rawHeaders: req.rawHeaders});

  req.session.save(function(err){
    if (err) console.log("error saving session".green + err);
    console.log('>>SESSION SAVED<<'.green);
    console.log({sessionID: req.sessionID});   ;
    console.log('-----------------------'.green);

  })

	var url_parts = url.parse(req.url, true);
	req.parameters = url_parts.query;
	keys = Object.keys(req.parameters);

	if(req.parameters && keys.length > 0)
    console.log({parameters: req.parameters});		//print request parameters
	keys = Object.keys(req.body);
	if (req.body && keys.length > 0)
    console.log({body: req.body});						//print request body

	next();
});



///////////////////////////////////////////////////////////////////////
///////////////////////////// MAIN ROUTE /////////////////////////////
//////////////////////////////////////////////////////////////////////



app.use(function (req, res) {


  const memoryHistory = createMemoryHistory(req.Url)
  const store = configureStore(memoryHistory)
  const history = syncHistoryWithStore(memoryHistory, store)


  match({ history, routes, location: req.url }, (error, redirectLocation, renderProps) => {
    if (error) {
      res.status(500).send(error.message)
    } else if (redirectLocation) {
      res.redirect(302, redirectLocation.pathname + redirectLocation.search)
    } else if (renderProps) {
      const content = renderToString(
        <Provider store={store}>
          <RouterContext {...renderProps}/>
        </Provider>
      )
      const cookies = new Cookies(req,res); // cookie jar

      console.log('>>DISPLAY COOKIE JAR<<'.green);
      console.log(cookies.get('chaoticbots'));
      console.log('-----------------------'.green);

      console.log('>>setting res header <<'.green);
      cookies.set('chaoticbots', 'unknown', sessionParms.cookie);
      console.log('-----------------------'.green);

      res.send('<!doctype html>\n' + renderToString(<HTML content={content} store={store}/>))

    }
  })
})


///////////////////////////////////////////////////////////////////////
/////////////////Launch Server---  Connect Sockets ////////////////////
//////////////////////////////////////////////////////////////////////

const server = app.listen(port, host, function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('server listening on port: '.green + port);
});

const io = new SocketIo(server, {path: '/api/chat'})

io.on('connection', function(socket) {
  console.log("someone just joined sockets")
})

app.set('socketio', io);

const socketEvents = require('./socketEvents')(io);
