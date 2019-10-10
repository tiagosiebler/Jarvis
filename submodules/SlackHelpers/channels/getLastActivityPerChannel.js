const getDaysSinceLastMessage = require('./getDaysSinceLastMessage');

const getLastActivityPerChannel = (
  channelsInfo,
  channelsHistory,
  ignoredUserIDs
) => {
  const channelsLastActivity = {};

  for (const channel of channelsInfo) {
    const history = channelsHistory[channel.id];

    channelsLastActivity[channel.id] = {
      days: getDaysSinceLastMessage(history.messages, ignoredUserIDs),
      messages: history.messages
    };
  }

  return channelsLastActivity;
};

module.exports = getLastActivityPerChannel;
