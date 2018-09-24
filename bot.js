/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


  Run your bot from the command line:

    clientId=<MY SLACK TOKEN> clientSecret=<my client secret> PORT=<3000> studio_token=<MY BOTKIT STUDIO TOKEN> node bot.js

# USE THE BOT:

    Navigate to the built-in login page:

    https://<myhost.com>/login

    This will authenticate you with Slack.

    If successful, your bot will come online and greet you.


# EXTEND THE BOT:

  Botkit has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
var env = require('node-env-file');
env(__dirname + '/.env');
//console.clear();

if (!process.env.clientId || !process.env.clientSecret || !process.env.PORT) {
  console.log('Error: Specify clientId clientSecret and PORT in environment');
  usage_tip();
  process.exit(1);
}


var Botkit = require('botkit');
var debug = require('debug')('botkit:main');

var bot_options = {
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
	interactive_replies: true,
    // debug: true,
    scopes: ['bot']
};

// Use a mongo database if specified, otherwise store in a JSON file local to the app.
// Mongo is automatically configured when deploying to Heroku
if (process.env.MONGO_URI) {
    var mongoStorage = require('botkit-storage-mongo')({
		mongoUri: process.env.MONGO_URI,
		mongoOptions: {
			//authSource: process.env.mongoDb
		}
	});
    bot_options.storage = mongoStorage;

	console.log("Initialised MongoDB Storage");
} else {
    bot_options.json_file_store = __dirname + '/../.jarvisLocalData/db/'; // store user data in a simple JSON format
}

// Create the Botkit controller, which controls all instances of the bot.
var controller = Botkit.slackbot(bot_options);

controller.startTicking();

// Set up an Express-powered webserver to expose oauth and webhook endpoints
var webserver = require(__dirname + '/components/express_webserver')(controller);

// Set up a simple storage backend for keeping a record of customers
// who sign up for the app via the oauth
require(__dirname + '/components/user_registration')(controller);

// Send an onboarding message when a new team joins
require(__dirname + '/components/onboarding')(controller);

// no longer necessary since slack now supports the always on event bots
// // Set up a system to manage connections to Slack's RTM api
// // This will eventually be removed when Slack fixes support for bot presence
// var rtm_manager = require(__dirname + '/components/rtm_manager')(controller);
//
// // Reconnect all pre-registered bots
// rtm_manager.reconnect();

// Enable Dashbot.io plugin
require(__dirname + '/components/plugin_dashbot')(controller);

const ExtDB = require('./submodules/extDB')
const SalesforceLib = require('./submodules/sfLib');

controller.extDB 		= new ExtDB();
controller.dateFormat 	= require('dateformat');
controller.utils 		= require('./submodules/utils');
controller.flow 		= require('flow');

controller.sfLib 		= new SalesforceLib();

const normalizedSkillsSubfolderPath = require("path").join(__dirname, "skills");
require("fs").readdirSync(normalizedSkillsSubfolderPath).forEach(function(file) {
	// we're only loading JS files, or it's a pain.
	if (file.endsWith(".js")) require("./skills/" + file)(controller);

	// do the same with submodules? load them globally, rather than locally?
});

// increase the default limit
process.setMaxListeners(30);

function usage_tip() {
    console.log('~~~~~~~~~~');
    console.log('Jarvis is starting up');
    console.log('Get Slack app credentials here: https://api.slack.com/apps')
    console.log('Bot Running')
    console.log('~~~~~~~~~~');
}