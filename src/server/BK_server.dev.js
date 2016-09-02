'use strict';

import express                    from 'express';
import path                       from 'path';
import mongoose                   from 'mongoose';
import { renderToString }         from 'react-dom/server'
import { Provider }               from 'react-redux'
import React                      from 'react';
import { RouterContext, match }   from 'react-router';
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
const usersRouter = express.Router();
const channelRouter = express.Router();
require('./routes/message_routes')(messageRouter);
require('./routes/channel_routes')(channelRouter);
require('./routes/user_routes')(usersRouter, passport);
app.use('/api', messageRouter);
app.use('/api', usersRouter);
app.use('/api', channelRouter);


///////////////////////////////////////////////////////////////////////
///////////////////////////// MAIN ROUTE /////////////////////////////
//////////////////////////////////////////////////////////////////////


app.get('/*', function(req, res) {
  const location = createLocation(req.url)
  match({ routes, location }, (err, redirectLocation, renderProps) => {

    const initialState = {
      auth: {
        user: {
          username: 'tester123',
          id: 0,
          socketID: null
        }
      }
    }
    const store = configureStore(initialState);
    // console.log(redirectLocation);
    // if(redirectLocation) {
    //   return res.status(302).end(redirectLocation);
    // }


    if(err) {
      console.error(err);
      return res.status(500).end('Internal server error');
    }

    if(!renderProps) {
      return res.status(404).end('Not found');
    }
    const InitialView = (
      <Provider className="root" store={store}>
        <div style={{height: '100%'}}>
          <RouterContext {...renderProps} />
          {process.env.NODE_ENV !== 'production' && <DevTools />}
        </div>
      </Provider>
    );

    const finalState = store.getState();
    const html = renderToString(InitialView)
    res.status(200).end(renderFullPage(html, finalState));
  })
})

const server = app.listen(port, host, function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('server listening on port: ' + port);
});

const io = new SocketIo(server, {path: '/api/chat'})
const socketEvents = require('./socketEvents')(io);

function renderFullPage(html, initialState) {
  return `
    <!doctype html>
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" />
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css" />
        <link rel="icon" href="./favicon.ico" type="image/x-icon" />
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <title>ChaoticBots</title>
      </head>
      <body>
        <container id="react">${html}</container>
        <script>
          window.__INITIAL_STATE__ = ${JSON.stringify(initialState)}
        </script>
        <script src="/dist/bundle.js"></script>
      </body>
    </html>
  `
}
