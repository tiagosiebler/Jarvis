// TODO: clean me
const handleReplyToThread = async (controller, bot, message) => {
  // console.log("####################### Reply to thread detected: ", message.text);

  // get username via slackAPI of current msg poster
  let user;
  try {
    user = await controller.extDB.lookupUser(bot, message);
  } catch (e) {
    console.warn(
      'handleReplyToThread() failed reading slack user due to exception ',
      message,
      e ? e.stack || e.message || e : undefined
    );
    user = {
      sf_username: 'unknownSlackUser'
    };
  }

  const rawMessage = message.text;
  //message.text replace new lines with <p>&nbsp;</p>
  var theMessage;
  theMessage = rawMessage.replace(/<!(.*?)\|@\1>/g, '@$1');
  theMessage = theMessage.replace(/<(.*?\1)>/g, '$1');
  theMessage = theMessage.replace(/(?:\r\n|\r|\n)/g, '</i></p><p><i>');

  var msgBody =
    '<p><b>@' +
    user.sf_username +
    '</b> via slack:</p><ul><li><p><i>' +
    theMessage +
    '</i></p></li></ul>';

  // check if thread_ts is known already
  const sf_thread_ref = await controller.extDB.getSFThreadForSlackThread(
    controller,
    message
  );

  if (!sf_thread_ref) {
    //console.log("ServiceCloud thread doesn't exist yet for slack thread with timestamp " + message.thread_ts + ". Returning blankly.");
    return false;
  }

  if (!sf_thread_ref.sf_should_sync) {
    return console.log("shouldSync == false, won't add post automatically");
  }

  // add comment to existing thread
  console.log(
    `##### NEW handleReplyToThread: adding reply to case ${sf_thread_ref.sf_case}: ${theMessage}`
  );
  controller.sfLib.addCommentToPost(
    sf_thread_ref.sf_post_id,
    msgBody,
    (err, records) => {
      controller.logStat('case', 'syncPost');

      //console.log("controller.sfLib.addCommentToPost callback - ", err);
    }
  );
};

module.exports = handleReplyToThread;
