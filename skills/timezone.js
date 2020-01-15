const { findTimeZone, getZonedTime } = require('timezone-support');
const { formatZonedTime } = require('timezone-support/dist/parse-format');
const ExpressionList = require('../submodules/Regex/ExpressionList');
const timeZoneExList = require('../submodules/Regex/timeZoneExList');

// Zone Name comes from the npm module timezone-support and pulled from a list listTimeZones.
// Using zone names will account for Daylights Savings Time
const zones = {
  PST: 'America/Los_Angeles',
  MST: 'America/Phoenix',
  CST: 'America/Chicago',
  EST: 'America/New_York',
  IST: 'Indian/Kerguelen',
  GMT: 'Europe/London',
  CEST: 'Europe/Warsaw',
  CTC: 'Asia/Shanghai'
};

const adjustForTimeZone = timeZone => {
  const zone = findTimeZone(timeZone);
  const localTime = new Date();
  const zoneTime = getZonedTime(localTime, zone);
  const format = 'h:mm A z';

  return formatZonedTime(zoneTime, format);
};

// Cannot use timezone to key the expression list or zones dict becuase the user input
// could be a value that is not the key. Ex: Using et instead of est
// If we don't care about other ways to write certain timzones we can simplify
const getResolveTimezone = (timezone, respMessage) => {
  switch (true) {
    case timeZoneExList.PST.test(timezone):
      return respMessage + adjustForTimeZone(zones.PST);
    case timeZoneExList.MST.test(timezone):
      return respMessage + adjustForTimeZone(zones.MST);
    case timeZoneExList.CST.test(timezone):
      return respMessage + adjustForTimeZone(zones.CST);
    case timeZoneExList.EST.test(timezone):
      return respMessage + adjustForTimeZone(zones.EST);
    case timeZoneExList.IST.test(timezone):
      return respMessage + adjustForTimeZone(zones.IST);
    case timeZoneExList.GMT.test(timezone):
      return respMessage + adjustForTimeZone(zones.GMT);
    case timeZoneExList.CEST.test(timezone):
      return respMessage + adjustForTimeZone(zones.CEST);
    case timeZoneExList.CTC.test(timezone):
      return respMessage + adjustForTimeZone(zones.CTC);
    case timeZoneExList.UTC.test(timezone):
      var timezoneName = 'Etc/' + timezone.toUpperCase();
      // For some reason the +/- in GMT+X are inverted in timezone-support. This fixes that
      const regex = /(\+|-)/i;
      timezoneName = timezoneName.replace(regex, function() {
        if (timezoneName.includes('+')) {
          return '-';
        } else if (timezoneName.includes('-')) {
          return '+';
        }
      });
      return respMessage + adjustForTimeZone(timezoneName);
    case timeZoneExList.HELP.test(timezone):
      return (
      'Due to the regional context, some timezone abbreviations are used multiple times.' +
        ' Because of this, please use one of the recognized timezones, or proivde your own UTC+-X timezone' +
        '\n\nLegend (Case insensitive):\nPST/PT - Pacific Standard Time\t|\tMST/MT - Mountain Standard Time\n' +
        'CST/CT - Central Standard Time\t|\tEST/ET - Eastern Standard Time\nIST/IT - India Standard Time\t|\t' +
        'GMT - Greenwich Mean Time\nCEST/Warsaw - Central European Standard Time. Time of the Warsaw office\nCTC/China - China Standard Time. Time of the CTC office\n' +
        'GMT+X or GMT-X - Will provide the time for any other timezone given the GMT offset'
    );
    default:
      return 'Unrecognized parameter used :sad_blob:. Please provide a timezone or use HELP for a full list.';
  }
};

module.exports = controller => {
  controller.hears(
    [ExpressionList.timezone],
    'direct_message,direct_mention',
    async (bot, message) => {
      var timezone = message.match[1];
      var responseMessage = 'It is '; // Prep response

      bot.createConversation(message, async (err, convo) => {
        if (err) return false;
        if (!timezone) {
          responseMessage =
            'Missing parameter. Please provide a timezone. Use HELP for a list of timezones';
          convo.say(responseMessage);
          convo.activate();
          return;
        }

        responseMessage = getResolveTimezone(timezone, responseMessage);

        convo.say(responseMessage);
        convo.activate();
      });
    }
  );
};