var RallyLib = function () {};

var rally = require('rally'),
    restApi = rally({
        apiKey: process.env.rallyAPIKey,
        requestOptions: {
            headers: {
                'X-RallyIntegrationName': 'Tiago Siebler\'s SlackBot Jarvis',
                'X-RallyIntegrationVendor': 'MicroStrategy Technical Support',
                'X-RallyIntegrationVersion': '1.0'                    
            }
        }
    }),
    queryUtils = rally.util.query;

var generateError = function(key, message){
	var error = {
		"error": true,
		"errorID": key,
		"errorMSG": message
	}
	return error;
}

RallyLib.prototype.queryRally = function(formattedID, slackUser, callbackFunction){
	var type = "unkn";
	if(formattedID.startsWith("DE")){
		type = "defect";
	}else if(formattedID.startsWith("US")){
		type = "hierarchicalrequirement";
	}else{
		var error = generateError("unknType", "rally ID not recognised as story or defect (not prefixed with DE/US)");
		return callbackFunction(error);
	}
	
	return restApi.query({
	    type: type,
	    fetch: ['FormattedID', 'Name', 'State', 'ScheduleState', 'Release', 'ProductionRelease', 'CreationDate', 'ClosedDate', 'Project','ObjectID'],
	    query: '(FormattedID = '+formattedID+')',
	    limit: 10, //the maximum number of results to return- enables auto paging

	}).then(function(result){
		if(result.Results.length == 0){
			var error = generateError("rallyNotFound", "No rally entry was found with the selected ID. Make sure the rally ID is correct.")

			return callbackFunction(error);
		}else{
			var results = result.Results[0];

		    //console.log('\n\n\n ######## rallyQuerySuccessResult:', result);
			var rallyInfo = {
				"ID": results["FormattedID"],
				"urlPortal": "http://"+process.env.rallyGateDomain+":"+process.env.rallyGatePort+"/CSRallygate/#?user="+slackUser+"&rallyoid=" + results["ObjectID"],
				"name": results["Name"],
				"ScheduleState": results["ScheduleState"],
				"GeneralState": results["State"],
				//"ScheduleRelease": results["Release"]["Name"],
				"ActualRelease": results["c_ProductionRelease"],
				"CreatedDtRaw": results["CreationDate"],
				"ClosedDtRaw": results["ClosedDate"],
				"error": false,
			}
			
			if(typeof results["Release"] != 'undefined' && results["Release"] != null){
				rallyInfo.ScheduleRelease = results["Release"]["Name"];
			}else{
				rallyInfo.ScheduleRelease = 'N/A';
			}
			
			if(type == "defect"){
				rallyInfo.url = "https://"+process.env.rallyDomain+"/#/" + results["Project"]["ObjectID"] + "d/detail/defect/" + results["ObjectID"];
			}else if(type == "hierarchicalrequirement"){
				rallyInfo.url = "https://"+process.env.rallyDomain+"/#/" + results["Project"]["ObjectID"] + "d/detail/userstory/" + results["ObjectID"]
			}
	
			//console.log(type + ' success', rallyInfo);
		
			return callbackFunction(rallyInfo);
		}

    }).catch(function(error){
	    
		console.log('WARNING: queryRally error: ', error.message, error.errors, error);
		var error = generateError("rallyErr", error.message);
		return callbackFunction(error);
    });
}
RallyLib.prototype.generateSnapshotAttachment = function(result){	
	var results = {
		"attachments": [{
            "fallback": "Snapshot of "+result["ID"],
            "color": "#36a64f",
            "title": result["ID"] + ": "+result["name"],
            "title_link": result["urlPortal"],
            //"text": "Optional text that appears within the attachment",
            "fields": [
                {
                    "title": "State",
                    "value": result["GeneralState"],
                    "short": true
                },
				{
                    "title": "Schedule State",
                    "value": result["ScheduleState"],
                    "short": true
                },
				{
                    "title": "Schedule Release",
                    "value": result["ScheduleRelease"],
                    "short": true
                },
				{
                    "title": "Actual Release",
                    "value": result["ActualRelease"],
                    "short": true
                },
            ],
            "footer": "<"+result["url"]+"|Rally API Ref>",//"Rally API",
            "footer_icon": "http://connect.tech/2016/img/ca_technologies.png",
        }]
	};
	
	for(i = 0;i < results.attachments[0].fields.length;i++){
		if(results.attachments[0].fields[i].value == null){
			results.attachments[0].fields[i] = null;
		}
	}
	return results;
}




module.exports = new RallyLib();