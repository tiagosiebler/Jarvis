// threaded messages have a thread_ts parameter
const isMessageThreaded = (message = {}) =>
  message.thread_ts != "undefined";

module.exports = isMessageThreaded;
