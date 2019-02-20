const getSalesforceMarkupThreadNew = require('../submodules/sfLib/getSalesforceMarkupThreadNew');
const getCleanedRichTextSafeMessage = require('../submodules/sfLib/getCleanedRichTextSafeMessage');

const debug = require('debug')('sf:skill');

// scope of where these commands will trigger (anywhere the bot is, right now)
const listenScope = {
  everywhere: 'ambient,direct_message,direct_mention,mention,bot_message'
};

const emojis = [
  'sleepy',
  'unamused',
  'weary',
  'anguished',
  'no_mouth',
  'persevere',
  'sleeping',
  'disappointed',
  'confounded',
  'sob',
  'tired_face',
  'frowning',
  'disappointed_relieved',
  'fearful',
  'speak_no_evil',
  'see_no_evil'
];

const insertToStatisticsTable = (controller, message) => {
  controller.extDB.insertPostStat(controller, message, (err, result) => {
    if (err) console.error('WARNING - insertPostStat err: ', err);
  });
};

const createThreadInSFCase = (
  controller,
  bot,
  message,
  caseNum,
  userInfo,
  channelInfo,
  shouldSync
) => {
  const firstMessageInThread = message.original_message.attachments[1].fallback;

  const messageURL = controller.utils.getURLFromMessage(message);
  const inLocation = channelInfo.isPrivateMessage
    ? ' in a private message'
    : ` in channel #${channelInfo.slack_channel_name}.`;

  // need to remove any message syntax that might conflict with salesforce's rich formatting, and some other cleaning to keep things pretty;
  const originalMessage = getCleanedRichTextSafeMessage(firstMessageInThread);

  // Prepare the post we'll make in SF
  const messageBody = getSalesforceMarkupThreadNew(
    userInfo.sf_username,
    inLocation,
    messageURL,
    originalMessage
  );

  // Start the thread in the salesforce case
  return controller.sfLib
    .createThreadInCase(caseNum, messageBody)
    .then(resultSFThread => {
      // thread should have been created now in SF case, so store the sfID of that thread for later use
      // update our DB state (slack thread x is associated with sf case thread y, with sync state true|false)
      // return promise resolving with URL to thread
      return controller.extDB
        .setSFThreadForSlackThread(
          message,
          caseNum,
          resultSFThread.id,
          shouldSync
        )
        .then(results => process.env.sfURL + '/' + resultSFThread.id);
    });
};

const handleSyncQuestionResponse = async (
  controller,
  bot,
  message,
  reply,
  caseNum,
  trigger,
  syncQuestionResponseCallback
) => {
  debug('handleSyncQuestionResponse: entered');
  const attachment = {
    title: ''
  };

  let createPost = false;
  let privateResponse = false;
  let shouldSync = false;

  // TODO: make a getter to segment this
  switch (trigger.text) {
    case 'yes-1':
      createPost = true;
      shouldSync = true;

      debug('handleSyncQuestionResponse: button: YES 1 - full sync');
      break;

    case 'yes-2':
      createPost = true;

      debug('handleSyncQuestionResponse: button: YES 2 - link only');
      break;

    case 'no':
      privateResponse = true;

      debug('handleSyncQuestionResponse: button: NO');

      // TODO remove this message after delay? setTimeout?
      attachment.title = null;
      attachment.text = `I won't post anything in case ${caseNum}.'`;
      break;
  }

  // TODO: promises.....
  if (!createPost) {
    return syncQuestionResponseCallback(null, attachment, privateResponse);
  }

  debug('handleSyncQuestionResponse: createPost == yes, starting user lookup');

  // create internal post in service cloud case, with link to this
  const channelInfo = await controller.extDB.lookupChannel(bot, message);
  const userInfo = await controller.extDB.lookupUser(bot, message);
  if (!channelInfo || !userInfo) {
    console.log(
      `handleSyncQuestionResponse(): userInfo (${userInfo}) or channelInfo (${channelInfo}) returned empty, refusing to continue`
    );
    return syncQuestionResponseCallback(true, {
      ...attachment,
      text:
        'Error reading slack user when trying to create serviceCloud post. Refusing to continue'
    });
  }

  debug(
    'lookupChannel & lookupUser complete - creating thread in SF case: ',
    caseNum
  );

  // TODO try & catch error
  let resultLink;
  try {
    resultLink = await createThreadInSFCase(
      controller,
      bot,
      message,
      caseNum,
      userInfo,
      channelInfo,
      shouldSync
    );
  } catch (err) {
    console.log(
      'handleSyncQuestionResponse(): createThreadInSFCase error: ',
      err
    );
    return syncQuestionResponseCallback(err, {
      ...attachment,
      text: 'Failed to create thread in case, possible API error'
    });
  }

  debug(
    'handleSyncQuestionResponse():  Thread creation complete: ',
    resultLink
  );

  attachment.title = 'Thread Created';
  attachment.title_link = resultLink;

  if (shouldSync) {
    attachment.title += ' - Sync Enabled';
  } else {
    attachment.title += ' - Sync Disabled';
  }

  // add a hide button
  attachment.callback_id = 'hideButton-0';
  attachment.actions = [
    {
      name: 'hide',
      text: 'Hide this message',
      value: 'hide',
      type: 'button'
    }
  ];

  // Add undo button here?
  syncQuestionResponseCallback(false, attachment, privateResponse);
};

