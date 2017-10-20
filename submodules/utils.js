var Utils = function () {};


Utils.prototype.regex = {
	KBase: /(?:^|^\s|[^\/a-zA-Z0-9])(?:tn|kb|ArticlesKB)\s?([0-9]+)/img,
	case: /(?:^|^\s|[^\/a-zA-Z0-9])(?:ts|case|#)(?:\:|,|)\s{0,3}?([0-9]{6,7})/img,
	genericIDNumber:/([0-9]{6,7}).*$/im,
	setSME: /set me as sme(.*)/i
};

// returns case number if present
Utils.prototype.extractCaseNum = function(string){	
	let result = this.regex.genericIDNumber.exec(string);
	if(result != null && result[1]){
		return result[1];
	}
};
Utils.prototype.containsMatch = function(string, regex){
	return regex.exec(string) !== null;
};
Utils.prototype.containsCaseNumber = function(string){
	let result = this.regex.genericIDNumber.exec(string);
	if(result != null && result[1]){
		return true;
	}
	return false;
};

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