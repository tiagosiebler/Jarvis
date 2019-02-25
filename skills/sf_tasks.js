// TODO: cleanme, promisify
const handleLogTaskRequest = async (controller, bot, message) => {
  console.log("######### log a task tag: ", message.text);

  //var url = controller.utils.getURLFromMessage(message);
  var caseNum = controller.utils.extractCaseNum(message.text);
  //console.log("caseNum: ", caseNum);

  controller.flow.exec(
    function() {
      if (false) console.log("hears.logTask(): running user & thread lookup");
      if (!caseNum) controller.extDB.getSFThreadForSlackThreadOld(controller, message, this.MULTI("threadInfo"));
    },
    async function(results) {
      var userInfo = await controller.extDB.lookupUser(bot, message),
        threadInfo = results.threadInfo;

      // rare chance of this happening, should I bounce info back to the slack request or just silently fail?
      if (!userInfo) {
        console.log("WARNING: hears.logTask() trigger failed reading slack user, error: ", userInfo);
        return false;
      }
      if (!caseNum) {
        if (threadInfo[0] || !threadInfo[1]) {
          console.log("hears.logTask(): Can't set log task if I don't know what case it's for... let's ask the user for info", threadInfo);

          bot.startConversation(message, this.MULTI('startedConvo'));
          this.MULTI("userInfo")(userInfo);
        } else {
          caseNum = threadInfo[2].sf_case;

          if (false) console.log("hears.logTask(): found case number in stored thread ref: ", caseNum);
          bot.reply(message, controller.utils.generateAttachmentForTask(caseNum, message.user, message.user))
          return true;
        }
      } else {
        bot.whisper(message, controller.utils.generateAttachmentForTask(caseNum, message.user, message.user))
        return true;
      }
    },
    function(result) {
      if (typeof result.startedConvo == "object") {
        var count = 0;

        // we've started a conversation, now use the conversation to ask the user for info
        result.startedConvo[1].ask('What case is this for? E.g `123456`', [{
          pattern: controller.utils.regex.genericIDNumber,
          callback: this.MULTI("caseInfo")
        }, {
          default: true,
          callback: (reply, convo) => {
            console.log("logTaskRegex not found: default callback hit " + count + " times. ", reply);
            if (count == 3) convo.stop();
            count++;
          }
        }]);

        this.MULTI("userInfo")(result.userInfo);
      }

    },
    function(result) {
      var reply = result.caseInfo[0],
        convo = result.caseInfo[1],
        caseNum = reply.match[1],
        userInfo = result.userInfo;

      // complete the conversation so it doesn't interfere
      convo.next();

      // we have everything, send the action button to the user
      bot.whisper(message, controller.utils.generateAttachmentForTask(caseNum, message.user, message.user))
    });
    return true;
}

