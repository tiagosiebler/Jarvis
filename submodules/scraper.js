var Scraper = function () {};

var request = require('request');
var cheerio = require('cheerio');

var stringContains = function(string, substring){
	return string.indexOf(substring) != -1;
}
Scraper.prototype.isQuestionOnVersionSupport = function(message, callback){
	var result = {
		isValid: true
	}

	result.version = message.replace(/[^0-9\.]+/g, "");	
	if(result.version.length == 0 || result.version.length > 5) {
		result.reason = "too long or doesn't contain any matches";
		result.isValid = false;
		return callback(result);
	}
	
	var containsNumber = result.version.match(/\d+/g);
	if (containsNumber == null) {
		result.reason = "no numbers";
		result.isValid = false;
		return callback(result);
	}
	
	if(stringContains(message,"supported on") || stringContains(message,"iOS") || stringContains(message,"ios")){
		console.log("isQuestionOnVersionSupport: ignoring false positive");
		result.reason = "isQuestionOnVersionSupport: ignoring false positive";
		result.isValid = false;
		return callback(result);
	}
	
	if(result.isValid && !stringContains(result.version,".")){
		result.version = result.version + ".0";
	}
	
	callback(result);
}

Scraper.prototype.getExpirationForVersion = function(version, callback){

	var url, supportStatus, releaseDate, expirationDate;
	url = 'https://www.microstrategy.com/us/services/customer-support/expiration-schedule';

	request(url, function(error, response, html) {
		if (!error) {
			var $ = cheerio.load(html);

			var matchingVersion = $("#schedule .alternating-rows tr td strong:contains("+version+")");
			
			// no matches
			if(matchingVersion.length == 0){			
				var result = {
					error: true,
					errorMSG: "Version "+version+" wasn't found on the <"+url+"|expiration schedule>.",
					errorID: 1,
					url: url,
				};
				callback(result);
				return;
			// more than one match
			}else if(matchingVersion.length > 1){				
				var result = {
					error: true,
					errorMSG: "Too many results to display ("+matchingVersion.length+"). Searching for "+version+" wasn't specific enough, or an error occurred. Versions should be provided uniquely, e.g: 10.4",
					errorID: 2,
					url: url,
				};
				callback(result);
				return;
			// one match (expected, since versions are specific)
			}else{	
							
				var results = [
					matchingVersion.text(),
					matchingVersion.parent().next().text(),
					matchingVersion.parent().next().next().text(),
					matchingVersion.parent().next().next().next().text()
				]
				
				var result = {
					"version": results[0],
					"supportStatus": results[1],
					"releaseDate": results[2],
					"expirationDate": results[3],
					error: false,
					url: url,
				}
				callback(result);
				return;
			}
			
		}
	});
	
}

/*
	Dev zone searches, done by rendering JS and scraping results
*/
var Nightmare = require('nightmare');		
var maxResults = 5;
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

var cleanMSDLResults = function(dom, callback, urlPrefix, url){
	var totalSpan = dom.window.document.getElementsByClassName("total-results")[0];
	var searchResults = dom.window.document.getElementById("resultList");
	
	//console.log("processing results: ");
	
	var processedResults = [];
	for(i = 0;i < maxResults && i < searchResults.children.length;i++){
		
		processedResults[i] = {
			"link": urlPrefix + encodeURI(searchResults.children[i].children[0].children[0].attributes[0].value),
			"title": searchResults.children[i].children[0].children[0].text,
			"desc": searchResults.children[i].children[1].innerHTML,
			"path": searchResults.children[i].children[2].children[0].innerHTML,
		}
	}
	
	var results = {
		"total": totalSpan.innerHTML,
		"data": processedResults,
		"link": url,
		"success": true
	}
	//console.log("results: ",results);
	callback(results);
	
}
Scraper.prototype.scrapeDevZoneResults = function(section, query, maxCount, callback){
	maxResults = maxCount;
	var urlPrefix = 'https://lw.microstrategy.com/msdz/MSDL/GARelease_Current/docs/projects/'+section+'/default.htm';
	var url = urlPrefix + '#search-' + encodeURI(query);
	var nightmare = Nightmare({ show: false });
	//console.log("begin scrape of URL: ",url);
	nightmare
		.goto(url)
	/*
		.type('#search-field', 'test')
		.click('.search-submit-wrapper .search-submit')//*/
		.wait('#resultList li h3')
		//.wait('.total-results')
		.evaluate(function() {
			//console.log("wait over, returning innerHTML");
			return document.body.innerHTML;
		})
		.end()
		.then(function(result) {
			//console.log("search finished, scraping results ");
			// cheerio is supposedly faster?
			const dom = new JSDOM(result);
			cleanMSDLResults(dom, callback, urlPrefix, url);
			
		})
		.catch(function(error) {
			console.error('Search failed:', section, query, error);
			
			var results = {
				"success": false,
				"error": error,
				"url": url
			}
			callback(results);
		});
}

Scraper.prototype.getReadmeList = function(callback){
	var urlPrefix = 'https://microstrategyhelp.atlassian.net/wiki/spaces/';
	var url = urlPrefix + 'MSTRDOCS/overview';
	var nightmare = Nightmare({
		openDevTools: false,
		show: false,
	});
		
	nightmare
		.goto(url)
		.wait('#MicroStrategyProductDocumentation-ReadmeandReleaseNotesbyVersion')
		.evaluate(function() {			
			var readmeContainer = document.getElementById("MicroStrategyProductDocumentation-ReadmeandReleaseNotesbyVersion").parentNode;
			var readmeList = readmeContainer.getElementsByTagName("a");
			
			debugger;
			var resultArray = [];
						
			for(i = 0;i < readmeList.length;i++){

				var readme = {
					"link": readmeList[i].href,
					"label": readmeList[i].innerText,
				};

				resultArray.push(readme);
			}
			
			return resultArray;
		})
		.end()
		.then(function(result) {
			callback(result);
		})
		.catch(function(error) {
			console.error('scrape failed:', error);
			
			var results = {
				"success": false,
				"error": error,
				"url": url
			}
			callback(results);
		});
}





module.exports = new Scraper();