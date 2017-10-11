// custom modules with some hardcoded values/references
var sfLib = require('../submodules/sfLib.js');
//var storageLib = require('../submodules/storage.js');

// scope of where these commands will trigger (anywhere the bot is, right now)
var listenScope = {
	"everywhere": 'ambient,direct_message,direct_mention,mention',
}

var regexList = {
	"case1": /(?:^|^\s|[^\/a-zA-Z0-9])ts([0-9]{6,7}).*$/im,
	"case2": /(?:^|^\s|[^\/a-zA-Z0-9])ts ([0-9]{6,7}).*$/im,
	"case3": /(?:^|^\s|[^\/a-zA-Z0-9])case ([0-9]{6,7}).*$/im,
	"case4": /(?:^|^\s|[^\/a-zA-Z0-9])case([0-9]{6,7}).*$/im,
	"case5": /(?:^|^\s|[^\/a-zA-Z0-9])#([0-9]{6,7}).*$/im,
	"case6": /(?:^|^\s|[^\/a-zA-Z0-9])# ([0-9]{6,7}).*$/im,
	"case7": /(?:^|^\s|[^\/a-zA-Z0-9])case: ([0-9]{6,7}).*$/im,
}
var emojis = [
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
	"fearful",
	"speak_no_evil",
	"see_no_evil",
];

var getFirstMessageFromThread = (message, getFirstMessageCallback) => {
	return getFirstMessageCallback(true, message.original_message.attachments[1].fallback);
	/*
	// hold onto this, just in case it's needed as a fallback.
		// checking if the first letter of the channel ID is C as per https://stackoverflow.com/questions/3427132/how-to-get-first-character-of-string and slack's response to my twitter 
		if (channel.charAt(0) == 'C'){
			//we use then the channels.history as is public
			bot.api.channels.history({
				channel: message.channel,
				latest: message.original_message.thread_ts,
				count: 1,
				inclusive: 1,
				token: bot.config.bot.app_token,
			}, function(err, response) {
				if(response.ok){
					getFirstMessageCallback(true, response.messages[0].text);
				}else{
					console.log("ERROR reading first message in public thread: ",err, response);
					getFirstMessageCallback(false, "error occurred fetching first message in public thread: "+JSON.stringify(response));
				}
			});
		} else {
			//we use then the groups.history as is private although it could also be direct message that starts with D then.
			bot.api.groups.history({
				channel: message.channel,
				latest: message.original_message.thread_ts,
				count: 1,
				inclusive: 1,
				token: bot.config.bot.app_token,
				}, function(err, response) {
					if(response.ok){
						getFirstMessageCallback(true, response.messages[0].text);
					}else{
						console.log("ERROR reading first message in private thread: ",err, response);
						getFirstMessageCallback(false, "error occurred fetching first message in private thread: "+JSON.stringify(response));
				}
			});
		}
	//*/
};

