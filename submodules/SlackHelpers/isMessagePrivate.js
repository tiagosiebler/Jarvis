// public channels IDs start with the letter C
const isMessagePrivate = (message = {}) =>
  message.channel.charAt(0) != 'C';

module.exports = isMessagePrivate;
