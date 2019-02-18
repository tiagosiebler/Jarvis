const debug = require('debug')('rally:lib');

const SimpleError = require('../Error/SimpleError');
const ResultParser = require('./ResultParser');
const getRallyMentionCommentMarkup = require('./getRallyMentionCommentMarkup');
const isMessagePrivate = require('../SlackHelpers/isMessagePrivate');

const rally = require('rally');
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
const queryUtils = rally.util.query;
const refUtils = rally.util.ref;

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
    return 'unknown object type';
  }

  getRallyURLForType(type = '', results) {
    const linkType = type.includes('/') ? type : linkTypes[type];

    if (linkType)
      return `https://${process.env.rallyDomain}/#/${
        results.Project.ObjectID
      }d/detail/${linkType}/${results.ObjectID}`;

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

    return {
      type: objectType,
      fetch: [
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
        'ObjectID'
      ],
      query: queryUtils.where('FormattedID', '=', formattedID),
      limit: 10 //the maximum number of results to return- enables auto paging
    };
  }

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

        // console.log('rally results: ', JSON.stringify(results));
        const rallyInfo = {
          ID: results.FormattedID,
          urlPortal: `http://${process.env.rallyGateDomain}:${
            process.env.rallyGatePort
          }/CSRallygate/#?user=${slackUser}&rallyoid=${results.ObjectID}`,
          url: this.getRallyURLForType(objectType, results),
          name: results.Name,
          ScheduleState: results.ScheduleState,
          GeneralState: results.State,
          //ScheduleRelease: results.Release.Name,
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

  generateSnapshotAttachment(result) {
    const results = {
      attachments: [
        {
          fallback: 'Snapshot of ' + result.ID,
          color: '#36a64f',
          title: result.ID + ': ' + result.name,
          title_link: result.urlPortal,
          fields: [
            {
              title: 'Scheduled State',
              value: result.ScheduleState,
              short: true
            },
            {
              title: 'State',
              value:
                result.GeneralState && result.GeneralState.Name
                  ? result.GeneralState.Name
                  : result.GeneralState,
              short: true
            },
            {
              title: 'Scrum Team',
              value: result.Project,
              short: true
            },
            {
              title: 'Iteration',
              value: result.Iteration,
              short: true
            },
            {
              title: 'Scheduled Release',
              value: result.ScheduleRelease,
              short: true
            },
            {
              title: 'Production Release',
              value: result.ActualRelease,
              short: true
            }
          ],
          footer: '<' + result.url + '|Direct Rally Link Here>', //"Rally API",
          footer_icon: 'http://connect.tech/2016/img/ca_technologies.png'
        }
      ]
    };

    for (let i = 0; i < results.attachments[0].fields.length; i++) {
      if (results.attachments[0].fields[i].value == null) {
        results.attachments[0].fields[i] = null;
      }
    }
    return results;
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
    channelName,
    slackURL
  ) {
    const messageTemplate = getRallyMentionCommentMarkup(
      message.text,
      channelName,
      slackURL,
      this.getReadableObjectType(formattedID),
      isMessagePrivate(message)
    );

    return this.getRallyRefForID(IDprefix, formattedID)
      .then(rallyRef => {
        const create = {
          type: 'ConversationPost',
          data: {
            Text: messageTemplate,
            Artifact: refUtils.getRelative(rallyRef)
          }
        };
        return rallyRestAPI.create(create);
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
