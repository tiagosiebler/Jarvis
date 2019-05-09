const getColourForAttachmentResult = result => {
  return result.DisplayColor ? result.DisplayColor : '#36a64f';
};

module.exports = getColourForAttachmentResult;
