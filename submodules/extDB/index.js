const debug = require('debug')('DBCore');

const mysql = require('mysql');
const flow = require('flow');

const generateInsertPost = require('./util/generateInsertPost');
const monthDiff = require('./util/monthDiff');
const testDbConnection = require('./util/testDbConnection');
const isMessagePrivate = require('../SlackHelpers/isMessagePrivate');
const getStorageTeam = require('../SlackHelpers/storage/getStorageTeam');

const SalesforceLib = require('../sfLib');
const sfLib = new SalesforceLib();

const ERR_NOT_FOUND = 0;
const ERR_QUERY = 1;
const ERR_OTHER = 2;

// TODO: move this into constructor after deprecating flowjs
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.mysqlServer,
  user: process.env.mysqlUser,
  password: process.env.mysqlPwd,
  database: process.env.mysqlDB,
  insecureAuth: true
});

let connectionTested = false;

class ExtDB {
  constructor() {
    if (connectionTested) {
      console.log('Already tested connection, why are we checking it twice?');
      debugger;
      return;
    }

    console.log('Preparing & testing DB connection...');
    try {
      testDbConnection(pool)
        .then(() => console.log('DB connection successful!'))
        .then(() => this.connectionTested = true);

    } catch (e) {
      console.error('DB connection failed: ', e);
      throw e;
    }
  }

  query(SQL) {
    debug(`Executing query() with SQL: (${SQL})`);
    return new Promise((resolve, reject) => {
      pool.query(SQL, (error, results, fields) => {
        if (error) return reject({ error, SQL, results });

        return resolve({ error, results, fields });
      });
    });
  }

  // TODO: All pool calls should be replaced with this promise-wrapped mysql execution
  queryPool(queryString, argArray) {
    debug(`queryPool() Executing query() with SQL: (${queryString})`);

    return new Promise((resolve, reject) => {
      pool.query(queryString, argArray, (error, results, fields) => {
        if (error) return reject(error);
        return resolve(results);
      });
    });
  }

  // inserts row into DB when a post is seen
  insertPostStat(controller, message, callback) {
    var URLts = '';
    var messageText;
    if (typeof message.event_ts != 'undefined') URLts = message.event_ts;
    else if (typeof message.action_ts != 'undefined') {
      //console.log("Ignoring action event, probably a button from jarvis was clicked");
      return;
    } else {
      console.log(
        'WARNING ExtDB.insertPostStat(): message.event_ts undefined? May cause issues'
      );
    }

    if (message.channel.charAt(0) == 'C') {
      //public channel
      messageText = message.text;
    } else {
      //private channel
      messageText = 'Private Channel';
    }

    var postContent = generateInsertPost(
      message.ts,
      message.thread_ts,
      messageText,
      process.env.slackDomain +
        '/archives/' +
        message.channel +
        '/p' +
        message.event_ts.replace('.', ''),
      message.user,
      message.channel
    );

    var insertSQL =
      'INSERT INTO ' + process.env.mysqlTableStatsPosts + ' SET ?';
    debug(`Executing query() with SQL: (${insertSQL})`);
    pool.query(insertSQL, postContent, (error, results, fields) => {
      //if (error) throw error;

      //console.log('SQL RESULT: ', results);
      callback(error, results);
    });
  }

  /*
  		MEMORY & STORAGE

  */
  /*
  	Simple yes/no toggle for an existing thread. If thread doesn't exist yet/isn't known yet by the bot, it'll tell the user to trigger the thread process if they want sync.

  */
  setSyncStateForSlackThread(controller, message, shouldSync, callback) {
    // works blindly even if thread doesn't exist, without causing error. 0 affected rows means no thread exists yet
    var SQLpost = {
      sf_should_sync: shouldSync
    };
    const sql = 'UPDATE ?? SET ? WHERE thread_ts = ?';

    debug(`setSyncStateForSlackThread() Executing query() with SQL: (${sql})`);
    pool.query(
      sql,
      [process.env.mysqlTableMemoryThreads, SQLpost, message.thread_ts],
      (error, results, fields) => {
        //console.log('SQL RESULT: ', results);
        if (!error) {
          if (results.affectedRows == 0) {
            return callback(
              "A thread hasn't been created yet in your case. Say `@jarvis case xxxxx` here to set this up.",
              false,
              fields
            );
          }
        } else {
          return callback(error, results, fields);
        }
        return callback(error, results.affectedRows != 0, fields);
      }
    );
  }

