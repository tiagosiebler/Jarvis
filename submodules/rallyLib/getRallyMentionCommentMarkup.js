// Handle slack-specific syntax, mapping it to syntax understood by the Rally comments section
const markupMessageText = text => {
  const formattedMessage = text.replace('\n', '</div><div>');
  return `<div>${formattedMessage}</div`;
};

// Generate a rich-text comment for Rally, used as a template for when a rally object is mentioned in slack
const getRallyMentionCommentMarkup = (
  messageText,
  slackUserInfo,
  slackChannel,
  slackLink,
  prettyObjectName,
  isPrivateChannel
) => {
  const messageLocation = isPrivateChannel
    ? 'a private channel'
    : `the slack channel <b>${slackChannel}</b>, read the full discussion <b><a href="${slackLink}">here</a></b>`;

  const userReference = `${slackUserInfo.first_name} ${slackUserInfo.last_name} (${slackUserInfo.slack_username})`;
  return `
  <p>
    This ${prettyObjectName} was mentioned by <b>${userReference}</b> in ${messageLocation}.
  </p>
  <p>
  <blockquote style="margin: 0 0 0 40px; border: none; padding: 0px;">
    <div>
      <i>
        <font size="1">
          ${markupMessageText(messageText)}
        </font>
      </i>
    </div>
  </blockquote>
  <p>
    <font size="1">Note that this is an automated message.</font>
  </p>`;
};

module.exports = getRallyMentionCommentMarkup;
