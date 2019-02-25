const debug = require('debug')('sf:skill:logToCaseButton');
const handleCaseSyncThreadCreate = require('./handleCaseSyncThreadCreate');
const addDeleteButton = require('../../SlackHelpers/addDeleteButton');

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

  const newText =
    trigger.text == 'no'
      ? "Okay, I won't post anything in that case."
      : 'Preparing internal post in case ' + caseNum + '... :waiting:';

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
module.exports = handleButtonClickLogToCase;
