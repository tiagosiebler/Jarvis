const getChannelIDsToNames = (inputChannels, channelsInfo) => {
  const remapped = {};

  for (const channel in inputChannels) {
    const channelName = channelsInfo[channel].name;
    remapped[channelName] = inputChannels[channel];
  }

  return remapped;
}

module.exports = getChannelIDsToNames;