  /*
  	Called when SF thread has been created for case. Inserts a record of that thread and any related info, so both the SF post/thread and case info can be found using nothing but the slack thread timestamp.
  */
  setSFThreadForSlackThread(message, sf_case, sf_post_id, shouldSync) {
    const thread_ts =
      typeof message.thread_ts != 'undefined'
        ? message.thread_ts
        : message.original_message.thread_ts;

    const SQLpost = {
      thread_ts: thread_ts,
      dt_added: new Date(),
      slack_user_id: message.user,
      slack_channel_id: message.channel,
      message_text: message.original_message.startingPost,
      sf_case: sf_case,
      sf_post_id: sf_post_id,
      sf_post_created: true,
      sf_post_url: process.env.sfURL + '/' + sf_post_id,
      sf_should_sync: shouldSync
    };

    const sql = 'INSERT INTO ?? SET ?';
    debug(
      `setSFThreadForSlackThread(): Executing query() with SQL: (${sql}) & vars (${SQLpost})`
    );

    // pass through the parent callback
    return this.queryPool(sql, [process.env.mysqlTableMemoryThreads, SQLpost]);
  }

  async getSFThreadForSlackThread(controller, message) {
    const lookupSQL = 'SELECT * FROM ?? WHERE thread_ts = ?';
    debug(
      `getSFThreadForSlackThread() Executing query() with SQL: (${lookupSQL})`
    );

    const teamStorageObject = await getStorageTeam(controller, message.team);

    return this.queryPool(
      lookupSQL,
      [process.env.mysqlTableMemoryThreads, message.thread_ts]
    )
    .then(dbThreadResults => (dbThreadResults && dbThreadResults.length) ? dbThreadResults[0] : false)
    .catch(error => console.error(error.stack || error));
  }

