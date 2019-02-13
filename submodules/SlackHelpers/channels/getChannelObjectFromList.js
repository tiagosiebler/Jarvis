const getChannelObjectFromList = (channelsInfo) => {
  const channelsObject = {};

  for (const channel of channelsInfo) {
    channelsObject[channel.id] = channel;
  }

  return channelsObject;
}

module.exports = getChannelObjectFromList;