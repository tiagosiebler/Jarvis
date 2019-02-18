const rallyLib = require('../rallyLib');

const generatePlainAttachmentStr = require('../SlackHelpers/generatePlainAttachmentStr');
const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const isCaseMentioned = require('../Regex/isCaseMentioned');
const isMessagePrivate = require('../SlackHelpers/isMessagePrivate');

const handleConversationFn = (
  controller,
  bot,
  message,
  IDprefix,
  formattedRallyID,
  err,
  convo
) => {
  if (err) return err;

  //convo.say("Bringing up snapshot of the defect DE" + message.match[2]);
  controller.extDB.lookupUser(bot, message, (err, user) => {
    if (err) {
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
  });
};

const addMentionCommentToRally = (IDprefix, formattedID, message) => {
  if (isMessagePrivate(message)) {
    console.log(`This is a private message, ignoring ${message.text}`);
    return false;
  }

  const prettyObjectType = rallyLib.getReadableObjectType(formattedID);
  console.log(`Adding comment to rally ${prettyObjectType} ${formattedID}`);

  const comment = `This ${prettyObjectType} was mentioned in a slack discussion. `;
  // rallyLib.addCommentToRallyTicket(IDprefix, formattedID, comment)

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
  // addMentionCommentToRally(IDprefix, formattedID, message);
  return true;
};
