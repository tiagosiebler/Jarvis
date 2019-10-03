const debug = require('debug')('sf:skill:stats');

const insertToStatisticsTable = (controller, message) => {
  controller.extDB.insertPostStat(controller, message, (err, result) => {
    if (err) console.error('WARNING - insertPostStat err: ', err);
  });
  return true;
};

// log public discussions to stats DB for reporting in AQ
module.exports = controller => {
  // all message events
  controller.on('ambient', (bot, message) => insertToStatisticsTable(controller, message));
  controller.on('file_share', (bot, message) => insertToStatisticsTable(controller, message));
};