  // TODO ew...flow.exec. Promisfy!!!
  getSFThreadForSlackThreadOld(controller, message, callback) {
    flow.exec(
      function() {
        // query if user is already in lookup table
        const lookupSQL = 'SELECT * FROM ?? WHERE thread_ts = ?';
        debug(
          `getSFThreadForSlackThread() Executing query() with SQL: (${lookupSQL})`
        );
        pool.query(
          lookupSQL,
          [process.env.mysqlTableMemoryThreads, message.thread_ts],
          this.MULTI('dbThread')
        );

        // get any info from local storage, if there at all
        controller.storage.teams.get(message.team, this.MULTI('teamStorage'));

        // pass important params to next step
        // this.MULTI("params")(controller, message, callback, pool);
      },
      function(results) {
        var dbThread = results.dbThread,
          teamStorage = results.teamStorage,
          SQLpost,
          storedThread;
        //params = results.params,
        //test = controller;
        debugger;

        var dbResult = false,
          teamStoreResult = false,
          shouldMigrate = false,
          shouldRemoveOld = false;

        if (
          typeof dbThread.length == 'undefined' ||
          dbThread[0] ||
          !dbThread[1]
        ) {
          console.log(
            'ERROR ExtDB.getSFThreadForSlackThread: SQL error occurred ',
            dbThread
          );

          return callback(dbThread, null, null);
        }

        if (teamStorage[0] || !teamStorage[1]) {
          // error in reading from team storage. This should prevent further calls
          return callback(
            'Error in reading from team storage',
            teamStorage,
            null
          );
        }

        if (dbThread[1].length) dbResult = true;

        if (typeof teamStorage[1].sf_threads != 'undefined')
          storedThread = teamStorage[1].sf_threads[message.thread_ts];

        teamStoreResult = typeof storedThread != 'undefined';

        // thread isn't known yet
        if (!teamStoreResult && !dbResult) return callback(null, false, null);

        // found thread in local storage, but not DB. Time to migrate
        if (teamStoreResult && !dbResult) {
          shouldMigrate = true;

          SQLpost = {
            thread_ts: storedThread.thread_ts,
            dt_added: new Date(),
            slack_user_id: message.user,
            slack_channel_id: message.channel,
            message_text: message.text,
            sf_case: storedThread.sf_case,
            sf_post_id: storedThread.sf_post_id,
            sf_post_created: storedThread.sf_post_created,
            sf_post_url: process.env.sfURL + '/' + storedThread.sf_post_id,
            sf_should_sync: storedThread.shouldSync
          };

          const sql = 'INSERT INTO ?? SET ?';

          debug(
            `getSFThreadForSlackThread().saveThread Executing query() with SQL: (${sql})`
          );
          pool.query(
            sql,
            [process.env.mysqlTableMemoryThreads, SQLpost],
            this.MULTI('dbSaveThread')
          );
        } else if (teamStoreResult && dbResult) {
          // found thread info in local team store & JarvisDB. Want to migrate old thread to JarvisDB
          // clean up local storage to only store essentials
          shouldRemoveOld = true;

          SQLpost = dbThread[1][0];
          var thread_id = SQLpost.thread_id;
          delete SQLpost.thread_id;

          SQLpost = {
            thread_ts: storedThread.thread_ts,
            dt_added: new Date(),
            slack_user_id: message.user,
            slack_channel_id: message.channel,
            message_text: message.text,
            sf_case: storedThread.sf_case,
            sf_post_id: storedThread.sf_post_id,
            sf_post_created: storedThread.sf_post_created,
            sf_post_url: process.env.sfURL + '/' + storedThread.sf_post_id,
            sf_should_sync: storedThread.shouldSync
          };

          pool.query(
            'UPDATE ?? SET ? WHERE thread_id = ?',
            [process.env.mysqlTableMemoryThreads, SQLpost, thread_id],
            this.MULTI('dbSaveThread')
          );
        } else {
          // received only JarvisDB result, no local teamStoreResult (desired outcome);
          // run callback, providing known info for that thread and return early
          callback(null, true, dbThread[1][0]);
          return;
        }
        this.MULTI('params')(callback, SQLpost, teamStorage);
      },
      function(results) {
        var dbSaveThread = results.dbSaveThread;
        var SQLpost = results.params[1];
        var teamStorage = results.params[2];

        if (!dbSaveThread[0]) {
          controller.storage.teams.get(message.team, function(err, team) {
            // freshly get the current teams storage
            var result = team.sf_threads[message.thread_ts];

            // purge the current thread from sf_threads
            delete team.sf_threads[message.thread_ts];

            // save the new teams storage to complete the migration
            controller.storage.teams.save(team, function(err, saved) {
              console.log(
                '--------> Migration of thread ' +
                  message.thread_ts +
                  ' to JarvisDB successfully completed. ' +
                  Object.keys(team.sf_threads).length +
                  ' threads remain in local storage.'
              );
            });
          });
        } else {
          callback(dbSaveThread[0], true, SQLpost);
          return;
        }

        callback(null, true, SQLpost);
      }
    );
  }

  /*
  		LOOKUPS

  */
  /*
  	- if a user's not known yet, ±4 secs to lookup user in slack and salesforce APIs.
  	- if a user's known and no refresh is needed, ±0.01 secs to lookup user in JarvisDB.
  */
  // TODO: clean me
  lookupUserWithID(bot, userID, callback) {
    debugger;
    // simulate expected syntax for message object
    return this.lookupUser(bot, {
      user: userID
    }).then(result => callback(null, result));
  }

  lookupUser(bot, message) {
    debug(`Running lookupUser on ${message.user}`);
    return this.queryPool('SELECT * FROM ?? WHERE slack_user_id = ?', [
      process.env.mysqlTableUsersLU,
      message.user
    ])
    .then(results => {
      if (!results.length) {
        debug(`lookupUser returned no results, calling refresh`);
        return this.refreshSlackUserLookup(bot, message);
      }

      if (results.length == 1) {
        debug(`lookupUser returned 1 result`);
        // check if channel should be refreshed
        return this.handleUserResult(bot, message, results);
      }

      debug(`lookupUser returned multiple results: `, results);
      return this.handleUserResult(bot, message, results);
    })
    .then(results => results.length ? results[0] : results);
  }

