// custom modules with some hardcoded values/references
var scraper = require('../submodules/scraper.js');

// scope of where these commands will trigger (anywhere the bot is, right now)
var listenScope = {
  "everywhere": 'ambient,direct_message,direct_mention,mention',
};

var regexList = {
  "case": /^.*ts([0-9]+).*$/i,
  "KB": /^.*kb([0-9]+).*$/i,
  "TN": /^.*TN([0-9]+).*$/i,
  "DE": /^.*DE([0-9]+).*$/i,
  "US": /^.*US([0-9]+).*$/i,
  "websdk": /websdk/i,
  "mobilesdk1": /mob(.*)sdk/i,
  "mobilesdk2": /iossdk/i,
  "mobilesdk3": /andr(.*)sdk/i,
  "vissdk": /vis(.*)sdk/i,
  "restapi1": /rest(.*)sdk/i,
  "restapi2": /rest(.*)api/i,
  "restapi3": /json(.*)api/i,
  "restapi4": /json(.*)sdk/i,
  "datasdk1": /data(.*)sdk/i,
  "datasdk2": /data(.*)api/i,
  "datasdk3": /connector(.*)sdk/i,
  "kbase1": /kbase(.*)/i,
  "kbase2": /technote(.*)/i,
  "kbase3": /tn(.*)/i,
  "kbase4": /community(.*)/i,
  "sdk": /(.*)sdk(.*)/i,
};


var generatePlainAttachmentStr = function(title, str) {
  var retAttachment = {
    "attachments": [{
      "fallback": title,
      "title": title,
      "text": str,
    }]
  };
  return retAttachment;
};
var generateLinkAttachment = function(link, title) {
  var results = {
    "attachments": [{
      "fallback": title,
      "color": '#36a64f',
      "title": title,
      "title_link": link,
    }]
  };
  return results;
};
var generatePlainAttachmentStrWithLink = function(title, link, str) {
  var retAttachment = {
    "attachments": [{
      "fallback": title,
      "title": title,
      "title_link": link,
      "text": str,
    }]
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
  //debugger;

  for (i = 0;i< data.length;i++){
    var desc = data[i].desc;
    //var limit = 70;
    //if(desc.length > limit) desc = desc.substring(0,limit);
    //desc = desc.replace(/(\<.*\>)/g, "");

    array[i] = {
      "title" : (i+1) + '. ' + data[i].title,
      "value" : '<' + data[i].link + '| ' + data[i].path + '>',
      "short" : false
    };
    //debugger;
  }
  return array;
};

var getReadmeFromList = function(version, readmeList) {
  //debugger;

  version = version.replace('.','');

  for (i = 0;i < readmeList.length;i++){
    var label = readmeList[i].label.replace('.','');
    if (label.indexOf(version) != -1){
      //debugger;
      return readmeList[i];
    }
  }
  //debugger;
  return;
};
var getReadmeForVersion = function(version, controller, bot, message) {
  //debugger;

  // try to fetch from storage
  controller.storage.teams.get('readmeList', function(error, object){
    var refreshReadmes = false;
    //debugger;
    if (!error){
      var readme = getReadmeFromList(version, object.items);

      if (typeof readme == 'undefined' || readme == null){
        refreshReadmes = true;
      } else {
        //debugger;
        bot.reply(message, generateLinkAttachment(readme.link, readme.label));
      }
    }

    if (error || refreshReadmes){
      // readme not known, try to get it from site
      console.log('Refreshing readme list - due to these vars: error, refreshReadmes:', error, refreshReadmes);
      bot.reply(message, generatePlainAttachmentStrWithLink('Refreshing Readme List', 'https://microstrategyhelp.atlassian.net/wiki/spaces/MSTRDOCS/overview', 'Updating my list of readmes using our documentation...'));

      scraper.getReadmeList(function(result){
        if (typeof result.error === 'undefined'){
          console.log('success!');
          //					https://resource.microstrategy.com/support/releasenote/9.3.0/readme.htm
          //					https://resource.microstrategy.com/support/releasenote/MSTRAnalytics/readme.htm

          // got readmes, now store them for later retrieval
          controller.storage.teams.save({id: 'readmeList', items:result}, function(err) {

            // check the stored readme list again, to be sure
              var readme = getReadmeFromList(version, result);
            if (typeof readme == 'undefined')
              bot.reply(message, generatePlainAttachmentStrWithLink('Error Fetching Readme', 'https://microstrategyhelp.atlassian.net/wiki/spaces/MSTRDOCS/overview', "No matching readme was found, try checking this link in case it couldn't be fetched properly."));
            else {
              bot.reply(message, generateLinkAttachment(readme.link, readme.label));
              }
          });
        } else {
          console.log('error fetching readme list');
          bot.reply(message, generatePlainAttachmentStrWithLink('Error in fetching updated list', 'https://microstrategyhelp.atlassian.net/wiki/spaces/MSTRDOCS/overview', 'Automatic readmelist update failed, error: ' + result.error.message + '\n Try checking the confluence page manually.'));
        }
      });
    }
  });
};

module.exports = function(controller) {
  controller.hears([/.*!readme (.*)/im], listenScope['everywhere'], function(bot, message) {
    var params = message.match[0];
    console.log('Readme request triggered. Params:('+params.length+') message: ',message.text);
    switch (params.length) {
      case 1:
      triggerQuickLink(bot, message, 'The syntax is !readme <version here>. For example: !request 10.5');
        break;

      default:
      if (message.match[1].indexOf('clear') != -1){
          bot.startConversationInThread(message, function(err, convo) {
            if (!err) {
              // can't get delete call to work, so trying this instead
              //Error: ENOENT: no such file or directory, unlink '.data/db/teams/undefined.json'
            controller.storage.teams.save({id:'readmeList', items:[{link:'',label:''}]}, function(error){
            });

            convo.say('Cleared readme memory, next call will refresh known readmes.');
              convo.activate();
            }
          });
      } else {
          getReadmeForVersion(message.match[1], controller, bot, message);
        }

        break;
    }
  });

};
