module.exports = (
  messageTS,
  threadTS,
  messageText,
  postURL,
  slackUserID,
  slackChannelID,
  sf_case
) => {
  var insertPost = {};

  if (!messageTS) return null;
  var message_dt = new Date(messageTS * 1000);

  insertPost.message_ts = messageTS;
  insertPost.message_dt = message_dt;
  insertPost.post_type = 'post';

  if (threadTS) {
    insertPost.thread_ts = threadTS;
    insertPost.post_type = 'reply';
  }

  if (messageText) insertPost.message_text = messageText;
  if (postURL) insertPost.post_url = postURL;
  if (slackUserID) insertPost.slack_user_id = slackUserID;
  if (slackChannelID) insertPost.slack_channel_id = slackChannelID;
  if (sf_case) insertPost.sf_case = sf_case;

  return insertPost;
};
