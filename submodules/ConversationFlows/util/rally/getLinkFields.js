const shouldShowFooter = require('./shouldShowFooter');

const getLinkFields = (result, idPrefix) => {
  const linkButtons = [];
  linkButtons.push({
    type: 'button',
    text: 'Go to Rally',
    url: result.url,
    style: 'primary'
  });

  if (!shouldShowFooter(idPrefix)) return linkButtons;

  linkButtons.push({
    type: 'button',
    text: 'Go to Gateway',
    url: result.urlPortalIP,
    style: 'primary'
  });
  return linkButtons;
};

module.exports = getLinkFields;
