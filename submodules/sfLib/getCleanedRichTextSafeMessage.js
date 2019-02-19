// SF richtext is really fussy for how things are formatted. One invalid situation and the whole request is rejected.
const getCleanedRichTextSafeMessage = slackMessage => {
  return slackMessage
    // need to remove what might be mistaken as salesforce post body syntax / fake HTML, as that'll cause salesforce to error out when submitting this.
    // clean out any mentions (<!someone|@someone>)
    .replace(/<!(.*?)\|@\1>/g, '@$1')
    // clean up any other rogue <something> tags
    .replace(/<(.*?\1)>/g, '$1')
    // replace newlines and CRs with something salesforce can understand
    .replace(/(?:\r\n|\r|\n)/g, '\n');
};


module.exports = getCleanedRichTextSafeMessage;
