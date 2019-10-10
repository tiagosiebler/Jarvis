const debug = require('debug')('rally:lib');

const SimpleError = require('../Error/SimpleError');
const ResultParser = require('./ResultParser');
const getRallyMentionCommentMarkup = require('./getRallyMentionCommentMarkup');

const rally = require('rally');
const queryUtils = rally.util.query;
const refUtils = rally.util.ref;

const requiredResponseFields = [
  'FormattedID',
  'Name',
  'State',
  'ScheduleState',
  'Release',
  'ProductionRelease',
  'Iteration',
  'CreationDate',
  'ClosedDate',
  'Project',
  'ObjectID',
  'Method',
  'Type',
  'c_TestCaseStatus',
  'PlanEstimate',
  'DisplayColor',
  'CreatedBy'
];

class RallyLib {
  constructor() {
    this.restAPI = rally({
      apiKey: process.env.rallyAPIKey,
      requestOptions: {
        headers: {
          'X-RallyIntegrationName': "Tiago Siebler's SlackBot Jarvis",
          'X-RallyIntegrationVendor': 'MicroStrategy Technical Support',
          'X-RallyIntegrationVersion': '1.0'
        }
      }
    });
  }

  getAPI() {
    return this.restAPI;
  }

  getUtil() {
    return rally.util;
  }

  getKeyToTypes() {
    return {
      DE: 'defect',
      US: 'hierarchicalrequirement',
      F: 'portfolioitem/feature',
      I: 'portfolioitem/initiative',
      TA: 'Task',
      TS: 'TestSet',
      TC: 'TestCase'
    };
  }

  // TODO: this should probably just reverse getKeyToTypes(), as this is just duplicate noise
  getPrefixForRallyType(type) {
    const lowerCaseType = type.toLowerCase();

    if (lowerCaseType === 'defect') return 'DE';
    if (lowerCaseType === 'hierarchicalrequirement') return 'US';
    if (lowerCaseType === 'portfolioitem/feature') return 'F';
    if (lowerCaseType === 'portfolioitem/initiative') return 'I';
    if (lowerCaseType === 'testset') return 'TS';
    if (lowerCaseType === 'testcase') return 'TC';
    if (lowerCaseType === 'task') return 'TA';
  }

  // map ID prefixes to
  getRallyQueryObjectType(formattedID) {
    if (formattedID.startsWith('DE')) return 'defect';
    if (formattedID.startsWith('US')) return 'hierarchicalrequirement';
    if (formattedID.startsWith('F')) return 'portfolioitem/feature';
    if (formattedID.startsWith('I')) return 'portfolioitem/initiative';
    if (formattedID.startsWith('TA')) return 'Task';
    if (formattedID.startsWith('TS')) return 'TestSet';
    if (formattedID.startsWith('TC')) return 'TestCase';

    return new SimpleError(
      'unknType',
      `ID ${formattedID} is not recognised as rally object type. Expected one of ${Object.keys(
        this.getKeyToTypes()
      )}`
    );
  }

  getReadableObjectType(formattedID) {
    if (formattedID.startsWith('DE')) return 'defect';
    if (formattedID.startsWith('US')) return 'user story';
    if (formattedID.startsWith('F')) return 'feature';
    if (formattedID.startsWith('I')) return 'initiative';
    if (formattedID.startsWith('TS')) return 'test set';
    if (formattedID.startsWith('TC')) return 'test case';
    return 'unknown object type';
  }

  getRallyURLForType(type = '', results) {
    const projectRootURL = `https://${process.env.rallyDomain}/#/${results.Project.ObjectID}d`;
    return `${projectRootURL}/search?keywords=${results.FormattedID}`;
  }

  getRallyQueryForID(IDprefix, formattedID) {
    const objectType = this.getRallyQueryObjectType(formattedID);
    if (typeof objectType != 'string') {
      debug(
        `getRallyQueryForID() might fail, as type is not a string: ${JSON.stringify(
          objectType
        )}`
      );
    }

    return {
      type: objectType,
      fetch: requiredResponseFields,
      query: queryUtils.where('FormattedID', '=', formattedID),
      limit: 10 //the maximum number of results to return- enables auto paging
    };
  }

  getMultiQueryForProperty(propertyName, queriesArray) {
    let query = queryUtils.where(propertyName, '=', queriesArray.pop());
    for (let i = 0; i < queriesArray.length; i++) {
      query = query.or(propertyName, '=', queriesArray[i]);
    }
    return query;
  }

