var StorageLib = function () {};

var rally = require('rally'),
    queryUtils = rally.util.query;

var generateError = function(key, message){
	var error = {
		"error": true,
		"errorID": key,
		"errorMSG": message
	}
	return error;
}


StorageLib.prototype.setSyncStateForSlackThread = function(controller, message, shouldSync, callback){	
    controller.storage.teams.get(message.team, function(err, team) {
		if(err){
			console.log("WARNING: storage error happened, details: ", err);
			callback(err, false)
			
			return;
		}
		
        if (!team) {
            team = {};
            team.id = message.team;
        }
		
		if (!team.sf_cases) team.sf_cases = {};
		if (!team.sf_threads) team.sf_threads = {};
		
		if(typeof team.sf_threads[message.thread_ts] != 'undefined'){
			team.sf_threads[message.thread_ts].shouldSync = shouldSync;
			
			debugger;

	        controller.storage.teams.save(team, function(err,saved) {			
				debugger;
	        
			    if (err) {
					console.log("#####setSyncStateForSlackThread: error in updating reference to salesforce thread", err)
					callback(err, false)
	            } else {
					callback(err, true, saved);
	            }
	        });
		}
	});
};
StorageLib.prototype.getSFThreadForSlackThread = function(controller, message, caseNum, callback){
    return controller.storage.teams.get(message.team, function(err, team) {
		if(err){
			console.log("WARNING: getSFThreadForSlackThread: error reading from storage, may not remember cases properly: ",err);
		}
		
        if (!team) {
            team = {};
            team.id = message.team;
        }
		if (!team.sf_threads){
			team.sf_threads = {};
		}
		
		if(typeof team.sf_threads[message.thread_ts] == 'undefined'){
			//var retErr = generateError("threadNotKnown","No SF thread could be found for this slack thread. May need to create one");
			// what about that case number in team.sf_cases? should we handle if case is mentioned in a new thread? or leave it at one thread per case? 
			/*
			if(typeof caseNum != 'undefined' 
				&& typeof team.sf_cases[caseNum] != 'undefined' 
				&& typeof team.sf_cases[caseNum].thread_ts != 'undefined' 
				&& typeof team.sf_threads[team.sf_cases[caseNum].thread_ts] != 'undefined'
				&& team.sf_threads[team.sf_cases[caseNum].thread_ts].sf_post_created
			){
				// case was talked about in another thread
				return callback(true, team.sf_threads[team.sf_cases[caseNum].thread_ts]);
			}else //*/
				return callback(false);
		}else{
			// successfully retrieved thread, meaning it's known
			return callback(true, team.sf_threads[message.thread_ts]);
		}
	});	
}
StorageLib.prototype.setSFThreadForCase = function(controller, message, sf_case, sf_post_id, shouldSync, callback){
    controller.storage.teams.get(message.team.id, function(err, team) {
		
		if(err){
			// probably the file doesn't exist yet, shouldn't be an issue as we'll just create it
			console.log("WARNING: storage error happened, details: ", err);
			
			//err = null;
			
			callback(err, false)
			
			return;
		}
		
        if (!team) {
            team = {};
            team.id = message.team;
        }
		
		// store state info for this case, so we can fetch the slack thread ref to it later
		if (!team.sf_cases){
			team.sf_cases = {};
		}
		
		
		var thread_ts;
		if(typeof message.thread_ts == 'undefined')
			thread_ts = message.original_message.thread_ts;
		else
			thread_ts = message.thread_ts;
		
		if(typeof team.sf_cases[sf_case] == 'undefined'){
			team.sf_cases[sf_case] = {
				sf_case: sf_case,
				thread_ts: thread_ts,
			}
		}else{
			team.sf_cases[sf_case].sf_case = sf_case;
			team.sf_cases[sf_case].thread_ts = thread_ts;
		}
		
		// store state info for this thread
		if (!team.sf_threads){
			team.sf_threads = {};
		}
		
		
		if(typeof team.sf_threads[thread_ts] == 'undefined'){
			var sf_thread_ref = {
				thread_ts: thread_ts,
				ts_added: + Date.now(),
				sf_case: sf_case,
				sf_post_id: sf_post_id,
				sf_post_created: true,
				shouldSync: shouldSync
			}
			
			team.sf_threads[sf_thread_ref.thread_ts] = sf_thread_ref;
			//console.log("#####setSFThreadForCase: Saved thread in team memory: ",team.sf_threads[sf_thread_ref.thread_ts], team.sf_threads)
		}else{
			team.sf_threads[sf_thread_ref.thread_ts].thread_ts = thread_ts;
			team.sf_threads[sf_thread_ref.thread_ts].sf_case = sf_case;
			team.sf_threads[sf_thread_ref.thread_ts].sf_post_id = sf_post_id;
			team.sf_threads[sf_thread_ref.thread_ts].sf_post_created = true;
			team.sf_threads[sf_thread_ref.thread_ts].shouldSync = shouldSync;
		}
		
        controller.storage.teams.save(team, function(err,saved) {			
            if (err) {
				console.log("#####setSFThreadForCase: error in saving reference to salesforce thread", err)
				callback(err, false)
				
            } else {
				//console.log("#####setSFThreadForCase: saved reference to salesforce thread in memory", saved, team);
				callback(err, true, saved);
            }
			
        });
	});
};

module.exports = new StorageLib();