const sf = require('jsforce');

const SfSlackFn = require('./SfSlackFn');
const debug = require('debug')('sfLib');

const uname = process.env.sfUser;
const pword = process.env.sfPwd;
const token = process.env.sfToken;
const clientId = process.env.sfClientId;
const clientSecret = process.env.sfClientSecret;

function treatAsUTC(date) {
  var result = new Date(date);
  result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
  return result;
}

function daysBetween(startDate, endDate) {
  var millisecondsPerDay = 24 * 60 * 60 * 1000;
  return (treatAsUTC(endDate) - treatAsUTC(startDate)) / millisecondsPerDay;
}

class SalesforceLib {
  constructor(controller) {
    this.loggedIn = Promise.resolve(false);
    this.sessionStart = false;

    this.conn = new sf.Connection({
      oauth2: {
        clientId: clientId,
        clientSecret: clientSecret,
        redirectUri: process.env.sfRedirectUri //'https://login.salesforce.com/services/oauth2/success'
      },
      version: '39.0' //want/need the newer SF APIs
    });

    this.conn.on('refresh', this.onConnectionRefresh.bind(this));

    if (controller) controller.sfLib = this;
  }

  onConnectionRefresh(accessToken, res) {
    // Refresh event will be fired when renewed access token
    // to store it in your storage for next request
    debug('sfLib: onConnectionRefresh hit: ', accessToken);
  }

  generateError(key, message) {
    return SfSlackFn.generateError(key, message);
  }

  refreshSession() {
    return new Promise(resolve => {
      this.login(conn => {
        return resolve(conn);
      });
    });
  }

  login(callback) {
    if (!uname) {
      throw new Error(`No sf username provided: ${uname}`);
    }

    if (!pword) {
      throw new Error(`No sf encoded password provided: ${pword}`);
    }

    if (typeof this.conn != 'object') {
      this.conn = new sf.Connection({
        oauth2: {
          clientId: clientId,
          clientSecret: clientSecret,
          redirectUri: 'https://efe5a7a5.ngrok.io/oauth'
        },
        version: '39.0' //want/need the newer SF APIs
      });
      this.loggedIn = false;
    }

    this.conn.on('refresh', function(accessToken, res) {
      // Refresh event will be fired when renewed access token
      // to store it in your storage for next request
      debug('sfLib: refresh hit', accessToken, res);
    });

    if (!this.sessionStart || daysBetween(this.sessionStart, new Date()) > 5) {
      debug('Refreshing SF session');
      //this.loggedIn = sfLib.conn.oauth2.authenticate(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);
      this.loggedIn =
        this.loggedIn ||
        this.conn.login(
          new Buffer(uname, 'base64').toString('ascii'),
          new Buffer(pword, 'base64').toString('ascii') + token,
          (err, res) => {
            if (err)
              return console.error(
                'SF Authentication failed: ',
                err.stack || err
              );
            return debug(`Logged into SF: ${JSON.stringify(res)}`);
          }
        );
    } else {
      debug('>>> sf session is fine');
    }

    //this.loggedIn = this.loggedIn || this.conn.login(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);

    // just login every time for now
    this.loggedIn = this.conn.login(
      new Buffer(uname, 'base64').toString('ascii'),
      new Buffer(pword, 'base64').toString('ascii') + token,
      (err, res) => {
        if (err)
          return console.error('SF Authentication failed: ', err.stack || err);
        return debug(`Logged into SF: ${JSON.stringify(res)}`);
      }
    );
    //this.loggedIn = this.loggedIn || this.conn.oauth2.authenticate(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);

    this.loggedIn.then(info => {
      // debug(
      //   'authenticated, oauth test URL if desired: ' + this.conn.oauth2.getAuthorizationUrl()
      // );

      this.sessionStart = new Date();
      callback(this.conn);

      return this.conn;
    });
  }

