const {findTimeZone, getZonedTime} = require('timezone-support');
const {formatZonedTime} = require('timezone-support/dist/parse-format');
const ExpressionList = require('../submodules/Regex/ExpressionList');
const timeZoneExList = require('../submodules/Regex/timeZoneExList');

// Zone Name comes from the npm module timezone-support and pulled from a list listTimeZones.
// Using zone names will account for Daylights Savings Time
const zones = {
  PST: 'America/Los_Angeles',
  MST: 'America/Phoenix',
  CST: 'America/Chicago',
  EST: 'America/New_York',
  IST: 'Indian/Mahe',
  GMT: 'Europe/London',
  CEST: 'Europe/Warsaw',
  CTC: 'Asia/Shanghai'
};

module.exports = controller => {
  controller.hears(
      [ExpressionList.timezone], 
      'direct_message,direct_mention', 
      async (bot, message) => {
          var tz = message.text.split(' ')[1];
          var responseMessage = "It is "; // Prep response

          bot.createConversation(message, async(err, convo) => {
              if (err) return false;
              if(tz == undefined){
                responseMessage = ("Missing parameter. Please provide a timezone. Use HELP for a list of timezones");
              }else{
                // Cannot use tz to key the expression list or zones dict becuase the user input
                // could be a value that is not the key. Ex: Using et instead of est
                // If we don't car about other ways to write certain timzones we can simplify
                switch(true){
                  case(timeZoneExList.PST.test(tz)):
                    responseMessage += adjustForTimeZone(zones.PST);
                    break;
                  case(timeZoneExList.MST.test(tz)):
                    responseMessage += adjustForTimeZone(zones.MST);
                    break;
                  case(timeZoneExList.CST.test(tz)):
                    responseMessage += adjustForTimeZone(zones.CST);
                    break;
                  case(timeZoneExList.EST.test(tz)):
                    responseMessage += adjustForTimeZone(zones.EST);
                    break;
                  case(timeZoneExList.IST.test(tz)):
                    responseMessage += adjustForTimeZone(zones.IST);
                    break;
                  case(timeZoneExList.GMT.test(tz)):
                    responseMessage += adjustForTimeZone(zones.GMT);
                    break;
                  case(timeZoneExList.CEST.test(tz)):
                    responseMessage += adjustForTimeZone(zones.CEST);
                    break;
                  case(timeZoneExList.CTC.test(tz)):
                    responseMessage += adjustForTimeZone(zones.CTC);
                    break;
                  case(timeZoneExList.UTC.test(tz)):
                    var tzName = 'Etc/' + tz.toUpperCase();
                    // For some reason the +/- in GMT+X are inverted in timezone-support. This fixes that
                    const regex = /(\+|-)/i;
                    tzName = tzName.replace(regex, function(){
                      if(tzName.includes('+')){return '-'}
                      else if(tzName.includes('-')){return '+'}
                    });
                    responseMessage += adjustForTimeZone(tzName);
                    break;
                  case(timeZoneExList.HELP.test(tz)):
                    responseMessage = 'Due to the regional context, some timezone abbreviations are used multiple times.'+
                      " Because of this, please use one of the recognized timezones, or proivde your own UTC+-X timezone"+
                      "\n\nLegend (Case insensitive):\nPST/PT - Pacific Standard Time\t|\tMST/MT - Mountain Standard Time\n"+
                      "CST/CT - Central Standard Time\t|\tEST/ET - Eastern Standard Time\nIST/IT - India Standard Time\t|\t"+
                      "GMT - Greenwich Mean Time\nCEST/Warsaw - Central European Standard Time. Time of the Warsaw office\nCTC/China - China Standard Time. Time of the CTC office\n"+
                      "GMT+X or GMT-X - Will provide the time for any other timezone given the GMT offset";
                    break;
                  default:
                    responseMessage = "Unrecognized parameter used :sad_blob:. Please provide a timezone or use HELP for a full list."; 
                }
              }

              convo.say(responseMessage);
              convo.activate();
          });
      }
  );
};

var adjustForTimeZone = (timeZone) => {
  const zone = findTimeZone(timeZone);
  const localTime = new Date();
  const zoneTime = getZonedTime(localTime, zone);
  const format = 'h:mm A z'

  return formatZonedTime(zoneTime, format);
}