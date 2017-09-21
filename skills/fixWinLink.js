
// scope of where these commands will trigger (anywhere the bot is, right now)
var listenScope = {
	"everywhere": 'ambient,direct_message',
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


var triggerQuickLink = function(bot, message, response){
	//bot.reply(message, response);
	bot.startConversationInThread(message, function(err, convo) {
		if (!err) {
			convo.say(response);
			convo.activate();
		}
	});
}

var fixLink = function(linkStr){
	var fs1ServerName = process.env.serverName1,
	      fs1ServerIP = process.env.serverIP1;
	  
	var tech_srvName = process.env.serverName2,
		  tech_srvIP = process.env.serverIP2;

		  debugger;
	linkStr = linkStr.replace(/\\/g,"/");

	linkStr = linkStr.replace(fs1ServerName,fs1ServerIP);
	linkStr = linkStr.replace(tech_srvName,tech_srvIP);

	linkStr = linkStr.substring(linkStr.indexOf("//"));
	linkStr = linkStr.substr(0, linkStr.lastIndexOf("/"));
	linkStr = linkStr.substring(linkStr.indexOf(":") + 1);

	linkStr = "smb:"+linkStr + "/";
	return linkStr;
}

// listeners
module.exports = function(controller) {
	controller.hears([/.*(file:\/\/.*)/i, /.*(\\\\prod.*)/i, /.*(\\\\corp.*)/i], 'direct_message,direct_mention,mention', function(bot, message) {
		//console.log("file system link: ", message);
		
		var fixedLink = fixLink(message.match[1]);
		
		bot.reply(message, generateLinkAttachment(fixedLink,fixedLink));

	});
};
