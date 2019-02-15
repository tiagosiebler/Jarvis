/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
           ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
           \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
            \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


  Run your bot from the command line:

    clientId=<MY SLACK TOKEN> clientSecret=<my client secret> PORT=<3000> node bot.js

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
const env = require('node-env-file');
env(__dirname + '/.env');
//console.clear();

if (!process.env.clientId || !process.env.clientSecret || !process.env.PORT) {
  console.log('Error: Specify clientId clientSecret and PORT in environment');
  usage_tip();
  process.exit(1);
}

const Botkit = require('botkit');
const debug = require('debug')('botkit:main');

const bot_options = {
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  clientSigningSecret: process.env.clientSigningSecret,
  interactive_replies: true,
  // debug: true,
  scopes: ['bot']
};

// Use a mongo database if specified, otherwise store in a JSON file local to the app.
// Mongo is automatically configured when deploying to Heroku
if (process.env.MONGO_URI) {
  bot_options.storage = require('botkit-storage-mongo')({
    mongoUri: process.env.MONGO_URI,
    mongoOptions: {
      //authSource: process.env.mongoDb
    }
  });
  console.log('Initialised MongoDB Storage');
} else {
  bot_options.json_file_store = __dirname + '/../.jarvisLocalData/db/'; // store user data in a simple JSON format
}

// Create the Botkit controller, which controls all instances of the bot.
const controller = Botkit.slackbot(bot_options);
controller.flow = require('flow');

controller.startTicking();

// Set up an Express-powered webserver to expose oauth and webhook endpoints
const webserver = require(__dirname + '/components/express_webserver')(
  controller
);

// Set up a simple storage backend for keeping a record of customers
// who sign up for the app via the oauth
require(__dirname + '/components/user_registration')(controller);

// Send an onboarding message when a new team joins
require(__dirname + '/components/onboarding')(controller);

const ExtDB = require('./submodules/extDB');
const SalesforceLib = require('./submodules/sfLib');

controller.extDB = new ExtDB();
controller.dateFormat = require('dateformat');
controller.utils = require('./submodules/utils');

controller.sfLib = new SalesforceLib();

const normalizedSkillsSubfolderPath = require('path').join(__dirname, 'skills');
require('fs')
  .readdirSync(normalizedSkillsSubfolderPath)
  .forEach(function(file) {
    // we're only loading JS files, or it's a pain.
    if (file.endsWith('.js')) require('./skills/' + file)(controller);

    // do the same with submodules? load them globally, rather than locally?
  });

// increase the default limit
process.setMaxListeners(30);

const usage_tip = () => {
  console.log('~~~~~~~~~~');
  console.log('Jarvis couldn\'t start due to missing .env settings.');
  console.log('Get Slack app credentials here: https://api.slack.com/apps');
  console.log('Make sure to follow the configuration steps here: https://github.com/tiagosiebler/Jarvis/blob/master/_notes/install.md#configuration');
  console.log('~~~~~~~~~~');
}
