// custom modules with some hardcoded values/references
var scraper = require('../submodules/scraper.js');

// scope of where these commands will trigger (anywhere the bot is, right now)
var listenScope = {
  everywhere: 'ambient,direct_message,direct_mention,mention'
};

var regexList = {
  case: /^.*ts([0-9]+).*$/i,
  KB: /^.*kb([0-9]+).*$/i,
  TN: /^.*TN([0-9]+).*$/i,
  DE: /^.*DE([0-9]+).*$/i,
  US: /^.*US([0-9]+).*$/i,
  websdk: /websdk/i,
  mobilesdk1: /mob(.*)sdk/i,
  mobilesdk2: /iossdk/i,
  mobilesdk3: /andr(.*)sdk/i,
  vissdk: /vis(.*)sdk/i,
  restapi1: /rest(.*)sdk/i,
  restapi2: /rest(.*)api/i,
  restapi3: /json(.*)api/i,
  restapi4: /json(.*)sdk/i,
  datasdk1: /data(.*)sdk/i,
  datasdk2: /data(.*)api/i,
  datasdk3: /connector(.*)sdk/i,
  kbase1: /kbase(.*)/i,
  kbase2: /technote(.*)/i,
  kbase3: /tn(.*)/i,
  kbase4: /community(.*)/i,
  sdk: /(.*)sdk(.*)/i
};

var generatePlainAttachmentStr = function(title, str) {
  var retAttachment = {
    attachments: [
      {
      fallback: title,
      title: title,
        text: str
    }
    ]
  };
  return retAttachment;
};
var generatePlainAttachmentStrWithLink = function(title, link, str) {
  var retAttachment = {
    attachments: [
      {
      fallback: title,
      title: title,
      title_link: link,
        text: str
    }
    ]
  };
  return retAttachment;
};
var triggerQuickLink = function(bot, message, response) {
  //bot.reply(message, response);
  bot.startConversationInThread(message, function(err, convo) {
    if (!err) {
      convo.say(response);
      convo.activate();
    }
  });
};

var getFieldsForResults = function(results) {
  var data = results.data;
  var array = [];
  for (i = 0; i < data.length; i++) {
    var desc = data[i].desc;
    //var limit = 70;
    //if(desc.length > limit) desc = desc.substring(0,limit);
    //desc = desc.replace(/(\<.*\>)/g, "");

    array[i] = {
      title: i + 1 + '. ' + data[i].title,
      value: '<' + data[i].link + '| ' + data[i].path + '>',
      short: false
    };
  }
  return array;
};
var generateSearchResultAttachment = function(section, searchResults) {
  var searchIcon = 'https://community.microstrategy.com/s/favicon.png';

  // generate fields using results array
  var results = {
    attachments: [
      {
        fallback: searchResults.total + ' search results from the ' + section,
        color: '#36a64f',
        author_name:
          searchResults.total +
          ' search results from the ' +
          section +
          ', top results:',
        author_link: searchResults.link,
        author_icon: searchIcon,
        //"text": "Top results",
        fields: getFieldsForResults(searchResults)
      }
    ]
  };

  return results;
};
var triggerSearchInSection = function(
  bot,
  message,
  section,
  sectionConst,
  keywords
) {
  scraper.scrapeDevZoneResults(sectionConst, keywords, 4, function(result) {
    if (!result.success) {
      console.log(section + ': got search error - ', result);

      if (result.error.message.indexOf('wait() timed out after') != -1) {
        // timeout happened or no results, since results-list was never seen
        bot.reply(
          message,
          generatePlainAttachmentStrWithLink(
            'Search for keywords failed: ' + keywords,
            result.url,
            'Either no results were returned or the search timed out. Click the title of this message to try it yourself.'
          )
        );
      } else {
        // unknown error, try direct URL: result.url
        bot.reply(
          message,
          generatePlainAttachmentStrWithLink(
            'Search for keywords failed: ' + keywords,
            result.url,
            'An unknown error happened during the search. Click the title of this message to try it yourself.'
          )
        );
      }
    } else {
      console.log(section + ': got search results - ', result);
      // render reults as attachment
      var attachment = generateSearchResultAttachment(section, result);
      bot.reply(message, generateSearchResultAttachment(section, result));
    }
  });
};
var triggerSearchInSectionSwitch = function(bot, message, section, keywords) {
  var resultArray = [];

  switch (section) {
  case 'Web SDK DevZone':
    triggerSearchInSection(bot, message, section, 'WebSDK', keywords);
      break;

  case 'Mobile SDK DevZone':
    triggerSearchInSection(bot, message, section, 'MobileSDK', keywords);
      break;

  case 'Visualization SDK DevZone':
    triggerSearchInSection(bot, message, section, 'VisSDK', keywords);
      break;

  case 'REST API DevZone':
    triggerSearchInSection(bot, message, section, 'RESTSDK', keywords);
      break;

  case 'Data Connector SDK DevZone':
    triggerSearchInSection(
      bot,
      message,
      section,
      'DataConnectorSDK',
      keywords
    );
    break;
  }
};
var triggerSearch = function(bot, message, params) {
  var searchLocation = params[1];
  var searchKeywords = params.slice(2);
  var searchKeywordsStr = searchKeywords.join('+');
  var searchResults = [];
  console.log('searchKeywords: ', searchKeywords, searchKeywordsStr);

  if (searchLocation.match(regexList['websdk'])) {
    bot.startConversationInThread(message, function(err, convo) {
      if (!err) {
        convo.say(
          'Searching Web SDK documentation using keywords (' +
            searchKeywords.join(' ') +
            ')'
        );
        convo.activate();

        triggerSearchInSectionSwitch(
          bot,
          message,
          'Web SDK DevZone',
          searchKeywords.join(' ')
        );
      }
    });
  } else if (
    searchLocation.match(regexList['mobilesdk1']) ||
    searchLocation.match(regexList['mobilesdk2']) ||
    searchLocation.match(regexList['mobilesdk3'])
  ) {
    bot.startConversationInThread(message, function(err, convo) {
      if (!err) {
        convo.say(
          'Searching Mobile SDK documentation using keywords (' +
            searchKeywords.join(' ') +
            ')'
        );
        convo.activate();

        triggerSearchInSectionSwitch(
          bot,
          message,
          'Mobile SDK DevZone',
          searchKeywords.join(' ')
        );
      }
    });
  } else if (searchLocation.match(regexList['vissdk'])) {
    bot.startConversationInThread(message, function(err, convo) {
      if (!err) {
        convo.say(
          'Searching Visualization SDK documentation using keywords (' +
            searchKeywords.join(' ') +
            ')'
        );
        convo.activate();

        triggerSearchInSectionSwitch(
          bot,
          message,
          'Visualization SDK DevZone',
          searchKeywords.join(' ')
        );
      }
    });
  } else if (
    searchLocation.match(regexList['restapi1']) ||
    searchLocation.match(regexList['restapi2']) ||
    searchLocation.match(regexList['restapi3']) ||
    searchLocation.match(regexList['restapi4'])
  ) {
    bot.startConversationInThread(message, function(err, convo) {
      if (!err) {
        convo.say(
          'Searching REST JSON Data API documentation using keywords (' +
            searchKeywords.join(' ') +
            ')'
        );
        convo.activate();

        triggerSearchInSectionSwitch(
          bot,
          message,
          'REST API DevZone',
          searchKeywords.join(' ')
        );
      }
    });
  } else if (
    searchLocation.match(regexList['datasdk1']) ||
    searchLocation.match(regexList['datasdk2']) ||
    searchLocation.match(regexList['datasdk3'])
  ) {
    bot.startConversationInThread(message, function(err, convo) {
      if (!err) {
        convo.say(
          'Searching Data Connector SDK documentation using keywords (' +
            searchKeywords.join(' ') +
            ')'
        );
        convo.activate();

        triggerSearchInSectionSwitch(
          bot,
          message,
          'Data Connector SDK DevZone',
          searchKeywords.join(' ')
        );
      }
    });
  } else if (
    searchLocation.match(regexList['kbase1']) ||
    searchLocation.match(regexList['kbase2']) ||
    searchLocation.match(regexList['kbase3']) ||
    searchLocation.match(regexList['kbase4'])
  ) {
    bot.startConversationInThread(message, function(err, convo) {
      if (!err) {
        convo.say(
          'Searching Knowledge Base using keywords (' +
            searchKeywords.join(' ') +
            ')'
        );
        convo.say('KBase searching not ready yet :(');
        convo.activate();
      }
    });
  } else if (searchLocation.match(regexList['sdk'])) {
    bot.startConversationInThread(message, function(err, convo) {
      if (!err) {
        convo.say(
          'Unrecognized SDK search, please specify which section to search, e.g: websdk, mobilesdk, vissdk, restapi or datasdk (data connector).'
        );
        convo.activate();
      }
    });
  } else {
    bot.startConversationInThread(message, function(err, convo) {
      if (!err) {
        convo.say(
          'Unrecognized search location, please specify which location to search, e.g: websdk, mobilesdk, vissdk, restapi, datasdk (data connector), kbase.'
        );
        convo.activate();
      }
    });
  }
};