var createThreadInSFCase = (controller, bot, message, caseNum, userInfo, channelInfo, shouldSync, createSFThreadCallback) => {

	// can simplify this later, #todo	
	getFirstMessageFromThread(message, (success, firstMessageInThread) => {
		// don't bother if issue occurred fetching first message in thread
		if(!success){
			bot.reply(message, "WARNING: Error happened reading first message in thread, refusing to continue <@tsiebler>. Note that this functionality doesn't work properly in private channels - detail: \n `"+theMessage + "` \n\n see thread: "+process.env.slackDomain+"/archives/"+message.channel+"/p" + message.original_message.thread_ts.replace(".",""));
			return;
		}

		var theMessage;
		
		// need to remove what might be mistaken as salesforce post body syntax / fake HTML, as that'll cause salesforce to error out when submitting this.
		// clean out any mentions (<!someone|@someone>)
		theMessage = firstMessageInThread.replace(/<!(.*?)\|@\1>/g, '@$1');
		
		// clean up any other rogue <something> tags
		theMessage = theMessage.replace(/<(.*?\1)>/g, '$1');
		
		// replace newlines and CRs with something salesforce can understand
		theMessage = theMessage.replace(/(?:\r\n|\r|\n)/g, '</i></p><p><i>');
		
		// clean up this mess #todo
		var msgBody = "<p>This case is being discussed in slack by @" + userInfo.sf_username + " in channel #"+channelInfo.slack_channel_name +". Read the full thread here: "+process.env.slackDomain+"/archives/"+message.channel+"/p" + message.original_message.thread_ts.replace(".","") + "</p><p>&nbsp;</p><p><b>Original Message:</b></p><ul><li><p><i>" + theMessage + "</i></p></li></ul>";
		
		sfLib.createThreadInCase(caseNum, msgBody, function(err, resultSFThread){
			if(err){ console.log("WARNING: Error sfLib.createThreadInCase callback: ",err, resultSFThread); }
			
			// thread should have been created now in SF case, so store the sfID of that thread for later use
			controller.extDB.setSFThreadForSlackThread(controller, message, caseNum, resultSFThread.id, shouldSync, (err, results, savedRef) => {
								
				if(err) {
					console.log("WARNING: Error in createThreadInSFCase -> setSFThreadForCase: ", err, results, savedRef);
					createSFThreadCallback(true, "Error in saving sf_thread_ref for case, I may forget about this case later <!tsiebler>: " + JSON.stringify(err));
				}else{ createSFThreadCallback(false, process.env.sfURL + "/" +resultSFThread.id); }
				
			});
		});
	});

}
var handleSyncQuestionResponse = (controller, bot, message, reply, caseNum, trigger, syncQuestionResponseCallback) => {
	
	var attachment = {
		title: "",
        text: "",
	}
	
	var createPost = false,
		privateResponse = false,
		shouldSync = false,
		logging = false;
		
	switch(trigger.text){
		case "yes-1":
			createPost = true;
			shouldSync = true;
			
			if(logging) console.log("button: YES 1 - full sync");
			break;
			
		case "yes-2":
			createPost = true;
			
			if(logging) console.log("button: YES 2 - link only");
			break;
			
		case "no":
			privateResponse = true;
			
			if(logging) console.log("button: NO");
			attachment.title = null;
			attachment.text = "Okay, I won't post anything in case "+caseNum+".";

			break;
		break;
	}
	
	// flowjs this mess #todo
	if(createPost){
		// create internal post in service cloud case, with link to this
		controller.extDB.lookupUserAndChannel(controller, bot, message, (err, user, channel) =>{
			if(!err){
				//console.log("Channel & User Lookup Complete: ",user, channel);

				createThreadInSFCase(controller, bot, message, caseNum, user, channel, shouldSync, (err, resultLink) =>{
			
					attachment.title = "Thread Created";
					attachment.title_link = resultLink;
					
					if(shouldSync)
						attachment.text = "I'll keep it updated with any replies to this slack thread. ";
						
					else
						attachment.text = "Replies to this slack thread will *not* be automatically added to your case. ";
						
					// add a hide button
					attachment.callback_id = 'hideButton-0';
					attachment.actions = [
						{
							"name": "hide",
							"text": "Hide this message",
							"value": "hide",
							"type": "button"
						}
					];
					
					// Add undo button here?
									
					syncQuestionResponseCallback(
						err,
						attachment,
						privateResponse
					);
				});
			}else{
				console.log("failed reading slack username when trying to create SF post. Refusing to continue");
				
				attachment.text = "Error reading slack user when trying to create serviceCloud post. Refusing to continue";
				syncQuestionResponseCallback(
					err,
					attachment,
					false
				);
			}
		});
		
	}else{
		
		syncQuestionResponseCallback(
			null,
			attachment,
			privateResponse
		);
	}
}

var handleReplyToThread = (controller, bot, message) => {
	//console.log("####################### Reply to thread detected: ", message, message.text);
	
	// get username via slackAPI of current msg poster
    controller.extDB.lookupUser(bot, message, (err, user) =>{
		if(err){
			console.log("WARNING: handleReplyToThread() failed reading slack user, error: ", err, response);
			return;
		}else{
			//message.text replace new lines with <p>&nbsp;</p>
			var theMessage;
			theMessage = message.text.replace(/<!(.*?)\|@\1>/g, '@$1');
			theMessage = theMessage.replace(/<(.*?\1)>/g, '$1');
			theMessage = theMessage.replace(/(?:\r\n|\r|\n)/g, '</i></p><p><i>');
			
			var msgBody = "<p><b>@"+user.sf_username + "</b> via slack:</p><ul><li><p><i>" + theMessage+ "</i></p></li></ul>";
			
			// check if thread_ts is known already
			controller.extDB.getSFThreadForSlackThread(controller, message, (err, exists, sf_thread_ref) =>{
				//console.log("##### NEW handleReplyToThread : getSFThreadForSlackThread: err, exists and ref: ", err, exists, sf_thread_ref);
				if(!exists){
					//console.log("ServiceCloud thread doesn't exist yet for slack thread with timestamp " + message.thread_ts + ". Returning blankly.");
					return false;
				}
				
				if(sf_thread_ref.sf_should_sync){
					// add comment to existing thread
					console.log("##### NEW handleReplyToThread: adding reply to case: ",message.text);
					sfLib.addCommentToPost(sf_thread_ref.sf_post_id, msgBody, function(err, records){
						//console.log("sfLib.addCommentToPost callback - ", err);
					});
				}else{
					console.log("shouldSync == false, won't add post automatically");
				}
			});
		}
    });
}

