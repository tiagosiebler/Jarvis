const debug = require('debug')('skills:sf_sme');

const getCaseNumberFromMessage = (controller, message, caseNum) => {
  return new Promise((resolve, reject) => {
    if (caseNum) return resolve(caseNum);
    // TODO: refactor the hell out of getSFThreadForSlackThread()
    controller.extDB.getSFThreadForSlackThread(
      controller,
      message,
      (error, whatIsThis, threadInfo, c, d) => {
        if (error) return reject(error);
        if (!whatIsThis && !threadInfo) return resolve(null);

        debugger;
      }
    );
  });
}

const handleCaseNumberMissing = (controller, bot, message) => {
  let failCounter = 0;
  bot.startConversation(message, (err, convo) => {
    if (err) throw err;
    convo.ask(
      'What case is this for? E.g `123456`',
      [
        {
          pattern: controller.utils.regex.genericIDNumber,
          callback: (reply, convo) => {
            const caseNumber = reply.match[0];
            debug(`Received case number in reply: ${caseNumber}`);
            convo.stop();
            return handleSMErequest(controller, bot, message, caseNumber, convo.sent[0]);
          }
        },
        {
          default: true,
          callback: (reply, convo) => {
            failCounter++;
            debug('default callback hit ' + failCounter + ' times: ' + reply.text);
            if (failCounter == 3) {
              debug(`Too many invalid replies, giving up waiting for case number.`);
              return convo.stop();
            }
          }
        }
      ]
    );
  });
}

const handleSMErequest = async (controller, bot, message, passedCaseNum, previousMessage) => {
  const url = controller.utils.getURLFromMessage(message);
  const parsedCaseNum = controller.utils.extractCaseNum(message.text) || passedCaseNum;

  const userInfo = await controller.extDB.lookupUser(bot, message);
  if (!userInfo) {
    debug(`No user info returned, was there an error?`);
    return false;
  }

  const caseNum = parsedCaseNum || await getCaseNumberFromMessage(controller, message);
  debug(`received request to set user as SME for case ${caseNum}`);

  if (!caseNum) {
    debug(`Missing case number, let's ask the user!`);
    return handleCaseNumberMissing(controller, bot, message);
  }

  // should not be possible, but just in case
  if (!userInfo.sf_user_id || !userInfo.sf_username) {
    throw new Error(`User lookup info missing, expected auto-refresh: ${userInfo}`);
  }

  // TODO: refactor the hell out of this fn too, return a promise
  controller.sfLib.setCaseSME(
    caseNum,
    userInfo.sf_user_id,
    userInfo.sf_username,
    url,
    false,
    (err, caseInfo, caseInfo2) => {
      if (err) {
        debugger;
        return bot.reply(
          message,
          `I can't :${controller.utils.getSadEmoji()}': ${err}`
        );
      }

      if (previousMessage) {
        bot.api.chat.update({
          token: bot.config.bot.token,
          channel: message.channel,
          text: `I've set the SME for case ${caseNum}. :bowtie:`,
          ts: previousMessage.api_response.ts
        });
      }

      bot.api.reactions.add({
        name: '+1',
        channel: message.channel,
        timestamp: message.ts
      });
    }
  );
  return false;
};

module.exports = controller => {
  /*
		lookup thread and user from memory.
		if blank, update SME.
		if known, read SME from case
		if not blank, but same as new SME, pretend to have updated it.
		if different SME already set, return warning.
	*/
  controller.hears(
    [controller.utils.regex.setSME, controller.utils.regex.setSMEShort],
    'direct_message,direct_mention,mention',
    (bot, message) => handleSMErequest(controller, bot, message)
  );
};
