// modify a prepared slack message object to add a delete button
module.exports = messageObject => {
  const lastAttachment = messageObject.attachments[messageObject.attachments.length-1];
	lastAttachment.callback_id = 'deleteButton-0';
	lastAttachment.actions = [
    ...lastAttachment.actions,
		{
			"name": "hide",
			"text": "Hide this message",
			"value": "hide",
			"type": "button"
		}
	];
}