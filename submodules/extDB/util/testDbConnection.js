module.exports = pool => {
  return new Promise((resolve, reject) => {
    pool.query("SELECT 'stuff'", (error, results, fields) => {
      if (error) {
        return reject(error);
      }

      if (results[0].stuff != 'stuff') {
        return reject(`Unexpected result in DB connection test! Expected "stuff" but received ${JSON.stringify(results)}`);
      }

      return resolve('Startup DB Connection Successful');
    });
  })
}
