const debug = require('debug')('rally:lib');

const SimpleError = require('../Error/SimpleError');
const ResultParser = require('./ResultParser');
const getRallyMentionCommentMarkup = require('./getRallyMentionCommentMarkup');

const rally = require('rally');
const queryUtils = rally.util.query;
const refUtils = rally.util.ref;

const linkTypes = {
  defect: 'defect',
  hierarchicalrequirement: 'userstory'
};

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

  // map ID prefixes to
  getRallyQueryObjectType(formattedID) {
    if (formattedID.startsWith('DE')) return 'defect';
    if (formattedID.startsWith('US')) return 'hierarchicalrequirement';
    if (formattedID.startsWith('F')) return 'portfolioitem/feature';
    if (formattedID.startsWith('I')) return 'portfolioitem/initiative';
    if (formattedID.startsWith('TS')) return 'TestSet';
    if (formattedID.startsWith('TC')) return 'TestCase';

    return new SimpleError(
      'unknType',
      'rally ID not recognised as story or defect (not prefixed with DE/US)'
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
    const linkType = type.includes('/')
      ? type
      : linkTypes[type]
        ? linkTypes[type]
        : type;

    const projectRootURL = `https://${process.env.rallyDomain}/#/${
      results.Project.ObjectID
    }d`;

    if (linkType)
      return `${projectRootURL}/search?keywords=${results.FormattedID}`;
    //   return `${projectRootURL}/detail/${linkType}/${results.ObjectID}`;

    throw new SimpleError(
      'unknownObjectType',
      `Link structure for objects of type ${type} is unhandled`
    );
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
      'DisplayColor'
    ];

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

  queryRallyWithID(IDprefix, formattedID, slackUser) {
    const rallyQuery = this.getRallyQueryForID(IDprefix, formattedID);
    const objectType = this.getRallyQueryObjectType(formattedID);

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

        const gatewayURL = `http://${process.env.rallyGateDomain}:${
          process.env.rallyGatePort
        }/CSRallygate/#?user=${slackUser}&rallyoid=${results.ObjectID}`;
        const gatewayURLIP = `http://${process.env.rallyGateIP}:${
          process.env.rallyGatePort
        }/CSRallygate/#?user=${slackUser}&rallyoid=${results.ObjectID}`;

        // console.log('rally results: ', JSON.stringify(results));
        const rallyInfo = {
          ...results,
          ID: results.FormattedID,
          urlPortal: gatewayURL,
          urlPortalIP: gatewayURLIP,
          url: this.getRallyURLForType(objectType, results),
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
            results.Project && results.Project.Name
              ? results.Project.Name
              : null
        };

        //console.log(type + ' success', rallyInfo);
        return rallyInfo;
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
      .then(
        rallyObject =>
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
