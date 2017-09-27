var SfLib = function () {};

var sf = require('node-salesforce'),
	sfURL = process.env.sfURL,
	conn;
		
var login = function(callback){
	var uname = process.env.sfUser,
		pword = process.env.sfPwd,
		token = process.env.sfToken,
		clientId = process.env.sfClientId,
		clientSecret = process.env.sfClientSecret,
		accessToken = process.env.sfAccessToken;
				
	if(typeof conn != "object"){
		/*
		conn = new sf.Connection({
		  // you can change loginUrl to connect to sandbox or prerelease env. 
			loginUrl :  sfURL
		});
		//*/
		
		conn = new sf.Connection({
		  oauth2 : {
		    clientId : clientId,
		    clientSecret : clientSecret,
		    redirectUri : 'https://efe5a7a5.ngrok.io/oauth'
		  },
		  version: "39.0"//want/need the newer SF APIs
		});
	}
	
	conn.login(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token, function(err, userInfo) {
		if (err) { 
			return callback(err, userInfo, conn); 
		}
		// Now you can get the access token and instance URL information. 
		// Save them to establish connection next time. 
		//console.log("AccessToken: ", conn.accessToken);
		//console.log("InstanceURL: ", conn.instanceUrl);
	
		// logged in user property 
		///console.log("User ID: " + userInfo.id);
		//console.log("Org ID: " + userInfo.organizationId);
		// ... 
		
		return callback(err, userInfo, conn);
	});
}

SfLib.prototype.generateError = function(key, message){
	var error = {
		"error": true,
		"errorID": key,
		"errorMSG": message
	}
	return error;
}
SfLib.prototype.generateAttachmentForCase = function(caseRef){
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
SfLib.prototype.generateAttachmentForKBArticle = function(articleNum, articleRef){
	var results = {
		"attachments": [{
			"fallback": "KBase Article "+articleNum,
			"color": "#36a64f",
			"title": articleRef.Title,
			"title_link": "https://community.microstrategy.com/s/article/" + articleRef.Id,
            //"text": articleRef.Summary,
            //"footer": "Community API",
            //"footer_icon": "https://community.microstrategy.com/s/favicon.ico",
		}]
	}
	
	return results;
}

SfLib.prototype.getCase = function(caseNumber, callbackFunction){
	login(function(err, userInfo, conn){
		if(err != null) {
			console.log("getCase: SalesForce Error Creating Session: ",err);
			callbackFunction(err);
			return err;
		}
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
SfLib.prototype.createThreadInCase = function(caseNumber, msgBody, callbackFunction){
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
//https://help.salesforce.com/articleView?id=fields_using_html_editor.htm&type=0
SfLib.prototype.addCommentToPost = function(sf_post_id, msgBody, callbackFunction){
	msgBody = msgBody.replace(/<!(.*?)\|@\1>/g, '@$1');
	
	return login(function(err, userInfo, conn){
		if(err != null) {
			console.log("SalesForce Error Creating Session: ",err);
			callbackFunction(err);
			return err;
		}
		//console.log("SalesForce Session Established");
			
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

SfLib.prototype.readPost = function(caseNumber, postID, callbackFunction){
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
SfLib.prototype.readCommentOnPost = function(caseNumber, postID, commentID, callbackFunction){
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


SfLib.prototype.getKBArticle = function(articleNumber, callbackFunction){
	login(function(err, userInfo, conn){
		if(err != null) {
			console.log("SalesForce Error Creating Session: ",err);
			callbackFunction(err);
			return err;
			
		}
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


/*

	User stuff

*/
SfLib.prototype.getUser = function(uName, callbackFunction){
	login(function(err, userInfo, conn){
		if(err != null) {
			console.log("getUser: SalesForce Error Creating Session: ",err);
			callbackFunction(err);
			return err;
		}
		//console.log("SalesForce Session Established");
	
	
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

module.exports = new SfLib();