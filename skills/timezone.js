/*

 This simply hears the time in United States timezones and reports the system time (EST) and adjusts it accordingly

*/

module.exports = function(controller) {
  //listening for time
  controller.hears(
    ['^time (.*)'],
    'direct_message,direct_mention',
    (bot, message) => {
      const timezone = message.match[1];
      const time = getTimeForTimezone(timezone);
      bot.createConversation(message, (err, convo) => {
        if (err) return false;
        const responseMessage = 'The current time is ' + time + '.';
        convo.say(responseMessage);
        convo.activate();
      });
    }
  );

  //get system time
  const getTimeForTimezone = function(timezone) {
    var date = new Date();
    let hours = date.getHours();
    let adjustedHours = hours + adjustForTimezone(timezone);
    let minutes = (date.getMinutes() < 10 ? '0' : '') + date.getMinutes();
    return adjustedHours + ':' + minutes;
  };

  //time zone adjustment
  const adjustForTimezone = function(timezone) {
    let adjustment = 0;
    switch (timezone) {
    case 'PST':
    case 'PT':
    case 'pst':
    case 'pt': {
      adjustment = -3;
      break;
    }
    case 'MST':
    case 'MT':
    case 'mst':
      case 'mt': {
        adjustment = -2;
        break;
    }
      case 'CST':
    case 'CT':
    case 'cst':
    case 'ct': {
      adjustment = -1;
      break;
    }
      default:
      break;
    }
    return adjustment;
  };
};
