var debug = require('debug')('botkit:webhooks:rally');

/*
  This allows you to redirect rally events to the HTTP endpoint on the bot server:
    https://botserver:3000/rally/receive
*/
module.exports = function(webserver, controller) {

  debug('Configured /rally/receive url');
  webserver.post('/rally/receive', function(req, res) {
    // NOTE: we should enforce the token check here

    // respond to Rally that the webhook has been received.
    res.status(200);
    return;

    // Now, pass the webhook to be normalised then processed as a bot event
    // this is configured as a middleware
    controller.handleRallyWebhookPayload(req, res);
  });

}
