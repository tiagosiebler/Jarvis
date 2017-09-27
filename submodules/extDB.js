var ExtDB = function () {};

const mysql = require('mysql'),
	flow 	= require('flow');

var pool  = mysql.createPool({
	connectionLimit : 10,
	host            : process.env.mysqlServer,
	user            : process.env.mysqlUser,
	password        : process.env.mysqlPwd,
	database        : process.env.mysqlDB
});

const statsTable 	= process.env.mysqlTableStatsPosts;


var monthDiff = function(d1, d2) {
    var months;
    months = (d2.getFullYear() - d1.getFullYear()) * 12;
    months -= d1.getMonth() + 1;
    months += d2.getMonth();
    return months <= 0 ? 0 : months;
}
var extractCase = function(message){
	/*
		- check if message is a thread.
		- if not, check if there's a case number in message text
		- if it is, check if the thread is known / remembered
		- if it is, get the case number from the known thread in memory, and return it.
	*/
}

var generateInsertPost = function(messageTS, threadTS, messageText, postURL, slackUserID, slackChannelID, caseNumber){
	var insertPost = {};
	
	if(!messageTS) return null;
	var message_dt = new Date(messageTS * 1000);
	
	insertPost.message_ts 	= messageTS;
	insertPost.message_dt 	= message_dt;
	insertPost.post_type 	= "post";
	
	if(threadTS){
		insertPost.thread_ts 	= threadTS;
		insertPost.post_type 	= "reply";
	}
	
	if(messageText) insertPost.message_text 	= messageText;
	if(postURL) 	insertPost.post_url 		= postURL;
	if(slackUserID) insertPost.slack_user_id 	= slackUserID;
	if(slackChannelID) insertPost.slack_channel_id = slackChannelID;
	if(caseNumber) insertPost.case_number 	= caseNumber;
	
	return insertPost;
}

// inserts row into DB when a post is seen
ExtDB.prototype.insertPostStat = function(controller, message, callback){	
	
	var URLts = "";
	if(typeof message.event_ts != "undefined") URLts = message.event_ts;
	else if(typeof message.action_ts != "undefined"){
		console.log("Ignoring action event, probably a button from jarvis was clicked");
		return;
	}
	else{
		console.log("WARNING ExtDB.insertPostStat(): message.event_ts undefined? May cause issues");
	}

	var postContent = generateInsertPost(
		message.ts,
		message.thread_ts,
		message.text,
		process.env.slackDomain + '/archives/'+message.channel+"/p" + message.event_ts.replace(".",""),
		message.user,
		message.channel
		//threadOwner? nah, don't need this. Get thread owner by matching against threadTS in threadTrack Table
	);

	var insertSQL = "INSERT INTO " + statsTable + " SET ?";
	pool.query(insertSQL, postContent, (error, results, fields) => {
		//if(error) throw error;
	
	    //console.log('SQL RESULT: ', results);
		callback(error, results);
	});
};

var ERR_NOT_FOUND = 0,
		ERR_QUERY = 1,
		ERR_OTHER = 2;