  loginNew(callback) {
    // refresh if its been more than 5 days since last refresh
    if (!this.sessionStart || daysBetween(this.sessionStart, new Date()) > 5) {
      debug('loginNew() refreshing SF session');
      //this.loggedIn = this.conn.oauth2.authenticate(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);
      this.loggedIn =
        this.loggedIn ||
        this.conn.login(
          new Buffer(uname, 'base64').toString('ascii'),
          new Buffer(pword, 'base64').toString('ascii') + token,
          (err, res) => {
            if (err)
              return console.error(
                'SF Authentication failed: ',
                err.stack || err
              );
            return debug(`Logged into SF: ${JSON.stringify(res)}`);
          }
        );
    } else {
      debug('sf session is fine');
    }

    //this.loggedIn = this.loggedIn || this.conn.login(new Buffer(uname, 'base64').toString('ascii'), new Buffer(pword, 'base64').toString('ascii') + token);
    this.loggedIn =
      this.loggedIn ||
      this.conn.oauth2.authenticate(
        new Buffer(uname, 'base64').toString('ascii'),
        new Buffer(pword, 'base64').toString('ascii') + token
      );

    this.loggedIn.then(() => {
      this.sessionStart = new Date();

      return callback(this.conn);
    });
  }

  // login(conn) {
  //   console.log(
  //     'oauthURL: \n',
  //     conn.oauth2.getAuthorizationUrl()
  //   );
  // }

  getCase(caseNumber, callbackFunction) {
    this.login(conn => {
      //console.log("SalesForce Session Established");
      conn
        .sobject('Case')
        .find(
          { CaseNumber: caseNumber },
          'Id, CaseNumber, Status, Subject, Priority, Description, Status_Summary__c, Version__c, Service_Pack__c, District__c, isCloud__c'
          // '*'
        )
        .limit(5)
        .execute(function(err, records) {
          if (err) {
            console.error('getCase: SalesForce Error in Query: ', err);
            callbackFunction(err);
            return err;
          }

          callbackFunction(err, records);
        });
    });
  }

  fetchCase(
    caseNumber,
    columns = 'Id, CaseNumber, Status, Subject, Priority, Description, Status_Summary__c, Version__c, Service_Pack__c, District__c, isCloud__c'
  ) {
    return this.fetchResultsForSObjectQuery('Case', { CaseNumber: `${caseNumber}` }, columns, 5);
  }

  fetchResultsForSObjectQuery(type, query, columns, limit = 5) {
    return new Promise((resolve, reject) => {
      debug(
        `Executing fetch sobject(${type}), query(${JSON.stringify(
          query
        )}) & columns(${columns})`
      );
      return this.refreshSession().then(conn =>
        conn
          .sobject(type)
          .find(query, columns)
          .limit(limit)
          .execute((err, records) => {
            if (err) return reject(err);
            return resolve(records);
          })
      );
    });
  }

  getKBArticle(articleNumber, callbackFunction) {
    this.refreshSession().then(conn => {
      console.log('SfLib.getKBArticle(): Have SF session');

      var columns = 'Id, Title, Summary, ValidationStatus';
      var query =
        'FIND {' +
        articleNumber +
        '} IN NAME FIELDS RETURNING KnowledgeArticleVersion(' +
        columns +
        " WHERE PublishStatus = 'Online' AND Language = 'en_US')";

      conn.search(query, function(err, res) {
        if (err) {
          console.error('SalesForce Error in Find Query: ', err);
          return callbackFunction(err);
        }

        console.log(
          'should have TN result: ',
          res,
          JSON.stringify(res.searchRecords)
        );
        return callbackFunction(err, res.searchRecords);
      });
    });
  }

  fetchKBArticles(articlesArray) {
    const columns = 'Id, Title, Summary, ValidationStatus';
    var articles = '';
    for (let i = 0; i < articlesArray.length; i++) {
      articles += 'KB' + articlesArray[i];
      if (i + 1 < articlesArray.length) articles += ' OR ';
    }

    const query = `FIND {${articles}} IN NAME FIELDS RETURNING KnowledgeArticleVersion(${columns} WHERE PublishStatus = 'Online' AND Language = 'en_US')`;
    return this.fetchResultsForQuery(query);
  }