  async refreshSlackUserLookup(bot, message) {
    try {
      const userInfo = await this.getUserInfoFromAPI(bot, message);
      debug(`refreshSlackUserLookup: got slack user info: `, userInfo);

      const email = userInfo.slack_useremail;
      if (!email) {
        throw new Error(`refreshSlackUserLookup failed as this slack user has no email defined?? userInfo: ${JSON.stringify(userInfo)} & message: ${JSON.stringify(message)}`);
      }

      if (userInfo.sf_username === 'bot') {
        debug(`refreshSlackUserLookup: Blocking further slack lookup as this user is a bot: ${userInfo}`);
        userInfo.sf_user_id = userInfo.slack_username;
        this.queryPool('REPLACE ?? SET ?', [
          process.env.mysqlTableUsersLU,
          userInfo
        ]);
        return userInfo;
      }

      const [ userObjectRef, ...rest ] = await sfLib.getUserWithEmail(email);
      debug(`refreshSlackUserLookup: got sf user info: `, userObjectRef, rest);

      if (!userObjectRef) {
        throw new Error(`SF user not found using email address: ${userInfo.slack_useremail} for slack user ${JSON.stringify(userInfo)}`);
      }

      // username in sf is first half of email address
      userInfo.sf_username = email ? email.split('@')[0] : email;

      // id comes from sf
      userInfo.sf_user_id = userObjectRef.Id;

      // upsert user info for next time;
      this.queryPool('REPLACE ?? SET ?', [
        process.env.mysqlTableUsersLU,
        userInfo
      ]);

      return userInfo;

    } catch (e) {
      console.error(`refreshSlackUserLookup failed for user Id: ${message.user} due to exception: `, e);

      if (e === 'noResults') {
        return false;
      }

      throw e;
    }
  }

  getUserInfoFromAPI(bot, message) {
    return new Promise((resolve, reject) => {
      return bot.api.users.info(
        {
          user: message.user
        },
        (ok, response) => {
          if (!response || !response.ok) return reject(response);

          const isBot = response.user.is_bot;
          const username = response.user.name;
          const email = isBot ? `${username}@slackbot.com` : response.user.profile.email;
          const responseObject = {
            slack_user_id: response.user.id,
            slack_username: isBot ? username : response.user.profile.display_name,
            slack_usertitle: response.user.profile.title,
            slack_useremail: email,
            slack_team_id: response.user.profile.team,
            first_name: response.user.profile.first_name,
            last_name: response.user.profile.last_name,
            real_name: response.user.profile.real_name,
            dt_last_resolved: new Date(),
            // This threw a few exceptions, rarely. If email is missing, just leave this as null.
            sf_username: isBot ? 'bot' : email ? response.user.profile.email.split('@')[0] : email
          };

          if (!email) {
            console.warn(`getUserInfoFromAPI() - email missing in user response: (${JSON.stringify(response)}) & message: (${message})`);
          }

          return resolve(responseObject);
        }
      );
    });
  }

  handleUserResult(bot, message, result) {
    const lastRefreshDate = result[0].dt_last_resolved;
    const monthsDiff = monthDiff(new Date(lastRefreshDate), new Date());

    if (!result.sf_user_id || !result.sf_username) {
      debug(`DB user info is missing sf_user_id and/or sf_username, running SF user sync`);
      return this.refreshSlackUserLookup(bot, message);
    }

    if (monthsDiff <= process.env.maxLURowAge) {
      return Promise.resolve(result);
    }

    return this.refreshSlackUserLookup(bot, message);
  }

