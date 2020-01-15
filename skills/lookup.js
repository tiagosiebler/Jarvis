const ExpressionList = require('../submodules/Regex/ExpressionList');
const ping = require('ping');

const pingResult = async host => {
  let result = null;
  try {
    result = await ping.promise.probe(host);
    result = result.numeric_host;
  } catch (e) {
    console.log(e);
    return e;
  }
  return result;
};

module.exports = controller => {
  controller.hears(
    [ExpressionList.lookup],
    'direct_message,direct_mention',
    async (bot, message) => {
      bot.createConversation(message, async (err, convo) => {
        if (err) return false;
        let responseMessage;
        let domain = message.match[1];

        if (!domain) {
          convo.say(
            'Missing parameter. Please provide the domain name to lookup'
          );
          convo.activate();
          return;
        }
        //Slack will automatically try to make anything ending in '.com' be a link
        //This causes issue with message response formatting which needs to be corrected
        if (domain[0] === '<') {
          // RegEx matches: <http:// and >
          domain = domain.replace(/(<http:\/\/|>)/gi, '');
          domain = domain.split('|')[0];
        }
        let ip = await pingResult(domain);
        console.log('pingResult: ' + ip);
        if (!ip) {
          responseMessage = `Could not retreive IP of domain: ${domain}. Try using the fully qualified domain name`;
        } else {
          responseMessage = `Resolved to IP: \`${ip}\``;
        }

        convo.say(responseMessage);
        convo.activate();
      });
    }
  );
};
