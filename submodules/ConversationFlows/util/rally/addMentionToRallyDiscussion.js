const rallyLib = require('../../../rallyLib');
const isMessagePrivate = require('../../../SlackHelpers/isMessagePrivate');
const shouldAddCommentForPrefix = require('./shouldAddCommentForPrefix');

const addMentionToRallyDiscussion = async (
  controller,
  bot,
  IDprefix,
  formattedID,
  message
) => {
  if (!shouldAddCommentForPrefix(IDprefix)) return false;

  const slackURL = controller.utils.getURLFromMessage(message);
  const channel = await controller.extDB.lookupChannel(bot, message);
  const user = await controller.extDB.lookupUser(bot, message);
  if (!channel || !user) {
    console.error(
      `addMentionToRallyDiscussion failed to lookup channel (${channel}) or user (${user}) info`
    );
  }

  // disable for private channels, per request
  if (isMessagePrivate(message)) return Promise.resolve(false);

  return rallyLib
    .addCommentToRallyTicket(
      IDprefix,
      formattedID,
      message,
      user,
      `#${channel.slack_channel_name}`,
      slackURL
    )
    .then(result => {
      // log a successful query for a rally item
      controller.logStat('rally', 'comment');
    })
    .catch(error => {
      console.warn(
        `Failed to add comment to rally ticket: ${JSON.stringify(error)}`
      );
    });
};

module.exports = addMentionToRallyDiscussion;
