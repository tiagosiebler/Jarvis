// scope of where these commands will trigger (anywhere the bot is, right now)
const getListenScope = require('../submodules/SlackHelpers/getListenScope');

const ExpressionList = require('../submodules/Regex/ExpressionList');
const isCaseMentioned = require('../submodules/Regex/isCaseMentioned');

const ExecuteRallyFlow = require('../submodules/ConversationFlows/Rally');

module.exports = function(controller) {
  controller.hears([ExpressionList.US], getListenScope('everywhere'), (bot, message) => {
    console.log("Caught userstory mention ", message.text);

    const IDprefix = 'US';
    ExecuteRallyFlow(controller, bot, message, IDprefix);

    // allow other matching handlers to fire
    return true;
  });

  controller.hears([ExpressionList.DE], getListenScope('everywhere'), (bot, message) => {
    console.log("caught defect mention:", message.text);

    const IDprefix = 'DE';
    ExecuteRallyFlow(controller, bot, message, IDprefix);

    // allow other matching handlers to fire
    return true;
  });
};
