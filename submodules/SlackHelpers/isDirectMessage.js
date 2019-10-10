const isDirectMessage = message => {
  return (
    message.type == 'direct_message' ||
    (message.channel_type && message.channel_type === 'mpim')
  );
};

module.exports = isDirectMessage;
