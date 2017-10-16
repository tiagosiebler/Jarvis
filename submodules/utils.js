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

module.exports = new Utils();