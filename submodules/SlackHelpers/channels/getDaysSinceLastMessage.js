const daysBetween = require('./daysBetween');

const getMostRecentMessageNotFromBots = (messages, userIDs) => {
  const filteredMessages = messages
    .filter(
      // ignore certain user IDs
      message => !userIDs.includes(message.user)
    );

  // return the most recent message not from Jarvis, unless there aren't any.
  // Then we just return the most recent.
  return filteredMessages[0] || messages[0] || { ts: 0 };
}

const getDaysSinceLastMessage = (messages, ignoreUserIDs= [], fixedDec = 2) => {
  // sort most recent messages on top
  messages.sort((a, b) => +b.ts - +a.ts);

  const mostRecentMessage = getMostRecentMessageNotFromBots(messages, ignoreUserIDs);

  const lastDt = new Date(mostRecentMessage.ts * 1000);
  const daysAgo = daysBetween(lastDt, new Date());
  return daysAgo.toFixed(fixedDec);
}

module.exports = getDaysSinceLastMessage;