'use strict';

import express                    from 'express';
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
import colors                     from 'colors'

// configurations
import setup                      from '../../setup';
import configureStore             from '../common/store/configureStore'
import routes                     from '../common/routes';
import User                       from './models/User.js';
import {HTML}                     from '../html/index';

// security and oauth
require('../../config/passport')(passport);

/////////////////////////////////////////////////////////////////////////////////////////////
////////Component and Configuration Related to the Development Server             /////////
////////////////////////////////////////////////////////////////////////////////////////////
import DevTools                   from '../common/containers/DevTools';
import webpack                    from 'webpack';
import webpackConfig              from '../../webpack.config.dev'
const compiler =                  webpack(webpackConfig);

/////////////////////////////////////////////////////////////////////////////////////////////
////////Create our server object with configurations -- either in the cloud or local/////////
////////////////////////////////////////////////////////////////////////////////////////////
const app =         express();

const host =        setup.SERVER.HOST;
const port =        setup.SERVER.PORT;
const dbURI =       setup.SERVER.DB;

// connect our DB
mongoose.connect(dbURI);

process.on('uncaughtException', function (err) {
  console.log(err);
});



///////////////////////////////////////////////////////////////////////
///////////////////////// Middleware Config ////////////////////////////
//////////////////////////////////////////////////////////////////////


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use('/', express.static(path.join(__dirname, '../..', 'static')));
app.use(favicon(path.join(__dirname, '..', '..', '/static/favicon.ico')));

app.use(cors());
app.use(passport.initialize());


/////////////////////////////////////////////////////////////////////////////////////
///////////////////        Development Server Only        //////////////////////////
///////////////////////////////////////////////////////////////////////////////////

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: webpackConfig.output.publicPath
}));

app.use(require('webpack-hot-middleware')(compiler));

//////////////////////////////////////////////////////////////////////////
///////////////////////////// API CATALOGUE /////////////////////////////
////////////////////////////////////////////////////////////////////////

const messageRouter = express.Router();
const watsonRouter = express.Router();
const usersRouter = express.Router();
const channelRouter = express.Router();
require('./routes/message_routes')(messageRouter);
require('./routes/watson_routes')(watsonRouter);
require('./routes/channel_routes')(channelRouter);
require('./routes/user_routes')(usersRouter, passport);

app.use('/api', watsonRouter);
app.use('/api', messageRouter);
app.use('/api', usersRouter);
app.use('/api', channelRouter);


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
const socketEvents = require('./socketEvents')(io);
