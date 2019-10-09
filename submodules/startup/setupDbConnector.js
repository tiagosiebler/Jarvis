const botkitMongo = require('botkit-storage-mongo');

module.exports = botOptionsObject => {
  if (!process.env.MONGO_URI) {
    // store user data in a simple JSON format
    botOptionsObject.json_file_store = __dirname + '/../../../.jarvisLocalData/db/';
    console.log('MongoDB URI missing in .env file, no MONGO_URI defined. Defaulting to JSON store');
    return;
  }

  // Use a mongo database if specified, otherwise store in a JSON file local to the app.
  // Mongo is automatically configured when deploying to Heroku
  botOptionsObject.storage = botkitMongo({
    mongoUri: process.env.MONGO_URI,
    mongoOptions: {
      //authSource: process.env.mongoDb
    }
  });
  console.log('Successfully initialised MongoDB Connector');
};
