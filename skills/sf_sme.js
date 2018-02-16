module.exports = function(controller) {

	/*
		lookup thread and user from memory.
		if blank, update SME.
		if known, read SME from case
		if not blank, but same as new SME, pretend to have updated it.
		if different SME already set, return warning.

	*/
	controller.hears([controller.utils.regex.setSME, controller.utils.regex.setSMEShort], 'direct_message,direct_mention,mention', function(bot, message) {
		console.log("hears.setSME(): received request to set user as SME");
		
		var url = controller.utils.getURLFromMessage(message);
		var caseNum = controller.utils.extractCaseNum(message.text);
		
		controller.flow.exec(
			function(){
				controller.extDB.lookupUser(bot, message, this.MULTI("userInfo"));
				
				if(!caseNum) controller.extDB.getSFThreadForSlackThread(controller, message, this.MULTI("threadInfo"));
			},function(results){

				var userInfo = results.userInfo,
					threadInfo = results.threadInfo;
				
				// rare chance of this happening, should I bounce info back to the slack request or just silently fail?
				if(userInfo[0]){
					console.log("WARNING: setAsSME trigger failed reading slack user, error: ", userInfo);
					return false;	
				}
								
				if(!caseNum){

					if(threadInfo[0] || !threadInfo[1]){
						console.log("Can't set SME if I don't know what case it's for... let's ask the user for info", threadInfo);
				
						bot.startConversation(message, this.MULTI('startedConvo'));
						this.MULTI("userInfo")(userInfo);
					}else{
						caseNum = threadInfo[2].sf_case;		
								
						controller.sfLib.setCaseSME(caseNum, userInfo[1].sf_user_id, userInfo[1].sf_username, url, false, this.MULTI("setSME"));
						if(false) console.log("hears.setSME(): found case number in stored thread ref: ",caseNum);
					}
				}else 
					controller.sfLib.setCaseSME(caseNum, userInfo[1].sf_user_id, userInfo[1].sf_username, url, false, this.MULTI("setSME"));
				
			},function(result){
				if(typeof result.startedConvo == "object"){
					var count = 0;
					
					// we've started a conversation, now use the conversation to ask the user for info
		            result.startedConvo[1].ask('What case is this for? E.g `123456`',[
		                	{ pattern:  controller.utils.regex.genericIDNumber, callback: this.MULTI("caseInfo") },
							{ 	
								default: true, 
								callback: (reply, convo) => {
									console.log("default callback hit " + count + " times. ",reply);
									if(count == 3) convo.stop();
									count++;
					            } 
							}
			            ]
					);
					
					this.MULTI("userInfo")(result.userInfo);
					
				}else if(typeof result.setSME != "undefined"){	
														
					var err = result.setSME[0];
					if(false) console.log("hears.setSME(): err & result1: ",result.setSME[0], result.setSME[1]);
					
					if(!err){					
			            bot.api.reactions.add({
			                name: '+1',
			                channel: message.channel,
			                timestamp: message.ts
			            });
						
						return false;
					}else{
						//add overwrite button?
			            bot.reply(message, 'I can\'t :'+ controller.utils.getSadEmoji() +': '+ err);
						
						return false;
					}
				}else{
					console.log("WARNING: unknown error happened in either asking for the case or setting the SME: ", result);
				}
			},function(result){
				var reply 		= result.caseInfo[0],
					convo 		= result.caseInfo[1],
					caseNum 	= reply.match[1],
					userInfo 	= result.userInfo;
				
				controller.sfLib.setCaseSME(caseNum, userInfo[1].sf_user_id, userInfo[1].sf_username, url, false, (err, sfResult) =>{					
					if(false) console.log("hears.setSME(): err & result2: ",err, sfResult);
					
					if(!err){
						
						bot.api.chat.update({
							token: bot.config.bot.token,
							channel: message.channel,
							text: "I've set the SME for case "+caseNum+". :bowtie:",
							ts: convo.sent[0].api_response.ts,
						})
					
			            bot.api.reactions.add({
			                name: '+1',
			                channel: message.channel,
			                timestamp: message.ts
			            });
					
		                // since no further messages are queued after this,
		                // the conversation will end naturally with status == 'completed'	
						convo.next();
				
					}else{
						//add overwrite button?
						bot.reply(message, 'I can\'t :'+ controller.utils.getSadEmoji() +': '+ err);
						convo.next();
					}
					
				});				
			}
		)
		
		return false;

	});
	
};
