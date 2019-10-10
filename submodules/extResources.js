var ExtResources = function() {};

var generateLinkAttachment = function(link, title) {
  var results = {
    attachments: [
      {
        fallback: title,
        color: '#36a64f',
        title: title,
        title_link: link
      }
    ]
  };
  return results;
};

ExtResources.prototype.devZoneLinks = {
  webSDK: {
    attachments: [
      {
        fallback: 'Web SDK Developer Zone',
        color: '#36a64f',
        author_name: 'MicroStrategy Developer Zone',
        author_link: 'http://developer.microstrategy.com',
        author_icon: 'https://community.microstrategy.com/s/favicon.png',
        title: 'Web SDK Documentation & Examples',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/WebSDK/default.htm',
        text:
          'Searchable section with thorough information on: architecture, APIs, examples, and more reference links.',
        thumb_url:
          'https://community.microstrategy.com/resource/1497975160000/Community_Web_sdk'
      },
      {
        fallback: 'Java API Reference',
        color: '#36a64f',
        title: 'Java API Reference',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/ReferenceFiles/index.html',
        text:
          'Documentation on APIs exposed through the MSTR Web SDK, for developing in Java or understanding some of the classes or methods mentioned in MSTR Web'
      },
      {
        fallback:
          'Tip: Find these links any time by going to developer.microstrategy.com',
        color: '#f0ca00',
        text:
          'Tip: Get to this documentation quicker by going to developer.microstrategy.com.'
      }
    ]
  },
  mobileSDK: {
    attachments: [
      {
        fallback: 'Mobile SDK Developer Zone',
        color: '#36a64f',
        author_name: 'MicroStrategy Developer Zone',
        author_link: 'http://developer.microstrategy.com',
        author_icon: 'https://community.microstrategy.com/s/favicon.png',
        title: 'Mobile SDK Documentation & Examples',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/MobileSDK/default.htm',
        text:
          'Searchable section with thorough information on: Android & iOS Mobile SDK, scenarios, examples and references.',
        thumb_url:
          'https://community.microstrategy.com/resource/1497975160000/Community_Icon_MobileSDK'
      },
      {
        fallback: 'iOS SDK API Reference',
        color: '#36a64f',
        title: 'iOS SDK API Reference',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/DevLib/sdk_mobile/html/index.html',
        text:
          'Documentation on APIs exposed through the MicroStrategy iOS SDK, both for customizing the existing iOS app and implementing MSTR into custom iOS applications.'
      },
      {
        fallback: 'Android SDK API Reference?',
        color: 'warning',
        title: 'Android SDK API Reference?',
        text:
          'The Android SDK is more limited than the iOS SDK. Type !androidsdk for more info.'
      },
      {
        fallback:
          'Tip: Find these links any time by going to developer.microstrategy.com',
        color: '#f0ca00',
        text:
          'Tip: Get to this documentation quicker by going to developer.microstrategy.com.'
      }
    ]
  },
  androidSDK: {
    attachments: [
      {
        fallback: 'Android SDK Developer Zone',
        color: '#36a64f',
        author_name: 'MicroStrategy Developer Zone',
        author_link: 'http://developer.microstrategy.com',
        author_icon: 'https://community.microstrategy.com/s/favicon.png',
        title: 'Android SDK Documentation & Examples',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/MobileSDK/default.htm#topics/android/andr_What_Can_You_Do_with_the_Mobile_SDK.htm',
        text:
          'Searchable section with thorough information on the Android Mobile SDK, with scenarios and examples.'
        //"thumb_url": "https://community.microstrategy.com/resource/1497975160000/Community_Icon_MobileSDK",
      },
      {
        fallback:
          'Note: While the our iOS SDK exposes programmable APIs, our Android SDK does not yet have such APIs exposed.',
        color: 'warning',
        text:
          'Note: While the our iOS SDK exposes programmable APIs, our Android SDK does not yet have such APIs exposed.\n Last updated for MicroStrategy 10.7 by @tsiebler'
      }
    ]
  },
  visSDK: {
    attachments: [
      {
        fallback: 'Visualization SDK Developer Zone',
        color: '#36a64f',
        author_name: 'MicroStrategy Developer Zone',
        author_link: 'http://developer.microstrategy.com',
        author_icon: 'https://community.microstrategy.com/s/favicon.png',
        title: 'Visualization SDK Documentation & Examples',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/VisSDK/default.htm',
        text:
          'Searchable section with thorough information & examples on creating, implementing and extending custom visualizations using javascript & CSS.',
        thumb_url:
          'https://community.microstrategy.com/resource/1497975160000/Community_Icon_VizSDK'
      },
      {
        fallback: 'Visualization Builder',
        color: '#36a64f',
        title: 'Visualization Builder',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/VisSDK/default.htm#topics/HTML5/Using_Vis_Builder.htm',
        text:
          'The MicroStrategy tool used for building, implementing & enhancing custom HTML5 Visualizations.'
      },
      {
        fallback: 'API References',
        color: '#36a64f',
        title: 'API References',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/VisSDK/Content/topics/HTML5/API_Reference.htm',
        text:
          'Documentation on APIs exposed through the Visualization SDK, including detailed examples and version information. Note some of the visualization APIs are only available from a certain version, and only available in visual insight.'
      },
      {
        fallback: 'Visualizations Gallery',
        color: '#36a64f',
        title: 'Visualizations Gallery',
        title_link: 'https://community.microstrategy.com/s/gallery',
        text:
          'Gallery of ready-to-go, downloadable, samples to be used in MicroStrategy. Note that some of these sample visualizations rely on premium 3rd-party APIs that may require additional license.'
      },
      {
        fallback:
          'Tip: Find these links any time by going to developer.microstrategy.com',
        color: '#f0ca00',
        text:
          'Tip: Get to this documentation quicker by going to developer.microstrategy.com.'
      }
    ]
  },
  restapi: {
    attachments: [
      {
        fallback: 'Rest SDK Developer Zone',
        color: '#36a64f',
        author_name: 'MicroStrategy Developer Zone',
        author_link: 'http://developer.microstrategy.com',
        author_icon: 'https://community.microstrategy.com/s/favicon.png',
        title: 'Rest SDK: JSON Data API Documentation & Examples',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/RESTSDK/default.htm',
        text:
          'Searchable section with thorough information & examples on the REST API (JSON Data API), including syntax, architecture and examples.',
        thumb_url:
          'https://community.microstrategy.com/resource/1497975160000/Community_Icon_RestSDK'
      },
      {
        fallback: 'Live Demo (with source)',
        color: '#36a64f',
        title: 'Live Demo (with source)',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/RESTSDK/default.htm#topics/JSON_Data_API/JSON_Data_API_Sample.htm',
        text:
          'Live demo of a javascript website using the JSON Data API connected to the Tutorial Demo server, accessible by customers.'
      },
      {
        fallback:
          'Tip: Find these links any time by going to developer.microstrategy.com',
        color: '#f0ca00',
        text:
          'Tip: Get to this documentation quicker by going to developer.microstrategy.com.'
      }
    ]
  },
  dataconnectorsdk: {
    attachments: [
      {
        fallback: 'Data Connector SDK Developer Zone',
        color: '#36a64f',
        author_name: 'MicroStrategy Developer Zone',
        author_link: 'http://developer.microstrategy.com',
        author_icon: 'https://community.microstrategy.com/s/favicon.png',
        title: 'Data Connector SDK Documentation & Examples',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/DataConnectorSDK/default.htm',
        text:
          'Searchable section with thorough information & examples on the Data Connector SDK, including syntax, architecture and examples.',
        thumb_url:
          'https://community.microstrategy.com/resource/1497975160000/Community_IconDataSDK'
      },
      {
        fallback: 'API Reference',
        color: '#36a64f',
        title: 'API Reference',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/DataConnectorSDK/Content/topics/API_References/API_Reference.htm',
        text:
          'Reference information on the APIs exposed and used by the Data Connector SDK'
      },
      {
        fallback: 'Downloadable Examples',
        color: '#36a64f',
        title: 'Downloadable Examples',
        title_link:
          'https://community.microstrategy.com/s/gallery?tabset-89baf=202df',
        text:
          'Downloaded & ready-to-go examples within the connector gallery in community.'
      },
      {
        fallback: 'API Examples',
        color: '#36a64f',
        title: 'API Examples',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/DataConnectorSDK/Default.htm#topics/Creating_a_Connector.htm',
        text:
          'Several basic examples demonstrating key ways the API can be leveraged.'
      },
      {
        fallback:
          'Tip: Find these links any time by going to developer.microstrategy.com',
        color: '#f0ca00',
        text:
          'Tip: Get to this documentation quicker by going to developer.microstrategy.com.'
      }
    ]
  },
  officesdk: {
    attachments: [
      {
        fallback: 'Office SDK Developer Zone',
        color: '#36a64f',
        author_name: 'MicroStrategy Developer Zone',
        author_link: 'http://developer.microstrategy.com',
        author_icon: 'https://community.microstrategy.com/s/favicon.png',
        title: 'Office SDK Documentation & Examples',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/DevLib/sdk_office/moiapi.htm',
        text:
          'Searchable section with thorough information & examples on the MicroStrategy Office SDK, including syntax and examples. Note that the Office SDK is only available for .NET (windows) environments.',
        thumb_url:
          'http://images.techhive.com/images/article/2013/06/office_mobile_icon-100042298-orig.jpg'
      },
      {
        fallback:
          'Tip: Find these links any time by going to developer.microstrategy.com',
        color: '#f0ca00',
        text:
          'Tip: Get to this documentation quicker by going to developer.microstrategy.com.'
      }
    ]
  },
  serversdk: {
    attachments: [
      {
        fallback: 'Server SDK Documentation',
        color: '#36a64f',
        author_name: 'MicroStrategy Developer Zone',
        author_link: 'http://developer.microstrategy.com',
        author_icon: 'https://community.microstrategy.com/s/favicon.png',
        title: 'Server SDK Documentation',
        title_link:
          'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/DevLib/sdk_iserver/api_ref/index.html',
        text:
          'Raw API documentation for developing with the Intelligence Server SDK. For detailed examples refer to existing community articles. Notes:',
        fields: [
          {
            title: 'Windows Only',
            value:
              'The server SDK is only available for .NET (windows) environments.',
            short: false
          },
          {
            title: 'Not for customizing',
            value:
              'This API is designed for building custom applications leveraging the I-Server APIs. The existing intelligence server cannot be customized, contrary to how the Web SDK works.',
            short: false
          }
        ],
        thumb_url:
          'https://cdn3.iconfinder.com/data/icons/computer-network-icons/512/Data_Center-128.png'
      },
      {
        fallback:
          'Tip: Find these links any time by going to developer.microstrategy.com',
        color: '#f0ca00',
        text:
          'Tip: Get to this documentation quicker by going to developer.microstrategy.com.'
      }
    ]
  }
};