  /*
  	- if channel's not known yet, ±0.5 seconds to lookup channel in slack APIs and save to JarvisDB for later.
  	- if channel's known and refresh is needed, ±0.5 seconds to lookup, update and return
  	- if channel's known and no refresh needed, ±0.02 seconds to lookup channel: most scearios covered by this
  */
  /*
    - Query slack APIs for channel info
    - Persist info in local DB
    - Return resolved channel info
  */
  lookupChannel(bot, message) {
    debug(`lookupChannel entered`);
    if (
      message.type &&
      message.type == 'interactive_message_callback' &&
      message.raw_message &&
      message.raw_message.channel.name == 'directmessage'
    ) {
      debug(`lookupChannel returning pm channel info`);
      return Promise.resolve({
        slack_channel_name: message.raw_message.channel.name,
        isPrivateMessage: true
      });
    }

    return this.queryPool('SELECT * FROM ?? WHERE slack_channel_id = ?', [
      process.env.mysqlTableChannelsLU,
      message.channel
    ])
      .then(results => {
        if (!results || !results.length) {
          debug(`lookupChannel query returned no results: `, results);
          return this.refreshSlackChannelLookup(bot, message);
        }

        if (results.length == 1) {
          debug(`lookupChannel query returned 1 result: `, results);
          // check if channel should be refreshed
          return this.handleChannelResult(bot, message, results);
        }

        debug(`lookupChannel query returned multiple results, taking first: `, results);
        // check if channel should be refreshed
        return this.handleChannelResult(bot, message, results);
      })
      .then(results => (Array.isArray(results) ? results[0] : results))
      .catch(error => {
        console.error(`Exception thrown in lookupChannel(): ${error}`);
        debugger;
      });
  }

  handleChannelResult(bot, message, result) {
    var lastRefreshDate = result[0].dt_last_resolved;
    var monthsDiff = monthDiff(new Date(lastRefreshDate), new Date());
    if (monthsDiff <= process.env.maxLURowAge) {
      debug(`lookupChannel result is new enough, returning as-is`);
      return Promise.resolve(result);
    }

    debug(`lookupChannel result is too old, refreshing via refreshSlackChannelLookup`);
    return this.refreshSlackChannelLookup(bot, message);
  }

  refreshSlackChannelLookup(bot, message) {
    return this.getChannelInfoFromAPI(bot, message)
      .then(channelInfo => {
        // upsert channel info for next time;
        this.queryPool('REPLACE ?? SET ?', [
          process.env.mysqlTableChannelsLU,
          channelInfo
        ]);
        return channelInfo;
      })
      .catch(response => {
        if (!response || !response.ok) {
          throw new Error(
            `refreshSlackChannelLookup() failed due to error: ${response.error}`
          );
        }
        console.error(`refreshSlackChannelLookup() failed: ${JSON.stringify(response)}`);
      });
  }

  getChannelInfoFromAPI(bot, message) {
    return new Promise((resolve, reject) => {
      if (isMessagePrivate(message)) {
        return bot.api.groups.info(
          {
            channel: message.channel
          },
          (err, response) => {
            if (!response || !response.ok) return reject(response);
            return resolve({
              slack_channel_id: response.group.id,
              slack_channel_name: response.group.name,
              slack_channel_visibility: 'Private',
              dt_last_resolved: new Date()
            });
          }
        );
      }

      return bot.api.channels.info(
        {
          channel: message.channel
        },
        (ok, response) => {
          if (!response || !response.ok) return reject(response);
          return resolve({
            slack_channel_id: response.channel.id,
            slack_channel_name: response.channel.name,
            slack_channel_visibility: response.channel.is_private
              ? 'Private'
              : 'Public',
            dt_last_resolved: new Date()
          });
        }
      );
    });
  }

  // combines the above two functions and doesn't run the callback until both results are present
  // TODO: refactor dependents and promisify completely
  async lookupUserAndChannel(controller, bot, message, callback) {
    if (false) console.log('lookupUserAndChannel() entered');
    const channelInfo = await this.lookupChannel(bot, message);
    if (!channelInfo) {
      debugger;
    }

    const userInfo = await this.lookupUser(bot, message);
    if (!userInfo) {
      debugger;
    }

    return callback(null, userInfo, channelInfo);
  }

  /*

  	Failover & error handling

  */
  handleFailedSyncComment(failedSOQL, errorInfo, messageTS, threadTS) {
    // log SOQL
    // mark post in stats_posts sf_comment_added = 0
  }

  handleFailedSQL(failedSQL, errorInfo) {}
}
module.exports = ExtDB;
