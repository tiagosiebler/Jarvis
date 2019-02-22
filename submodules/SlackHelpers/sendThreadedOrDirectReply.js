const isMessageInThread = require('./isMessageThreaded');
const sendThreadedOrDirectReply = (bot, message, responseAttachment) => {
  if (message.type == 'direct_message' && !isMessageInThread(message)) {
    return bot.startConversation(message, (err, convo) => {
      if (err) return false;
      convo.say(responseAttachment);
      convo.next();
    });
  }

  return bot.startConversationInThread(message, (err, convo) => {
    if (err) return false;
    convo.say(responseAttachment);
    convo.next();
  });
};

module.exports = sendThreadedOrDirectReply;
