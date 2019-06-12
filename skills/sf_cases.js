const debug = require('debug')('sf:skill');

const ExpressionList = require('../submodules/Regex/ExpressionList');

const handleReplyToThread = require('../submodules/sfLib/caseSync/handleReplyToThread');
const handleButtonClickLogToCase = require('../submodules/sfLib/caseSync/handleButtonClickLogToCase');
const didSeeCaseMention = require('../submodules/ConversationFlows/didSeeCaseMention');

const addDeleteButton = require('../submodules/SlackHelpers/addDeleteButton');
const handleButtonClickDelete = require('../submodules/SlackHelpers/handleButtonClickDelete');
const handleButtonClickHide = require('../submodules/SlackHelpers/handleButtonClickHide');

// scope of where these commands will trigger (anywhere the bot is, right now)
const listenScope = {
  everywhere: 'ambient,direct_message,direct_mention,mention,bot_message,file_share'
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

const handleButtonClick = (controller, bot, trigger) => {
  debug('interactiveMessageCallback: ', JSON.stringify(trigger.raw_message));

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
    (bot, message) => didSeeCaseMention(controller, bot, message)
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
