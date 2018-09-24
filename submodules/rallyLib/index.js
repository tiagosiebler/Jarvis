const SimpleError = require('../Error/SimpleError');
const ResultParser = require('./ResultParser');

const rally = require('rally');
const rallyRestAPI = rally({
  apiKey: process.env.rallyAPIKey,
  requestOptions: {
    headers: {
      'X-RallyIntegrationName': 'Tiago Siebler\'s SlackBot Jarvis',
      'X-RallyIntegrationVendor': 'MicroStrategy Technical Support',
      'X-RallyIntegrationVersion': '1.0'
    }
  }
});
const queryUtils = rally.util.query;

const linkTypes = {
  defect: 'defect',
  hierarchicalrequirement: 'userstory'
}

class RallyLib {
  // map ID prefixes to
  getRallyObjectType(formattedID) {
    if (formattedID.startsWith("DE")) return 'defect';
    if (formattedID.startsWith("US")) return 'hierarchicalrequirement';

    return new SimpleError("unknType", "rally ID not recognised as story or defect (not prefixed with DE/US)");
  }

  getRallyURLForType(type, results) {
    const linkType = linkTypes[type];

    if (linkType) return `https://${
      process.env.rallyDomain
    }/#/${
      results.Project.ObjectID
    }d/detail/${
      linkType
    }/${
      results.ObjectID
    }`;

    return new SimpleError("unknownObjectType", `Link structure for objects of type ${type} is unhandled`);
  }

  queryRallyWithID(formattedID, slackUser, callbackFunction) {
    const objectType = this.getRallyObjectType(formattedID);

    const rallyQuery = {
      type: objectType,
      fetch: ['FormattedID', 'Name', 'State', 'ScheduleState', 'Release', 'ProductionRelease', 'Iteration', 'CreationDate', 'ClosedDate', 'Project', 'ObjectID'],
      query: `(FormattedID = ${formattedID})`,
      limit: 10, //the maximum number of results to return- enables auto paging
    };

    return rallyRestAPI
      .query(rallyQuery)
      .then(result => {
        if (!result.Results.length) {
          const error = new SimpleError("rallyNotFound", "No rally entry was found with the selected ID. Make sure the rally ID is correct.");
          return callbackFunction(error);
        }

        const results = result.Results[0];

        // console.log('rally results: ', JSON.stringify(results));
        const rallyInfo = {
          ID: results.FormattedID,
          urlPortal: `http://${
            process.env.rallyGateDomain
          }:${
            process.env.rallyGatePort
          }/CSRallygate/#?user=${
            slackUser
          }&rallyoid=${
            results.ObjectID
          }`,
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
          Iteration: results.Iteration && results.Iteration.Name ? results.Iteration.Name : null,
          Project: results.Project && results.Project.Name ? results.Project.Name : null,
        }

        //console.log(type + ' success', rallyInfo);
        return callbackFunction(rallyInfo);
      })
      .catch(error => {
        console.error('queryRallyWithID failed with error: ', error.message, error.errors, error);
        const resultError = new SimpleError("rallyErr", error.message);
        return callbackFunction(resultError);
      });
  }

  generateSnapshotAttachment(result) {
    var results = {
      attachments: [{
        fallback: "Snapshot of " + result.ID,
        color: "#36a64f",
        title: result.ID + ": " + result.name,
        title_link: result.urlPortal,
        //"text": "Optional text that appears within the attachment",
        fields: [
          {
            title: "Scrum Team",
            value: result.Project,
            short: true
          }, {
            title: "Iteration",
            value: result.Iteration,
            short: true
          },{
            title: "State",
            value: result.GeneralState,
            short: true
          }, {
            title: "Schedule State",
            value: result.ScheduleState,
            short: true
          }, {
            title: "Schedule Release",
            value: result.ScheduleRelease,
            short: true
          }, {
            title: "Production Release",
            value: result.ActualRelease,
            short: true
          },
        ],
        footer: "<" + result.url + "|Direct Rally Link>", //"Rally API",
        footer_icon: "http://connect.tech/2016/img/ca_technologies.png",
      }]
    };

    for (let i = 0; i < results.attachments[0].fields.length; i++) {
      if (results.attachments[0].fields[i].value == null) {
        results.attachments[0].fields[i] = null;
      }
    }
    return results;
  }
}

module.exports = new RallyLib();
