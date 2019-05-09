const rallyLib = require('../rallyLib');
const debug = require('debug')('rally:flowmuti');

const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const generatePlainAttachmentStr = require('../SlackHelpers/generatePlainAttachmentStr');

const getFieldsForObjectType = require('./util/rally/getFieldsForObjectType');
const getColourForAttachmentResult = require('./util/rally/getColourForAttachmentResult');
const getLinkFields = require('./util/rally/getLinkFields');

const addMentionToRallyDiscussion = require('./util/rally/addMentionToRallyDiscussion');
const addTagToRallyObject = require('./util/rally/addTagToRallyObject');

const getAttachmentForRallyResult = (
  result,
  idPrefix,
  attachments = [],
  trimResult = false
) => {
  const body = {
    fallback: 'Snapshot of ' + result.ID,
    color: getColourForAttachmentResult(result, idPrefix),
    title: result.ID + ': ' + result.name,
    title_link: result.url,
    fields: getFieldsForObjectType(result, idPrefix)
  };
  if (trimResult) {
    delete body.fields;
  }

  attachments.push(body);

  if (!trimResult) {
    attachments.push({
      fallback: 'Rally Links',
      actions: getLinkFields(result, idPrefix)
    });
  }

  return attachments;
};

const generateAttachmentForResults = (
  resultsArray = [],
  typePrefix = 'DE',
  attachments = [],
  trimResult = false
) => {
  resultsArray.forEach(result =>
    getAttachmentForRallyResult(result, typePrefix, attachments, trimResult)
  );
};

const handleConversationFn = async (
  controller,
  bot,
  message,
  listOfIds,
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
    console.error(`extDB.lookupUser failed when processing ${listOfIds}`);
    convo.stop();
    return err;
  }

  return rallyLib
    .queryRallyWithIds(listOfIds, user.sf_username)
    .then(resultObjectsByType => {
      const attachments = [];

      // since we're printing multiple results, keep them trimmed
      const trimResult = true;

      // build message results
      for (const typeString in resultObjectsByType) {
        const results = resultObjectsByType[typeString];
        const typePrefix = rallyLib.getPrefixForRallyType(typeString);

        generateAttachmentForResults(
          results,
          typePrefix,
          attachments,
          trimResult
        );
      }

      const message = { attachments };

      addDeleteButton(message, 'Hide Results');

      convo.say(message);
      convo.next();
    })
    .then(() => {
      // log query result stats by type
      listOfIds.forEach(rallyId => {
        // log a successful query for a rally item
        controller.logStat('rally', rallyId[0]);
      });
    })
    .catch(error => {
      console.error('Rally lookup failed due to error: ', error);

      const header = error.errorMSG
        ? `Error fetching ${JSON.stringify(listOfIds)} : ${error.errorID}`
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
    });
};

module.exports = (controller, bot, message, listOfIds = []) => {
  /*
    - query mulitple rally IDs at once
    - build results into one response
    - add comment once per rally ID
  */
  console.log(`Rally query for ${listOfIds}`);

  // if a direct message, direct reply (no thread)
  if (message.type == 'direct_message') {
    bot.startConversation(message, (err, convo) =>
      handleConversationFn(controller, bot, message, listOfIds, err, convo)
    );
    return true;
  }

  // else, start thread (tidier)
  bot.startConversationInThread(message, (err, convo) =>
    handleConversationFn(controller, bot, message, listOfIds, err, convo)
  );

  // log query result stats by type
  listOfIds.forEach(async rallyId => {
    const prefix = rallyId[0];
    const formattedID = rallyId.join('').toUpperCase();

    // add mention in Rally ticket, for slack discussion
    await addMentionToRallyDiscussion(
      controller,
      bot,
      prefix,
      formattedID,
      message
    );

    // tag automation request for feedback channel
    addTagToRallyObject(controller, bot, prefix, formattedID, message);
  });

  return true;
};
