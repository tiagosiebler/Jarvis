module.exports = () => {
  if (!process.env.clientId || !process.env.clientSecret || !process.env.PORT) {
    console.log('Error: Specify clientId clientSecret and PORT in environment');
    console.log('~~~~~~~~~~');
    console.log('Jarvis couldn\'t start due to missing .env settings.');
    console.log('Get Slack app credentials here: https://api.slack.com/apps');
    console.log('Make sure to follow the configuration steps here: https://github.com/tiagosiebler/Jarvis/blob/master/_notes/install.md#configuration');
    console.log('~~~~~~~~~~');
    process.exit(1);
  }
};
