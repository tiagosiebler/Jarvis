const getAttachmentField = require('../../../SlackHelpers/attachments/getAttachmentField');
const getDefaultFields = result => {
  return [
    getAttachmentField('Sheduled State', result.ScheduleState, true),
    getAttachmentField('Scrum Team', result.Project, true),
    getAttachmentField(
      'State',
      result.GeneralState && result.GeneralState.Name
        ? result.GeneralState.Name
        : result.GeneralState,
      true
    ),
    getAttachmentField('Iteration', result.Iteration, true),
    getAttachmentField('Scheduled Release', result.ScheduleRelease, true),
    getAttachmentField('Production Release', result.ActualRelease, true)
  ];
};

module.exports = getDefaultFields;