  queryRallyTags(tagsArray) {
    const query =
      tagsArray.length == 1
        ? queryUtils.where('Name', '=', tagsArray[0])
        : this.getMultiQueryForProperty('Name', tagsArray);

    return this.getAPI()
      .query({
        type: 'Tag',
        fetch: ['ObjectID', 'Name'],
        query,
        limit: Infinity
      })
      .then(response => response.Results)
      .then(results =>
        results.map(result => {
          return {
            _ref: refUtils.getRelative(result._ref)
          };
        })
      );
  }

  queryRallyTag(tagName) {
    return this.getAPI()
      .query({
        type: 'Tag',
        fetch: ['ObjectID', 'Name', 'Archived'],
        query: queryUtils.where('Name', '=', tagName),
        limit: 10 //the maximum number of results to return- enables auto paging
      })
      .then(response =>
        response.Results.filter(result => result.Name == tagName)
      )
      .then(result => result[0]);
  }

  buildQueriesByType(queryIdsByType) {
    let queryByType = {};

    // Don't think we can query multiple rally types at once, so we group queries by type
    // (all defects at once, all user stories at once, etc)
    for (const rallyType in queryIdsByType) {
      let query;

      // build x=y query strings
      queryIdsByType[rallyType]
        .map(splitType => splitType.join('').toUpperCase())
        .map(formattedId => {
          if (!query) {
            query = queryUtils.where('FormattedID', '=', formattedId);
          } else {
            query = query.or('FormattedID', '=', formattedId);
          }
        });

      // this is the query object we can send to the Rally API
      queryByType[rallyType] = {
        type: rallyType,
        fetch: requiredResponseFields,
        query: query.toQueryString(),
        limit: queryIdsByType[rallyType].length
      };

      debug(
        `Built rally query for type (${rallyType}): ${JSON.stringify(
          queryByType[rallyType],
          null,
          2
        )}`
      );
    }

    return queryByType;
  }

  /*
   *  @public Query multiple IDs in as few API calls as possible.
   */
  async queryRallyWithIds(queryIds = [['DE', '123455']], slackUser) {
    // collect query object types (defects vs stories vs etc)
    const queryObjectTypes = {};
    const resultObjectsByType = {};
    for (const splitQueryId of queryIds) {
      const formattedId = splitQueryId.join('');
      const objectType = this.getRallyQueryObjectType(formattedId);

      resultObjectsByType[objectType] = [];

      // track the objects by type that we'll need
      if (!queryObjectTypes[objectType]) queryObjectTypes[objectType] = [];
      queryObjectTypes[objectType].push(splitQueryId);
    }

    // build queries ready to go to Rally APi
    const queriesByType = this.buildQueriesByType(queryObjectTypes);

    // execute all api calls in parallel, grouped by rally object type
    const executionPromises = [];
    for (const rallyType in queriesByType) {
      const query = queriesByType[rallyType];
      const queryPromise = this.getAPI().query(query);
      executionPromises.push(queryPromise);
    }

    // wait for all results to return
    const queryResults = await Promise.all(executionPromises);

    // collect & transform results
    for (const queryResult of queryResults) {
      if (queryResult.Errors.length) {
        console.error(
          `rallyLib saw errors in query result: ${JSON.stringify(queryResult)}`
        );
      }

      if (queryResult.Warnings.length) {
        console.warn(
          `rallyLib saw warnings in query result: ${JSON.stringify(
            queryResult
          )}`
        );
      }

      if (queryResult.Results.length) {
        queryResult.Results.forEach(result => {
          const type = result._type.toLowerCase();
          const originalQuery = queriesByType[type].query;

          // exclusion: skip any results we didn't ask for
          if (!originalQuery.includes(result.FormattedID)) return;
          resultObjectsByType[type].push(
            this.transformQueryResultForType(type, result, slackUser)
          );
        });
      }
    }

    return resultObjectsByType;
  }

  transformQueryResultForType(rallyType, results, slackUser) {
    const gatewayURL = `http://${process.env.rallyGateDomain}:${process.env.rallyGatePort}/CSRallygate/#?user=${slackUser}&rallyoid=${results.ObjectID}`;
    const gatewayURLIP = `http://${process.env.rallyGateIP}:${process.env.rallyGatePort}/CSRallygate/#?user=${slackUser}&rallyoid=${results.ObjectID}`;

    // console.log('rally results: ', JSON.stringify(results));
    const rallyInfo = {
      ...results,
      ID: results.FormattedID,
      urlPortal: gatewayURL,
      urlPortalIP: gatewayURLIP,
      url: this.getRallyURLForType(rallyType, results),
      name: results.Name,
      GeneralState: results.State,
      ActualRelease: results.c_ProductionRelease,
      CreatedDtRaw: results.CreationDate,
      ClosedDtRaw: results.ClosedDate,
      error: false,
      ScheduleRelease: ResultParser.getScheduledRelease(results),
      Iteration:
        results.Iteration && results.Iteration.Name
          ? results.Iteration.Name
          : null,
      Project:
        results.Project && results.Project.Name ? results.Project.Name : null
    };

    //console.log(type + ' success', rallyInfo);
    return rallyInfo;
  }