// TODO: clean me
const handleReplyToThread = async (controller, bot, message) => {
  // console.log("####################### Reply to thread detected: ", message.text);

  // get username via slackAPI of current msg poster
  const user = await controller.extDB.lookupUser(bot, message);
  if (!user) {
    throw new Error(
      `WARNING: handleReplyToThread() failed reading slack user, error: ${err}`
    );
    debugger;
  }

  //message.text replace new lines with <p>&nbsp;</p>
  var theMessage;
  theMessage = message.text.replace(/<!(.*?)\|@\1>/g, '@$1');
  theMessage = theMessage.replace(/<(.*?\1)>/g, '$1');
  theMessage = theMessage.replace(/(?:\r\n|\r|\n)/g, '</i></p><p><i>');

  var msgBody =
    '<p><b>@' +
    user.sf_username +
    '</b> via slack:</p><ul><li><p><i>' +
    theMessage +
    '</i></p></li></ul>';

  // check if thread_ts is known already
  controller.extDB.getSFThreadForSlackThread(
    controller,
    message,
    (err, exists, sf_thread_ref) => {
      //console.log("##### NEW handleReplyToThread : getSFThreadForSlackThread: err, exists and ref: ", err, exists, sf_thread_ref);
      if (!exists || !sf_thread_ref) {
        //console.log("ServiceCloud thread doesn't exist yet for slack thread with timestamp " + message.thread_ts + ". Returning blankly.");
        return false;
      }

      if (sf_thread_ref.sf_should_sync) {
        // add comment to existing thread
        console.log(
          '##### NEW handleReplyToThread: adding reply to case: ',
          message.text
        );
        controller.sfLib.addCommentToPost(
          sf_thread_ref.sf_post_id,
          msgBody,
          function(err, records) {
            //console.log("controller.sfLib.addCommentToPost callback - ", err);
          }
        );
      } else {
        console.log("shouldSync == false, won't add post automatically");
      }
    }
  );
};

