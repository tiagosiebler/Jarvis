// TODO: deprecate flow in favour of promises
const flow = require('flow');

const Botkit = require('botkit');
const dateFormat = require('dateformat');

const ExtDB = require(__dirname + '/../extDB');
const sfLib = require(__dirname + '/../sfLib');
const botUtils = require(__dirname + '/../utils');

module.exports = botOptionsObject => {
  const controller = Botkit.slackbot(botOptionsObject);
  controller.flow = flow;
  controller.dateFormat = dateFormat;
  controller.extDB = new ExtDB();
  controller.utils = botUtils;
  controller.sfLib = new sfLib();
  controller.startTicking();

  return controller;
};
