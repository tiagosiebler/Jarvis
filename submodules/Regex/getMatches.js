const ExpressionList = require('./ExpressionList');

const getMatchesForKey = (string, regexKey, matchCount = 1) => {
  const regularExpression = ExpressionList[regexKey];
  if (!regularExpression) throw new Error('No regex found for key: ', regexKey);

  const matches = [];
  let match;
  while ((match = regularExpression.exec(string))) {
    if (matchCount == 1) {
      matches.push(match[1]);
    } else {
      matches.push([match[1], match[2]]);
    }
  }
  return matches;
};

// returns multiple matches for the same regex.
const matchesFunctions = {
  getKBMatches: string => getMatchesForKey(string, 'KBase'),
  getRallyMatches: string => getMatchesForKey(string, 'RallyAll', 2)
};

module.exports = matchesFunctions;
