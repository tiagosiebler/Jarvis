const getAttachmentField = require('../../../SlackHelpers/attachments/getAttachmentField');
const getDefaultFields = require('./getDefaultFields');

const getFieldsForObjectType = (result, idPrefix) => {
  switch (idPrefix) {
    case 'TC':
      return [
        getAttachmentField('Type', result.Type, true),
        getAttachmentField('Scrum Team', result.Project, true),
        getAttachmentField('Method', result.Method, true),
        getAttachmentField('Test Case Status', result.c_TestCaseStatus, true)
      ];

    case 'TS':
      return [
        getAttachmentField('Sheduled State', result.ScheduleState, true),
        getAttachmentField('Scrum Team', result.Project, true),
        getAttachmentField('Production Release', result.ActualRelease, true),
        getAttachmentField('Iteration', result.Iteration, true),
        getAttachmentField('Plan Estimate', result.PlanEstimate, true)
      ];

    case 'TA':
      return [
        getAttachmentField('Owner', result.CreatedBy._refObjectName, true),
        getAttachmentField('State', result.State, true)
      ];

    default:
      return getDefaultFields(result);
  }
};

module.exports = getFieldsForObjectType;
