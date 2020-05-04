const debug = require('debug')('sf:flow');

const addDeleteButton = require('../SlackHelpers/addDeleteButton');
const ExpressionList = require('../Regex/ExpressionList');
const getSlackMarkupForCaseSyncQuestion = require('../sfLib/caseSync/getSlackMarkupForCaseSyncQuestion');
const SfSlackFn = require('../sfLib/SfSlackFn');
const isDirectMessage = require('../SlackHelpers/isDirectMessage');

const handleCoverationFn = (
  err,
  convo,
  caseSyncQuestionAttachment,
  caseLookupAttachment
) => {
  if (err) return false;

  // Send a question asking if case sync should be enabled for this thread
  if (caseSyncQuestionAttachment) {
    convo.say(caseSyncQuestionAttachment, []);
  }

  //console.log("Attaching case snapshot to thread: ",resultCase);
  convo.say(caseLookupAttachment);

  convo.next();
};

const didSeeCaseMention = async (controller, bot, message) => {
  debug('didSeeCaseMention');
  if (
    controller.utils.containsMatch(message.text, ExpressionList.setSME) ||
    controller.utils.containsMatch(message.text, ExpressionList.setSMEShort) ||
    controller.utils.containsMatch(message.text, ExpressionList.logTask)
  )
    return true;

  console.log('Case mention in channel: ', message.match);

  const match = ExpressionList.supportCase.exec(message.text);

  const caseNum = match[1];
  const isInThread = typeof message.thread_ts != 'undefined';

  const sf_thread_ref = await controller.extDB.getSFThreadForSlackThread(
    controller,
    message
  );
  console.log('didSeeCaseMention db lookup result: ', JSON.stringify(sf_thread_ref));
  let trackedThread = sf_thread_ref ? sf_thread_ref.sf_post_created : false;

  // prevent 'want me to link' question if case is mentioned in a thread, without jarvis being mentioned. Avoid spam, especially if the user says no to the previous prompt
  if (message.event.type == 'ambient' && isInThread) {
    trackedThread = true;
  }
  // also prevent link-to-case logic when in direct message
  if (isDirectMessage(message)) {
    trackedThread = true;
  }


  // console.log("hears.case(): message.event.type: ", message.event.type);
  // logic to bring up case snapshot
  const caseResults = await controller.sfLib.fetchCase(caseNum);
  if (!caseResults || !caseResults.length) {
    return console.error(
      'No case results returned in query for ',
      caseNum,
      caseResults
    );
  }

  // log a successful query for a sf case
  controller.logStat('case', 'lookups');

  // lookup result for case info from SF
  const caseResultInfo = caseResults[0];

  const caseLookupAttachment = SfSlackFn.generateAttachmentForCase(
    process.env.sfURL,
    caseResultInfo
  );
  addDeleteButton(caseLookupAttachment, 'Hide Snapshot');

  // If this thread isn't tracked in our DB, we'll ask if we should sync it with the SF case
  const caseSyncQuestionAttachment = !trackedThread
    ? getSlackMarkupForCaseSyncQuestion(message.text, message.user, caseNum, message)
    : false;

  if (isDirectMessage(message)) {
    bot.startConversation(message, (err, convo) =>
      handleCoverationFn(
        err,
        convo,
        caseSyncQuestionAttachment,
        caseLookupAttachment
      )
    );
    return true;
  }

  // send responses back to slack
  bot.startConversationInThread(message, (err, convo) =>
    handleCoverationFn(
      err,
      convo,
      caseSyncQuestionAttachment,
      caseLookupAttachment
    )
  );
  return true;
};

module.exports = didSeeCaseMention;
