const schedule = require('node-schedule');
const moment = require('moment-timezone');
const momentDurationFormatSetup = require('moment-duration-format');
momentDurationFormatSetup(moment); //Required to format moment

const ExpressionList = require('../submodules/Regex/ExpressionList');

const actionRegEx = {
  start: /start$/i,
  stop: /stop$/i,
  cont: /(cont$|continue$)/i,
  purged: /purged$/i
};

const getUserData = (controller, user) => {
  return new Promise(function(resolve, reject) {
    controller.storage.users.get(user, function(err, user_data) {
      if (err) {
        reject(false);
      } else {
        resolve(user_data);
      }
    });
  });
};

const saveUserData = (controller, data) => {
  controller.storage.users.save(data, function(err) {
    if (err) {
      console.error('Could not save user data.', err);
      return;
    }
    console.log('Saved users data: ', data);
  });
};

const getCurrentTime = () => {
  return new Date().getTime();
};

const startFunc = async (controller, keyUser) => {
  // Prep data to add in storage
  const data = {
    id: keyUser,
    startTime: getCurrentTime(),
    elapsedTime: 0
  };
  await saveUserData(controller, data);
  return 'Started...';
};

const stopFunc = async (controller, keyUser) => {
  try {
    const exists = await getUserData(controller, keyUser);
    const stoppedTime = getCurrentTime();
    // Current time - time when started + any currently elapsed time (from Continue)
    // this allows jarvis to never need to do any background calculations while the stopwatch is 'running'
    // Only once stop is called will it do the math
    const elapsedTime = stoppedTime - exists.startTime + exists.elapsedTime;
    const formatted = moment
      .duration(elapsedTime, 'milliseconds')
      .format('hh [Hours,] mm [Minutes,] ss [Seconds]');

    const data = {
      id: keyUser,
      startTime: stoppedTime,
      elapsedTime: elapsedTime
    };
    await saveUserData(controller, data);

    return 'Elapsed time: ' + formatted;
  } catch (e) {
    console.error('User does not exist. Returned: ', e);
    return 'No timer found for you. Please START the stopwatch first.';
  }
};

const contFunc = async (controller, keyUser) => {
  try {
    const exists = await getUserData(controller, keyUser);
    const elapsed = exists.elapsedTime;
    const data = {
      id: keyUser,
      startTime: getCurrentTime(),
      elapsedTime: elapsed
    };
    await saveUserData(controller, data);
    const elapsedFormatted = moment
      .duration(elapsed, 'milliseconds')
      .format('hh [Hours,] mm [Minutes,] ss [Seconds]');
    return 'Continue stopwatch from: ' + elapsedFormatted;
  } catch (e) {
    console.error('User does not exist. Returned: ', e);
    return 'No timer found for you. Please START the stopwatch first.';
  }
};

const logicHandle = async (controller, user, action, pruneDate) => {
  const keyUser = 'stopwatch' + user;
  switch (true) {
    case actionRegEx.start.test(action):
      return startFunc(controller, keyUser);
    case actionRegEx.stop.test(action):
      return stopFunc(controller, keyUser);
    case actionRegEx.cont.test(action):
      return contFunc(controller, keyUser);
    case actionRegEx.purged.test(action):
      return 'Last date purged: ' + pruneDate.date;
    default:
      return 'Unrecognized parameter used :sad_blob:. Please provide either START, STOP, or CONT';
  }
};

// Cleanup job to remove all old stopwatch entries
const getStopwatchJob = (controller, pruneDate) => {
  // Schedule job set for Midnight 00:00
  const stopwatchJob = schedule.scheduleJob('0 0 * * *', function() {
    console.log('Trigger cleanup..');
    controller.storage.users.all(function(err, all_user_data) {
      if (err) {
        console.error('Could get all user data.', err);
        return;
      }
      // Purge entries old then X days
      const dayMiliseconds = 86400000; // 1 Day = 86,400,000 ms
      const deleteTimer = 2 * dayMiliseconds; // max time storage allowed in MS
      const cronTime = getCurrentTime();
      for (let k = 0; k < all_user_data.length; k++) {
        const reg = /stopwatch/i;
        const userID = all_user_data[k].id;
        if (
          reg.test(userID) &&
          all_user_data[k].startTime < cronTime - deleteTimer
        ) {
          controller.storage.users.delete(userID, function(err) {
            if (err) {
              console.error('Could not delete user data.', err);
              return;
            }
            console.log('Deleted: ' + userID);
          });
        }
      }
      // Used for admin cleanup monitoring
      pruneDate.date = new Date().toLocaleDateString(undefined, {
        dateStyle: 'short'
      });
    });
  });
  return stopwatchJob;
};

module.exports = controller => {
  // Maintain variable for Admin to monitor purging
  let lastPruneDate = {
    date: 'Storage has not been purged since Jarvis startup.'
  };

  let job = getStopwatchJob(controller, lastPruneDate); // Can cancel the job with job.cancel();

  controller.hears(
    [ExpressionList.stopwatch],
    'direct_message',
    async (bot, message) => {
      bot.createConversation(message, async (err, convo) => {
        if (err) return false;
        const response = await logicHandle(
          controller,
          message.user,
          message.match[1],
          lastPruneDate
        );
        convo.say(response);
        convo.activate();
      });
    }
  );
};