/*
	- if a user's not known yet, ±4 secs to lookup user in slack and salesforce APIs.
	- if a user's known and no refresh is needed, ±0.01 secs to lookup user in JarvisDB.
*/
ExtDB.prototype.lookupUser = function(bot, message, callback){	
	flow.exec(
		function(){
			// query if user is already in lookup table
			var lookupSQL = "SELECT * FROM ?? WHERE slack_user_id = ?";
			pool.query(lookupSQL, [process.env.mysqlTableUsersLU, message.user], this.MULTI("lookup_user"));

			// pass important params to next step
			this.MULTI("params")(bot, message, callback, pool, monthDiff);
			
		},function(results){
			// determine if this means the user is known, and use the current info to query the slack API for info.
			var bot = results.params[0],
				message = results.params[1],
				callback = results.params[2],
				pool = results.params[3],
				monthDiff = results.params[4];
								
			if(results.lookup_user[0]){
				// error in SQL query
				var err = {
					msg: "Error in SQL Query",
					desc: results.lookup_user[0]
				};
				
				console.log("WARNING: ExtDB.lookupUser error in SQL query: ",results.lookup_user[0]);
				callback(err, null);
				return;
				
			}else{
				var results = results.lookup_user[1];
				var isKnownUser =	 false,
					shouldRefresh = false;

				if(results.length == 0){
					//console.log("Slack user not known in user LU table");
					
				}else{
					//console.log("Slack user already known in LU table");
					isKnownUser = true;
					
					var dt_last_resolved = results[0].dt_last_resolved;
					var monthsDiff = monthDiff(new Date(dt_last_resolved), new Date());
					
					if(monthsDiff > process.env.maxLURowAge)
						shouldRefresh = true;
					
					if(results[0].sf_user_id == null) shouldRefresh = true;
					else if(results[0].sf_user_id.length < 6) shouldRefresh = true;
				}
				
				if(shouldRefresh || !isKnownUser)
				    bot.api.users.info({user: message.user}, this.MULTI("userInfo"));
			
				// pass the same info to the next sync function				
				this.MULTI("params")(bot, message, callback, pool, isKnownUser, shouldRefresh, results);
			}	
					
		},function(results){
			var bot = results.params[0],
				message = results.params[1],
				callback = results.params[2],
				pool = results.params[3],
				isKnownUser = results.params[4],
				shouldRefresh = results.params[5],
			
				userInfoLU = results.params[6],
				userInfo = results.userInfo;
				
			var SQLpost, SQLstatement, 
				runSQL = false,
				emailChanged = false,
				querySF = false;
			
			if(!isKnownUser){
				SQLpost  = {
					slack_user_id: 		userInfo[1].user.id,
					slack_username: 	userInfo[1].user.profile.display_name,
					slack_usertitle: 	userInfo[1].user.profile.title,
					slack_useremail: 	userInfo[1].user.profile.email,
					slack_team_id: 		userInfo[1].user.profile.team,
					first_name: 		userInfo[1].user.profile.first_name,
					last_name: 			userInfo[1].user.profile.last_name,
					real_name: 			userInfo[1].user.profile.real_name,
					dt_last_resolved: 	new Date(),
					sf_username: 		userInfo[1].user.profile.email.split("@")[0],
				};
				
				SQLstatement = "INSERT INTO ?? SET ?";
				runSQL = true;
				querySF = true;
				//pool.query(SQLstatement, [process.env.mysqlTableUsersLU, SQLpost], this.MULTI("userLU_insert"));
				
			}else{
				if(userInfoLU[0].sf_user_id == null) shouldRefresh = true;
				
				if(shouldRefresh){
					//console.log("preparing update info, since user is known but in need of refresh");

					SQLstatement = "UPDATE ?? SET ?";
					runSQL = true;
					querySF = true;
					
					SQLpost = userInfoLU[0];
					SQLpost.slack_username  = userInfo[1].user.profile.display_name;
					SQLpost.slack_usertitle  = userInfo[1].user.profile.title;
					SQLpost.slack_useremail  = userInfo[1].user.profile.email;
					SQLpost.dt_last_resolved = new Date();
					SQLpost.sf_username 	 = userInfo[1].user.profile.email.split("@")[0];					
				}else{
					// don't need more queries, just call callback and kill the rest of the logic. Save time.
					callback(null, userInfoLU[0]);
					return;
				}
			}
			
			if(querySF){
				// query SF lib to get sfuserID, since we'll need that info later
				let sfLib = require('../submodules/sfLib.js');
				sfLib.getUser(SQLpost.sf_username, this.MULTI("sfUserInfo"));
			}
			
			this.MULTI("params")(callback, pool, SQLpost, SQLstatement, runSQL, userInfoLU);
			
		},function(results){
			
			var callback = results.params[0],
				pool = results.params[1],
				SQLpost = results.params[2],
				SQLstatement = results.params[3],
				runSQL = results.params[4],
				userInfoLU = results.params[5],
				sfQueryResult = results.sfUserInfo;
							
			//SQLpost.sf_user_id = "userIDhere";
			
			if(runSQL){
				if(sfQueryResult[0]){
					console.log("WARNING: ExtDB.lookupUser error in SF query: ", sfQueryResult[0]);
					
					var err = {
						msg: "Error in SF Query",
						desc: rsfQueryResult[0]
					};
				
					callback(err, null);
					return;
				}else{
					// we have SF info at this stage.
					// add it to the post body:
					SQLpost.sf_user_id = sfQueryResult[1][0].Id;
				}
				
				// one last check on SQL statement + the post body, then execute the update/insert on the LU table:
				// WARNING this has no error handling yet, in case the SQL query fails. #TODO
				pool.query(SQLstatement, [process.env.mysqlTableUsersLU, SQLpost], this.MULTI("userLU_SQL"));
			}

			//userLU_insert check it was a success
			// return lookup info to parent callback. callback.originalCallback();
			this.MULTI("params")(callback, SQLpost, userInfoLU, sfQueryResult);

		},function(results){
			var callback = results.params[0],
				SQLpost = results.params[1],
				userInfoLU = results.params[2],
				sfQueryResult = results.params[3];
				
			var userInfo = {};
			
			if(typeof results.userLU_SQL == "undefined"){
				// didn't lookup user in SF, so probably already have user info
				userInfo = userInfoLU[0];
				
			}else{
				// did a user lookup, lets see what info we have now
				userInfo = SQLpost;
			}
			
			callback(null, userInfo)
		}
	);
}

