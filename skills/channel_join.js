var debug = require('debug')('botkit:channel_join');

module.exports = function(controller) {
	var autoResponders = {
		'attachments': [{
			"fields": [
				{
					"title": "Cases (TS xxx or case xxx)",
					"value": "In case 12345, the issue is only reproducible in mobile, any ideas on further narrowing down the cause?",
					"short": true
				}, {
					"title": "Knowledge Base References",
					"value": "Is the issue described in KB355731 still present in 10.8?",
					"short": true
				},
				{
					"title": "Defects",
					"value": "Is DE55934 going to be fixed?",
					"short": true
				},
				{
					"title": "User Stories / Enhancements",
					"value": "When was US59312 addressed?",
					"short": true
				},
			],
			'color': '#7CD197',
		}]
	};

	var shortcuts = {
		'attachments': [{
			'fallback': 'I respond to a number of commands: !iossdk, !androidsdk, !websdk, etc.',
			"fields": [{
					"title": "!websdk",
					"value": "Web SDK documentation",
					"short": true
				}, {
					"title": "!iossdk",
					"value": "iOS SDK documentation",
					"short": true
				}, {
					"title": "!androidsdk",
					"value": "Android SDK documentation",
					"short": true
				}, {
					"title": "!vissdk",
					"value": "Visualization SDK documentation",
					"short": true
				}, {
					"title": "!restapi",
					"value": "Rest / JSON Data API documentation",
					"short": true
				}, {
					"title": "!datasdk",
					"value": "Data Connector SDK documentation",
					"short": true
				}, {
					"title": "!officesdk",
					"value": "MicroStrategy Office SDK documentation",
					"short": true
				}, {
					"title": "!serversdk",
					"value": "MicroStrategy Office SDK documentation",
					"short": true
				}, {
					"title": "!readme 10x/10.0x",
					"value": "Get the readme for a certain version",
					"short": true
				}],
			'color': '#7CD197',
		}]
	};

	var commands = {
		'attachments': [{
			'fallback': 'I respond to a number of commands: !iossdk, !androidsdk, !websdk, etc. !searchsdk web <search terms here>',
			"fields": [
				{
					"title": "!search",
					"value": "Trigger a search in various locations and display the top results (work in progress, only SDK docs so far)",
					"short": true
				},
				/*
				{
					"title": "!request",
					"value": "Suggest an ER or log an issue related to this bot.",
					"short": true
				}, //*/
				{
					"title": "!help",
					"value": "Replay this message with the list of commands.",
					"short": true
				}],
			'color': '#7CD197',
		}]
	};

	var helpText = [
		'Hello <!everyone>!',
		'I\'m Jarvis, at your service.',
		'Mention cases, technotes, defects or even user stories in this channel, and I\'ll pull up any relevant information for context. \n\nHere are some examples to which I\'ll respond automatically.',
		'I can pull up quick links to some documentation that\'s asked for regularly, you can read more about commands <https://microstrategy.atlassian.net/wiki/spaces/Jarvis/pages/152960689/Shortcuts|here>.',
		'If you have any questions, issues or ideas, join <#C6B1NRXM4>!',
		'For issues or questions on my service, reach out to <@tsiebler> 🤕'
	]
	var caseMention = "I can tie your slack thread with your ServiceCloud case. Read about the ServiceCloud Sync feature <https://microstrategy.atlassian.net/wiki/spaces/Jarvis/pages/152866596/ServiceCloud+Sync|here>.";

  // controller.on('bot_channel_join,bot_group_join', function(bot, message) {
  //   bot.startConversation(message, function(err, convo) {
  //     convo.say(helpText[0]);
  //     convo.say(helpText[1]);
  //     convo.say(autoResponders);
  //     convo.say(helpText[2]);
  //     convo.say(caseMention);
  //     convo.say(helpText[3]);
  //     //convo.say(shortcuts);
  //     convo.say(helpText[4]);
  //     //convo.say(commands);
  //     //convo.say(helpText[6]);
  //   });
  //
  //   //bot.reply(message, reply_with_attachments);
  //
  // });
	controller.hears(['(.*)!command(.*)', '(.*)!help(.*)'], 'ambient,direct_message,direct_mention', function(bot, message) {
		bot.startConversationInThread(message, function(err, convo) {
			if (!err) {
				convo.say(helpText[2]);
				convo.say(autoResponders);
				convo.say(helpText[3]);
				convo.say(caseMention);
				convo.say(helpText[4]);
				//convo.say(shortcuts);
				//convo.say(helpText[5]);
				//convo.say(commands);
				//convo.say(helpText[6]);
				convo.activate();
			}
		});
	});
	controller.hears(['(.*)!testjoin(.*)'], 'ambient,direct_message,direct_mention', function(bot, message) {
		bot.startConversation(message, function(err, convo) {
			convo.say(helpText[0]);
			convo.say(helpText[1]);
			convo.say(helpText[2]);
			convo.say(autoResponders);
			convo.say(helpText[3]);
			convo.say(helpText[4]);
			//convo.say(helpText[5]);
			//convo.say(commands);
			//convo.say(helpText[6]);
		});
	});

}
