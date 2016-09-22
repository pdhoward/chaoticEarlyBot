
///////////////////////////////////////////////////////////////////////
////////   set the default for the initial channel     //////////////
//////////////////////////////////////////////////////////////////////
var configureChannels  = require('./channels');

console.log("-------channeldefaults-------");
console.log({'configureChannels ': configureChannels[0]})

exports.INITIALCHANNEL = configureChannels[0];
