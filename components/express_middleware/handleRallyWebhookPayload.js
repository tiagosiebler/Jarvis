const debug = require('debug')('botkit:webhooks:rally');

const exampleBody = require('../../../tests/systems/data/webhookCommentAddedToDefect.json');
const exampleBody2 = require('../../../tests/systems/data/webhookCommentAddedToDefect2.json');

module.exports = (webserver, controller) => {

  debug('Configured handleRallyWebhookPayload()');
  controller.handleRallyWebhookPayload = (req, res) => {
    return false;
    // expose a simple function to handle and normalise rally webhook events, in a way the bot can understand

    // if (req.body.type === 'url_verification') {
    //     slack_botkit.debug('Received url handshake');
    //     res.json({ challenge: req.body.challenge });
    //     return;
    // }

    var payload = req.body;

    if (!payload) {
      debugger;
      return;
    }

    const {
      object_id,
      changes,
      transaction
    } = payload.message;

    if (!changes || !object_id || !transaction || transaction.user) {
      debugger;
      return;
    }

    const userEmail = transaction.user.username;
    if (!userEmail) return;

    // get all changes that were posts
    const conversationPosts = Object.values(changes)
      .filter(change => change.name == 'Discussion')
      .map(change => change.added);

    // no comments added, ignore webhook event
    if (!conversationPosts) return;
    debugger;

    // debugger;
    /*


    */

    var c = controller;

    // process rally payload here
    /*
      - check if payload has
          -
          - changes {}
          - { object_type == ConversationPost}
      - Lookup DB for tracked rally ID
      - Build MSG for slack
      - For each thread, add reply from tracked ID using slack API
    */
  }

  setTimeout(() => {
    controller.handleRallyWebhookPayload({
      body: exampleBody
    });
  }, 3000);


}
