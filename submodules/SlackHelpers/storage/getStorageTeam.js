// Return promise resolving with stored memory on team-level (comes from JSON store)
const getStorageTeam = (controller, team) => {
  return new Promise((resolve, reject) => {
    controller.storage.teams.get(team, (err, storage) => {
      if (err) return reject(err);
      return resolve(storage);
    })
  });
};

module.exports = getStorageTeam;
