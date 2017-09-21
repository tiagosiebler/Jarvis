// custom modules with some hardcoded values/references
var sfLib = require('../submodules/sfLib.js');
var storageLib = require('../submodules/storage.js');

// scope of where these commands will trigger (anywhere the bot is, right now)
var listenScope = {
	"everywhere": 'ambient,direct_message,direct_mention,mention',
}

var regexList = {
	"case1": /^.*ts([0-9]+).*$/im,
	"case2": /^.*ts ([0-9]+).*$/im,
	"case3": /^.*case ([0-9]+).*$/im,
	"case4": /^.*case([0-9]+).*$/im,
	"case5": /^.*#([0-9]+).*$/im,
	"case6": /^.*# ([0-9]+).*$/im,
	"case7": /^.*case: ([0-9]+).*$/im,
}

var getFirstMessageFromThread = (channel, thread_ts, getFirstMessageCallback) => {
	bot.api.channels.history({
		channel: channel,
		latest: thread_ts,
		count: 1,
		inclusive: 1,
		token: bot.config.bot.app_token,
	}, function(err, response) {
		if(response.ok){
			getFirstMessageCallback(true, response.messages[0].text);
		}else{
			console.log("ERROR reading first message in thread: ",err, response);
			getFirstMessageCallback(false, "error occurred fetching first message in thread: "+JSON.stringify(response));
		}
	});
};
//	== in event caller, check if that thread is in the list of tracked threads (if not, some logic)
var createThreadInSFCase = (controller, bot, message, caseNum, slackUser, shouldSync, createSFThreadCallback) => {
	// messageText is blank here, that info was lost?
	
	getFirstMessageFromThread(message.channel,message.original_message.thread_ts, (success, firstMessageInThread) => {
		// look at getting first message from thread, and adding that when creating SF thread
		var theMessage;
		theMessage = firstMessageInThread.replace(/<!(.*?)\|@\1>/g, '@$1');
		theMessage = theMessage.replace(/<(.*?\1)>/g, '$1');
		theMessage = theMessage.replace(/(?:\r\n|\r|\n)/g, '</i></p><p><i>');
		
		if(!success){
			bot.reply(message, "WARNING: Error happened reading first message in thread, refusing to continue <@tsiebler>: \n `"+theMessage + "` \n\n see thread: "+process.env.slackDomain+"/archives/"+message.channel+"/p" + message.original_message.thread_ts.replace(".",""));
			return;
		}


		var msgBody = "<p>This case is being discussed in slack by @" + slackUser + ". Read the full thread here: "+process.env.slackDomain+"/archives/"+message.channel+"/p" + message.original_message.thread_ts.replace(".","") + "</p><p>&nbsp;</p><p><b>Original Message:</b></p><ul><li><p><i>" + theMessage + "</i></p></li></ul>";
		
		sfLib.createThreadInCase(caseNum, msgBody, function(err, resultSFThread){
			if(err){
				console.log("Error createThreadInCase: ",err, resultSFThread);
			}
			
			// thread should be created in SF case, so now store the refID for later use
			storageLib.setSFThreadForCase(controller, message, caseNum, resultSFThread.id, shouldSync, (err, success, savedRef) => {
			
				if(!success) {
					console.log("Error in storageLib.setSFThreadForCase after creating SF thread", err, savedRef);

					// add reply? Warning: couldn't store reference to salesforce thread for some rason.
					createSFThreadCallback(true, "Error in saving storageLib ref to case, I may forget about this case <!tsiebler>");
				}else{
					createSFThreadCallback(false, "https://mstr.my.salesforce.com/"+resultSFThread.id);
				}
			})
		});
	});

}
var handleSyncQuestionResponse = (controller, bot, message, reply, caseNum, trigger, syncQuestionResponseCallback) => {
	
	var attachment = {
		title: "",
        text: "",
	}
	var logging = false;
	
	var createPost = false,
		privateResponse = false,
		shouldSync = false;
		
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
	
	if(createPost){
		// create internal post in service cloud case, with link to this
		//attachment.title_link = "http://test.com/";
	    bot.api.users.info({user: message.user}, (error, response) => {
			if(response.ok){	
				
				createThreadInSFCase(controller, bot, message, caseNum, response.user.name, shouldSync, (err, resultLink) =>{
			
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
									
					syncQuestionResponseCallback(
						err,
						attachment,
						privateResponse
					);
				});
		
			}
			else{
				console.log("failed reading slack username when trying to create SF post. Refusing to continue");
				
				attachment.text = "Error reading slack user when trying to create serviceCloud post. Refusing to continue";
				syncQuestionResponseCallback(
					err,
					attachment,
					false
				);
			}
		})
		
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
    bot.api.users.info({user: message.user}, (error, response) => {
		if(error){
			console.log("handleReplyToThread: failed reading slack user, error: ", error, response);
			return;
		}
		else if(typeof response != "undefined" && typeof response.ok != "undefined" && response.ok){
			//message.text replace new lines with <p>&nbsp;</p>
			var theMessage;
			theMessage = message.text.replace(/<!(.*?)\|@\1>/g, '@$1');
			theMessage = theMessage.replace(/<(.*?\1)>/g, '$1');
			theMessage = theMessage.replace(/(?:\r\n|\r|\n)/g, '</i></p><p><i>');
			
			var msgBody = "<p><b>@"+response.user.name + "</b> via slack:</p><ul><li><p><i>" + theMessage+ "</i></p></li></ul>";
			
			// check if thread_ts is known already
			storageLib.getSFThreadForSlackThread(controller, message, null, (exists, sf_thread_ref) => {
				//console.log("##### handleReplyToThread : getSFThreadForSlackThread: exists and ref: ", exists, sf_thread_ref);
				
				// if yes, check if its tied to a case
				if(!exists){
					//console.log("ServiceCloud thread doesn't exist yet for slack thread with timestamp " + message.thread_ts + ". Returning blankly.");
					return false;
				}
		
				if(sf_thread_ref.shouldSync){
					// add comment to existing thread
					console.log("handleReplyToThread: adding reply to case: ",message.text);
					sfLib.addCommentToPost(sf_thread_ref.sf_post_id, msgBody, function(err, records){
						//console.log("sfLib.addCommentToPost callback - ", err);
					});
				}else{
					//console.log("shouldSync == false, won't add post automatically");
				}
			});
		}
		else{
			console.log("handleReplyToThread: failed reading slack user, last ifelse, error: ",error, response);
			return;
		}
    })
}

var isCaseMentioned = function(str){
	//[regexList['case1'], regexList['case2'], regexList['case3'], regexList['case4'], regexList['case5'], regexList['case6'], regexList['case7']
	var regexList = {
		"case1": /^.*ts([0-9]+).*$/im,
		"case2": /^.*ts ([0-9]+).*$/im,
		"case3": /^.*case ([0-9]+).*$/im,
		"case4": /^.*case([0-9]+).*$/im,
		"case5": /^.*#([0-9]+).*$/im,
		"case6": /^.*# ([0-9]+).*$/im,
		"case7": /^.*case: ([0-9]+).*$/im,
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
		console.log("Case mention in channel: ", message.text, message.event);
		var caseNum = message.match[1];		
		var trackedThread = false;
		
		storageLib.getSFThreadForSlackThread(controller, message, caseNum, (exists, sf_thread_ref) => {
			console.log("known thread: ",exists);
			if(exists) trackedThread = sf_thread_ref.sf_post_created;
			
			// prevent 'want me to link' question if case is mentioned in a thread, without jarvis being mentioned. Avoid spam, especially if the user says no to the previous prompt
			if(message.event == 'ambient' && typeof message.thread_ts != 'undefined') trackedThread = true;
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
						var syncText = "• Yes: I'll create an internal post with a link to this slack thread. \n\n• Full-sync: any replies here will also be added to the internal thread in your case. \n\nYou can toggle sync at any time. :bowtie:";
								
						// logic to sync with case in service cloud
						if(!trackedThread){						
						    convo.say({
						        attachments:[
						            {
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
		storageLib.setSyncStateForSlackThread(controller, message, true, (err, success, savedRef) => {
	        if (!success) {
				console.log("err: "+ err);
				if(err == 'Error: could not load data'); err = "This thread isn't currently being sync'd with your service cloud case. Type case xxxxx in this thread to set this up.";
					
	            bot.reply(message, 'I couldn\'t enable the service-cloud sync state for this thread. \n\n Error details: ' + err);
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
		storageLib.setSyncStateForSlackThread(controller, message, false, (err, success, savedRef) => {
	        if (!success) {
				if(err == 'Error: could not load data'); err = "This thread isn't currently being sync'd with your service cloud case. Type case xxxxx in this thread to set this up.";
				
	            bot.reply(message, 'I couldn\'t disable the service-cloud sync state for this thread. \n\n Error details: ' + err);
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
		
	    var ids = trigger.callback_id.split(/\-/);
	    var callbackReference = ids[0];
	    var caseNum = ids[1];
		
		if(callbackReference == 'logToCaseQuestion'){
			console.log("callbackIDs: ",callbackReference,caseNum);
			// edit original message, as a response
	        var reply = trigger.original_message;
			
	        for (var a = 0; a < reply.attachments.length; a++) { reply.attachments[a] = null; }			
						
			var attachment = {
				text: "Preparing internal post in case "+caseNum+"... :waiting:"
			}
			if(trigger.text == "no"){
				attachment.text = "Okay, I won't post anything in that case.";
			}

			reply.attachments.push(attachment);
	        bot.replyInteractive(trigger, reply);
			
			//console.log("cleared previous attachments");
						
			handleSyncQuestionResponse(controller, bot, trigger, reply, caseNum, trigger, (err, attachmentBody, privateResponse) => {
				if(!err){
					if(privateResponse) reply.response_type = "ephemeral";
					
			        for (var a = 0; a < reply.attachments.length; a++) { reply.attachments[a] = null; }	

					reply.attachments.push(attachmentBody);
					
			        bot.replyInteractive(trigger, reply);
					
				}else{
					console.log("WARNING: error happened trying to sync this slack thread with case "+caseNum);
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

		controller.extDB.insertPostStat(controller, message, function(err, result){
			console.log("logged message stat: ", err, result);
			
		})
		
		controller.extDB.lookupUser(message, function(){
		
		})
		
		if(typeof message.thread_ts != "undefined"){
			handleReplyToThread(controller, bot, message);
		}else{
			//console.log("####################### ambient message with undefined thread_ts: ", message, message.text);
		}
		return true;
	});
};
