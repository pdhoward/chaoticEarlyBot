

require('babel-core/register'); //enables ES6 ('import'.. etc) in Node
//import setup                      from '../../setup';

var setup = require('../../setup');

if (setup.SERVER.HOST != 'localhost') {
//if (process.env.NODE_ENV === 'production') {
  require('./server.prod')
} else {
  require('./server.dev');
}
