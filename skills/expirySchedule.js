// custom modules with some hardcoded values/references
var scraper = require('../submodules/scraper.js');

// scope of where these commands will trigger (anywhere the bot is, right now)
var listenScope = {
	"everywhere": 'ambient,direct_message,direct_mention,mention',
}

var generatePlainAttachmentStr = function(title, str){
	var retAttachment = {
		"attachments": [{
			"fallback": title,
			"title": title,
			"text": str,
		}]
	};
	return retAttachment;
}

var generateExpirationAttachment = function(version, statusStr, releaseDate, expirationDate, url){
	var retAttachment = {
		"attachments": [
				{
				"fallback": version + " : " + statusStr,
				"title": "<"+url+"|Expiration schedule for MicroStrategy "+version+">",
	            "fields": [
					{
						"title": "Version",
						"value": "MicroStrategy "+version,
						"short": true
					},
					{
						"title": "Status",
						"value": statusStr,
						"short": true
					},
					{
						"title": "Original Release",
						"value": releaseDate,
						"short": true
					},
					{
						"title": "Expected Expiration*",
						"value": expirationDate,
						"short": true
					},
				],
				"color": "#36a64f",
			},{
            	"text": "* _Note: Expiration may occur later than the dates published above, based on product release schedules. However, dates will not be moved earlier than those posted above._",
			    "mrkdwn_in": ["text"]
			}
		]
	};

	if(statusStr == 'Expired') retAttachment.attachments[0].color = "#D9232E";
	return retAttachment;
}

module.exports = function(controller) {
	controller.hears(['(.*)support(.*)','(.*)expir(.*)','(.*)expiration(.*)'], 'direct_message,direct_mention,mention', function(bot, message) {

		console.log("caught possible question about whether a version's still supported:", message);

		bot.startConversationInThread(message, function(err, convo) {
			if (!err) {
				// strip slack mentions, as they're misread as numbers /(\<@.*\>)/g
				message.text = message.text.replace(/(\<@.*\>)/g, "");
				//console.log("stripped mention: ", message.text);
				
				scraper.isQuestionOnVersionSupport(message.text, function(question){
					if(!question.isValid){
						//console.log("not a valid version support question: ");
						convo.stop();
					
						return;
					}
	
					scraper.getExpirationForVersion(question.version, function(result){
						if(result.error){
							convo.say(generatePlainAttachmentStr("Error fetching expiration schedule for version "+question.version,result.errorMSG));
							convo.activate();

							//console.log("error occurred in fetching expiration schedule for version ", question.version, result);
						}else{
							convo.say(generateExpirationAttachment(question.version, result.supportStatus, result.releaseDate, result.expirationDate, result.url));
							convo.activate();
							
							//console.log("Expiration schedule for ", question.version, result);
						}
					});
				});
			}
		});
	});




};
