const ExpressionList = require('../submodules/Regex/ExpressionList');

module.exports = controller => {
  controller.hears([ExpressionList.quotes], 'direct_message,direct_mention', async (bot, message) => {
      console.log(message);

      try {
        const quoteResult = await controller.extDB.fetchRandomQuote();
        const quote = quoteResult.pop();

        if (!quote) {
          console.error(`no quotes returned: ${quoteResult}, ${quote}`);
          return true;
        }

        console.log(`quote: `, quote);
        const responseAttachment = {
          "attachments": [{
            "color": "#fff",
            "text": quote.quote,
            "footer": quote.author
          }]
        };


        bot.reply(message, responseAttachment);

      } catch (e) {
        console.error(`Quote retrieval failed due to error: `, e.stack || e.message || e);
        return true;
      }
    }
  );
};
