const rallyLib = require('../../../rallyLib');
const debug = require('debug')('rally:addTagToRallyObject');

const getRallyTagsForEvent = (IDprefix, formattedID, message) => {
  const channel = message.channel;
  const envKey = `channelTags${channel}`;
  const channelTagsString = process.env[envKey];

  if (!channelTagsString) return [];

  return channelTagsString.split(',');
};

const addTagToRallyObject = async (
  controller,
  bot,
  IDprefix,
  formattedID,
  message
) => {
  // These are the rally tags we WANT this object to have
  const tagNamesArray = getRallyTagsForEvent(IDprefix, formattedID, message);
  if (!tagNamesArray.length) return true;

  // These are the rally tags this object already has
  const existingTags = await rallyLib.getTagsForRallyWithID(formattedID);

  const currentSet = new Set(existingTags);
  // these are the tags that aren't in the rally object yet
  const missingTags = tagNamesArray.filter(x => !currentSet.has(x));

  // refuse to continue if the object already has the tags we want, nothing to do.
  if (!missingTags.length) return true;

  // We have tags that are missing in this object, so lets add them in
  debug(
    `Adding ${missingTags.length} tags (${missingTags}) to rally object (${formattedID})`
  );

  return rallyLib
    .addTagsToRallyWithID(IDprefix, formattedID, missingTags)
    .then(results => {
      debug(
        `Successfully added tags (${tagNamesArray}) to rally object (${formattedID}): `,
        JSON.stringify(results)
      );
      controller.logStat('rallytags', tagNamesArray.length);
    })
    .catch(err => {
      console.error(
        `Error seen trying to add tags (${tagNamesArray}) to rally object (${formattedID}): `,
        err.message
      );
    });
};

module.exports = addTagToRallyObject;