/*
	- if channel's not known yet, ±0.5 seconds to lookup channel in slack APIs and save to JarvisDB for later.
	- if channel's known and refresh is needed, ±0.5 seconds to lookup, update and return
	- if channel's known and no refresh needed, ±0.02 seconds to lookup channel: most scearios covered by this
*/
ExtDB.prototype.lookupChannel = function(bot, message, callback){
	flow.exec(
		function(){
			// query if channel is already in lookup table
			var lookupSQL = "SELECT * FROM ?? WHERE slack_channel_id = ?";
			pool.query(lookupSQL, [process.env.mysqlTableChannelsLU, message.channel], this.MULTI("lookup_channel"));

			// pass important params to next step
			this.MULTI("params")(bot, message, callback, pool, monthDiff);
			
		},function(results){
			// determine if this means the channel is known, and use the current info to query the slack API for info.
			var bot = results.params[0],
				message = results.params[1],
				callback = results.params[2],
				pool = results.params[3],
				monthDiff = results.params[4];
								
			if(results.lookup_channel[0]){
				// error in SQL query
				var err = {
					msg: "Error in SQL Query",
					desc: results.lookup_channel[0]
				};
				
				console.log("WARNING: ExtDB.lookupChannel error in SQL query: ",results.lookup_channel[0]);
				callback(err, null);
				return;
				
			}else{
				var results = results.lookup_channel[1];
				var isKnownChannel =	 false,
					shouldRefresh = false;

				if(results.length == 0){
					//console.log("Slack channel not known in channel LU table");
					
				}else{
					//console.log("Slack channel already known in LU table");
					isKnownChannel = true;
					
					var dt_last_resolved = results[0].dt_last_resolved;
					var monthsDiff = monthDiff(new Date(dt_last_resolved), new Date());
					
					if(monthsDiff > process.env.maxLURowAge) shouldRefresh = true;
				}
				
				if(shouldRefresh || !isKnownChannel){
					if(message.channel.charAt(0) == 'C'){
						// public channel
					    bot.api.channels.info({channel: message.channel}, this.MULTI("channelInfo"));
					}else{
					    bot.api.groups.info({channel: message.channel}, this.MULTI("channelInfo"));
					}
				}
			
				// pass the same info to the next sync function				
				this.MULTI("params")(bot, message, callback, pool, isKnownChannel, shouldRefresh, results);
			}	
					
		},function(results){
			var bot = results.params[0],
				message = results.params[1],
				callback = results.params[2],
				pool = results.params[3],
				isKnownChannel = results.params[4],
				shouldRefresh = results.params[5],
			
				channelInfoLU = results.params[6],
				channelInfo = results.channelInfo;
				
			var SQLpost, SQLstatement, 
				runSQL = false;
							
			if(!isKnownChannel){

				// need to differentiate between private channel (API term is group) and public channel
				if(typeof channelInfo[1].channel == "undefined"){
					SQLpost  = {
						slack_channel_id: 			channelInfo[1].group.id,
						slack_channel_name:			channelInfo[1].group.name,
						slack_channel_visibility: 	"Private",
						dt_last_resolved: 			new Date(),
					};
				}else{
					SQLpost  = {
						slack_channel_id: 			channelInfo[1].channel.id,
						slack_channel_name:			channelInfo[1].channel.name,
						slack_channel_visibility: 	channelInfo[1].channel.is_private ? "Private" : "Public",
						dt_last_resolved: 			new Date(),
					};
				}

				
				SQLstatement = "INSERT INTO ?? SET ?";
				runSQL = true;
				//pool.query(SQLstatement, [process.env.mysqlTableChannelsLU, SQLpost], this.MULTI("channelLU_insert"));
				
			}else{				
				if(shouldRefresh){
					//console.log("preparing update info, since channel is known but in need of refresh");

					SQLstatement = "UPDATE ?? SET ?";
					runSQL = true;
					
					SQLpost = channelInfoLU[0];
					SQLpost.slack_channel_name  		= channelInfo[1].channel.name;
					SQLpost.slack_channel_visibility  	= channelInfo[1].channel.is_private ? "Private" : "Public";
					SQLpost.dt_last_resolved 			= new Date();

				}else{
					// don't need more queries, just call callback and kill the rest of the logic. Save time.
					callback(null, channelInfoLU[0]);
					return;
				}
			}
			
			// can already run SQL at this stage, no need for SF stuff.
			if(runSQL) pool.query(SQLstatement, [process.env.mysqlTableChannelsLU, SQLpost], this.MULTI("channelLU_SQL"));
			
			this.MULTI("params")(callback, SQLpost, channelInfoLU);
			
		},function(results){
			var callback = results.params[0],
				SQLpost = results.params[1],
				channelInfoLU = results.params[2];
				
			var channelInfo = {};
			
			if(typeof results.channelLU_SQL == "undefined"){
				// didn't lookup channel from slack APIs, probably already have the needed info
				channelInfo = channelInfoLU[0];
				
			}else{
				// did a channel lookup, lets see what info we have now
				channelInfo = SQLpost;
				
			}
			
			callback(null, channelInfo)
		}
	);
};

// combines the above two functions and doesn't run the callback until both results are present
ExtDB.prototype.lookupUserAndChannel = function(controller, bot, message, callback){	
	flow.exec(
		function(){
			controller.extDB.lookupUser(bot, message, this.MULTI("LU_User"));
			controller.extDB.lookupChannel(bot, message, this.MULTI("LU_Channel"));
		},function(results){
			var user = results.LU_User;
			if(user[0]) {
				callback(user[0], null, null);
				return;
			}
			
			var channel = results.LU_Channel;
			if(channel[0]) {
				// technically there's a chance one might return but not the other, not that it adds value...
				callback(channel[0], user[1], null);
				return;
			}
			
			callback(null, user[1], channel[1]);
			return;
		}
	);
};

module.exports = new ExtDB();