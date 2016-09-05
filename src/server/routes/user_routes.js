
//////////////////////////////////////////////////////
/////////////USER AUTHENTICATION/////////////////////
////////////////////////////////////////////////////

const bodyparser =              require('body-parser');
const User =                    require('../models/User.js');

/*
// define sessions
import session                  from 'express-session';

const dbURI =                   setup.SERVER.DB;

const MongoDBStore = require('connect-mongodb-session')(session);

const track = new MongoDBStore(
      { uri: dbURI,
        collection: 'tracksessions'});

// Catch errors
track.on('error', function(error) {
    console.log("error with session store = " + error);
    });

const sessionSecret       = secrets.SECRETS.SESSIONSECRET;

const sessionParms = {
    secret: sessionSecret,
    cookie: {
      secure: false,
      httpOnly: false,
      maxAge: 1000 * 60 * 60 * 24 * 7 }, // 1week
      store: track
    }

//allows us to use secure cookies in production but still test in dev
// note cookie.secure is recommended but requires https enabled website
// trust proxy required if using nodejs behind a proxy (like ngnx)
if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    sessionParms.cookie.secure = true // serve secure cookies
   }

console.log("session parms = " + JSON.stringify(sessionParms));

//app.use(cookieParser(sessionSecret));
app.use(session(sessionParms));
*/

//////////////////////////////////////////////
///////////// routes ////////////////////////
////////////////////////////////////////////

module.exports = function loadUserRoutes(router, passport) {
  router.use(bodyparser.json());

  router.get('/auth/facebook', passport.authenticate('facebook', {
    session: false,
    successRedirect: '/chat',
    failureRedirect: '/'
  }));

  router.get('/auth/facebook/callback', passport.authenticate('facebook', {
    session: false,
    successRedirect: '/chat',
    failureRedirect: '/'
  }));

  router.post('/sign_up', passport.authenticate('local-signup', { session: false}), function(req, res) {
    setSession(req);
    res.json(req.user);
  });

  router.post('/sign_in', passport.authenticate('local-login', { session: false}), function(req, res) {

    console.log(">> SIGN IN " + req.url);

    setSession(req);
    res.json(req.user);
  });

  router.get('/signout', function(req, res) {
    req.logout();
    res.end();
  });

  //get auth credentials from server
  router.get('/load_auth_into_state', function(req, res) {
    res.json(req.user);
  });

  // get usernames for validating whether a username is available
  router.get('/all_usernames', function(req, res) {
    User.find({'local.username': { $exists: true } }, {'local.username': 1, _id:0}, function(err, data) {
      if(err) {
        console.log(err);
        return res.status(500).json({msg: 'internal server error'});
      }
      res.json(data);
    });
  })
};



///////////////////////////////////////////////////////////////////////
///////////////manage session state via express.session///////////////
//////////////////////////////////////////////////////////////////////

function setSession(req) {
    var sessionState = req.session

    console.log("req = " + Object.getOwnPropertyNames(req));

    if (sessionState.views) {
      sessionState.views++
      console.log('session id = ' + sessionState.id);
      console.log('user id = ' + sessionState.user);
      console.log('session views = ' + sessionState.views);
      } else {
      sessionState.views = 1;
      sessionState.user = req.user.username;
      console.log('session views = ' + sessionState.views);
      console.log('user id = ' + sessionState.user);
     }
    return;
   }
