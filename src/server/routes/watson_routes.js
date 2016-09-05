
//////////////////////////////////////////////////////////////////////////
///////////////////////////// Watson API ////////////////////////////////
////////////////////////////////////////////////////////////////////////

var Message =           require('../models/Message');
var bodyparser =        require('body-parser');

// The following requires are needed for logging purposes
var uuid =              require( 'uuid' );
var vcapServices =      require( 'vcap_services' );
var basicAuth =         require( 'basic-auth-connect' );
var logs = null;

// watson sdk and workspace id
require( 'dotenv' ).config( {silent: true} );
var watson =            require( 'watson-developer-cloud' );

// Create the service wrapper
var conversation = watson.conversation( {
  url: 'https://gateway.watsonplatform.net/conversation/api',
  username: process.env.CONVERSATION_USERNAME || '<username>',
  password: process.env.CONVERSATION_PASSWORD || '<password>',
  version_date: '2016-07-11',
  version: 'v1'
} );

module.exports = function(router) {
  router.use(bodyparser.json());

  //evaluate a new message
  router.post('/newmessage', function(req, res) {

    // for every new message -- Watson looks at it and responds
    console.log(">>>>>>>WATSON IS EVALUATING POST<<<<<<<")
    console.log("message = " + JSON.stringify(req.body));

    var watsonMessage = new Message(req.body);

    ///////////////////////////////////////////////////////////////
    var workspace = process.env.WORKSPACE_ID || '<workspace-id>';

    if ( !workspace || workspace === '<workspace-id>' ) {
        console.log(">>>>>>>>>>>>>MISSING WORSPACE ID <<<<<<<<<<<<<<<")
      }

    var payload = {
      workspace_id: workspace,
      context: {},
      input: {}
    };

    if ( req.body ) {
        payload.input = watsonMessage.text
      }
    if ( req.body.context ) {
        // The client must maintain context/state
        payload.context = req.body.context;
      }

      console.log("payload = " + JSON.stringify(payload));

    // Send the input to the conversation service
    conversation.message( payload, function(err, data) {
      if ( err ) {
//        return res.status( err.code || 500 ).json( err );
          console.log(">>>>>>WATSON ERROR<<<<<<<<<<")
          }
//      return res.json( updateMessage( payload, data ) );
      console.log(">>>>>>>>>WATSON RESPONSE<<<<<<<<<<")
      console.log(data);
    });


    // need to update this to ensure that watson's message gets saved ----- not user message
        watsonMessage.save(function (err, data) {
          if(err) {
            console.log(err);
            return res.status(500).json({msg: 'internal server error'});
          }
    //      res.json(data);
        console.log(">>>>>>>SAVED WATSON RESPONSE TO MONGO<<<<<<<<<<")
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
