const getFilteredChannels = (channels, daysInt, whitelist) => {
  const filteredChannels = Object.keys(channels)
    // more than daysInt days ago
    .filter(channelID => channels[channelID].days > daysInt)
    // not whitelisted
    .filter(channelID => !whitelist[channelID])
    // build result object channelId:days
    .reduce((obj, key) => {
      obj[key] = channels[key].days;
      return obj;
    }, {});

  return filteredChannels;
}
module.exports = getFilteredChannels;