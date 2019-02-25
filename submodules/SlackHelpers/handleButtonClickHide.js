const handleButtonClickHide = (bot, trigger) => {
  const reply = trigger.original_message;
  reply.attachments = [];
  bot.replyInteractive(trigger, reply);
};

module.exports = handleButtonClickHide;
