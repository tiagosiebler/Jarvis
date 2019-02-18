// All things parsing API responses from the Rally API into generic objects or strings

const ResultParser = {
  getScheduledRelease: result => {
    if (result.Release) {
      return result.Release.Name;
    }

    return 'N/A';
  }
};
module.exports = ResultParser;
