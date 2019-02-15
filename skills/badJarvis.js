const emojis = [
  'sleepy',
  'unamused',
  'weary',
  'anguished',
  'no_mouth',
  'persevere',
  'triumph',
  'sleeping',
  'disappointed',
  'confounded',
  'sob',
  'tired_face',
  'broken_heart',
  'frowning',
  'disappointed_relieved',
  'fearful',
  'speak_no_evil',
  'see_no_evil'
];

// simple function to generate the text of the mistake list so that
// it can be used in various places
const generateTaskList = team => {
  let text = '';

  for (let t = 0; t < team.mistakes.length; t++) {
    text = text + '> `' + (t + 1) + '`) ' + team.mistakes[t] + '\n';
  }

  return text;
};

module.exports = controller => {
  // listen for someone saying 'mistakes' to the bot
  // reply with a list of current mistakes loaded from the storage system
  // based on this team's id
  controller.hears(
    ['mistakes', 'errors'],
    'direct_message,direct_mention,mention',
    (bot, message) => {
      // load team from storage...
      controller.storage.teams.get(message.team, (err, team) => {
        // team object can contain arbitary keys. we will store mistakes in .mistakes
        if (!team || !team.mistakes || team.mistakes.length == 0) {
          return bot.reply(
            message,
            'There are no known mistakes on your list.'
          );
        }

        const listedMistakes = generateTaskList(team);
        const text = `Here are my current mistkaes: \n${listedMistakes}Reply with \`fixed x\` to mark a mistake as resolved`;

        bot.startConversationInThread(message, (err, convo) => {
          if (err) {
            return console.error(
              `Start conversation failed due to error ${err}`
            );
          }
          convo.say(text);
          convo.activate();
        });
      });
    }
  );

  // listen for a team saying "@jarvis bad jarvis <something>", and then add it to the team's mistake list
  controller.hears([/.*bad jarvis(.*)/im], 'direct_mention,mention', (bot, message) => {
    console.log('add mistakes: ', message.match);

    const url =
      process.env.slackDomain +
      '/archives/' +
      message.channel +
      '/p' +
      message.thread_ts.replace('.', '');
    const newmistake = 'Thread ' + url + ' reason: ' + message.match[1];

    controller.storage.teams.get(message.team, (err, team) => {
      if (!team) {
        team = {};
        team.id = message.team;
      }
      if (!team.mistakes) {
        team.mistakes = [];
      }
      team.mistakes.push(newmistake);

      controller.storage.teams.save(team, (err, saved) => {
        if (err) {
          return bot.reply(
            message,
            'I experienced an error registering this mistake: ' + err
          );
        }

        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        bot.api.reactions.add({
          name: randomEmoji,
          channel: message.channel,
          timestamp: message.ts
        });
      });
    });
  });

  // listen for a team saying "fixed <number>" and mark that item as fixed.
  controller.hears(
    ['fixed (.*)'],
    'direct_message,direct_mention,mention',
    (bot, message) => {
      let number = message.match[1];

      if (isNaN(number)) {
        return bot.reply(message, 'Please specify a number.');
      }

      // adjust for 0-based array index
      number = parseInt(number) - 1;

      controller.storage.teams.get(message.team, function(err, team) {
        if (!team) {
          team = {};
          team.id = message.team;
          team.mistakes = [];
        }

        if (number < 0 || number >= team.mistakes.length) {
          return bot.reply(
            message,
            'Sorry, your input is out of range. Right now there are ' +
              team.mistakes.length +
              ' items on your list.'
          );
        }

        const item = team.mistakes.splice(number, 1);

        controller.storage.teams.save(team, (err, saved) => {
          if (err) {
            return bot.reply(
              message,
              'I experienced an error removing that mistake: ' + err
            );
          }

          bot.api.reactions.add({
            name: 'thumbsup',
            channel: message.channel,
            timestamp: message.ts
          });

          // reply with a strikethrough message...
          bot.reply(message, '~' + item + '~');

          if (team.mistakes.length > 0) {
            return bot.reply(
              message,
              'Here are my remaining mistakes:\n' + generateTaskList(team)
            );
          }

          return bot.reply(message, "Yay I'm perfect again! Nap time!");
        });
      });
    }
  );
};
