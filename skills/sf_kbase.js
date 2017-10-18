module.exports = function(controller) {
	controller.hears([controller.utils.regex.KBase], 'ambient,direct_message,mention,direct_mention', function(bot, message) {
		var matches = controller.utils.getMatchesKB(message.text);
		console.log("Searching for TN(s)", message.text,matches);
		
		// if jarvis wasn't tagged, and it isn't a thread but a plain thread-less post, and a case was mentioned
		// this currently rejects posts in the channel without a case number		
		if(message.event == 'ambient' && typeof message.thread_ts != 'undefined' && controller.utils.containsCaseNumber(message.text)) return true;
		
		controller.sfLib.getKBArticles(matches, (err, records)=>{
			var origMatches = matches;
			var results = [];
			
			for(i = 0;i < records.length;i++){
				var record = records[i];
				for(a = 0;a < matches.length;a++){
					if(record.Title.startsWith('KB'+matches[a]))
						results.push(record);
				}
			}
						
			bot.startConversationInThread(message, (err, convo)=>{
				if (!err) {
					var attachment = controller.utils.generateAttachmentForKBArticles(results);
					
					// add a hide button
					attachment.attachments[attachment.attachments.length-1].callback_id = 'hideButton-0';
					attachment.attachments[attachment.attachments.length-1].actions = [
						{
							"name": "hide",
							"text": "Hide this message",
							"value": "hide",
							"type": "button"
						}
					];
					
					convo.say(attachment);
					convo.next();
				}
			});
		});
		
		return true;		// allow other matching handlers to fire
	});
};