var isCaseMentioned = function(str){
	//[regexList['case1'], regexList['case2'], regexList['case3'], regexList['case4'], regexList['case5'], regexList['case6'], regexList['case7']
	var regexList = {
		"case1": /(?:^|^\s|[^\/a-zA-Z0-9])ts([0-9]{6,7}).*$/im,
		"case2": /(?:^|^\s|[^\/a-zA-Z0-9])ts ([0-9]{6,7}).*$/im,
		"case3": /(?:^|^\s|[^\/a-zA-Z0-9])case ([0-9]{6,7}).*$/im,
		"case4": /(?:^|^\s|[^\/a-zA-Z0-9])case([0-9]{6,7}).*$/im,
		"case5": /(?:^|^\s|[^\/a-zA-Z0-9])#([0-9]{6,7}).*$/im,
		"case6": /(?:^|^\s|[^\/a-zA-Z0-9])# ([0-9]{6,7}).*$/im,
		"case7": /(?:^|^\s|[^\/a-zA-Z0-9])case: ([0-9]{6,7}).*$/im,
	}
	
	if(
		regexList['case1'].exec(str) !== null
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
	controller.hears([regexList['case1'], regexList['case2'], regexList['case3'], regexList['case4'], regexList['case5'], regexList['case6'], regexList['case7']], listenScope["everywhere"], function(bot, message) {
		console.log("Case mention in channel: ", message.match, message.event);
		
		var thread_ts = message.thread_ts;
		
		var caseNum = message.match[1];		
		var trackedThread = false,
			isInThread = typeof thread_ts != "undefined";		
					
		controller.extDB.getSFThreadForSlackThread(controller, message, (err, exists, sf_thread_ref) =>{
			console.log("getSFThreadForSlackThread: ",exists);
			if(exists) trackedThread = sf_thread_ref.sf_post_created;
			
			// prevent 'want me to link' question if case is mentioned in a thread, without jarvis being mentioned. Avoid spam, especially if the user says no to the previous prompt
			if(message.event == 'ambient' && isInThread) trackedThread = true;
			
			// also prevent link-to-case logic when in direct message
			if(message.event == 'direct_message') trackedThread = true;

			bot.startConversationInThread(message, function(err, convo) {
				if (!err) {
				
					// logic to bring up case snapshot
					sfLib.getCase(caseNum, function(err, records){
						if (err) { 
							console.error("error in SF Query Result: ",err); 
							return;
						}
						var syncPreText = "Create an internal post in case "+caseNum+"?";
						var syncText = "• Yes: I'll create an internal post with a link to this slack thread. \n\n• Full-sync: any replies here will also be added to the internal thread in your case. \n\nYou can toggle sync at any time, click 'ServiceCloud Sync' for more details. :bowtie:";
						
						// logic to sync with case in service cloud
						if(!trackedThread){										
						    convo.say({
						        attachments:[
						            {	
										fallback: message.text,
						                title: 'ServiceCloud Sync',
										title_link: 'https://microstrategy.atlassian.net/wiki/spaces/Jarvis/pages/152866596/ServiceCloud+Sync',
										color: "#36a64f",
										pretext: syncPreText,
						                text: syncText,           
										callback_id: 'logToCaseQuestion-'+caseNum,
										callback_ref: message,
						                attachment_type: 'default',
						                actions: [
						                    {
						                        "name": "yes-1",
						                        "text": "Yes (full-sync)",
						                        "value": "yes-1",
						                        "type": "button",
												"style": "primary"
						                    },			                    
											{
						                        "name": "yes-2",
						                        "text": "Yes (link only)",
						                        "value": "yes-2",
						                        "type": "button",
						                    },
						                    {
						                        "name":"no",
						                        "text": "No",
						                        "value": "no",
						                        "type": "button",
						                    }
						                ]
						            }
						        ]
						    },[]);
							
						}
	
						var resultCase = records[0];	
						var attachment = sfLib.generateAttachmentForCase(resultCase);
						
						//console.log("Attaching case snapshot to thread: ",resultCase);
						convo.say(attachment);
						convo.next();
					});
				}
			});	
		});
		
		return true;		// allow other matching handlers to fire
	});
    controller.hears([/.*enable sync.*/i],'direct_mention,mention', function(bot, message) {
		// quit early if this isn't a thread in slack
		if(typeof message.thread_ts == "undefined") return true;

		controller.extDB.setSyncStateForSlackThread(controller, message, true, (err, success, savedRef) => {			
	        if (!success) {				
	            bot.reply(message, 'I can\'t :'+ emojis[Math.floor(Math.random()*emojis.length)] +': \n\n ' + err );

	        } else {
	            bot.api.reactions.add({
	                name: 'thumbsup',
	                channel: message.channel,
	                timestamp: message.ts
	            });
	        }
		});
    });
    controller.hears([/.*disable sync.*/i],'direct_mention,mention', function(bot, message) {
		// quit early if this isn't a thread in slack
		if(typeof message.thread_ts == "undefined") return true;
		
		controller.extDB.setSyncStateForSlackThread(controller, message, false, (err, success, savedRef) => {
	        if (!success) {				
	            bot.reply(message, 'I can\'t :'+ emojis[Math.floor(Math.random()*emojis.length)] +': \n\n ' + err );
				
	        } else {
	            bot.api.reactions.add({
	                name: 'thumbsup',
	                channel: message.channel,
	                timestamp: message.ts
	            });
	        }
		});
    });
	
	controller.on('interactive_message_callback', function(bot, trigger) {
		//console.log("interactiveMessageCallback: ", trigger);
		
	    var ids = trigger.callback_id.split(/\-/),
			callbackReference = ids[0],
			caseNum = ids[1];
		
		if(callbackReference == 'logToCaseQuestion'){
			console.log("Buttonclick callback IDs: ",callbackReference,caseNum);
			// edit original message, as a response
						
	        var reply = trigger.original_message,
				originalText = trigger.original_message.attachments[0].fallback;
				attachment = {
					text: "Preparing internal post in case "+caseNum+"... :waiting:",
					fallback: originalText,
			}
			
			// clear previous post
	        for (var a = 0; a < reply.attachments.length; a++) { reply.attachments[a] = null; }			
						
			// overwrite default "yes" reply if we're bailing early
			if(trigger.text == "no"){
				attachment.text = "Okay, I won't post anything in that case.";
			}
			
			// append new text to previous post
			reply.attachments.push(attachment);
	        bot.replyInteractive(trigger, reply);
			
			//console.log("cleared previous attachments");
						
			handleSyncQuestionResponse(controller, bot, trigger, reply, caseNum, trigger, (err, attachmentBody, privateResponse) => {
				if(!err){
					if(privateResponse) reply.response_type = "ephemeral";
					
					// clear previous post
			        for (var a = 0; a < reply.attachments.length; a++) { reply.attachments[a] = null; }	

					// append new text to previous post
					reply.attachments.push(attachmentBody);
			        bot.replyInteractive(trigger, reply);
					
				}else{
					console.log("WARNING: handleSyncQuestionResponse() callback() - error happened trying to sync this slack thread with case "+caseNum);
				}
			});
		}else if(callbackReference == "hideButton"){
	        var reply = trigger.original_message;
	        for (var a = 0; a < reply.attachments.length; a++) { reply.attachments[a] = null; }			
	        bot.replyInteractive(trigger, reply);
		}
		return true;
	});
	
	controller.on('ambient', function(bot, message) {
		controller.extDB.lookupUserAndChannel(controller, bot, message, function(err, result){

		});
		controller.extDB.insertPostStat(controller, message, function(err, result){
			if(err) console.log("WARNING - insertPostStat err: ",err);
			//console.log("logged message stat: ", err, result);
		});
		
		// slack thread -> case thread sync
		if(typeof message.thread_ts != "undefined"){
			handleReplyToThread(controller, bot, message);
		}else{
			//console.log("####################### ambient message with undefined thread_ts: ", message, message.text);
		}
		
		return true;
	});
};
