// threaded messages have a thread_ts parameter
const isMessageThreaded = (message = {}) =>
  typeof message.thread_ts != "undefined";

module.exports = isMessageThreaded;
