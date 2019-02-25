const handleButtonClickDelete = (bot, trigger) => {
  bot.replyInteractive(trigger, {
    delete_original: true
  });
};

module.exports = handleButtonClickDelete;
