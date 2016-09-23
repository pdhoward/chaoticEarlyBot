import Channel          from '../models/Channel';
import bodyparser       from 'body-parser';

module.exports = function(router) {
  router.use(bodyparser.json());
/*
  // deprecating this route since it just gets all channels
  router.get('/channels', function(req, res) {

    Channel.find({},{name: 1, id:1, _id:0}, function(err, data) {
      if(err) {
        console.log(err);
        return res.status(500).json({msg: 'internal server error'});
      }

      res.json(data);
    });
  });
*/
  // this route returns all channels --- including private channels for that user
  router.get('/channels/:name', function(req, res) {

    Channel.find({ $or: [ {between: req.params.name}, {private: false } ] }, {name: 1, id:1, private: 1, between: 1, _id:0}, function(err, data) {
      if(err) {
        console.log(err);
        return res.status(500).json({msg: 'internal server error'});
      }

      res.json(data);
    });
  })


  // return a single channel name based on parm -- used to sync in the initialization of the platform
  router.get('/channels/sync_channel/:channel', function(req, res) {
    Channel.find({ name: req.params.channel })
           .select( {name: 1, id:1, private: 1, between: 1, _id:0})
           .lean()
           .exec( function(err, data) {
                    if(err) {
                      console.log(err);
                      return res.status(500).json({msg: 'internal server error'});
                    }
                  console.log("--------channel sync -----------");
                  console.log({data: data});
                  const channelObject = {};
                  channelObject.name = data[0].name;
                  channelObject.id = data[0].id;
                  console.log({channelObject: channelObject});

                  res.json(channelObject);
                });
          });

  // post a new user to channel list db
  router.post('/channels/new_channel', function(req, res) {
    console.log("--------creating new channel -----------");
    console.log(req.body);

    var newChannel = new Channel(req.body);
    newChannel.save(function (err, data) {
      if(err) {
        console.log(err);
        return res.status(500).json({msg: 'internal server error'});
      }

      res.json(data);
    });
  });
}
