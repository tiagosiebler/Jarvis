module.exports = str => {
  const regexList = {
    "case1": /^.*ts([0-9]+).*$/im,
    "case2": /^.*ts ([0-9]+).*$/im,
    "case3": /^.*case ([0-9]+).*$/im,
    "case4": /^.*case([0-9]+).*$/im,
    "case5": /^.*#([0-9]+).*$/im,
    "case6": /^.*# ([0-9]+).*$/im,
    "case7": /^.*case: ([0-9]+).*$/im,
  }

  if (regexList['case1'].exec(str) !== null ||
    regexList['case2'].exec(str) !== null ||
    regexList['case3'].exec(str) !== null ||
    regexList['case4'].exec(str) !== null ||
    regexList['case5'].exec(str) !== null ||
    regexList['case6'].exec(str) !== null ||
    regexList['case7'].exec(str) !== null
  ) return true;
  return false;
};