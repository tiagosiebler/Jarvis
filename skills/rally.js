// scope of where these commands will trigger (anywhere the bot is, right now)
const getListenScope = require('../submodules/SlackHelpers/getListenScope');

const ExpressionList = require('../submodules/Regex/ExpressionList');
const isCaseMentioned = require('../submodules/Regex/isCaseMentioned');

const executeRallyQueryFlow = require('../submodules/ConversationFlows/RallyFlow');

module.exports = controller => {
  controller.hears(
    [ExpressionList.RallyUS],
    getListenScope('everywhere'),
    (bot, message) => {
      console.log('Caught userstory mention ', message.text);

      const IDprefix = 'US';
      executeRallyQueryFlow(controller, bot, message, IDprefix);

      // allow other matching handlers to fire
      return true;
    }
  );

  controller.hears(
    [ExpressionList.RallyDE],
    getListenScope('everywhere'),
    (bot, message) => {
      console.log('caught defect mention:', message.text);

      const IDprefix = 'DE';
      executeRallyQueryFlow(controller, bot, message, IDprefix);
      return true;
    }
  );

  controller.hears(
    [ExpressionList.RallyF],
    getListenScope('everywhere'),
    (bot, message) => {
      console.log('caught feature mention:', message.text);

      const IDprefix = 'F';
      executeRallyQueryFlow(controller, bot, message, IDprefix);
      return true;
    }
  );
};
