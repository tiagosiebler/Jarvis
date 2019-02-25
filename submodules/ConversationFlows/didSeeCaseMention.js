const debug = require('debug')('sf:flow');

const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const ExpressionList = require('../Regex/ExpressionList');
const getSlackMarkupForCaseSyncQuestion = require('../sfLib/caseSync/getSlackMarkupForCaseSyncQuestion');

const didSeeCaseMention = async (controller, bot, message) => {
  if (
    controller.utils.containsMatch(message.text, ExpressionList.setSME) ||
    controller.utils.containsMatch(message.text, ExpressionList.setSMEShort) ||
    controller.utils.containsMatch(message.text, ExpressionList.logTask) ||
    controller.utils.containsMatch(message.text, ExpressionList.logTaskShort)
  ) return true;

  console.log('Case mention in channel: ', message.match);

  const match = ExpressionList.supportCase.exec(message.text);

  const caseNum = match[1];
  const isInThread = typeof message.thread_ts != 'undefined';

  const sf_thread_ref = await controller.extDB.getSFThreadForSlackThread(controller, message);

  console.log('didSeeCaseMention db lookup result: ', JSON.stringify(sf_thread_ref));
  let trackedThread = sf_thread_ref ? sf_thread_ref.sf_post_created : false;

  // prevent 'want me to link' question if case is mentioned in a thread, without jarvis being mentioned. Avoid spam, especially if the user says no to the previous prompt
  if (message.event.type == 'ambient' && isInThread) trackedThread = true;

  // also prevent link-to-case logic when in direct message
  if (
    message.type == 'direct_message' ||
    message.event.subtype == 'bot_message'
  )
    trackedThread = true;

  // console.log("hears.case(): message.event.type: ", message.event.type);

  // logic to bring up case snapshot
  const caseResults = await controller.sfLib.fetchCase(caseNum);
  if (!caseResults)
    return console.error('No case results returned in query for ', caseNum);

  // lookup result for case info from SF
  const caseResultInfo = caseResults[0];
  const caseLookupAttachment = controller.sfLib.generateAttachmentForCase(
    process.env.sfURL,
    caseResultInfo
  );

  // If this thread isn't tracked in our DB, we'll ask if we should sync it with the SF case
  const caseSyncQuestionAttachment = !trackedThread ? getSlackMarkupForCaseSyncQuestion(
    message.text,
    message.user,
    caseNum,
    message
  ) : false;

  // send responses back to slack
  bot.startConversationInThread(message, (err, convo) => {
    if (err) return false;

    // Send a question asking if case sync should be enabled for this thread
    if (caseSyncQuestionAttachment) {
      convo.say(caseSyncQuestionAttachment, []);
    }

    //console.log("Attaching case snapshot to thread: ",resultCase);
    convo.say(caseLookupAttachment);

    convo.next();
  });

  // allow other matching handlers to fire
  return true;
};

module.exports = didSeeCaseMention;
