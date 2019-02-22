const buildMessageWithNewLines = message => {
  const messageLines = message.split('\n');
  for (const i in messageLines) {
    messageLines[i] = `<li>${messageLines[i]}</li>`;
  }
  return messageLines.join('');
};

// TODO: let's make this prettier
// https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_feeditem.htm
const getSalesforceMarkupThreadNew = (
  sfUsername,
  messageLocation,
  messageURL,
  originalMessage
) => {
  const sfNewLine = '<p>&nbsp;</p>';
  const formattedMessageLines = buildMessageWithNewLines(originalMessage);
  return `
  <p>
    This case is being discussed in slack by @${sfUsername} ${messageLocation}. Read the full thread here: ${messageURL}
  </p>
  ${sfNewLine}
  <p>
    <b>
      Original Message:
    </b>
  </p>
  <i>
    <ul>
      ${formattedMessageLines}
    </ul>
  </i>
  `;
};

module.exports = getSalesforceMarkupThreadNew;
