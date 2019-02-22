const debug = require('debug')('sf:skill');

const ExpressionList = require('../submodules/Regex/ExpressionList');

const handleCaseSyncThreadCreate = require('../submodules/sfLib/caseSync/handleCaseSyncThreadCreate');

const addDeleteButton = require('../submodules/SlackHelpers/addDeleteButton');
const handleButtonClickDelete = require('../submodules/SlackHelpers/handleButtonClickDelete');
const handleButtonClickHide = require('../submodules/SlackHelpers/handleButtonClickHide');

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

// TODO: clean me
const handleReplyToThread = async (controller, bot, message) => {
  // console.log("####################### Reply to thread detected: ", message.text);

  // get username via slackAPI of current msg poster
  const user = await controller.extDB.lookupUser(bot, message);
  if (!user) {
    debugger;
    throw new Error(
      'WARNING: handleReplyToThread() failed reading slack user.'
    );
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
    match = ExpressionList.supportCase.exec(message.text);

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
        message.type == 'direct_message' ||
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
  shouldEnableSyncState
) => {
  // quit early if this isn't a thread in slack
  if (typeof message.thread_ts == 'undefined') return true;

  controller.extDB.setSyncStateForSlackThread(
    controller,
    message,
    shouldEnableSyncState,
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

const handleButtonClickLogToCase = async (
  controller,
  bot,
  trigger,
  callbackReference,
  caseNum
) => {
  console.log('Buttonclick callback IDs: ', callbackReference, caseNum);

  // edit original message, as a response
  const original_message = trigger.original_message;
  const originalText = trigger.original_message.attachments[0].fallback;

  const newText = trigger.text == 'no' ? "Okay, I won't post anything in that case." : 'Preparing internal post in case ' + caseNum + '... :waiting:';

  const attachment = {
    text: newText,
    fallback: originalText
  };

  addDeleteButton(attachment);

  // clear previous post
  original_message.attachments = [];
  original_message.startingPost = originalText;
  debug('Buttonclick.Callback: cleared previous attachments');

  // TODO remove this message after delay? setTimeout?
  if (trigger.text == 'no') {
    debug('case sync button: NO');
    original_message.attachments.push({
      text: `I won't post anything in case ${caseNum}.`
    });
    addDeleteButton(original_message, 'Hide Message');
    return bot.replyInteractive(trigger, original_message);
  }

  // append new text to previous post
  original_message.attachments.push(attachment);
  bot.replyInteractive(trigger, original_message);

  const responseAttachment = await handleCaseSyncThreadCreate(
    controller,
    bot,
    trigger,
    caseNum,
    trigger
  );

  // clear previous post
  original_message.attachments = [];

  // append new text to previous post
  original_message.attachments.push(responseAttachment);
  bot.replyInteractive(trigger, original_message);
};

const handleButtonClick = (controller, bot, trigger) => {
  debug('interactiveMessageCallback: ', JSON.stringify(trigger));

  const ids = trigger.callback_id.split(/-/);
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
    [ExpressionList.supportCase],
    listenScope['everywhere'],
    (bot, message) => handleCaseMentionedWorkflow(controller, bot, message)
  );

  // control whether to turn the case sync feature on/off
  controller.hears(
    [ExpressionList.syncEnable],
    'direct_mention,mention',
    (bot, message) => handleSetSyncStateTrigger(controller, bot, message, true)
  );
  controller.hears(
    [ExpressionList.syncDisable],
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
