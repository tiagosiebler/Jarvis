const isMessageInThread = require('../submodules/SlackHelpers/isMessageThreaded');
const addDeleteButton = require('../submodules/SlackHelpers/addDeleteButton');
const ExpressionList = require('../submodules/Regex/ExpressionList');

const sendThreadedOrDirectReply = require('../submodules/SlackHelpers/sendThreadedOrDirectReply');

const handleMentionedKB = async (controller, bot, message) => {
  const matches = controller.utils.getMatchesKB(message.text);
  const prefixedMatches = matches.map(element => `KB${element}`);

  console.log('Searching for TN(s)', message.text, matches);

  // if jarvis wasn't tagged,
  // and it isn't a thread but a plain thread-less post,
  // and a case was mentioned
  // this currently rejects posts in the channel without a case number
  if (
    message.event == 'ambient' &&
    !isMessageInThread(message) &&
    controller.utils.containsCaseNumber(message.text)
  )
    return true;

  // Query SalesForce for KB matches
  const articleResults = await controller.sfLib.fetchKBArticles(matches);

  // Search results are a loose match, so we reduce our search results to exact matches for our KB ID.
  const resultsMatchingQuery = articleResults.filter(record => {
    const match = record.Title.match(ExpressionList.KBase);
    return match && match.length && prefixedMatches.includes(match[0]);
  });

  // No results = no action
  if (resultsMatchingQuery.length == 0) return true;

  controller.logStat('kb', resultsMatchingQuery.length);

  // build response
  const responseAttachment = controller.utils.generateAttachmentForKBArticles(
    resultsMatchingQuery
  );
  addDeleteButton(responseAttachment, 'Hide Results');

  // send it to slack. Direct messages get direct responses. Public messages are replied to in thread.
  sendThreadedOrDirectReply(bot, message, responseAttachment);

  // allow other matching handlers to fire
  return true;
};

module.exports = function(controller) {
  controller.hears(
    [ExpressionList.KBase],
    'ambient,direct_message,mention,direct_mention,file_share',
    (bot, message) => handleMentionedKB(controller, bot, message)
  );
};
