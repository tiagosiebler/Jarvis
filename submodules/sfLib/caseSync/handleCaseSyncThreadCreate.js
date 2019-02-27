const debug = require('debug')('sf:skill:syncResponseHandle');

const createThreadInSFCase = require('./createThreadInSFCase');
const addDeleteButton = require('../../SlackHelpers/addDeleteButton');

const handleCaseSyncThreadCreate = async (
  controller,
  bot,
  message,
  caseNum,
  trigger,
  syncQuestionResponseCallback
) => {
  debug('handleCaseSyncThreadCreate: entered');
  const channelInfo = await controller.extDB.lookupChannel(bot, message);
  const userInfo = await controller.extDB.lookupUser(bot, message);
  if (!channelInfo || !userInfo) {
    debug('handleCaseSyncThreadCreate: failed to read user or channel info');
    return {
      text:
        'Error reading slack user when trying to create serviceCloud post. Refusing to continue'
    };
  }

  const shouldSync = trigger.text == 'yes-1';
  debug(`Should sync is set to ${shouldSync} - creating thread next.`);

  // create internal post in service cloud case, with link to this
  let resultLink;
  try {
    resultLink = await createThreadInSFCase(
      controller,
      bot,
      message,
      caseNum,
      userInfo,
      channelInfo,
      shouldSync
    );
  } catch (err) {
    return {
      text: `Failed to create thread in case, possible API error: ${err}`
    };
  }

  debug(`handleCaseSyncThreadCreate():  Thread creation complete: ${resultLink}`);

  const syncStateString = shouldSync ? 'Enabled' : 'Disabled';

  const responseAttachment = {
    title_link: resultLink,
    title: `Thread Created - Sync ${syncStateString}`
  }

  // add a hide button
  addDeleteButton(responseAttachment, 'Hide Message');

  // Add undo button here?
  return responseAttachment;
};

module.exports = handleCaseSyncThreadCreate;
