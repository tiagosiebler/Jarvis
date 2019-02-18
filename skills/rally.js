// scope of where these commands will trigger (anywhere the bot is, right now)
const getListenScope = require('../submodules/SlackHelpers/getListenScope');

const ExpressionList = require('../submodules/Regex/ExpressionList');
const isCaseMentioned = require('../submodules/Regex/isCaseMentioned');

const executeRallyQueryFlow = require('../submodules/ConversationFlows/RallyFlow');

const handleRallyMention = (controller, bot, message, IDprefix) => {
  executeRallyQueryFlow(controller, bot, message, IDprefix);
  // allow other matching handlers to fire
  return true;
};

module.exports = controller => {
  // TODO: combine these, extract the prefix as the first regex match
  controller.hears(
    [ExpressionList.RallyUS],
    getListenScope('everywhere'),
    (bot, message) => handleRallyMention(controller, bot, message, 'US')
  );

  controller.hears(
    [ExpressionList.RallyDE],
    getListenScope('everywhere'),
    (bot, message) => handleRallyMention(controller, bot, message, 'DE')
  );

  controller.hears(
    [ExpressionList.RallyF],
    getListenScope('everywhere'),
    (bot, message) => handleRallyMention(controller, bot, message, 'F')
  );

  controller.hears(
    [ExpressionList.RallyI],
    getListenScope('everywhere'),
    (bot, message) => handleRallyMention(controller, bot, message, 'I')
  );
};
