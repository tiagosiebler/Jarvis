// modify a prepared slack message object to add a delete button
module.exports = (messageObject, messageText = 'Hide this message') => {
  const hideButton = {
    name: 'hide',
    text: messageText,
    value: 'hide',
    type: 'button'
  };
  const callbackRef = 'deleteButton-0';

  if (!messageObject.attachments) messageObject.attachments = [];

  const lastAttachment =
    messageObject.attachments[messageObject.attachments.length - 1];

  if (lastAttachment && lastAttachment.actions && lastAttachment.actions.length) {
    lastAttachment.callback_id = callbackRef;
    lastAttachment.actions.push(hideButton);
    return messageObject;
  }

  messageObject.attachments.push({
    fallback: 'hideButton',
    actions: [hideButton],
    callback_id: callbackRef
  });
  return messageObject;
};
