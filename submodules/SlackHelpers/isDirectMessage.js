const isDirectMessage = message => {
  return message.type == 'direct_message' // single direct message
    || (message.channel_type && message.channel_type === 'mpim') // group direct message
    || (message.event && message.event.subtype == 'bot_message'); // bot message
};

module.exports = isDirectMessage;
