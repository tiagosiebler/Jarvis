// modify a prepared slack message object to add a delete button
module.exports = messageObject => {
	messageObject.attachments[messageObject.attachments.length-1].callback_id = 'deleteButton-0';
	messageObject.attachments[messageObject.attachments.length-1].actions = [
		{
			"name": "hide",
			"text": "Hide this message",
			"value": "hide",
			"type": "button"
		}
	];
}