// listeners
module.exports = function(controller) {

  controller.hears(
    [controller.utils.regex.logTask, controller.utils.regex.logTaskShort],
    'direct_message,direct_mention,mention',
    (bot, message) => handleLogTaskRequest(controller, bot, message)
  );

  controller.on('dialog_submission', function(bot, message) {
    var params = message.callback_id.split(/\-/),
      cbRef = params[0];

    if (cbRef == 'logTaskSubmit') {
      if (params.length < 3) {
        bot.replyInteractive(message, {
          "delete_original": true
        });
        bot.dialogError({
          "name": "subject",
          "error": "I'm missing esssential parameters, please restart the workflow by asking Jarvis to log a new task."
        });
        return false;
      }

      var caseNum = params[1],
        assignee = params[2],
        submission = message.submission;

      if (params[3] != "undefined") message.thread_ts = params[3];

      // tell slack everything's ok, we'll take it from here
      bot.dialogOk();

      controller.flow.exec(
        function() {
          controller.extDB.lookupUserWithID(bot, assignee, this.MULTI("assignee"));
          controller.extDB.lookupUserWithID(bot, message.user, this.MULTI("owner"));

          bot.reply(message, "Processing submitted task, hold on...", this.MULTI("message"));

        },
        function(results) {
          var assignTo = results.assignee,
            owner = results.owner,
            message = results.message[1].message;

          message.message_ts = results.message[1].ts;
          message.channel = results.message[1].channel

          if (assignTo[0])
            return controller.utils.message.update(bot, message, "Error", controller.utils.generateTextAttachmentWithColor("Error running assignee lookup. Did you select a bot as the assignee? Details: " + assignTo[0], "#FF0000"));
          if (owner[0])
            return controller.utils.message.update(bot, message, "Error", controller.utils.generateTextAttachmentWithColor("Error running lookup on your user. Details: " + owner[0], "#FF0000"));

          owner = owner[1];
          assignTo = assignTo[1];

          var color = 0;

          // who needs a contact? owner or assignee? let's try owner
          controller.sfLib.createTaskInCase(caseNum, owner.slack_useremail, assignTo.sf_user_id,
            submission.description, submission.subject,
            submission.taskType, controller.utils.tasks.SelectPriorityArray[1],
            submission.taskState, submission.timeSpent,
            (err, result) => {
              // execution completed
              if (err) {
                bot.reply(message, "Warning <!tsiebler>: failed to log task in SF: ```" + JSON.stringify(err) + "```");
                return false;
              }
              let resultURL = process.env.sfURL + "/" + result.id + "/e?retURL=" + result.id;

              console.log("Task Logging Complete: ", resultURL);

              var linkAttachment = controller.utils.generateLinkAttachment(resultURL, "New task logged & assigned to <@" + assignee + ">.");
              controller.utils.message.delete(bot, message.channel, message.message_ts);
              bot.reply(message, linkAttachment);

            },
            (progress) => {
              // received progress update
              //console.log("Task Logging Progress Update: ", progress);
              controller.utils.message.update(bot, message, "_Progress: " + progress + "_ ", null);
            });
        }
      );
    }
    return false;
  });

  controller.on('interactive_message_callback', function(bot, message) {
    var ids = message.callback_id.split(/\-/),
      callbackReference = ids[0],
      caseNum = ids[1],
      thread_ts;

    if (callbackReference == 'logTaskQuestion') {
      console.log("Buttonclick callback IDs: ", callbackReference, caseNum);

      if (message.text == "cancel") {
        //debugger;
        //controller.utils.message.delete(bot, message.channel, message.message_ts);
        bot.replyInteractive(message, {
          "delete_original": true
        });
        return false;
      }

      var assignee = message.actions[0].selected_options[0].value;

      //bot.replyInteractive(message, controller.utils.generateAttachmentForTaskInProgress());
      bot.replyInteractive(message, {
        "delete_original": true
      });

      /*
      	- you're always the owner of the task
      	- the assignee is the person working on the task. Set self if you're the one doing it.
      	- if the user is setting themselves as assignee, default task as completed?
      */

      if (typeof message.raw_message.original_message != "undefined") thread_ts = message.raw_message.original_message.thread_ts;
      var dialog = bot.createDialog(
          'New Task in Case ' + caseNum,
          'logTaskSubmit-' + caseNum + '-' + assignee + '-' + thread_ts,
          'Submit'
        )
        .addSelect('Task State', 'taskState', 'Not Started', controller.utils.tasks.SelectStateArray)
        .addSelect('Type', 'taskType', 'Task - Investigation', controller.utils.tasks.SelectTypeArray)
        .addSelect('Time Spent', 'timeSpent', 'none', controller.utils.tasks.SelectTimeArray, {
          placeholder: 'Has any time been spent on this task yet?'
        })
        .addText('Subject', 'subject', null, {
          placeholder: 'Summary of the task itself, be specific.'
        })
        .addTextarea('Description', 'description', null, {
          placeholder: 'Provide a detailed explanation on the purpose of this task, including any surrounding context if you need help from someone else.',
          hint: 'Note: This slack field is limited to 500 characters. If you need more, save the task and edit it in salesforce.',
          max_length: 500
        });

      bot.replyWithDialog(message, dialog.asObject(), function(err, result) {
        if (err) {
          if (result.response_metadata)
            console.log("replyWithDialog: ", err, result.response_metadata.messages);
          else {
            console.log("replyWithDialog erro: ", err, result);
          }
        }
      });
    }
    return true;
  });

};
