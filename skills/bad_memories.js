var listenScope = 'direct_mention,mention';
var mistakeStorageKey = 'mistakes';

var emojis = [
	"sleepy",
	"unamused",
	"weary",
	"anguished",
	"no_mouth",
	"persevere",
	"triumph",
	"sleeping",
	"disappointed",
	"confounded",
	"sob",
	"tired_face",
	"broken_heart",
	"frowning",
	"disappointed_relieved",
	"fearful",
	"speak_no_evil",
	"see_no_evil",
];


module.exports = function(controller) {

    // listen for someone saying 'mistakes' to the bot
    // reply with a list of current mistakes loaded from the storage system
    // based on this team's id
	//*
    controller.hears(['mistakes','errors'], 'direct_message,direct_mention,mention', function(bot, message) {

        // load team from storage...
        controller.storage.teams.get(message.team, function(err, team) {

            // team object can contain arbitary keys. we will store mistakes in .mistakes
            if (!team || !team.mistakes || team.mistakes.length == 0) {
                bot.reply(message, 'There are no known mistakes on your list.');
            } else {
				
                var text = 'Here are my current mistakes: \n' +
                    generateTaskList(team) +
                    'Reply with `fixed _number_` to mark a mistake as resolved.';
				
					bot.startConversationInThread(message, function(err, convo) {
						if (!err) {
							convo.say(text);
							convo.activate();
						}
					});
				

            }

        });

    });//*/

    // listen for a team saying "@jarvis bad jarvis <something>", and then add it to the team's mistake list
    controller.hears([/.*bad jarvis(.*)/im],listenScope, function(bot, message) {

		console.log("add mistakes: ",message.match);
		
		var url = process.env.slackDomain + "/archives/"+message.channel+"/p" + message.thread_ts.replace(".","");
        var newmistake = "Thread "+url+" reason: "+message.match[1];		
		
        controller.storage.teams.get(message.team, function(err, team) {

            if (!team) {
                team = {};
                team.id = message.team;
            }
			if (!team.mistakes){
                team.mistakes = [];
			}
            team.mistakes.push(newmistake);

            controller.storage.teams.save(team, function(err,saved) {

                if (err) {
                    bot.reply(message, 'I experienced an error registering this mistake: ' + err);
                } else {
					var emoji = emojis[Math.floor(Math.random()*emojis.length)];
                    bot.api.reactions.add({
                        name: emoji,
                        channel: message.channel,
                        timestamp: message.ts
                    });
                }

            });
        });

    });

    // listen for a team saying "fixed <number>" and mark that item as fixed.
    controller.hears(['fixed (.*)'],'direct_message,direct_mention,mention', function(bot, message) {

        var number = message.match[1];

        if (isNaN(number)) {
            bot.reply(message, 'Please specify a number.');
        } else {

            // adjust for 0-based array index
            number = parseInt(number) - 1;

            controller.storage.teams.get(message.team, function(err, team) {

                if (!team) {
                    team = {};
                    team.id = message.team;
                    team.mistakes = [];
                }

                if (number < 0 || number >= team.mistakes.length) {
                    bot.reply(message, 'Sorry, your input is out of range. Right now there are ' + team.mistakes.length + ' items on your list.');
                } else {

                    var item = team.mistakes.splice(number,1);
					
		            controller.storage.teams.save(team, function(err,saved) {

		                if (err) {
		                    bot.reply(message, 'I experienced an error removing that mistake: ' + err);
		                } else {
		                    bot.api.reactions.add({
		                        name: 'thumbsup',
		                        channel: message.channel,
		                        timestamp: message.ts
		                    });
							
		                    // reply with a strikethrough message...
		                    bot.reply(message, '~' + item + '~');

		                    if (team.mistakes.length > 0) {
		                        bot.reply(message, 'Here are my remaining mistakes:\n' + generateTaskList(team));
		                    } else {
		                        bot.reply(message, 'Yay I\'m perfect again! Time for a nap...');
		                    }
		                }

		            });
                }
            });
        }

    });

    // simple function to generate the text of the mistake list so that
    // it can be used in various places
    function generateTaskList(team) {

        var text = '';

        for (var t = 0; t < team.mistakes.length; t++) {
            text = text + '> `' +  (t + 1) + '`) ' +  team.mistakes[t] + '\n';
        }

        return text;

    }
}
