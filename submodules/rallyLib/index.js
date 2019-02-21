const debug = require('debug')('rally:lib');

const SimpleError = require('../Error/SimpleError');
const ResultParser = require('./ResultParser');
const getRallyMentionCommentMarkup = require('./getRallyMentionCommentMarkup');

const rally = require('rally');
const queryUtils = rally.util.query;
const refUtils = rally.util.ref;

const rallyRestAPI = rally({
  apiKey: process.env.rallyAPIKey,
  requestOptions: {
    headers: {
      'X-RallyIntegrationName': "Tiago Siebler's SlackBot Jarvis",
      'X-RallyIntegrationVendor': 'MicroStrategy Technical Support',
      'X-RallyIntegrationVersion': '1.0'
    }
  }
});

const linkTypes = {
  defect: 'defect',
  hierarchicalrequirement: 'userstory'
};

class RallyLib {
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
    const linkType = type.includes('/') ? type : linkTypes[type] ? linkTypes[type] : type;

    const projectRootURL = `https://${process.env.rallyDomain}/#/${results.Project.ObjectID}d`;

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
      'DisplayColor',
    ];

    return {
      type: objectType,
      fetch: requiredResponseFields,
      query: queryUtils.where('FormattedID', '=', formattedID),
      limit: 10 //the maximum number of results to return- enables auto paging
    };
  }

  // TODO: deprecate callback in favour of promise
  queryRallyWithID(IDprefix, formattedID, slackUser, callbackFunction) {
    const rallyQuery = this.getRallyQueryForID(IDprefix, formattedID);
    const objectType = this.getRallyQueryObjectType(formattedID);

    return rallyRestAPI
      .query(rallyQuery)
      .then(result => {
        if (!result.Results.length) {
          const error = new SimpleError(
            'rallyNotFound',
            'No rally entry was found with the selected ID. Make sure the rally ID is correct. \n\nQuery:```' +
              JSON.stringify(rallyQuery) +
              '```'
          );
          return callbackFunction(error);
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
        return callbackFunction(rallyInfo);
      })
      .catch(error => {
        console.error(
          'queryRallyWithID failed with error: ',
          error.message,
          error.errors,
          error
        );
        const resultError = new SimpleError('rallyErr', error.message);
        return callbackFunction(resultError);
      });
  }

  getRallyRefForID(IDprefix, formattedID) {
    return rallyRestAPI
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
        return rallyRestAPI.create(createCommentRequestObject);
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
}

module.exports = new RallyLib();
