var sf 		= require('node-salesforce'),
	sfURL 	= process.env.sfURL,
	flow 	= require('flow');

var uname = process.env.sfUser,
	pword = process.env.sfPwd,
	token = process.env.sfToken,
	clientId = process.env.sfClientId,
	clientSecret = process.env.sfClientSecret,
	accessToken = process.env.sfAccessToken;



module.exports = function(controller) {
	function treatAsUTC(date) {
	    var result = new Date(date);
	    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
	    return result;
	}

	function daysBetween(startDate, endDate) {
	    var millisecondsPerDay = 24 * 60 * 60 * 1000;
	    return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
	}

	var sfLib = {},
		loggedIn, sessionStart = false;
	
	// Connection API
	sfLib.conn = new sf.Connection({
		oauth2 : {
			clientId : clientId,
			clientSecret : clientSecret,
			redirectUri : process.env.sfRedirectUri,//'https://login.salesforce.com/services/oauth2/success'
		},
		version: "39.0"//want/need the newer SF APIs
	});
	
	sfLib.conn.on("refresh", function(accessToken, res) {
	  // Refresh event will be fired when renewed access token
	  // to store it in your storage for next request
		console.log("sfLib: refresh hit");
		debugger;
	});
	
	// Establish session
	sfLib.login = (callback) =>{
	// refresh if its been more than 5 days since last refresh
		if(!sessionStart || daysBetween(sessionStart, new Date()) > 5){
			console.log("SfLib: NOTICE - refreshing SF session");
		    //loggedIn = sfLib.conn.oauth2.authenticate(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);
		    loggedIn = loggedIn || sfLib.conn.login(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);
		}else{
			console.log("sf session is fine");
		}

	    //loggedIn = loggedIn || sfLib.conn.login(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);
	    loggedIn = loggedIn || sfLib.conn.oauth2.authenticate(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);
		loggedIn.then(()=> {
			sessionStart = new Date();
			
			return callback(sfLib.conn);
		});
		
	};
	
	// Test session on launch
	sfLib.login((conn)=>{
		console.log("SF Session established, authURL: \n", conn.oauth2.getAuthorizationUrl());
		//debugger;
	});
	
	// API methods
	sfLib.generateError = function(key, message){
		var error = {
			"error": true,
			"errorID": key,
			"errorMSG": message
		}
		return error;
	}
	sfLib.generateAttachmentForCase = function(caseRef){
		var results = {
			"attachments": [{
				"fallback": "Case " + caseRef.CaseNumber,
				"color": "#36a64f",
	            //"pretext": "Case " + caseRef.CaseNumber,
				"title": "TS"+caseRef.CaseNumber+ ": "+caseRef.Subject,
				"title_link": sfURL + "/" + caseRef.Id,
	            "fields": [
	                {
	                    "title": "State",
	                    "value": caseRef.Status,
	                    "short": true
	                },
					{
	                    "title": "Priority",
	                    "value": caseRef.Priority,
	                    "short": true
	                },{
	                    "title": "Version",
	                    "value": caseRef.Version__c,
	                    "short": true
	                },
					{
	                    "title": "HotFix",
	                    "value": caseRef.Service_Pack__c,
	                    "short": true
	                },
					{
	                    "title": "Status Summary",
	                    "value": caseRef.Status_Summary__c,
	                    "short": false
	                },
	            ],
				"callback_id": 'hideButton-0',
				"actions": [
					{
						"name": "hide",
						"text": "Hide this message",
						"value": "hide",
						"type": "button"
					}
				]
			}]
		}
	
		for(i = 0;i < results.attachments[0].fields.length;i++){
			if(results.attachments[0].fields[i].value == null){
				results.attachments[0].fields[i] = null;
			}
		}
	
		return results;
	}

	sfLib.getCase = function(caseNumber, callbackFunction){	
		this.login((conn)=>{
			//console.log("SalesForce Session Established");
	
			conn.sobject("Case")
				.find({ CaseNumber: caseNumber }, 'Id, CaseNumber, Status, Subject, Priority, Description, Status_Summary__c, Version__c, Service_Pack__c')
				.limit(5)
	
				.execute(function(err, records) {

					if (err) { 
						console.error("getCase: SalesForce Error in Query: ",err); 
						callbackFunction(err);
						return err;
					}
				
					callbackFunction(err, records);
			});
		});
	}
	sfLib.getKBArticle = function(articleNumber, callbackFunction){
		this.login((conn)=>{
			console.log("SfLib.getKBArticle(): Have SF session");
		
			var columns = "Id, Title, Summary, ValidationStatus";
			var query = "FIND {"+articleNumber+"} IN NAME FIELDS RETURNING KnowledgeArticleVersion("+columns+" WHERE PublishStatus = 'Online' AND Language = 'en_US')";
		
			conn.search(query,function(err, res) {
					if (err) { 
						console.error("SalesForce Error in Find Query: ",err); 
						callbackFunction(err);
						return; 
					}
	//				console.log("should have TN result: ",res,JSON.stringify(res.searchRecords));
				
					callbackFunction(err, res.searchRecords);
					return;
				}
			);
		});
	};
	sfLib.getKBArticles = function(articlesArray, callbackFunction){
		this.login((conn)=>{
		
			var columns = "Id, Title, Summary, ValidationStatus";
			var articles = "";
			for(i = 0;i < articlesArray.length;i++){
				articles += "KB"+articlesArray[i];
				if((i+1) < articlesArray.length) articles += " OR ";
			}
		
			let query = "FIND {"+articles+"} IN NAME FIELDS RETURNING KnowledgeArticleVersion("+columns+" WHERE PublishStatus = 'Online' AND Language = 'en_US')";
			//console.log("Search query: ",query);
		
			conn.search(query, (err, res) => {
				if (err) { 
					console.error("SalesForce Error in Find Query: ",err); 
					callbackFunction(err);
				}
				callbackFunction(err, res.searchRecords);			
			});
		});
	}

	sfLib.setCaseSME = function(caseNumber, sfUserID, slackUserRef, slackPostURL, shouldOverwrite, callbackFunction){
	
		flow.exec(
			function(){
				if(true) console.log("SfLib.setCaseSME(): Preparing SF Session");
			
				login(this);
			
			},function(conn){		
				if(true) console.log("SfLib.setCaseSME(): Getting case info...");
			
				// get case info, to verify if product specialist has been set yet
				conn.sobject("Case")
					.find({ CaseNumber: ''+caseNumber }, 'Id, CaseNumber, Status, Subject, Priority, Description, Status_Summary__c, Version__c, Service_Pack__c, Product_Support_Specialist__c')
					.limit(1)
					.execute(this.MULTI("caseInfo"));
				
			},function(results){

				var err = results.caseInfo[0];
				if(err != null){
					console.log("setCaseSME: Error reading case: ",err);
					return callbackFunction(err);
				}
			
				var caseInfo = results.caseInfo[1][0];
				if(caseInfo.Product_Support_Specialist__c == null || caseInfo.Product_Support_Specialist__c == sfUserID || shouldOverwrite){
					if(caseInfo.Product_Support_Specialist__c == sfUserID){
						if(true) console.log("SfLib.setCaseSME(): SME already set for this user, no further action needed.");
						console.log("setCaseSME: SME already set to this user. No further action needed.");
						return callbackFunction(null, caseInfo);
					
					}else{
						//overwrite support specialist
						conn.sobject("Case").update({ 
							Id : caseInfo.Id,
							Product_Support_Specialist__c : sfUserID
						}, this);
					}

				}else{
					// ask API to ask user to confirm overwriting, since SME was already set.
					// if they click yes, call this again with shouldOverwrite == true
					return callbackFunction("that case already has an SME assigned.", false, caseInfo);
				}
			},function(err, ret){
				if (err || !ret.success) { 
					console.error(err, ret); 
					return callbackFunction(err, ret);
				}
						
				var msgBody = "<p><b>Jarvis</b>: Case SME assigned via slack request from <b>@"+slackUserRef+"</b>: "+ slackPostURL + "</p>";
			
				//add post to case logging change.
				conn.sobject("FeedItem")
					.create({
						ParentId: ret.id,
						Type: 'TextPost',
						Body: msgBody,
						IsRichText: true,
					    NetworkScope: 'AllNetworks',
					    Visibility: 'InternalUsers'
					},function(err, result) {
						//console.log("Callback on create FeedItem call");
				
						if (err) { 
							console.error("WARNING: SF error in creating new post tracking SME change: ",err,msgBody); 
							//return callbackFunction(err);
						}else if(result.success){
							console.log("SF post created tracking SME change",result);
							//return callbackFunction(err, result);

						}		
				});
			
				callbackFunction(null, ret);
			}
		);
	}
	sfLib.createThreadInCase = function(caseNumber, msgBody, callbackFunction){
		msgBody = msgBody.replace(/<!(.*?)\|@\1>/g, '@$1');

		this.getCase(caseNumber, (err, records) => {

			if(err != null) {
				console.log("SalesForce Error createThreadInCase: ",err);
				callbackFunction(err);
				return err;
			}
		
			//console.log("createThreadInCase: got the case, preparing new post in case...");
		
			var caseRef = records[0];
			// Create feed item
			conn.sobject("FeedItem")
				.create({
					ParentId: caseRef.Id,
					Type: 'TextPost',
					Body: msgBody,
					IsRichText: true,
				    NetworkScope: 'AllNetworks',
				    Visibility: 'InternalUsers'
				},function(err, result) {
					//console.log("Callback on create FeedItem call");
				
					if (err) { 
						console.error("SalesForce Error in creating new post: ",err,msgBody); 
						callbackFunction(err);
					
						return err;
					}
					if(result.success){
						console.log("Post created, triggering callback. Post: ",result);
						callbackFunction(err, result);

						return;
					}		
			});
		});
	};

	// mostly internal function, hence the conn parameter to re-use an existing session. Need to design this module better.
	sfLib.getContact = function(conn, email, callbackFunction){
		return conn.sobject("Contact")
			.find({ Email: email }, 'Id, Name, Email')
			.limit(1)

			.execute(function(err, records) {
				if (err) { 
					console.error("getContact: SalesForce Error in Query: ",err); 
					callbackFunction(err);
					return err;
				}
				callbackFunction(err, records);
				return;
		});
	}
	sfLib.createTaskInCase = function(caseNumber, assignToEmail, ownerUserId, 
		description, subject, taskType, taskPriority, taskStatus, time, 
		callbackFunction, progressFunction){
	
		if(progressFunction) progressFunction("Checking assignee...");
		if(progressFunction) progressFunction("Checking case " + caseNumber + "...");
	
		return this.getCase(caseNumber, (err, records) => {
			if(err != null) {
				console.log("SalesForce Error Fetching Case: ",err);
				callbackFunction(err);
				return err;
			}
		
			var caseRef = records[0];
			var today = new Date();
				today.setDate(today.getDate() + 3); // set 3 days from now, for the moment
			

			if(progressFunction) progressFunction("Loaded case " + caseNumber + ", preparing contact for task...");
		
			return this.getContact(conn, assignToEmail, (err, results)=>{
				if(err) return callback(err, results);
			
				if(progressFunction) progressFunction("Loaded contact for task, ready for new task in case " + caseNumber + "...");
				var contactId = results[0].Id;
			
				var taskObject = {
					Priority: taskPriority,
					Status: taskStatus,
					Subject: subject,//limited to 255 characters
					WhoId: contactId,
					WhatId: caseRef.Id,
					Type: taskType,
					Description: description,
					OwnerId: ownerUserId,
					ActivityDate: today.toISOString().substring(0, 10)
				};
				if(time && time != "none") taskObject.Time_hp__c = time;
			
				conn.sobject("Task")
					.create(taskObject, function(err, result) {
						if (err) { 
							console.error("WARNING: createTaskInCase() SalesForce Error in logging new task ",err); 
							return callbackFunction(err, result);
						}
									
						if(result.success){
							//if(progressFunction) progressFunction("Task successfully logged, preparing URL...");
							console.log("Task logged with ID: " + result.id);
						}
						callbackFunction(err, result);
				});//*/
			});
		
		
		});
	}
	//https://help.salesforce.com/articleView?id=fields_using_html_editor.htm&type=0
	sfLib.addCommentToPost = function(sf_post_id, msgBody, callbackFunction){
		msgBody = msgBody.replace(/<!(.*?)\|@\1>/g, '@$1');
	
		return this.login((conn)=>{
		
			// Create feed comment on existing post
			//*
			conn.sobject("FeedComment")
				.create({
					FeedItemId: sf_post_id,
					CommentType: 'TextComment',
					CommentBody: msgBody,
					IsRichText: true,
				},function(err, result) {
					if (err) { 
						console.error("SalesForce Error in adding new comment to post: ",err); 
						callbackFunction(err);
						return err;
					}
					if(result.success){
						//console.log("Comment added to existing post: ",result);
						//Post created:  { id: '0D544000057u88jCAA', success: true, errors: [] }

					}
					callbackFunction(err, result);
			});//*/
		});
	
	

	};

	sfLib.readPost = function(caseNumber, postID, callbackFunction){
		return this.getCase(caseNumber, (err, records) => {
			if(err != null) {
				console.log("SalesForce Error Fetching Case: ",err);
				callbackFunction(err);
				return err;
			}
		
			var caseRef = records[0];
				
			conn.sobject("FeedItem")
				.find({ Id: postID }, '*')
				.limit(5)

				.execute(function(err, records) {
					if (err) { 
						console.error("readPost: SalesForce Error in Query: ",err); 
						callbackFunction(err);
						return err;
					}
					console.log(records);
					return;
			
					callbackFunction(err, records);
			});
		});
	};
	sfLib.readCommentOnPost = function(caseNumber, postID, commentID, callbackFunction){
		return this.getCase(caseNumber, (err, records) => {
			if(err != null) {
				console.log("SalesForce Error Fetching Case: ",err);
				callbackFunction(err);
				return err;
			}
		
			var caseRef = records[0];
				
			conn.sobject("FeedItem")
				.find({ Id: postID }, '*')
				.limit(5)

				.execute(function(err, records) {
					if (err) { 
						console.error("readCommentOnPost: SalesForce Error in Query: ",err); 
						callbackFunction(err);
						return err;
					}
					console.log(records);
					return;
			
					callbackFunction(err, records);
			});
		});
	};

	/*

		User stuff

	*/
	sfLib.getUser = function(uName, callbackFunction){
		this.login((conn)=>{
	
			conn.sobject("User")
			.find({ CommunityNickname: uName }, 'Id, User_ID_18_digit__c')//'*')//User_ID_18_digit__c, Support_Team__c, Business_Unit__c
				.limit(1)
	
				.execute(function(err, records) {

					if (err) { 
						console.error("getUser: SalesForce Error in Query: ",err); 
						callbackFunction(err);
						return err;
					}
					callbackFunction(err, records);
			});
		});
	}
	sfLib.getUserWithEmail = function(uEmail, callbackFunction){
		this.login((conn)=>{	
			conn.sobject("User")
				.find({ Email: uEmail }, 'Id, User_ID_18_digit__c')//'*')//User_ID_18_digit__c, Support_Team__c, Business_Unit__c
				.limit(1)
	
				.execute(function(err, records) {

					if (err) { 
						console.error("getUserWithEmail: SalesForce Error in Query: ",err); 
						callbackFunction(err);
						return err;
					}
					callbackFunction(err, records);
			});
		});
	}
	

	// return to parent
	controller.sfLib = sfLib;
	
	return sfLib;
	
}
