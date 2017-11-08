var Utils = function () {};


Utils.prototype.regex = {
	KBase: /(?:^|^\s|[^\/a-zA-Z0-9])(?:tn|kb|ArticlesKB)\s?([0-9]+)/img,
	case: /(?:^|^\s|[^\/a-zA-Z0-9])(?:ts|case|case\snumber|#)(?:\:|,|)\s{0,3}?([0-9]{6,7})/img,
	genericIDNumber:/([0-9]{6,7}).*$/im,
	setSME: /set me as sme(.*)/i,
	logTask: /log(?:^|^\s|[a-zA-Z0-9\s]+)task(.*)/i
};

// returns case number if present
Utils.prototype.extractCaseNum = function(string){	
	let result = this.regex.genericIDNumber.exec(string);
	if(result != null && result[1]){
		return result[1];
	}
};
Utils.prototype.containsMatch = function(string, regex){
	return regex.exec(string) !== null;
};
Utils.prototype.containsCaseNumber = function(string){
	let result = this.regex.genericIDNumber.exec(string);
	if(result != null && result[1]){
		return true;
	}
	return false;
};

/*

	Getters

*/
Utils.prototype.getMatchesKB = function(string){
	var matches = [], parsedMatch;
		
	while (parsedMatch = this.regex.KBase.exec(string)) {
		matches.push(parsedMatch[1]);
	}
	
	return matches;
}
Utils.prototype.getURLFromMessage = function(message){
	var channel = message.channel, 
		url = process.env.slackDomain + "/archives/"+ channel +"/p";
	
	if(typeof message.thread_ts != "undefined"){
		url += message.thread_ts.replace(".","");
	}else if(typeof message.message_ts != "undefined"){
		url += message.message_ts.replace(".","");
	}else if(typeof message.ts != "undefined"){
		url += message.ts.replace(".","");
	}else{
		debugger;
	}
	
	return url;
}

/*

	Emoji stuff

*/
Utils.prototype.emojisNegative = [
	"sleepy",
	"unamused",
	"weary",
	"anguished",
	"no_mouth",
	"persevere",
	"sleeping",
	"disappointed",
	"confounded",
	"sob",
	"tired_face",
	"frowning",
	"disappointed_relieved",
	"speak_no_evil",
	"see_no_evil",
];
Utils.prototype.getSadEmoji = function(){
	return this.emojisNegative[Math.floor(Math.random()*this.emojisNegative.length)];
}

/*

	Attachment builders
	
*/
Utils.prototype.generateAttachmentForKBArticles = function(articles){
	var results = {
		"attachments": []
	}
	
	for(i = 0;i < articles.length;i++){
		var article = articles[i];
		
		results.attachments.push({
			"fallback": article.Title.substring(0,14),
			"color": "#36a64f",
			"title": "• "+article.Title,
			"title_link": "https://community.microstrategy.com/s/article/" + article.Id
		})
	}
	
	return results;
}
// in future, I'd like to parse time, status, etc out of the message if present.
Utils.prototype.generateAttachmentForTask = function(caseNum, owner, assignee, time, status){	
	var attachments = {
        attachments:[
            {	
				fallback: "Log a new task?",
                title: 'New Task for Case ' + caseNum + '',
				title_link: 'https://microstrategy.atlassian.net/wiki/spaces/Jarvis/pages/167477717/ServiceCloud+jarvis+log+a+task',
				color: "#36a64f",
				//pretext: "pretext",
                //text: "Who will work / has worked on this task?",           
                text: "Detail can be provided after selecting an assignee.",           
				callback_id: 'logTaskQuestion-'+caseNum,
                attachment_type: 'default',
				actions: [
					{
	                    "name": "assignee",
	                    "text": "Assign to who?",
	                    "type": "select",
	                    "data_source": "users",
	                },
		            {
		                name:"Cancel",
		                text: "Cancel",
		                value: "cancel",
		                type: "button",
		            },
					/*
		            {
		                name:"Continue",
		                text: "Continue",
		                value: "continue",
		                type: "button",
		            }//*/
                ]
            }
        ]
    }
	
	return attachments;
}
Utils.prototype.generateAttachmentForTaskInProgress = function(){	
	var attachments = {
        attachments:[
            {	
				fallback: "Task underway...",
                title: 'Task underway...',
				title_link: 'https://microstrategy.atlassian.net/wiki/spaces/Jarvis/pages/167477717/ServiceCloud+jarvis+log+a+task',
				//pretext: "pretext",
                //text: "Who will work / has worked on this task?",           
				callback_id: 'logTaskQuestion-'+ 0,
                attachment_type: 'default',
				actions: [
		            {
		                name:"Cancel",
		                text: "Cancel",
		                value: "cancel",
		                type: "button",
		            },
                ]
            }
        ]
    }
	
	return attachments;
}

Utils.prototype.colors = ["#FFB300","#FFEE00","#DDFF00","#99FF00","#48FF00","#1EFF00"];
Utils.prototype.generateLinkAttachmentWithColor = function(link, title, color){
	var results = {
		"attachments": [{
			"fallback": title,
			"color": color,
			"title": title,
			"title_link": link,
		}]
	}
	return results;
}
Utils.prototype.generateLinkAttachment = function(link, title){
	return this.generateLinkAttachmentWithColor(link, title, "#36a64f");
}
Utils.prototype.generateTextAttachmentWithColor = function(text, color){
	var results = {
		"attachments": [{
			"fallback": text,
			"color": color,
			"title": text,
		}]
	}
	
	return results;
}

Utils.prototype.tasks = {};
Utils.prototype.tasks.SelectPriorityArray = [
	"Low",
	"Normal",
	"High"
]
Utils.prototype.tasks.SelectStateArray = [
	{
		label: "Not Started",
		value: "Not Started",
	},
	{
		label: "In Progress",
		value: "In Progress",
	},
	{
		label: "Completed",
		value: "Completed",
	}
];
Utils.prototype.tasks.SelectTimeArray = [
	{
		label: "none",
		value: "none"
	},
	{
		label: "15m",
		value: "15m"
	},
	{
		label: "30m",
		value: "30m"
	},
	{
		label: "45m",
		value: "45m"
	},
	{
		label: "1h",
		value: "1h"
	},
	{
		label: "1h 30m",
		value: "1h 30m"
	},
	{
		label: "2h",
		value: "2h"
	},
	{
		label: "2h 30m",
		value: "2h 30m"
	},				
	{
		label: "3h",
		value: "3h"
	},
	{
		label: "3h 30m",
		value: "3h 30m"
	},
	{
		label: "4h",
		value: "4h"
	},
	{
		label: "5h",
		value: "5h"
	},
	{
		label: "6h",
		value: "6h"
	},
	{
		label: "7h",
		value: "7h"
	},
	{
		label: "8h",
		value: "8h"
	}
]
Utils.prototype.tasks.SelectTypeArray = [
	{
		label: "Call",
		value: "Call"
	},
	{
		label: "Call - Conversation",
		value: "Call - Conversation"
	},
	{
		label: "Meeting - External",
		value: "Meeting - External"
	},
	{
		label: "Meeting - Internal",
		value: "Meeting - Internal"
	},
	{
		label: "Task - Investigation",
		value: "Task - Investigation"
	},
	{
		label: "Task - Training",
		value: "Task - Training"
	}
]
Utils.prototype.tasks.EnumStatus = ["Not Started","In Progress","Completed","Waiting on someone else","Deferred"];
Utils.prototype.tasks.EnumType = [
	"Call",
	"Call - Conversation",
	"Call - Missed",
	"Call - VM Inbound",
	"Call - VM Outbound",
	"Email",
	"Meeting - External",
	"Meeting - Internal",
	"Meeting - Screenshare",
	"Meeting - Site Visit",
	"Task - Follow-up",
	"Task - Investigation",
	"Task - Training",
	"Task - Translation"
];
Utils.prototype.tasks.EnumTimeSpent = ["","15m","30m","45m","1h","1h 30m","2h","2h 30m","3h","3h 30m","4h","5h","6h","7h","8h"];
Utils.prototype.tasks.EnumPriority = [
	"Low",
	"Normal",
	"High"
]

Utils.prototype.message = {};
Utils.prototype.message.update = function(bot, message, text, attachments){
	var params = {
		token: bot.config.bot.token,
		channel: message.channel,
		ts: message.message_ts,
		parse: "none"
	};
	
	if(text) params.text = text;
	if(attachments){
		params.attachments = attachments.attachments;
	}
	
	bot.api.chat.update(params, function(err, results){
		if(err) console.log("update: ",err, results);
	})
}
Utils.prototype.message.delete = function(bot, channel, timestamp){
	
	bot.api.chat.delete({
		token: bot.config.bot.token,
		channel: channel,
		ts: timestamp
	},function(err, results){
		if(err) console.log("delete err: ",err, results);
	});
}

module.exports = new Utils();