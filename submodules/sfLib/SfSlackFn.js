const getAttachmentField = require('../SlackHelpers/attachments/getAttachmentField');

const SfSlackFn = {
  generateError(key, message) {
    return {
      error: true,
      errorID: key,
      errorMSG: message
    };
  },
  generateAttachmentForCase(sfURL, caseRef) {
    const results = {
      attachments: [
        {
          fallback: `Case ${caseRef.CaseNumber}`,
          color: '#36a64f',
          title: `TS ${caseRef.CaseNumber}: ${caseRef.Subject}`,
          title_link: `${sfURL}/${caseRef.Id}`,
          fields: [
            getAttachmentField('State', caseRef.Status, true),
            getAttachmentField('Priority', caseRef.Priority, true),
            getAttachmentField('Version', caseRef.Version__c, true),
            getAttachmentField('HotFix', caseRef.Service_Pack__c, true),
            getAttachmentField('Status Summary', caseRef.Status_Summary__c, false)
          ]
        }
      ]
    };

    // remove any "fields" from the first attachment object, if they don't have a value
    for (let i = 0; i < results.attachments[0].fields.length; i++) {
      if (
        !results.attachments[0].fields[i].value ||
        results.attachments[0].fields[i].value == 'N/A'
      ) {
        results.attachments[0].fields[i] = null;
      }
    }

    return results;
  }
};
module.exports = SfSlackFn;
