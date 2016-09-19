
//////////////////////////////////////////////////////
/////////////USER AUTHENTICATION/////////////////////
////////////////////////////////////////////////////

const bodyparser =              require('body-parser');
const User =                    require('../models/User.js');

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

//  router.post('/sign_up', passport.authenticate('local-signup', { session: false}), function(req, res) {
  router.post('/sign_up', passport.authenticate('local-signup'), function(req, res) {

    console.log(">>> REQ HEADERS FOR SIGN UP <<<<".green);
    console.log({rawHeaders: req.rawHeaders});
    console.log({reqheadercookie: req.get('cookie')});
    console.log("---------------------".green);

    res.json(req.user);

    res.on('finish', function() {
        console.log(">>> RES HEADERS ON SIGN UP <<<<".green);
        console.log({resheaders: res._headers});
        console.log("---------------------".green);
      });

  });

// router.post('/sign_in', passport.authenticate('local-login' { session: false }), function(req, res) {
  router.post('/sign_in', passport.authenticate('local-login'), function(req, res) {

    console.log(">>> REQ HEADERS FOR SIGN IN <<<<".green);
    console.log({rawHeaders: req.rawHeaders});
    console.log({reqheadercookie: req.get('cookie')});
    console.log("---------------------".green);

    res.json(req.user);

    res.on('finish', function() {
        console.log(">>> RES HEADERS ON SIGN IN <<<<".green);
        console.log({resheaders: res._headers});
        console.log({reqUser: req.user});
        console.log("---------------------".green);
      });

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
