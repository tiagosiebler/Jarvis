var debug = require('debug')('oauthsf');

module.exports = function(webserver, controller) {

    var handler = {
        loginsf: function(req, res) {
			debugger;
			res.redirect(controller.sfLib.conn.oauth2.getAuthorizationUrl({ scope: 'api id web refresh_token' }));			
        },
        oauthsf: function(req, res) {
            var code = req.query.code;
            var state = req.query.state;
			var ctrl = controller;
			
			controller.sfLib.conn.authorize(code, (err, userInfo)=>{
				console.log("oAuthSf authorize ret: ",err, userInfo);
				debugger;
				
				
				console.log(conn.accessToken);
				console.log(conn.refreshToken);
				console.log(conn.instanceUrl);
			});
			
			res.send("ok");

        }
    }


    // Create a /login link
    // This link will send user's off to SF to authorize the app
    debug('Configured /loginsf url');
    webserver.get('/loginsf', handler.loginsf);

    // Create a /oauth link
    // This is the link that receives the postback from Slack's oauth system
    // So in Slack's config, under oauth redirect urls,
    // your value should be https://<my custom domain or IP>/oauth
    debug('Configured /oauthsf url');
    webserver.get('/oauthsf', handler.oauthsf);

    return handler;
}
