const shouldAddCommentForPrefix = IDprefix => {
  if (IDprefix == 'TC') return false;
  if (IDprefix == 'TA') return false;
  return true;
};

module.exports = shouldAddCommentForPrefix;
