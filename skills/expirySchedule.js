// custom modules with some hardcoded values/references
const scraper = require('../submodules/scraper.js');

// TODO: move to more general attachment generator
const generatePlainAttachmentStr = (title, str) => {
  return {
    attachments: [
      {
        fallback: title,
        title: title,
        text: str
      }
    ]
  };
};

// TODO: move to a more general attachment generator
const generateExpirationAttachment = (
  version,
  statusStr,
  releaseDate,
  expirationDate,
  url
) => {
  return {
    attachments: [
      {
        fallback: `${version} : ${statusStr}`,
        title: `<${url}|Expiration schedule for MicroStrategy ${version}>`,
        fields: [
          {
            title: 'Version',
            value: 'MicroStrategy ' + version,
            short: true
          },
          {
            title: 'Status',
            value: statusStr,
            short: true
          },
          {
            title: 'Original Release',
            value: releaseDate,
            short: true
          },
          {
            title: 'Expected Expiration*',
            value: expirationDate,
            short: true
          }
        ],
        color: statusStr == 'Expired' ? '#D9232E' : '#36a64f'
      },
      {
        text:
          '* _Note: Expiration may occur later than the dates published above, based on product release schedules. However, dates will not be moved earlier than those posted above._',
        mrkdwn_in: ['text']
      }
    ]
  };
};

const queryRegexArray = [
  '(.*)support(.*)',
  '(.*)expir(.*)',
  '(.*)expiration(.*)'
];
const queryListenScope = 'direct_message,direct_mention,mention';

const handleExpirationQueryMessage = (bot, message) => {
  bot.startConversationInThread(message, (err, convo) => {
    if (err) return false;

    // strip slack mentions, as they're misread as numbers /(\<@.*\>)/g
    message.text = message.text.replace(/(<@.*>)/g, '');
    //console.log("stripped mention: ", message.text);

    scraper.isQuestionOnVersionSupport(message.text, question => {
      if (!question.isValid) {
        //console.log("not a valid version support question: ");
        return convo.stop();
      }

      scraper.getExpirationForVersion(question.version, result => {
        if (result.error) {
          convo.say(
            generatePlainAttachmentStr(
              'Error fetching expiration schedule for version ' +
                question.version,
              result.errorMSG
            )
          );
          return convo.activate();
          //console.log("error occurred in fetching expiration schedule for version ", question.version, result);
        }

        controller.logStat('expSchedule', question.version);

        convo.say(
          generateExpirationAttachment(
            question.version,
            result.supportStatus,
            result.releaseDate,
            result.expirationDate,
            result.url
          )
        );
        convo.activate();
        //console.log("Expiration schedule for ", question.version, result);
      });
    });
  });
};

// listener for when Jarvis is asked: "@jarvis is 10.11 expired?"
module.exports = controller => {
  controller.hears(queryRegexArray, queryListenScope, (bot, message) => {
    console.log(
      `Caught possible question on whether a version's still supported: "${
        message.text
      }"`
    );

    handleExpirationQueryMessage(bot, message);
    return true;
  });
};