  /*
   *  @public Query a single Rally ID for a slack user. The user is used for building a rally gateway link.
   */
  queryRallyWithID(
    IDprefix = 'DE',
    formattedID = 'DE123456',
    slackUser = 'tsiebler'
  ) {
    const rallyQuery = this.getRallyQueryForID(IDprefix, formattedID);
    const objectType = this.getRallyQueryObjectType(formattedID);

    if (objectType.error) {
      throw new Error(objectType.errorMSG);
    }

    return this.getAPI()
      .query(rallyQuery)
      .then(result => {
        if (!result.Results.length) {
          throw new SimpleError(
            'rallyNotFound',
            'No rally entry was found with the selected ID. Make sure the rally ID is correct. \n\nQuery:```' +
              JSON.stringify(rallyQuery) +
              '```'
          );
        }

        const results = result.Results[0];
        return this.transformQueryResultForType(objectType, results, slackUser);
      });
  }

  getRallyRefForID(IDprefix, formattedID) {
    return this.getAPI()
      .query({
        type: this.getRallyQueryObjectType(formattedID),
        fetch: ['ObjectID'],
        query: queryUtils.where('FormattedID', '=', formattedID),
        limit: 1
      })
      .then(results => {
        if (!results.Results.length)
          throw new Error(`No results returned: ${results}`);
        return results.Results[0]._ref;
      });
  }

  addCommentToRallyTicket(
    IDprefix,
    formattedID,
    message,
    userInfo,
    channelName,
    slackURL,
    isMessagePrivate
  ) {
    return this.getRallyRefForID(IDprefix, formattedID)
      .then(rallyRef => {
        const messageTemplate = getRallyMentionCommentMarkup(
          message.text,
          userInfo,
          channelName,
          slackURL,
          this.getReadableObjectType(formattedID),
          isMessagePrivate
        );
        const createCommentRequestObject = {
          type: 'ConversationPost',
          data: {
            Text: messageTemplate,
            Artifact: refUtils.getRelative(rallyRef)
          }
        };
        return this.getAPI().create(createCommentRequestObject);
      })
      .then(result => {
        debug(`Created "mentioned" post in rally item: ${result.Object.Text}`);
      })
      .catch(error => {
        console.error(
          `addCommentToRallyTicket() saw error in creating rally post: ${error}`
        );
      });
  }

  // returns array of existing tag names
  getTagsForRallyWithID(formattedID) {
    return this.getAPI()
      .query({
        type: this.getRallyQueryObjectType(formattedID),
        fetch: ['Tags'],
        query: queryUtils.where('FormattedID', '=', formattedID),
        limit: 1
      })
      .then(response => response.Results)
      .then(results => results[0])
      .then(rallyObject =>
        rallyObject && rallyObject.Tags ? rallyObject.Tags._tagsNameArray : []
      )
      .then(tags => tags.map(tag => tag.Name));
  }

  // - logic to add one tag to rally ticket with minimal api calls
  // - logic to add multiple tags to rally ticket with same amt of api calls
  addTagsToRallyWithID(IDprefix, formattedID, tagsArray) {
    const queries = [];
    queries.push(this.queryRallyTags(tagsArray));
    queries.push(this.getRallyRefForID(IDprefix, formattedID));

    return Promise.all(queries)
      .then(results => {
        const tagResults = results[0];
        const rallyQueryResult = results[1];

        if (!tagResults.length) {
          console.warn(
            `Tags (${tagsArray}) weren't added to ${formattedID} as no results were found in tags ref query`
          );
          return false;
        }

        if (!rallyQueryResult) {
          console.warn(
            `Tags (${tagsArray}) weren't added to ${formattedID} as the rally object for ${formattedID} wasn't found - is the ID valid?`
          );
          return false;
        }

        // Run query to add tags to this rally ID
        const addTagsRequestObject = {
          ref: refUtils.getRelative(rallyQueryResult),
          collection: 'Tags',
          data: tagResults,
          fetch: ['Tags', 'FormattedID', 'Name', 'State']
        };

        return this.getAPI().add(addTagsRequestObject);
      })
      .catch(error => {
        console.error(
          `Adding tags (${tagsArray}) to ${formattedID} failed due to exception: `,
          error
        );
      });
  }
}

module.exports = new RallyLib();