  // Search using SOQL
  // If given a choice, use fetchObjectWithType instead
  fetchResultsForQuery(query) {
    return new Promise((resolve, reject) => {
      debug('Executing search query: ', query);
      return this.refreshSession().then(conn =>
        conn.search(query, (err, res) => {
          if (err) return reject(err);
          return resolve(res.searchRecords);
        })
      );
    });
  }

  // Search using object type query
  // If given a choice, use this, instead of fetchResultsForQuery();
  fetchObjectWithType(type, queryObject, responseColumns = '*', limit = 1) {
    return new Promise((resolve, reject) => {
      return this.refreshSession().then(conn => {
        conn
          .sobject(type)
          .find(queryObject, responseColumns)
          .limit(limit)
          .execute((err, records) => {
            if (err) return reject(err);
            if (limit === 1) return resolve(records[0]);
            return resolve(records);
          });
      });
    });
  }

  fetchContactWithEmail(email) {
    const objectType = 'Contact';
    const query = {
      Email: email
    };
    return this.fetchObjectWithType(objectType, query);
  }

  createObjectWithType(type, params) {
    return new Promise((resolve, reject) => {
      this.conn.sobject(type).create(params, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    });
  }

  updateObjectWithType(type, objectId, params) {
    return new Promise((resolve, reject) => {
      this.conn.sobject(type).update(
        {
          Id: objectId,
          ...params
        },
        (err, result) => {
          if (err) return reject(err);
          return resolve(result);
        }
      );
    });
  }

  // mostly internal function, hence the conn parameter to re-use an existing session. Need to design this module better.
  getContact(conn, email, callbackFunction) {
    return conn
      .sobject('Contact')
      .find({ Email: email }, 'Id, Name, Email')
      .limit(1)
      .execute(function(err, records) {
        if (err) {
          console.error('getContact: SalesForce Error in Query: ', err);
          callbackFunction(err);
          return err;
        }
        return callbackFunction(err, records);
      });
  }

  // SETTERS
  setCaseSME(
    caseNumber,
    sfUserID,
    slackUserRef,
    slackPostURL,
    shouldOverwrite,
    callbackFunction
  ) {
    if (true) console.log('SfLib.setCaseSME(): Preparing SF Session');
    if (!sfUserID) {
      debugger;
    }

    this.refreshSession()
      .then(conn => {
        if (true) console.log('SfLib.setCaseSME(): Getting case info...');

        return new Promise((resolve, reject) => {
          this.conn
            .sobject('Case')
            .find(
              { CaseNumber: '' + caseNumber },
              'Id, CaseNumber, Status, Subject, Priority, Description, Status_Summary__c, Version__c, Service_Pack__c, Product_Support_Specialist__c'
            )
            .limit(1)
            .execute((err, records) => {
              // if (err) return reject(err);
              return resolve({ err, records });
            });
        });
      })
      .then(({ err, records }) => {
        if (err) {
          console.log('setCaseSME: Error reading case: ', err);
          return callbackFunction(err);
          // return Promise.resolve(false);
        }

        const caseInfo = records[0];

        // check if there's already an SME, or if we've been told to overwrite an existing SME
        if (
          caseInfo.Product_Support_Specialist__c == null ||
          caseInfo.Product_Support_Specialist__c == sfUserID ||
          shouldOverwrite
        ) {
          if (caseInfo.Product_Support_Specialist__c == sfUserID) {
            console.log(
              'setCaseSME: SME already set to this user. No further action needed.'
            );
            return callbackFunction(null, caseInfo);
          }

          //overwrite support specialist
          return new Promise(resolve => {
            this.conn.sobject('Case').update(
              {
                Id: caseInfo.Id,
                Product_Support_Specialist__c: sfUserID
              },
              (err, ret) => {
                // if (err) reject(err);
                resolve({ err, ret });
              }
            );
          });
        }

        // ask API to ask user to confirm overwriting, since SME was already set.
        // if they click yes, call this again with shouldOverwrite == true
        return callbackFunction(
          'that case already has an SME assigned.',
          false,
          caseInfo
        );
      })
      .then(info => {
        if (!info) return false;

        const { err, ret } = info;
        if (err || !ret.success) {
          console.error(err, ret);
          return callbackFunction(err, ret);
        }

        var msgBody =
          '<p><b>Jarvis</b>: Case SME assigned via slack request from <b>@' +
          slackUserRef +
          '</b>: ' +
          slackPostURL +
          '</p>';

        //add post to case, tracking change was made, without listening to callback (from creating this post)
        this.conn.sobject('FeedItem').create(
          {
            ParentId: ret.id,
            Type: 'TextPost',
            Body: msgBody,
            IsRichText: true,
            NetworkScope: 'AllNetworks',
            Visibility: 'InternalUsers'
          },
          (err, result) => {
            if (err) {
              console.error(
                'WARNING: SF error in creating new post tracking SME change: ',
                err,
                msgBody
              );
              //return callbackFunction(err);
            } else if (result.success) {
              console.log('SF post created tracking SME change', result);
              //return callbackFunction(err, result);
            }
          }
        );

        callbackFunction(null, ret);
      });
  }

  createThreadInCase(caseNumber, msgBody) {
    return new Promise((resolve, reject) => {
      // msgBody = msgBody.replace(/<!(.*?)\|@\1>/g, '@$1');
      this.getCase(caseNumber, (err, records) => {
        if (err) {
          console.log('SalesForce Error createThreadInCase: ', err);
          return reject(err);
        }

        //console.log("createThreadInCase: got the case, preparing new post in case...");
        const caseRef = records[0];

        // Create feed item
        this.conn.sobject('FeedItem').create(
          {
            ParentId: caseRef.Id,
            Type: 'TextPost',
            Body: msgBody,
            IsRichText: true,
            NetworkScope: 'AllNetworks',
            Visibility: 'InternalUsers'
          },
          (err, result) => {
            //console.log("Callback on create FeedItem call");

            if (err) {
              console.error(
                'SalesForce Error in creating new post: ',
                err,
                msgBody
              );
              return reject(err);
            }

            if (result.success) {
              console.log('Post created, triggering callback. Post: ', result);
              return resolve(result);
            }

            throw new Error(
              `createThreadInCase() reached end without result.success: ${result}`
            );
          }
        );
      });
    });
  }

  createTaskInCase(
    caseNumber,
    assignToEmail,
    ownerUserId,
    description,
    subject,
    taskType,
    taskPriority,
    taskStatus,
    time,
    callbackFunction,
    progressFunction
  ) {
    if (progressFunction) progressFunction('Checking assignee...');
    if (progressFunction)
      progressFunction('Checking case ' + caseNumber + '...');

    return this.refreshSession().then(conn => {
      return this.getCase(caseNumber, (err, records) => {
        if (err != null) {
          console.log('SalesForce Error Fetching Case: ', err);
          callbackFunction(err);
          return err;
        }

        var caseRef = records[0];
        var today = new Date();
        today.setDate(today.getDate() + 3); // set 3 days from now, for the moment

        if (progressFunction)
          progressFunction(
            'Loaded case ' + caseNumber + ', preparing contact for task...'
          );

        return this.getContact(conn, assignToEmail, (err, results) => {
          if (err) {
            throw new Error({ err, results });
          }

          if (progressFunction)
            progressFunction(
              'Loaded contact for task, ready for new task in case ' +
                caseNumber +
                '...'
            );
          var contactId = results[0].Id;

          var taskObject = {
            Priority: taskPriority,
            Status: taskStatus,
            Subject: subject, //limited to 255 characters
            WhoId: contactId,
            WhatId: caseRef.Id,
            Type: taskType,
            Description: description,
            OwnerId: ownerUserId,
            ActivityDate: today.toISOString().substring(0, 10)
          };
          if (time && time != 'none') taskObject.Time_hp__c = time;

          this.conn.sobject('Task').create(taskObject, function(err, result) {
            if (err) {
              console.error(
                'WARNING: createTaskInCase() SalesForce Error in logging new task ',
                err
              );
              return callbackFunction(err, result);
            }

            if (result.success) {
              //if(progressFunction) progressFunction("Task successfully logged, preparing URL...");
              console.log('Task logged with ID: ' + result.id);
            }
            callbackFunction(err, result);
          }); //*/
        });
      });
    });
  }

  // POSTS
  //https://help.salesforce.com/articleView?id=fields_using_html_editor.htm&type=0
  addCommentToPost(sf_post_id, msgBody, callbackFunction) {
    msgBody = msgBody.replace(/<!(.*?)\|@\1>/g, '@$1');

    return this.login(() => {
      // Create feed comment on existing post

      this.conn.sobject('FeedComment').create(
        {
          FeedItemId: sf_post_id,
          CommentType: 'TextComment',
          CommentBody: msgBody,
          IsRichText: true
        },
        function(err, result) {
          if (err) {
            console.error(
              'SalesForce Error in adding new comment to post: ',
              err
            );
            callbackFunction(err);
            return err;
          }
          if (result.success) {
            //console.log("Comment added to existing post: ",result);
            //Post created:  { id: '0D544000057u88jCAA', success: true, errors: [] }
          }
          callbackFunction(err, result);
        }
      );
    });
  }

  readPost(caseNumber, postID, callbackFunction) {
    return this.getCase(caseNumber, (err, records) => {
      if (err != null) {
        console.log('SalesForce Error Fetching Case: ', err);
        callbackFunction(err);
        return err;
      }

      conn
        .sobject('FeedItem')
        .find({ Id: postID }, '*')
        .limit(5)
        .execute(function(err, records) {
          if (err) {
            console.error('readPost: SalesForce Error in Query: ', err);
            callbackFunction(err);
            return err;
          }
          console.log(records);
          return callbackFunction(err, records);
        });
    });
  }

  readCommentOnPost(caseNumber, postID, commentID, callbackFunction) {
    return this.getCase(caseNumber, (err, records) => {
      if (err != null) {
        console.log('SalesForce Error Fetching Case: ', err);
        callbackFunction(err);
        return err;
      }

      var caseRef = records[0];

      conn
        .sobject('FeedItem')
        .find({ Id: postID }, '*')
        .limit(5)
        .execute(function(err, records) {
          if (err) {
            console.error(
              'readCommentOnPost: SalesForce Error in Query: ',
              err
            );
            callbackFunction(err);
            return err;
          }
          console.log(records);
          return callbackFunction(err, records);
        });
    });
  }

  /*

		User stuff

	*/
  getUser(uName, callbackFunction) {
    this.login(conn => {
      conn
        .sobject('User')
        .find({ CommunityNickname: uName }, 'Id') //'*')//User_ID_18_digit__c, Support_Team__c, Business_Unit__c
        .limit(1)
        .execute(function(err, records) {
          if (err) {
            console.error('getUser: SalesForce Error in Query: ', err);
            callbackFunction(err);
            return err;
          }
          callbackFunction(err, records);
        });
    });
  }

  getUserWithEmail(uEmail, callbackFunction) {
    debug(`getUserWithEmail(${uEmail}, cb)...`);
    return new Promise((resolve, reject) => {
      this.login(conn => {
        conn
          .sobject('User')
          .find({ Email: uEmail }, 'Id') //'*')//User_ID_18_digit__c, Support_Team__c, Business_Unit__c
          .limit(1)
          .execute(function(err, records) {
            if (err) {
              console.error(
                'getUserWithEmail: SalesForce Error in Query: ',
                err
              );
              callbackFunction && callbackFunction(err);
              reject(err);
              return err;
            }

            debug(`getUserWithEmail(${uEmail}, cb)... results: `, records);

            if (!records || !records.length) {
              callbackFunction && callbackFunction(true, records);
              return reject('noResults');
            }

            callbackFunction && callbackFunction(err, records);
            return resolve(records);
          });
      });
    });
  }
}

module.exports = SalesforceLib;
