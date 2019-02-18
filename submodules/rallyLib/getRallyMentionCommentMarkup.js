// Handle slack-specific syntax, mapping it to syntax understood by the Rally comments section
const markupMessageText = text => {
  const formattedMessage = text.replace('\n', '</div><div>');
  return `<div>${formattedMessage}</div`;
};

// Generate a rich-text comment for Rally, used as a template for when a rally object is mentioned in slack
const getRallyMentionCommentMarkup = (
  messageText,
  slackChannel,
  slackLink,
  prettyObjectName,
  isPrivateChannel
) => {
  const messageLocation = isPrivateChannel
  ? `a private channel`
  : `the slack channel ${slackChannel}, read the full discussion <a href="${slackLink}">here</a>`;

  return `
  <p>
    This ${prettyObjectName} was mentioned in ${messageLocation}.
  </p>
  <p>
    <div>
      <i>
        <blockquote>
          ${markupMessageText(messageText)}
        </blockquote>
      </i>
    </div>
  </p>
  <p>
    <i>
      <font size="1">Note that this is an automated message.</font>
    </i>
  </p>`;
};

module.exports = getRallyMentionCommentMarkup;