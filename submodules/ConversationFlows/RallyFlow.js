const rallyLib = require('../rallyLib');
const debug = require('debug')('rally:flow');

const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const generatePlainAttachmentStr = require('../SlackHelpers/generatePlainAttachmentStr');

const getFieldsForObjectType = require('./util/rally/getFieldsForObjectType');
const getColourForAttachmentResult = require('./util/rally/getColourForAttachmentResult');
const getLinkFields = require('./util/rally/getLinkFields');

const shouldShowFooter = require('./util/rally/shouldShowFooter');

const addMentionToRallyDiscussion = require('./util/rally/addMentionToRallyDiscussion');
const addTagToRallyObject = require('./util/rally/addTagToRallyObject');
const isDirectMessage = require('../SlackHelpers/isDirectMessage');

const generateSnapshotAttachment = (result, idPrefix) => {
  const results = {
    attachments: [
      {
        fallback: 'Snapshot of ' + result.ID,
        color: getColourForAttachmentResult(result, idPrefix),
        title: result.ID + ': ' + result.name,
        title_link: result.url,
        fields: getFieldsForObjectType(result, idPrefix)
      }
    ]
  };

  if (idPrefix != 'TA') {
    results.attachments.push({
      fallback: 'Rally Links',
      actions: getLinkFields(result, idPrefix)
    });
  }

  // remove any "fields" from the first attachment object, if they don't have a value
  for (let i = 0; i < results.attachments[0].fields.length; i++) {
    if (
      !results.attachments[0].fields[i].value ||
      results.attachments[0].fields[i].value == 'N/A'
    ) {
      results.attachments[0].fields[i] = null;
    }
  }

  return results;
};

const addRallyFooter = (result, attachmentObject) => {
  const footerLabel = 'No rally access? Click here';
  attachmentObject.attachments.push({
    fallback: footerLabel,
    footer: `<${result.urlPortal}|${footerLabel}>`,
    footer_icon: 'http://connect.tech/2016/img/ca_technologies.png'
  });
};

const handleConversationFn = async (
  controller,
  bot,
  message,
  IDprefix,
  formattedRallyID,
  err,
  convo
) => {
  if (err) {
    console.error(
      'handleConversationFn failed to start convo due to error: ',
      err
    );
    convo.stop();
    return err;
  }

  const user = await controller.extDB.lookupUser(bot, message);
  if (!user) {
    console.error(
      `extDB.lookupUser failed when processing ${formattedRallyID}`
    );
    convo.stop();
    return err;
  }

  try {
    // console.log(`id: ${IDprefix} formatted: ${formattedRallyID}`);
    const result = await rallyLib.queryRallyWithID(
      IDprefix,
      formattedRallyID,
      user.sf_username
    );
    // log a successful query for a rally item
    controller.logStat('rally', IDprefix);

    // make a pretty slack message
    const slackResponseAttachments = generateSnapshotAttachment(
      result,
      IDprefix,
      formattedRallyID
    );

    if (shouldShowFooter(IDprefix)) {
      addDeleteButton(slackResponseAttachments, 'Hide Message');
      addRallyFooter(result, slackResponseAttachments);
    }

    convo.say(slackResponseAttachments);
    convo.next();
  } catch (error) {
    console.error('Rally lookup failed due to error: ', error);

    const header = error.errorMSG
      ? `Error fetching ${formattedRallyID} : ${error.errorID}`
      : 'Unhandled Rally Lookup Error';
    const message = error.errorMSG
      ? error.errorMSG
      : error.stack
        ? error.stack
        : error;

    const slackResponseAttachments = generatePlainAttachmentStr(
      header,
      message
    );

    addDeleteButton(slackResponseAttachments);
    convo.say(slackResponseAttachments);
    return convo.stop();
  }
};

module.exports = async (controller, bot, message, IDprefix, rallyID) => {
  const formattedID = `${IDprefix}${rallyID}`;
  console.log(`Rally query for ${formattedID}`);

  // if a direct message, direct reply (no thread)
  if (isDirectMessage(message)) {
    bot.startConversation(message, (err, convo) =>
      handleConversationFn(
        controller,
        bot,
        message,
        IDprefix,
        formattedID,
        err,
        convo
      )
    );
    return true;
  }

  // else, start thread (tidier)
  bot.startConversationInThread(message, (err, convo) =>
    handleConversationFn(
      controller,
      bot,
      message,
      IDprefix,
      formattedID,
      err,
      convo
    )
  );

  // add mention in Rally ticket, for slack discussion
  await addMentionToRallyDiscussion(
    controller,
    bot,
    IDprefix,
    formattedID,
    message
  );

  // tag automation request for feedback channel
  addTagToRallyObject(controller, bot, IDprefix, formattedID, message);

  return true;
};
