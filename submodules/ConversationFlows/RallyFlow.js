const rallyLib = require('../rallyLib');
const debug = require('debug')('rally:flow');

const generatePlainAttachmentStr = require('../SlackHelpers/generatePlainAttachmentStr');
const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const isCaseMentioned = require('../Regex/isCaseMentioned');
const isMessagePrivate = require('../SlackHelpers/isMessagePrivate');

const handleConversationFn = async (
  controller,
  bot,
  message,
  IDprefix,
  formattedRallyID,
  err,
  convo
) => {
  if (err) return err;

  const user = await controller.extDB.lookupUser(bot, message);
  if (!user) {
    console.error(
      `extDB.lookupUser failed when processing ${IDprefix} ID, due to error: ${err.message}`
    );
    convo.stop();
    return err;
  }

  rallyLib.queryRallyWithID(
    IDprefix,
    formattedRallyID,
    user.sf_username,
    result => {
      if (result.error) {
        const messageReply = generatePlainAttachmentStr(
          `Error fetching ${IDprefix}:${formattedRallyID}:${message.match[2]}`,
          result.errorMSG
        );
        addDeleteButton(messageReply);
        convo.say(messageReply);
        convo.next();
        return true;
      }

      const messageReply = rallyLib.generateSnapshotAttachment(result);
      addDeleteButton(messageReply);
      convo.say(messageReply);
      convo.next();
      return true;
    }
  );
};

const addMentionToRallyDiscussion = async (controller, bot, IDprefix, formattedID, message) => {
  const slackURL = controller.utils.getURLFromMessage(message);
  const channel = await controller.extDB.lookupChannel(bot, message);
  if (!channel) {
    console.error(`addMentionToRallyDiscussion failed to lookup channel info`)
  }

  return rallyLib.addCommentToRallyTicket(
    IDprefix,
    formattedID,
    message,
    `#${channel.slack_channel_name}`,slackURL
  )
  .catch(error => {
    debugger;
  });
}

module.exports = (controller, bot, message, IDprefix) => {
  // TODO: why was this here?
  // if (
  //   message.event == 'ambient' &&
  //   typeof message.thread_ts != 'undefined' &&
  //   isCaseMentioned(message.text)
  // ) {
  //   return true;
  // }
  const rallyID = message.match[1];
  const formattedID = `${IDprefix}${rallyID}`;
  console.log(`Rally query for ${formattedID}`);

  // if a direct message, direct reply (no thread)
  if (message.type == 'direct_message') {
    bot.startConversation(message, (err, convo) =>
      handleConversationFn(controller, bot, message, IDprefix, formattedID, err, convo)
    );
    return true;
  }

  // else, start thread (tidier)
  bot.startConversationInThread(message, (err, convo) =>
    handleConversationFn(controller, bot, message, IDprefix, formattedID, err, convo)
  );

  // add mention in Rally ticket, for slack discussion
  addMentionToRallyDiscussion(controller, bot, IDprefix, formattedID, message);
  return true;
};
