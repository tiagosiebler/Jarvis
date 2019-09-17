const env = require('node-env-file');
env(__dirname + '/.env');

const assertEnvKeys = require(__dirname + '/submodules/startup/assertEnvKeys');
const setupDbConnector = require(__dirname + '/submodules/startup/setupDbConnector');
const setupSkills = require(__dirname + '/submodules/startup/setupSkills');
const setupController = require(__dirname + '/submodules/startup/setupController');

const setupExceptionCatcher = require(__dirname + '/submodules/startup/setupExceptionCatcher');

// Sanity check for client id, secret and port. Process will exit if missing.
assertEnvKeys();

const bot_options = {
  clientId: process.env.clientId,
  clientSecret: process.env.clientSecret,
  clientSigningSecret: process.env.clientSigningSecret,
  interactive_replies: true,
  // debug: true,
  scopes: ['bot']
};

// Create the DB connection
setupDbConnector(bot_options);

// Create the Botkit controller, which controls all instances of the bot.
const controller = setupController(bot_options);

// express server for webhook and oauth endpoints
require(__dirname + '/components/express_webserver')(controller);

// oauth setup workflow
require(__dirname + '/components/user_registration')(controller);

// Load skills that define how to react to slack events
setupSkills(controller);

// Report exceptions to slack and automatically restart via pm2
setupExceptionCatcher();