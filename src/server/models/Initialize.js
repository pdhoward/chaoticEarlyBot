'use strict';

import Channel          from '../models/Channel';
import mongoose         from 'mongoose';
import uuid             from 'node-uuid';
import colors           from 'colors';

const limit = 1;

const defaultChannel = {
  name: "Lobby",
  id: `${Date.now()}${uuid.v4()}`,
  private: false
}

function createDefaultChannel () {
      Channel.find({}).limit(limit).exec(function (err, collection){
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
