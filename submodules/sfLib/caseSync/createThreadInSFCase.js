const getSalesforceMarkupThreadNew = require('../getSalesforceMarkupThreadNew');
const getCleanedRichTextSafeMessage = require('../getCleanedRichTextSafeMessage');

const createThreadInSFCase = (
  controller,
  bot,
  message,
  caseNum,
  userInfo,
  channelInfo,
  shouldSync
) => {
  const firstMessageInThread = message.original_message.startingPost;

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
      controller.logStat('case', 'thread');

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

module.exports = createThreadInSFCase;
