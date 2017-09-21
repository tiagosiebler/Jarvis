var greetings = [
	"Hello, human identified as ",
	"Hi, ",
	"Howdy, ",
	"G`day, ",
	"Salut, ",
	"Ciao, ",
	"Hola, ",
	"Welcome, ",
	"Greetings, ",
	"Aloha, ",
];

var getResponseForUser = function(user){
	var response = responses[Math.floor(Math.random()*responses.length)];
	return response.replace("USRHERE","<@"+user+">");
}
var responses = [
	"Hello, human identified as USRHERE",
 	"USRHERE Nice to meet you Human.",
 	"Howdy, USRHERE!",
 	"What's crackalakin USRHERE?",
 	"USRHERE Hello Human!",
 	"Hey USRHERE!",
 	"Hey there USRHERE!",
 	"USRHERE G'day human!",
 	"USRHERE Shalom!",
 	"Ciao, USRHERE!",
 	"Salut, USRHERE!",
 	"Hola, USRHERE!",
 	"Aloha, USRHERE!",
 	"USRHERE beep beep",
 	"```*dial-up sound*``` Oh, hey USRHERE!",
];


var regexList = {
	"gr1": /.*hi.*/i,
	"gr2": /.*hey.*/i,
	"gr3": /.*hello.*/i,
	"gr4": /.*howdy.*/i,
	"gr5": /.*hola.*/i,
	"gr6": /.*ciao.*/i,
	"gr7": /.*what\'s up.*/i,
	"gr8": /.*sup.*/i,
}

module.exports = function(controller) {

    controller.on('user_channel_join,user_group_join', function(bot, message) {
		var greeting = greetings[Math.floor(Math.random()*greetings.length)];

        bot.reply(message, greeting + ' <@' + message.user + '> <3');

    });
	
    controller.hears([regexList['gr1'],regexList['gr2'],regexList['gr3'],regexList['gr4'],regexList['gr5'],regexList['gr6'],regexList['gr7'],regexList['gr8']], 'direct_message,direct_mention,mention', function(bot, message) {		
		bot.reply(message, getResponseForUser(message.user));
    });
}
