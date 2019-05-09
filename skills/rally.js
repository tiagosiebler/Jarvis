const getListenScope = require('../submodules/SlackHelpers/getListenScope');
const ExpressionList = require('../submodules/Regex/ExpressionList');
const { getRallyMatches } = require('../submodules/Regex/getMatches');
const executeRallyQueryFlow = require('../submodules/ConversationFlows/RallyFlow');
const executeRallyMultiQueryFlow = require('../submodules/ConversationFlows/RallyMultiFlow');

module.exports = controller => {
  controller.hears(
    [ExpressionList.RallyAll],
    getListenScope('everywhere'),
    (bot, message) => {

      const rallyIdsToQuery = getRallyMatches(message.text);
      if (rallyIdsToQuery.length > 1) {
        // have more than one rally ref in this message
        executeRallyMultiQueryFlow(
          controller,
          bot,
          message,
          rallyIdsToQuery
        );
        return true;
      }

      const rallyIDprefix = message.match[1];
      const rallyIDnumber = message.match[2];

      // only one rally ref in this message
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
