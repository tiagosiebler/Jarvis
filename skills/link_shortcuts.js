// custom modules with some hardcoded values/references
var extResources = require('../submodules/extResources.js');
var scraper = require('../submodules/scraper.js');

// scope of where these commands will trigger (anywhere the bot is, right now)
var listenScope = {
	"everywhere": 'ambient,direct_message,direct_mention,mention',
}

var generateLinkAttachment = function(link, title){
	var results = {
		"attachments": [{
			"fallback": title,
			"color": "#36a64f",
			"title": title,
			"title_link": link,
		}]
	}
	return results;
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

// support schedule: https://www.microstrategy.com/us/services/customer-support/expiration-schedule

var regexList = {
	"case": /^.*ts([0-9]+).*$/i,
	"KB": /^.*kb([0-9]+).*$/i,
	"TN": /^.*TN([0-9]+).*$/i,
	"DE": /^.*DE([0-9]+).*$/i,
	"US": /^.*US([0-9]+).*$/i,
	"websdk": /websdk/i,
	"mobilesdk1": /mob(.*)sdk/i,
	"mobilesdk2": /iossdk/i,
	"mobilesdk3": /andr(.*)sdk/i,
	"vissdk": /vis(.*)sdk/i,
	"restapi1": /rest(.*)sdk/i,
	"restapi2": /rest(.*)api/i,
	"restapi3": /json(.*)api/i,
	"restapi4": /json(.*)sdk/i,
	"datasdk1": /data(.*)sdk/i,
	"datasdk2": /data(.*)api/i,
	"datasdk3": /connector(.*)sdk/i,
	"kbase1": /kbase(.*)/i,
	"kbase2": /technote(.*)/i,
	"kbase3": /tn(.*)/i,
	"kbase4": /community(.*)/i,
	"sdk": /(.*)sdk(.*)/i,
}

var triggerQuickLink = function(bot, message, response){
	//bot.reply(message, response);
	bot.startConversationInThread(message, function(err, convo) {
		if (!err) {
			convo.say(response);
			convo.activate();
		}
	});
}

// listeners
module.exports = function(controller) {
	controller.hears(['.*!websdk(.*)'], listenScope["everywhere"], function(bot, message) {
		triggerQuickLink(bot, message, extResources.devZoneLinks["webSDK"]);
	});
	controller.hears(['.*!mobilesdk(.*)', '^!iossdk(.*)'], listenScope["everywhere"], function(bot, message) {
		triggerQuickLink(bot, message, extResources.devZoneLinks["mobileSDK"]);
	});
	controller.hears(['.*!androidsdk(.*)'], listenScope["everywhere"], function(bot, message) {
		triggerQuickLink(bot, message, extResources.devZoneLinks["androidSDK"]);
	});
	controller.hears(['.*!vis(.*)sdk(.*)'], listenScope["everywhere"], function(bot, message) {
		var params = message.text.split(" ");
		switch (params.length) {
			case 1:
				triggerQuickLink(bot, message, extResources.devZoneLinks["visSDK"]);
				break;

			default:
				triggerQuickLink(bot, message, extResources.devZoneLinks["visSDK"]);
				console.log("default condition, more than one vis SDK param " + params.length, params);
				break;
		}
	});
	controller.hears(['.*!rest(.*)sdk(.*)', '.*!rest(.*)api(.*)', '.*!json(.*)api(.*)'], listenScope["everywhere"], function(bot, message) {
		var params = message.text.split(" ");
		switch (params.length) {
			case 1:
				triggerQuickLink(bot, message, extResources.devZoneLinks["restapi"]);
				break;

			default:
				triggerQuickLink(bot, message, extResources.devZoneLinks["restapi"]);
				console.log("default condition, more than one rest api param " + params.length, params);
				break;
		}
	});
	controller.hears(['.*!data(.*)sdk(.*)', '.*!data(.*)connector(.*)', '.*!connector(.*)sdk(.*)'], listenScope["everywhere"], function(bot, message) {
		var params = message.text.split(" ");
		switch (params.length) {
			case 1:
				triggerQuickLink(bot, message, extResources.devZoneLinks["dataconnectorsdk"]);
				break;

			default:
				triggerQuickLink(bot, message, extResources.devZoneLinks["dataconnectorsdk"]);
				console.log("default condition, more than one connector SDK param " + params.length, params);
				break;
		}
	});
	
	controller.hears(['.*!office(.*)sdk(.*)', '.*!office(.*)api(.*)'], listenScope["everywhere"], function(bot, message) {
		var params = message.text.split(" ");
		switch (params.length) {
			case 1:
				triggerQuickLink(bot, message, extResources.devZoneLinks["officesdk"]);
				break;

			default:
				triggerQuickLink(bot, message, extResources.devZoneLinks["officesdk"]);
				console.log("default condition, more than one office SDK param " + params.length, params);
				break;
		}
	});
	
	controller.hears(['.*!server(.*)sdk(.*)', '.*!server(.*)api(.*)', '.*!com(.*)sdk(.*)', '.*!com(.*)api(.*)'], listenScope["everywhere"], function(bot, message) {
		var params = message.text.split(" ");
		switch (params.length) {
			case 1:
				triggerQuickLink(bot, message, extResources.devZoneLinks["serversdk"]);
				break;

			default:
				triggerQuickLink(bot, message, extResources.devZoneLinks["serversdk"]);
				console.log("default condition, more than one server SDK param " + params.length, params);
				break;
		}
	});

	controller.hears(['.*!request(.*)'], listenScope["everywhere"], function(bot, message) {
		var params = message.text.split(" ");
		switch (params.length) {
			case 1:
				triggerQuickLink(bot, message, "The syntax is !request <info on bot request here>. For example: !request add ability to solve my case automatically");
				break;
				
			default:
				bot.startConversationInThread(message, function(err, convo) {
					if (!err) {
						convo.say("<@tsiebler>: New request for Jarvis! Detail: " + message.text);
						convo.activate();
					}
				});
				break;
		}
	});



};
