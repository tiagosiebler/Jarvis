const shouldAddCommentForPrefix = IDprefix => {
  if (IDprefix == 'TC') return false;
  return true;
};

module.exports = shouldAddCommentForPrefix;
