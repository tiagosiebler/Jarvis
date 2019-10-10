const getSlackMarkupForCaseSyncQuestion = (
  originalMessage,
  user,
  caseNum,
  messageRef
) => {
  const preText = `Create internal post in case ${caseNum}, <@${user}>?`;
  const syncText =
    "• Yes: I'll create an internal post with a link to this slack thread. \n\n• Full-sync: any replies here will also be added to the internal thread in your case. \n\nYou can toggle sync at any time, click 'ServiceCloud Sync' for more details. :bowtie:";

  return {
    attachments: [
      {
        fallback: originalMessage,
        title: 'ServiceCloud Sync',
        title_link:
          'https://microstrategy.atlassian.net/wiki/spaces/Jarvis/pages/152866596/ServiceCloud+Sync',
        color: '#36a64f',
        pretext: preText,
        text: syncText,
        callback_id: 'logToCaseQuestion-' + caseNum,
        callback_ref: messageRef,
        attachment_type: 'default',
        actions: [
          {
            name: 'yes-1',
            text: 'Yes (full-sync)',
            value: 'yes-1',
            type: 'button',
            style: 'primary'
          },
          {
            name: 'yes-2',
            text: 'Yes (link only)',
            value: 'yes-2',
            type: 'button'
          },
          {
            name: 'no',
            text: 'No',
            value: 'no',
            type: 'button'
          }
        ]
      }
    ]
  };
};
module.exports = getSlackMarkupForCaseSyncQuestion;
