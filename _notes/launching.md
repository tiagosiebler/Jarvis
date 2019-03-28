## Launching Jarvis in Slack

### Create a Testing HTTP Server With ngrok.io 

- Go here: [https://ngrok.com/]
- Create an account, and follow the 4 download instructions, except for step 4. Instead, run ngrok.exe http 3000
- The session only lasts 8 hours on the free version (fine for testing), but while the session is running - your localhost bot server can now be reached on https://9afde058.ngrok.io (or whatever is listed in the terminal).
- For events, the URL endpoint on your bot is: https://yourserver:3000/slack/receive, So with ngrok, it will be https://9afde058.ngrok.io/slack/receive 

### Start the Bot On localhost:3000

- Go to package.json make sure that under “scripts”, “start” is defined as “node bot.js”. Now you can start the bot with the command npm start
- Go to localhost:3000 in your web browser, you should see it return “Cannot GET /”

### Create a Slack App

Go here: [https://api.slack.com/apps?new_app=1] and create an app on your company Slack.

#### Event Subscriptions

- Under the Event Subscriptions tab, Enable Subscriptions needs to be turned on
- The request URL will be like https://9afde058.ngrok.io/slack/receive
- The slack bot receives and responds with 200. This can be found in Jarvis/components/routes/incoming_webhooks
- The Request URL should show “Verified”

#### Subscribe to Bot Events

Once verified, subscribe to events you’re interested in. Subscribe to these to start:
-link_shared
-message.channels
-message.groups
-message.im
-messagempim

#### OAuth & Permissions

- First, in the Slack application, create a public slack channel for testing.
- On the Oath & Permissions tab of the Slack API page, add a Workspace. Choose your newly created Slack channel
- Add a redirect url : http://yourserver.ngrok.io/oauth
- In the .env file, find clientId, clientSecret, clientSigningSecret. Get these values from https://api.slack.com/apps

### Final App Setup

Go to http://yoursever.com/setup.html and follow the setup. 

Common errors are 
- not having the client id defined in the .env file 
- not having the OAuth Redirect url defined in the app.
After completing this, you should get a message in slack from your bot.
- If you can get a response, you are ready to go. I just check by direct messaging “@jarvistest uptime” to my Jarvis bot. (my bots app name is jarvistest).
