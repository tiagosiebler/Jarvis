var sfLib = require('../submodules/sfLib.js');

var regexList = {
	"tn1": /(?:^|^\s|[^\/a-zA-Z0-9])tn([0-9]+).*$/im,///(?:^|[^\/])tn([0-9]+).*$/im,//(?:^|^\s|[^\/][^a-zA-Z0-9])tn([0-9]+).*$
	"tn2": /(?:^|^\s|[^\/a-zA-Z0-9])tn ([0-9]+).*$/im,///(?:^|[^\/])tn ([0-9]+).*$/im,
	"tn3": /(?:^|^\s|[^\/a-zA-Z0-9])kb ([0-9]+).*$/im,///(?:^|[^\/])kb ([0-9]+).*$/im,
	"tn4": /(?:^|^\s|[^\/a-zA-Z0-9])kb([0-9]+).*$/im,///(?:^|[^\/])kb([0-9]+).*$/im,
}

var isCaseMentioned = function(str){
	var regexList = {
		"case1": /^.*ts([0-9]+).*$/im,
		"case2": /^.*ts ([0-9]+).*$/im,
		"case3": /^.*case ([0-9]+).*$/im,
		"case4": /^.*case([0-9]+).*$/im,
		"case5": /^.*#([0-9]+).*$/im,
		"case6": /^.*# ([0-9]+).*$/im,
		"case7": /^.*case: ([0-9]+).*$/im,
	}
	
	if(regexList['case1'].exec(str) !== null
		|| regexList['case2'].exec(str) !== null
		|| regexList['case3'].exec(str) !== null
		|| regexList['case4'].exec(str) !== null
		|| regexList['case5'].exec(str) !== null
		|| regexList['case6'].exec(str) !== null
		|| regexList['case7'].exec(str) !== null
	) return true;
	return false;
}

// listeners
module.exports = function(controller) {
	/*
	controller.hears(['.*'], 'ambient,direct_message,mention,direct_mention', function(bot, message){
		console.log("msgDUMP: ", message.text);
		
		return true;
	});//*/
	controller.hears([regexList['tn1'], regexList['tn2'], regexList['tn3'], regexList['tn4']], 'ambient,direct_message,mention,direct_mention', function(bot, message) {
		console.log("Searching for TN ", message.text,message.match);
		
		// if jarvis wasn't tagged, and it isn't a thread but a plain thread-less post, and a case was mentioned
		// this currently rejects posts in the channel without a case number
		if(message.event == 'ambient' && typeof message.thread_ts != 'undefined' && isCaseMentioned(message.text)) return true;

		bot.startConversationInThread(message, function(err, convo) {
			if (!err) {
				sfLib.getKBArticle('KB'+message.match[1], function(err, records){
					if (err) { 
						console.error("error in getKBArticle Query Result: ",err); 
						return;
					}
					
					var actualResult;
					for(i = 0;i < records.length;i++){
						var currentResult = records[i];
						
						if(currentResult.Title.indexOf('KB'+message.match[1]) != -1){
							console.log("Found a matching TN! Preparing result for posting.");
							actualResult = currentResult;
							break;
						}
					}
					if(actualResult == null) {
						console.log("No results found for TN search");
						return true;
					}
					
					var resultCase = records[0];
					var attachment = sfLib.generateAttachmentForKBArticle('KB'+message.match[1],resultCase);
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
					convo.activate();
				});
			}
		});
		
		return true;		// allow other matching handlers to fire
	});
};
