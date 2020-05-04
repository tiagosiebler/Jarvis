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
    const caseVersion = caseRef.Version__c + ' ' + caseRef.Service_Pack__c;
    const results = {
      attachments: [
        {
          fallback: `Case ${caseRef.CaseNumber}`,
          color: '#36a64f',
          title: `TS ${caseRef.CaseNumber}: ${caseRef.Subject}`,
          title_link: `${sfURL}/${caseRef.Id}`,
          fields: [
            getAttachmentField('Priority', caseRef.Priority, true),
            getAttachmentField('State', caseRef.Status, true),
            getAttachmentField('Version', caseVersion, true),
            getAttachmentField('Customer BU', caseRef.District__c, true),
            getAttachmentField('Status Summary', caseRef.Status_Summary__c, false)
          ]
        }
      ]
    };

    // remove any "fields" from the first attachment object, if they don't have a value
    for (let i = 0; i < results.attachments[0].fields.length; i++) {
      if (!results.attachments[0].fields[i].value || results.attachments[0].fields[i].value == 'N/A') {
        results.attachments[0].fields[i] = null;
      }
    }

    return results;
  }
};
module.exports = SfSlackFn;
