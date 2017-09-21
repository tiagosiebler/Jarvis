var ExtDB = function () {};

const mysql = require('mysql');
const flow = require('flow');

var pool  = mysql.createPool({
	connectionLimit : 10,
	host            : process.env.mysqlServer,
	user            : process.env.mysqlUser,
	password        : process.env.mysqlPwd,
	database        : process.env.mysqlDB
});

const statsTable = process.env.mysqlTableStatsPosts;

// move this to generateUtils
var generateError = function(key, message){
	var error = {
		"error": true,
		"errorID": key,
		"errorMSG": message
	}
	return error;
}

var generateInsertPost = function(messageTS, threadTS, messageText, postURL, slackUserID, slackChannelID, caseNumber){
	var insertPost = {};
	if(!messageTS) return null;
	var messageDt = new Date(messageTS * 1000);
	
	insertPost.messageTS 	= messageTS;
	insertPost.messageDt 	= messageDt;
	insertPost.postType 	= "post";
	
	if(threadTS){
		insertPost.threadTS 	= threadTS;
		insertPost.postType 	= "reply";
	}
	
	if(messageText) insertPost.messageText 	= messageText;
	if(postURL) 	insertPost.postURL 		= postURL;
	if(slackUserID) insertPost.slackUserID 	= slackUserID;
	if(slackChannelID) insertPost.slackChannelID = slackChannelID;
	if(caseNumber) insertPost.caseNumber 	= caseNumber;
	
	return insertPost;
}
var extractCase = function(message){
	/*
		- check if message is a thread.
		- if not, check if there's a case number in message text
		- if it is, check if the thread is known / remembered
		- if it is, get the case number from the known thread in memory, and return it.
	*/
}

// inserts row into DB when a post is seen
ExtDB.prototype.insertPostStat = function(controller, message, callback){	
	var postContent = generateInsertPost(
		message.ts,
		message.thread_ts,
		message.text,
		process.env.slackDomain + '/archives/'+message.channel+"/p" + message.event_ts.replace(".",""),
		message.user,
		message.channel
		//threadOwner?
	);

	var insertSQL = "INSERT INTO " + statsTable + " SET ?";
	pool.query(insertSQL, postContent, (error, results, fields) => {
		//if(error) throw error;
	
	    console.log('SQL RESULT: ', results);
		callback(error, results);
	});

/*
	let postContent = {
		messageTimestamp: message.ts,
		messageDt: postDate,
		messageDtStr: dtStr,
		slackUserID: message.user,
		slackChannelID: message.channel,
		messageText: message.text,

		thread_ts: null,
		postType: "channelMessage",
		postURL: process.env.slackDomain + '/archives/'+message.channel+"/p" + message.event_ts.replace(".","") 
	};//*/

};
ExtDB.prototype.lookupUser = function(message, callback){
/*
	dbLookupUsers.findOne({id: message.user}).then((doc) => {
		//debugger;
	}).catch((err, doc) => {
		//debugger;
	})//*/
	
	//debugger;
}

module.exports = new ExtDB();