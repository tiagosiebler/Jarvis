const { supportCase } = require('./ExpressionList');

// Very simple check if the supportCase regex found a match in this string
module.exports = string => supportCase.exec(string) !== null;