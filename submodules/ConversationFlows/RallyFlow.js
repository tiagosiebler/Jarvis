const rallyLib = require('../rallyLib');
const debug = require('debug')('rally:flow');

const generatePlainAttachmentStr = require('../SlackHelpers/generatePlainAttachmentStr');
const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const isCaseMentioned = require('../Regex/isCaseMentioned');
const isMessagePrivate = require('../SlackHelpers/isMessagePrivate');

// TODO: split and tidy into submodules. Seperation of concepts.
const getSlackField = (title, value, short) => {
  return {
    title,
    value,
    short
  }
};

const getDefaultFields = result => {
  return [
    getSlackField('Sheduled State', result.ScheduleState, true),
    getSlackField(
      'State',
      result.GeneralState && result.GeneralState.Name
          ? result.GeneralState.Name
          : result.GeneralState,
      true
    ),
    getSlackField('Scrum Team', result.Project, true),
    getSlackField('Iteration', result.Iteration, true),
    getSlackField('Scheduled Release', result.ScheduleRelease, true),
    getSlackField('Production Release', result.ActualRelease, true)
  ];
};

const getFieldsForObjectType = (result, idPrefix) => {
  //Test Set I would use (Scheduled State, Scrum Team, Production Release, Iteration and Plan Est)
  //Test Case (Scrum Team, Type, Method and Test Case Status).
  switch (idPrefix) {

  case 'TC':
    return [
      getSlackField('Scrum Team', result.Project, true),
      getSlackField('Type', result.Type, true),
      getSlackField('Method', result.Method, true),
      getSlackField('Test Case Status', result.c_TestCaseStatus, true),
    ];
    break;

  case 'TS':

    break;

  default:
    return getDefaultFields(result);
    break;
  }
};

const getColourForAttachmentResult = (result, idPrefix) => {
  return '#36a64f';
};

const getLinkFields = result => {
  return [
    {
      type: "button",
      text: "Go to Rally",
      url: result.url,
      style: "primary"
    },
    {
      type: "button",
      text: "Go to Gateway",
      url: result.urlPortalIP,
      style: "primary"
    }
  ]
};

const generateSnapshotAttachment = (result, idPrefix, formattedID) => {
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
        actions: getLinkFields(result),
      }
    ]
  };

  // remove any "fields" from the first attachment object, if they don't have a value
  for (let i = 0; i < results.attachments[0].fields.length; i++) {
    if (!results.attachments[0].fields[i].value || results.attachments[0].fields[i].value == 'N/A') {
      results.attachments[0].fields[i] = null;
    }
  }

  return results;
};

const addRallyFooter = (result, attachmentObject) => {
  attachmentObject.attachments.push({
    fallback: 'Rally Gateway Link',
    footer: '<' + result.urlPortal + '|Rally Gateway Link>',
    footer_icon: 'http://connect.tech/2016/img/ca_technologies.png'
  });
}

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

  rallyLib.queryRallyWithID(
    IDprefix,
    formattedRallyID,
    user.sf_username,
    result => {
      if (result.error) {
        const messageReply = generatePlainAttachmentStr(
          `Error fetching ${formattedRallyID}`,
          result.errorMSG || result.error
        );
        addDeleteButton(messageReply);
        convo.say(messageReply);
        convo.next();
        return true;
      }

      // make a pretty slack message
      const messageReply = generateSnapshotAttachment(result, IDprefix, formattedRallyID);

      addDeleteButton(messageReply, 'Hide Message');
      addRallyFooter(result, messageReply);

      convo.say(messageReply);
      convo.next();
      return true;
    }
  );
};

const shouldAddCommentForPrefix = IDprefix => {
  if (IDprefix == 'TC') return false;
  return true;
}

const addMentionToRallyDiscussion = async (
  controller,
  bot,
  IDprefix,
  formattedID,
  message
) => {

  if (!shouldAddCommentForPrefix(IDprefix))
    return false;

  const slackURL = controller.utils.getURLFromMessage(message);
  const channel = await controller.extDB.lookupChannel(bot, message);
  const user = await controller.extDB.lookupUser(bot, message);
  if (!channel || !user) {
    console.error(`addMentionToRallyDiscussion failed to lookup channel (${channel}) or user (${user}) info`);
  }

  // disable for private channels, per request
  if (isMessagePrivate(message))
    return Promise.resolve(false);

  return rallyLib
    .addCommentToRallyTicket(
      IDprefix,
      formattedID,
      message,
      user,
      `#${channel.slack_channel_name}`,
      slackURL
    )
    .catch(error => {
      debugger;
    });
};

module.exports = (controller, bot, message, IDprefix, rallyID) => {
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
  addMentionToRallyDiscussion(controller, bot, IDprefix, formattedID, message);
  return true;
};
