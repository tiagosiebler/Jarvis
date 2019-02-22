// modify a prepared slack message object to add a delete button
module.exports = (messageObject, messageText = 'Hide this message') => {
  const hideButton = {
    name: 'hide',
    text: messageText,
    value: 'hide',
    type: 'button'
  };
  const callbackRef = 'deleteButton-0';

  const lastAttachment =
    messageObject.attachments[messageObject.attachments.length - 1];
  if (lastAttachment.actions && lastAttachment.actions.length) {
    lastAttachment.callback_id = callbackRef;
    return lastAttachment.actions.push(hideButton);
  }

  return messageObject.attachments.push({
    fallback: 'hideButton',
    actions: [hideButton],
    callback_id: callbackRef
  });
};