// TODO: clean me
const handleCaseMentionedWorkflow = (controller, bot, message) => {
  if (
    controller.utils.containsMatch(message.text, controller.utils.regex.setSME)
  )
    return true;
  if (
    controller.utils.containsMatch(message.text, controller.utils.regex.logTask)
  )
    return true;

  console.log('Case mention in channel: ', message.match);

  var thread_ts = message.thread_ts,
    match = controller.utils.regex.case.exec(message.text);

  var caseNum = match[1],
    trackedThread = false,
    isInThread = typeof thread_ts != 'undefined';

  controller.extDB.getSFThreadForSlackThread(
    controller,
    message,
    (err, exists, sf_thread_ref) => {
      console.log('getSFThreadForSlackThread: ', exists);
      if (exists) trackedThread = sf_thread_ref.sf_post_created;

      // prevent 'want me to link' question if case is mentioned in a thread, without jarvis being mentioned. Avoid spam, especially if the user says no to the previous prompt
      if (message.event.type == 'ambient' && isInThread) trackedThread = true;

      // also prevent link-to-case logic when in direct message
      if (
        message.event.type == 'direct_message' ||
        message.event.subtype == 'bot_message'
      )
        trackedThread = true;

      // console.log("hears.case(): message.event.type: ", message.event.type);

      bot.startConversationInThread(message, function(err, convo) {
        if (err) return false;

        // logic to bring up case snapshot
        controller.sfLib.getCase(caseNum, function(err, records) {
          if (err) {
            console.error('error in SF Query Result: ', err);
            convo.next();
            return;
          }
          var syncPreText =
            'Create internal post in case ' +
            caseNum +
            ', <@' +
            message.user +
            '> ?';
          var syncText =
            "• Yes: I'll create an internal post with a link to this slack thread. \n\n• Full-sync: any replies here will also be added to the internal thread in your case. \n\nYou can toggle sync at any time, click 'ServiceCloud Sync' for more details. :bowtie:";

          // logic to sync with case in service cloud
          if (!trackedThread) {
            convo.say(
              {
                attachments: [
                  {
                    fallback: message.text,
                    title: 'ServiceCloud Sync',
                    title_link:
                      'https://microstrategy.atlassian.net/wiki/spaces/Jarvis/pages/152866596/ServiceCloud+Sync',
                    color: '#36a64f',
                    pretext: syncPreText,
                    text: syncText,
                    callback_id: 'logToCaseQuestion-' + caseNum,
                    callback_ref: message,
                    attachment_type: 'default',
                    actions: [
                      {
                        name: 'yes-1',
                        text: 'Yes (full-sync)',
                        value: 'yes-1',
                        type: 'button',
                        style: 'primary'
                      },
                      {
                        name: 'yes-2',
                        text: 'Yes (link only)',
                        value: 'yes-2',
                        type: 'button'
                      },
                      {
                        name: 'no',
                        text: 'No',
                        value: 'no',
                        type: 'button'
                      }
                    ]
                  }
                ]
              },
              []
            );
          }

          var resultCase = records[0];
          var attachment = controller.sfLib.generateAttachmentForCase(
            process.env.sfURL,
            resultCase
          );

          //console.log("Attaching case snapshot to thread: ",resultCase);
          convo.say(attachment);
          convo.next();
        });
      });
    }
  );

  // allow other matching handlers to fire
  return true;
};

const handleSetSyncStateTrigger = (
  controller,
  bot,
  message,
  shoudlEnableSyncState
) => {
  // quit early if this isn't a thread in slack
  if (typeof message.thread_ts == 'undefined') return true;

  controller.extDB.setSyncStateForSlackThread(
    controller,
    message,
    shoudlEnableSyncState,
    (err, success, savedRef) => {
      if (!success) {
        return bot.reply(
          message,
          "I can't :" +
            emojis[Math.floor(Math.random() * emojis.length)] +
            ': \n\n ' +
            err
        );
      }

      bot.api.reactions.add({
        name: 'thumbsup',
        channel: message.channel,
        timestamp: message.ts
      });
    }
  );
};

const clearAttachmentsInMessage = message => {
  for (let a = 0; a < message.attachments.length; a++) {
    message.attachments[a] = null;
  }
};

