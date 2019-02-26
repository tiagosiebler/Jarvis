const formatUptime = uptime => {
  let unit = 'second';
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'minute';
  }

  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'hour';
  }

  if (uptime > 60 * 24) {
    uptime = uptime / (60 * 24);
    unit = 'day';
  }

  if (uptime != 1) {
    unit = unit + 's';
  }

  uptime = parseInt(uptime) + ' ' + unit;
  return uptime;
};

const getStatisticsBlocks = (uptimeMsg, stats) => {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: uptimeMsg + '. Other stats since last restart, by type:'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Rally*'
      },
      fields: [
        {
          type: 'mrkdwn',
          text: `*Initiatives:* ${stats.rally.I}`
        },
        {
          type: 'mrkdwn',
          text: `*Features:* ${stats.rally.F}`
        },
        {
          type: 'mrkdwn',
          text: `*User Stories:* ${stats.rally.US}`
        },
        {
          type: 'mrkdwn',
          text: `*Defects:* ${stats.rally.DE}`
        },
        {
          type: 'mrkdwn',
          text: `*Test Sets:* ${stats.rally.TS}`
        },
        {
          type: 'mrkdwn',
          text: `*Test Cases:* ${stats.rally.TC}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'plain_text',
        text: `${stats.rally.tags} rally tags were automatically assigned & ${
          stats.rally.comment
        } comments from slack were cross-posted into rally discussions.`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Salesforce Cases'
      },
      fields: [
        {
          type: 'mrkdwn',
          text: `*Snapshots:* ${stats.cases.lookups}`
        },
        {
          type: 'mrkdwn',
          text: `*SMEs set:* ${stats.cases.sme}`
        },
        {
          type: 'mrkdwn',
          text: `*Threads Started:* ${stats.cases.thread}`
        },
        {
          type: 'mrkdwn',
          text: `*Tasks Logged:* ${stats.cases.task}`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'plain_text',
        text: `${
          stats.cases.syncPost
        } slack posts were cross-posted into case threads.`
      }
    },
    {
      type: 'divider'
    },
    {
      type: 'section',
      text: {
        type: 'plain_text',
        text: `Lastly, I've provided ${stats.kb} technote snapshots, ${
          stats.fsLinkLookup.processed
        } crop-fs links (with ${
          stats.fsLinkLookup.uploaded
        } uploaded attachments) and that's with ${
          stats.mistakes
        } mistakes recorded.`
      }
    }
  ];
};

/* Collect some very simple runtime stats for use in the uptime/debug command */
const stats = {
  triggers: 0,
  convos: 0,
  rally: {
    US: 0,
    DE: 0,
    I: 0,
    F: 0,
    TC: 0,
    TS: 0,
    comment: 0,
    tags: 0
  },
  cases: {
    lookups: 0,
    sme: 0,
    thread: 0,
    syncPost: 0,
    task: 0
  },
  kb: 0,
  mistakes: 0,
  fsLinkLookup: {
    processed: 0,
    uploaded: 0
  },
  expSchedule: 0
};

module.exports = controller => {
  controller.logStat = (event, data) => {
    switch (event) {
      case 'rally':
        stats[data]++;
        break;

      case 'rallytags':
        stats.rally.tags += data;
        break;

      case 'case':
        stats.cases[data]++;
        break;

      case 'mistake':
        stats.mistakes++;
        break;

      case 'fsLinkLookup':
        stats.fsLinkLookup.processed++;
        break;

      case 'fsLinkLookupUploaded':
        stats.fsLinkLookup.uploaded++;
        break;

      case 'expSchedule':
        stats.expSchedule++;
        break;

      case 'kb':
        stats.kb += data;
        break;

      default:
        debugger;
        break;
    }
  };

  controller.on('heard_trigger', () => {
    stats.triggers++;
  });

  controller.on('conversationStarted', () => {
    stats.convos++;
  });

  controller.hears(
    ['^uptime'],
    'direct_message,direct_mention',
    (bot, message) => {
      bot.createConversation(message, (err, convo) => {
        if (err) return false;

        const uptime = formatUptime(process.uptime());
        const responseMessage = `My main process has been online for ${uptime}. Since booting, I have heard ${
          stats.triggers
        } triggers and conducted ${stats.convos} conversations.`;
        convo.say(responseMessage);
        convo.activate();
      });
    }
  );

  controller.hears(
    ['^stats'],
    'direct_message,direct_mention',
    (bot, message) => {
      bot.createConversation(message, (err, convo) => {
        if (err) return false;

        const uptime = formatUptime(process.uptime());
        const responseMessage = `My main process has been online for ${uptime}. Since booting, I have heard ${
          stats.triggers
        } triggers and conducted ${stats.convos} conversations.`;
        const blocks = getStatisticsBlocks(responseMessage, stats);
        const statsMessage = {
          channel: message.channel,
          blocks: JSON.stringify(blocks)
        };

        // console.log(`sending blocks: `, statsMessage);
        bot.api.chat.postMessage(statsMessage, (err, result) => {
          if (err) console.log('block post failed because: ', result);
        });

        convo.activate();
      });
    }
  );
};