ExtResources.prototype.getReadmeForVersion = function(version) {
  //scrape this for list of readmes: https://microstrategyhelp.atlassian.net/wiki/display/MSTRDOCS/MicroStrategy+Product+Documentation
  switch (version) {
    case '10':
    case '10.0':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/README10/MicroStrategy+10+Readme',
        'MicroStrategy 10 Readme'
      );
    break;

    case '101':
    case '10.1':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/README101/MicroStrategy+10.1+Readme',
        'MicroStrategy 10.1 Readme'
      );
    break;

    case '102':
    case '10.2':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/README102/MicroStrategy+10.2+Readme',
        'MicroStrategy 10.2 Readme'
      );
    break;

    case '103':
    case '10.3':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/README103/MicroStrategy+10.3+Readme',
        'MicroStrategy 10.3 Readme'
      );
    break;

    case '104':
    case '10.4':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/README104/MicroStrategy+10.4+Readme',
        'MicroStrategy 10.4 Readme'
      );
    break;

    case '105':
    case '10.5':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/README105/MicroStrategy+10.5+Readme',
        'MicroStrategy 10.5 Readme'
      );
    break;

    case '106':
    case '10.6':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/README106/MicroStrategy+10.6+Readme',
        'MicroStrategy 10.6 Readme'
      );
    break;

    case '107':
    case '10.7':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/README107/MicroStrategy+10.7+Readme',
        'MicroStrategy 10.7 Readme'
      );
    break;

    case '108':
    case '10.8':
      return generateLinkAttachment(
        'https://microstrategyhelp.atlassian.net/wiki/display/108README/MicroStrategy+10.8+Readme',
        'MicroStrategy 10.8 Readme'
      );
    break;

  default:
    return {
      attachments: [
        {
            fallback: 'Unknown version specified',
            color: '#36a64f',
          title:
              'Unknown version specified & this list is currently hardcoded.'
        }
        ]
      };
    break;
  }
};

module.exports = new ExtResources();
