'use strict';

import Channel          from '../models/Channel';
import mongoose         from 'mongoose';
import colors           from 'colors';

const defaultChannel = {
  name: "Lobby"
}

function createDefaultChannel () {
      Channel.findOne({}).exec(function (err, collection){
          if(collection.length === 0) {
            var newChannel = new Channel(defaultChannel)
            newChannel.save(function (err, data) {
              console.log("Default Channel Created".green)
              if(err) {
                console.log(err);
                return res.status(500).json({msg: 'internal server error'});
              }
            })
          }
          else{
            console.log("DB initialized. No default created".green)
          }
        })
      }

module.exports = {
  createDefaultChannel: createDefaultChannel,
}
