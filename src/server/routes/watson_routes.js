
//////////////////////////////////////////////////////////////////////////
///////////////////////////// Watson Routes /////////////////////////////
////////////////////////////////////////////////////////////////////////

import chatMessage            from '../models/Message';
import watsonResponse         from '../models/WatsonResponse';
import bodyparser             from 'body-parser';
import moment                 from 'moment';
import uuid                   from 'node-uuid';
import vcapServices           from 'vcap_services';
import basicAuth              from 'basic-auth-connect';
import colors                 from 'colors'


require( 'dotenv' ).config( {silent: true} );

const logs = null;
const workspace = process.env.WORKSPACE_ID || 'workspace-id';


// watson conversation parameters
const watson =             require( 'watson-developer-cloud' );

const conversation = watson.conversation( {
  url: 'https://gateway.watsonplatform.net/conversation/api',
  username: process.env.CONVERSATION_USERNAME || '<username>',
  password: process.env.CONVERSATION_PASSWORD || '<password>',
  version_date: '2016-07-11',
  version: 'v1'
} );

const message = {
  workspace_id: workspace,
  input: {
    text: ''
  },
  context: {},
  alternate_intents: false,
  entities: [],
  intents: [],
  output: {}
}

const buildMessageToSend = {
  id: `${Date.now()}${uuid.v4()}`,
  channelID: '',
  text: '',
  user: '',
  time: moment.utc().format('lll')

}

const watsonUserID = {
  username: 'Watson',
  socketID: '/#testid'
}

var buildID = '';


////////////////////////////////////////////////////////////
//////////////////Watson APIs /////////////////////////////
//////////////////////////////////////////////////////////



module.exports = function(router) {

  router.use(bodyparser.json());

  //evaluate a new message
  router.post('/newmessage', function(req, res, next) {

    var io = req.app.get('socketio');

    // for every new message emitted -- Watson looks at it and responds
    const watsonMessage = new chatMessage(req.body);

    //prepare message to send to Watson
    message.input.text = watsonMessage.text;

   // need a way to set message.context here
    message.context = req.bag.context;

    if ( ! message.workspace_id || message.workspace_id === 'workspace-id' ) {
        return res.status( 500 );};

    //prepare message to broadcast from watson once response is received

    buildMessageToSend.channelID = watsonMessage.channelID;
    buildMessageToSend.user = watsonUserID;
    buildID = `${Date.now()}${uuid.v4()}`;
    buildMessageToSend.id = buildID;

    // Send the input to the Watson conversation service
    conversation.message( message, function(err, data) {
      if ( err )  return res.status( err.code || 500 ).json( err );

      const newwatsonResponse = new watsonResponse(data);
      req.bag.context = newwatsonResponse.context;
      console.log('>>req bag <<'.green);
      console.log(JSON.stringify(req.bag));
      console.log('-----------------------'.green);

      console.log('>>watson input<<'.green);
      console.log(message);
      console.log('-----------------------'.green);

      console.log('>>watson response context<<'.green);
      console.log(newwatsonResponse.context);
      console.log('-----------------------'.green);

      console.log('>>watson output<<'.green);
      console.log(newwatsonResponse.output.text[0]);
      console.log('-----------------------'.green);

      //build and broadcast message
      buildMessageToSend.text = newwatsonResponse.output.text[0];
      console.log('>>Broadcast Message<<'.green);
      console.log(buildMessageToSend);
      console.log('-----------------------'.green);

      io.to(buildMessageToSend.channelID).emit('new bc message', buildMessageToSend);

      // save watson message
      newwatsonResponse.save(function (err, data) {
          if(err) {
            console.log(err);
            return res.status(500).json({msg: 'internal server error'});
            }
    //      watsonMessage.text = newwatsonResponse.output.text
    //      watsonMessage.user.username = "Watson";
  //        res.json(watsonMessage);
          console.log(">>>Watson Message Saved<<<<");
  //        console.log(watsonMessage);

          next()

        });
      });

    });
  }


/**
* Updates the response text using the intent confidence
* input The request to the Conversation service
* response The response from the Conversation service
* Returns the response with the updated message
*/

function updateMessage(input, response) {
    var responseText = null;
    var id = null;
    if ( !response.output ) {
      response.output = {};
    } else {
    if ( logs ) {
    // If the logs db is set, then we want to record all input and responses
      id = uuid.v4();
      logs.insert( {'_id': id, 'request': input, 'response': response, 'time': new Date()});
    }
    return response;
  }

  if ( response.intents && response.intents[0] ) {
    var intent = response.intents[0];
  // Depending on the confidence of the response the app can return different messages.
  // The confidence will vary depending on how well the system is trained. The service will always try to assign
  // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
  // user's intent . In these cases it is usually best to return a disambiguation message
  // ('I did not understand your intent, please rephrase your question', etc..)
  if ( intent.confidence >= 0.75 ) {
    responseText = 'I understood your intent was ' + intent.intent;
  } else if ( intent.confidence >= 0.5 ) {
    responseText = 'I think your intent was ' + intent.intent;
  } else {
    responseText = 'I did not understand your intent';
  }
}

  response.output.text = responseText;
  if ( logs ) {
    // If the logs db is set, then we want to record all input and responses
    id = uuid.v4();
    logs.insert( {'_id': id, 'request': input, 'response': response, 'time': new Date()});
  }
  return response;
}

////////////////////////////////////////////////////////////////
