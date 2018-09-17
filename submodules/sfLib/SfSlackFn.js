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
      attachments: [{
        fallback: "Case " + caseRef.CaseNumber,
        color: "#36a64f",
        //"pretext": "Case " + caseRef.CaseNumber,
        title: "TS" + caseRef.CaseNumber + ": " + caseRef.Subject,
        title_link: sfURL + "/" + caseRef.Id,
        fields: [{
          title: "State",
          value: caseRef.Status,
          short: true
        }, {
          title: "Priority",
          value: caseRef.Priority,
          short: true
        }, {
          title: "Version",
          value: caseRef.Version__c,
          short: true
        }, {
          title: "HotFix",
          value: caseRef.Service_Pack__c,
          short: true
        }, {
          title: "Status Summary",
          value: caseRef.Status_Summary__c,
          short: false
        }, ],
        callback_id: 'hideButton-0',
        actions: [{
          name: "hide",
          text: "Hide this message",
          value: "hide",
          type: "button"
        }]
      }]
    }

    for (i = 0; i < results.attachments[0].fields.length; i++) {
      if (results.attachments[0].fields[i].value == null) {
        results.attachments[0].fields[i] = null;
      }
    }

    return results;
  }
};
module.exports = SfSlackFn;
