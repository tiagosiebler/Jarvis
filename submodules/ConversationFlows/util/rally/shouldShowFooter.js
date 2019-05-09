const shouldShowFooter = idPrefix => {
  switch (idPrefix) {
    case 'TC':
      return false;

    case 'TS':
      return false;

    default:
      return true;
  }
};

module.exports = shouldShowFooter;
