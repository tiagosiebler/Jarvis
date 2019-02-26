const rallyLib = require('../rallyLib');
const debug = require('debug')('rally:flow');

const generatePlainAttachmentStr = require('../SlackHelpers/generatePlainAttachmentStr');
const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const isCaseMentioned = require('../Regex/isCaseMentioned');
const isMessagePrivate = require('../SlackHelpers/isMessagePrivate');

const getAttachmentField = require('../SlackHelpers/attachments/getAttachmentField');

const getDefaultFields = result => {
  return [
    getAttachmentField('Sheduled State', result.ScheduleState, true),
    getAttachmentField('Scrum Team', result.Project, true),
    getAttachmentField(
      'State',
      result.GeneralState && result.GeneralState.Name
        ? result.GeneralState.Name
        : result.GeneralState,
      true
    ),
    getAttachmentField('Iteration', result.Iteration, true),
    getAttachmentField('Scheduled Release', result.ScheduleRelease, true),
    getAttachmentField('Production Release', result.ActualRelease, true)
  ];
};

const shouldShowFooter = idPrefix => {
  switch (idPrefix) {
    case 'TC':
      return false;

    case 'TS':
      return false;

    default:
      return true;
  }
};

const getFieldsForObjectType = (result, idPrefix) => {
  switch (idPrefix) {
    case 'TC':
      return [
        getAttachmentField('Type', result.Type, true),
        getAttachmentField('Scrum Team', result.Project, true),
        getAttachmentField('Method', result.Method, true),
        getAttachmentField('Test Case Status', result.c_TestCaseStatus, true)
      ];

    case 'TS':
      return [
        getAttachmentField('Sheduled State', result.ScheduleState, true),
        getAttachmentField('Scrum Team', result.Project, true),
        getAttachmentField('Production Release', result.ActualRelease, true),
        getAttachmentField('Iteration', result.Iteration, true),
        getAttachmentField('Plan Estimate', result.PlanEstimate, true)
      ];

    default:
      return getDefaultFields(result);
  }
};

const getColourForAttachmentResult = (result) => {
  return result.DisplayColor ? result.DisplayColor : '#36a64f';
};

const getLinkFields = (result, idPrefix) => {
  const linkButtons = [];
  linkButtons.push({
    type: 'button',
    text: 'Go to Rally',
    url: result.url,
    style: 'primary'
  });

  if (!shouldShowFooter(idPrefix)) return linkButtons;

  linkButtons.push({
    type: 'button',
    text: 'Go to Gateway',
    url: result.urlPortalIP,
    style: 'primary'
  });
  return linkButtons;
};

const generateSnapshotAttachment = (result, idPrefix) => {
  const results = {
    attachments: [
      {
        fallback: 'Snapshot of ' + result.ID,
        color: getColourForAttachmentResult(result, idPrefix),
        title: result.ID + ': ' + result.name,
        title_link: result.url,
        fields: getFieldsForObjectType(result, idPrefix)
      },
      {
        fallback: 'Rally Links',
        actions: getLinkFields(result, idPrefix)
      }
    ]
  };

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
  if (err) return err;

  const user = await controller.extDB.lookupUser(bot, message);
  if (!user) {
    console.error(
      `extDB.lookupUser failed when processing ${formattedRallyID}`
    );
    convo.stop();
    return err;
  }

  return rallyLib.queryRallyWithID(
    IDprefix,
    formattedRallyID,
    user.sf_username
  )
  .then(result => {
    // log a successful query for a rally item
    controller.logStat('rally', IDprefix);

    // make a pretty slack message
    const slackResponseAttachments = generateSnapshotAttachment(
      result,
      IDprefix,
      formattedRallyID
    );

    addDeleteButton(slackResponseAttachments, 'Hide Message');

    if (shouldShowFooter(IDprefix)) addRallyFooter(result, slackResponseAttachments);

    convo.say(slackResponseAttachments);
    convo.next();
  })
  .catch(error => {
    console.error(`Rally lookup failed due to error: `, error);

    const header = error.errorMSG ? `Error fetching ${formattedRallyID} : ${error.errorID}` : 'Unhandled Rally Lookup Error';
    const message = error.errorMSG ? error.errorMSG : error.stack ? error.stack : error;

    const slackResponseAttachments = generatePlainAttachmentStr(
      header,
      message
    );
    addDeleteButton(slackResponseAttachments);
    convo.say(slackResponseAttachments);
    return convo.next();
  });
};

const shouldAddCommentForPrefix = IDprefix => {
  if (IDprefix == 'TC') return false;
  return true;
};

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
      console.warn(`Failed to add comment to rally ticket: ${JSON.stringify(error)}`);
    });
};

const getRallyTagsForEvent = (IDprefix, formattedID, message) => {
  const channel = message.channel;
  const envKey = `channelTags${channel}`;
  const channelTagsString = process.env[envKey];

  if (!channelTagsString) return [];

  return channelTagsString.split(',');
}

const addTagToRallyObject = async (
  controller,
  bot,
  IDprefix,
  formattedID,
  message
) => {
  const tagNamesArray = getRallyTagsForEvent(IDprefix, formattedID, message);
  if (!tagNamesArray.length) return true;

  // ensure rally object (formattedID) has tags associated
  debugger;
}

module.exports = async (controller, bot, message, IDprefix, rallyID) => {
  // TODO: why was this here?
  // if (
  //   message.event == 'ambient' &&
  //   typeof message.thread_ts != 'undefined' &&
  //   isCaseMentioned(message.text)
  // ) {
  //   return true;
  // }
  const formattedID = `${IDprefix}${rallyID}`;
  console.log(`Rally query for ${formattedID}`);

  // if a direct message, direct reply (no thread)
  if (message.type == 'direct_message') {
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
  await addMentionToRallyDiscussion(controller, bot, IDprefix, formattedID, message);

  // tag automation request for feedback channel
  addTagToRallyObject(controller, bot, IDprefix, formattedID, message);

  return true;
};