module.exports = function(controller) {
  controller.hears(['(.*)!search(.*)'], listenScope['everywhere'], function(
    bot,
    message
  ) {
    // avoid a potential bug when there are spaces before the !search call
    message.text = message.text.substring(message.text.indexOf('!search') + 1);

    var params = message.text.split(' ');

    switch (params.length) {
      case 1:
      triggerQuickLink(
        bot,
        message,
        'The syntax is !search <location> <keywords>. Example locations are: websdk, mobilesdk, vissdk, datasdk, restapi. More can be added by request.'
      );
        break;

      case 2:
      triggerQuickLink(
        bot,
        message,
        'Missing keywords (3rd parameter). The expected syntax is !search <location> <keywords>, you said: ' +
            message.text
      );
        break;

      default:
      console.log('Triggering search with params: ' + params.length, params);
        triggerSearch(bot, message, params);
        break;
    }
  });

  controller.hears(
    ['asdfadsfasfasfasdfadsf'],
    listenScope['everywhere'],
    function(bot, message) {
      console.log(
        "caught possible question about whether a version's still supported:",
        message
      );

      bot.startConversationInThread(message, function(err, convo) {
        if (!err) {
          // strip slack mentions, as they're misread as numbers /(\<@.*\>)/g
          message.text = message.text.replace(/(\<@.*\>)/g, '');
          //console.log("stripped mention: ", message.text);

          scraper.isQuestionOnVersionSupport(message.text, function(question) {
            if (!question.isValid) {
              //console.log("not a valid version support question: ");
              convo.stop();

              return;
            }

            scraper.getExpirationForVersion(question.version, function(result) {
              if (result.error) {
                convo.say(
                  generatePlainAttachmentStr(
                    'Error fetching expiration schedule for version ' +
                      question.version,
                    result.errorMSG
                  )
                );
                convo.activate();

                //console.log("error occurred in fetching expiration schedule for version ", question.version, result);
              } else {
                convo.say(
                  generateExpirationAttachment(
                    question.version,
                    result.supportStatus,
                    result.releaseDate,
                    result.expirationDate,
                    result.url
                  )
                );
                convo.activate();

                //console.log("Expiration schedule for ", question.version, result);
              }
            });
          });
        }
      });
    }
  );
};
