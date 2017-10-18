var Utils = function () {};

Utils.prototype.regexCases = [
	/(?:^|^\s|[^\/a-zA-Z0-9])ts([0-9]{6,7}).*$/im,
	/(?:^|^\s|[^\/a-zA-Z0-9])ts ([0-9]{6,7}).*$/im,//overkill, adjust regex to account for possible but not essential +w
	/(?:^|^\s|[^\/a-zA-Z0-9])case ([0-9]{6,7}).*$/im,
	/(?:^|^\s|[^\/a-zA-Z0-9])case([0-9]{6,7}).*$/im,
	/(?:^|^\s|[^\/a-zA-Z0-9])#([0-9]{6,7}).*$/im,
	/(?:^|^\s|[^\/a-zA-Z0-9])# ([0-9]{6,7}).*$/im,
	/(?:^|^\s|[^\/a-zA-Z0-9])case: ([0-9]{6,7}).*$/im,
	/([0-9]{6,7}).*$/im,
];

Utils.prototype.regex = {
	KBase: /(?:^|^\s|[^\/a-zA-Z0-9])(?:tn|kb)\s?([0-9]+)/img,
	setSME: /set me as sme(.*)/i
}
Utils.prototype.regexKBase = [
	/(?:^|^\s|[^\/a-zA-Z0-9])kb\s?([0-9]+).*$/imgy,
	/(?:^|^\s|[^\/a-zA-Z0-9])(?:tn|kb)\s?([0-9]+)/img,
	/(?:^|^\s|[^\/a-zA-Z0-9])tn([0-9]+).*$/img,
	/(?:^|^\s|[^\/a-zA-Z0-9])tn ([0-9]+).*$/im,
	/(?:^|^\s|[^\/a-zA-Z0-9])kb ([0-9]+).*$/im,
	/(?:^|^\s|[^\/a-zA-Z0-9])kb([0-9]+).*$/im,
];

Utils.prototype.regexTriggers = {
	setSME: /set me as sme(.*)/i
}

// returns case number if present
Utils.prototype.extractCaseNum = function(text){	
    for(i = 0;i < this.regexCases.length;i++){
		var result = this.regexCases[i].exec(text);
		if(result != null && result[1]){
			return result[1];
		}
    }
};
Utils.prototype.containsMatch = function(string, regex){
	return regex.exec(string) !== null;
}
Utils.prototype.containsCaseNumber = function(string){
	// skip the last one, since that's too generic to detect a case
	// let regexCount = this.regexCases.length - 1;
    for(i = 0;i < (this.regexCases.length - 1);i++){
		let result = this.regexCases[i].exec(string);
		//console.log("resultnew: ",result);
		
		if(result != null && result[1]){
			return true;
		}
    }
	return false;
}

/*

	Getters

*/
Utils.prototype.getMatchesKB = function(string){
	var matches = [], parsedMatch;
		
	while (parsedMatch = this.regex.KBase.exec(string)) {
		matches.push(parsedMatch[1]);
	}
	
	return matches;
}

/*

	Emoji stuff

*/
Utils.prototype.emojisNegative = [
	"sleepy",
	"unamused",
	"weary",
	"anguished",
	"no_mouth",
	"persevere",
	"sleeping",
	"disappointed",
	"confounded",
	"sob",
	"tired_face",
	"frowning",
	"disappointed_relieved",
	"speak_no_evil",
	"see_no_evil",
];
Utils.prototype.getSadEmoji = function(){
	return this.emojisNegative[Math.floor(Math.random()*this.emojisNegative.length)];
}

/*

	Attachment builders
	
*/
Utils.prototype.generateAttachmentForKBArticles = function(articles){
	var results = {
		"attachments": []
	}
	
	for(i = 0;i < articles.length;i++){
		var article = articles[i];
		
		results.attachments.push({
			"fallback": article.Title.substring(0,14),
			"color": "#36a64f",
			"title": "• "+article.Title,
			"title_link": "https://community.microstrategy.com/s/article/" + article.Id
		})
	}
	
	return results;
}

module.exports = new Utils();