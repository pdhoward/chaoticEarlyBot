
//////////////////////////////////////////////////////////////////////////
///////////////////////////// Watson Routes /////////////////////////////
////////////////////////////////////////////////////////////////////////

const chatMessage =         require('../models/Message');
const watsonResponse =      require('../models/WatsonResponse');
const bodyparser =          require('body-parser');
const uuid =                require( 'uuid' );
const vcapServices =        require( 'vcap_services' );
const basicAuth =           require( 'basic-auth-connect' );
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

var message = {
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


////////////////////////////////////////////////////////////
//////////////////Watson APIs /////////////////////////////
//////////////////////////////////////////////////////////



module.exports = function(router) {

  router.use(bodyparser.json());

  //evaluate a new message
  router.post('/newmessage', function(req, res, next) {

    // for every new message -- Watson looks at it and responds
    console.log(">>>>>>>WATSON IS EVALUATING POST<<<<<<<")
    console.log("message = " + JSON.stringify(req.body));

    const watsonMessage = new chatMessage(req.body);
    message.input.text = watsonMessage.text;

    if (req.session.context) {
      message.context = req.session.context;
    }

    if ( ! message.workspace_id || message.workspace_id === 'workspace-id' ) {
        console.log(">>>>>>>>>>>>>MISSING WORSPACE ID <<<<<<<<<<<<<<<")
      }

    // Send the input to the conversation service
    conversation.message( message, function(err, data) {
      if ( err )  return res.status( err.code || 500 ).json( err );

//    return res.json( updateMessage( payload, data ) );
      console.log(">>>>>>>>>WATSON RESPONSE<<<<<<<<<<")
      console.log(data);

      const newwatsonResponse = new watsonResponse(data);
      req.session.context = newwatsonResponse.context;

      newwatsonResponse.save(function (err, data) {
          if(err) {
            console.log(err);
            return res.status(500).json({msg: 'internal server error'});
            }
          watsonMessage.text = newwatsonResponse.output.text
          watsonMessage.user.username = "Watson";
          res.json(watsonMessage);
          console.log(">>>Watson Text<<<<");
          console.log(watsonMessage);
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
