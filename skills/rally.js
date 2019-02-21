const getListenScope = require('../submodules/SlackHelpers/getListenScope');
const ExpressionList = require('../submodules/Regex/ExpressionList');
const executeRallyQueryFlow = require('../submodules/ConversationFlows/RallyFlow');

module.exports = controller => {
  controller.hears(
    [ExpressionList.RallyAll],
    getListenScope('everywhere'),
    (bot, message) => {
      const rallyIDprefix = message.match[1];
      const rallyIDnumber = message.match[2];
      executeRallyQueryFlow(
        controller,
        bot,
        message,
        rallyIDprefix,
        rallyIDnumber
      );
      // allow other matching handlers to fire
      return true;
    }
  );
};
