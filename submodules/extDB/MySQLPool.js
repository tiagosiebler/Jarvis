const mysql = require('mysql');

const testDbConnection = require('./util/testDbConnection');
const debug = require('debug')('DBCore:MySQLPool');

/**
 *
 *    MySQL Pool
 *      A simple wrapper around a pooled DB connection
 */

module.exports = class MySQLPool {
  constructor() {
    this.connectionTested = false;
  }

  setupPool(host, username, password, database) {
    if (this.pool) {
      console.warn('JarvisDB Pool already setup');
      return this.pool;
    }

    this.pool = mysql.createPool({
      connectionLimit: 10,
      host: host,
      user: username,
      password: password,
      database: database,
      insecureAuth: true
    });
    return this.pool;
  }

  getPool() {
    return this.pool;
  }

  testConnection() {
    if (this.connectionTested) {
      console.log('Already tested connection, why are we checking it twice?');
      debugger;
      return;
    }

    console.log('Preparing & testing DB connection...');
    try {
      testDbConnection(this.pool)
        .then(() => console.log('DB connection successful!'))
        .then(() => (this.connectionTested = true));
    } catch (e) {
      console.error('DB connection failed: ', e);
      throw e;
    }
  }

  query(SQL) {
    debug(`Executing query() with SQL: (${SQL})`);
    return new Promise((resolve, reject) => {
      this.getPool().query(SQL, (error, results, fields) => {
        if (error) return reject({ error, SQL, results });

        return resolve({ error, results, fields });
      });
    });
  }

  // TODO: All pool calls should be replaced with this promise-wrapped mysql execution
  queryPool(queryString, argArray) {
    debug(
      `queryPool() Executing query() with SQL: (${queryString}) and argArray: (${JSON.stringify(
        argArray
      )})`
    );

    return new Promise((resolve, reject) => {
      this.getPool().query(queryString, argArray, (error, results, fields) => {
        if (error) return reject(error);
        return resolve(results);
      });
    });
  }
}