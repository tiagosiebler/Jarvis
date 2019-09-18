const rp = require('request-promise');

const sendMessageToSlack = (message) => {
  const webhookUrl = process.env.slackReportingWebhook;
  if (!webhookUrl) {
    console.error(`slackReportingWebhook was not configured in .env, can't send webhook'`);
    return Promise.resolve(false);
  }

  const options = {
      method: 'POST',
      uri: webhookUrl,
      body: {
        text: message
      },
      headers: {
        'content-type': 'application/json'
      },
      json: true
  };
  return rp(options);
};

module.exports = () => {
  process.on('uncaughtException', async (error) => {
    const message = `:warning: uncaught exception, resetting: \`\`\`${error.stack || error.message || error}\`\`\``;
    console.error(message);

    await sendMessageToSlack(message);

    // allow crash
    process.exit(1);
  });

  process.on('unhandledRejection', (error, p) => {
    const message = `:warning: unhandled rejection, resetting: \`\`\`${error.stack || error.message || error}\`\`\``;
    console.warn(message);

    await sendMessageToSlack(message);

    // I just caught an unhandled promise rejection, since we already have fallback handler for unhandled errors (see below), let throw and let him handle that
    console.warn(`Unhandled promise rejection detected, forwarding to exception handler: `, error, p);

    process.exit(1);
  });
};