const handleButtonClickLogToCase = (
  controller,
  bot,
  trigger,
  callbackReference,
  caseNum
) => {
  console.log('Buttonclick callback IDs: ', callbackReference, caseNum);
  // edit original message, as a response

  const reply = trigger.original_message;
  const originalText = trigger.original_message.attachments[0].fallback;
  const attachment = {
    text: 'Preparing internal post in case ' + caseNum + '... :waiting:',
    fallback: originalText
  };

  attachment.callback_id = 'hideButton-0';
  attachment.actions = [
    {
      name: 'hide',
      text: 'Hide this message',
      value: 'hide',
      type: 'button'
    }
  ];

  // clear previous post
  clearAttachmentsInMessage(reply);

  // overwrite default "yes" reply if we're bailing early
  if (trigger.text == 'no') {
    attachment.text = "Okay, I won't post anything in that case.";
  }

  // append new text to previous post
  reply.attachments.push(attachment);
  bot.replyInteractive(trigger, reply);

  debug('Buttonclick.Callback: cleared previous attachments');

  handleSyncQuestionResponse(
    controller,
    bot,
    trigger,
    reply,
    caseNum,
    trigger,
    (err, attachmentBody, privateResponse) => {
      if (err) {
        return console.error(
          'WARNING: handleSyncQuestionResponse() callback() - error happened trying to sync this slack thread with case ' +
            caseNum
        );
      }

      debug(
        'Buttonclick.Callback: received handleSyncQuestionResponse cb: ',
        attachmentBody
      );

      if (privateResponse) reply.response_type = 'ephemeral';

      // clear previous post
      for (var a = 0; a < reply.attachments.length; a++) {
        reply.attachments[a] = null;
      }

      // append new text to previous post
      reply.attachments.push(attachmentBody);
      bot.replyInteractive(trigger, reply);
    }
  );
};

const handleButtonClickHide = (bot, trigger) => {
  const reply = trigger.original_message;
  for (let a = 0; a < reply.attachments.length; a++) {
    reply.attachments[a] = null;
  }
  bot.replyInteractive(trigger, reply);
};

const handleButtonClickDelete = (bot, trigger) => {
  bot.replyInteractive(trigger, {
    delete_original: true
  });
};

const handleButtonClick = (controller, bot, trigger) => {
  debug('interactiveMessageCallback: ', JSON.stringify(trigger));

  const ids = trigger.callback_id.split(/\-/);
  const callbackReference = ids[0];
  const caseNum = ids[1];

  if (callbackReference == 'logToCaseQuestion') {
    return handleButtonClickLogToCase(
      controller,
      bot,
      trigger,
      callbackReference,
      caseNum
    );
  }

  if (callbackReference == 'hideButton') {
    return handleButtonClickHide(bot, trigger);
  }

  if (callbackReference == 'deleteButton') {
    return handleButtonClickDelete(bot, trigger);
  }

  return true;
};

// listeners
module.exports = controller => {
  controller.hears(
    [controller.utils.regex.case],
    listenScope['everywhere'],
    (bot, message) => handleCaseMentionedWorkflow(controller, bot, message)
  );

  // control whether to turn the case sync feature on/off
  controller.hears(
    [/.*enable sync.*/i],
    'direct_mention,mention',
    (bot, message) => handleSetSyncStateTrigger(controller, bot, message, true)
  );
  controller.hears(
    [/.*disable sync.*/i],
    'direct_mention,mention',
    (bot, message) => handleSetSyncStateTrigger(controller, bot, message, false)
  );

  // handle button clicks for the case sync workflows
  controller.on('interactive_message_callback', (bot, trigger) =>
    handleButtonClick(controller, bot, trigger)
  );

  // all message events
  controller.on('ambient', (bot, message) => {
    // log public discussions to stats DB for reporting in AQ
    insertToStatisticsTable(controller, message);

    // threaded posts are added to SF threads if sync is enabled
    if (typeof message.thread_ts != 'undefined') {
      handleReplyToThread(controller, bot, message);
    }

    return true;
  });
};
