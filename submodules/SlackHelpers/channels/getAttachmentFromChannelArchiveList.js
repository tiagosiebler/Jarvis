// generate a pretty attachment based on a list of channels to archive
module.exports = (channelsToArchive, channelMap, daysThreshold) => {
  const messages = [];
  for (const channelID in channelsToArchive) {
    const channelName = channelMap[channelID].name;
    const daysAgo = channelsToArchive[channelID];

    const message = {
      text: `<#${[channelID]}|${channelName}> : ${daysAgo} days ago`,
      daysAgo
    };

    messages.push(message);
  }

  const response = {
    text: `${
      messages.length
    } public channels found with no activity (incl joins) in the last ${daysThreshold} days`,
    attachments: []
  };

  response.attachments = [...messages.sort((a, b) => a.daysAgo > b.daysAgo)];
  return response;
};
