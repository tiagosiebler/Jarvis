const ExpressionList = require('../submodules/Regex/ExpressionList');
const ping = require('ping');


module.exports = controller => {
    controller.hears(
        [ExpressionList.lookup], 
        'direct_message', 
        async (bot, message) => {
            bot.createConversation(message, async(err, convo) => {
                if (err) return false;
                var domain = message.text.split(' ')[1];

                if(domain == undefined){
                    responseMessage = ("Missing parameter. Please provide the domain name to lookup");
                }else{
                    //Slack will automatically try to make anything ending in '.com' be a link
                    //This causes issue with message response formatting which needs to be corrected
                    if(domain[0] === '<'){ 
                        // RegEx matches: <http:// and >
                        var regex = /(<http:\/\/|>)/gi;
                        domain = domain.replace(regex, '');
                        domain = domain.split('|')[0];
                    }
                    let ip = await pingResult(domain);
                    console.log("pingResult: " + ip);
                    if(ip == undefined){
                        responseMessage = "Could not retreive IP of domain: " + 
                            domain + 
                            ". Try using the fully qualified domain name";
                    }else{
                        responseMessage = "Reply with IP: " + ip;
                    }
                }

                convo.say(responseMessage);
                convo.activate();
            });
        }
    );
};

const pingResult = async (host) => {
    let result = null;
    try{
        result = await ping.promise.probe(host);
        result = result.numeric_host;
    }catch(e){
        console.log(e);
        return e;
    }
    return result
}
