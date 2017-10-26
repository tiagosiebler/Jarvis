// NOTE: I previously suggested doing this through Grunt, but had plenty of problems with
// my set up. Grunt did some weird things with scope, and I ended up using nodemon. This
// setup is now using Gulp. It works exactly how I expect it to and is WAY more concise.
var gulp = require('gulp'),
	spawn = require('child_process').spawn,
	node;

/**
 * $ gulp server
 * description: launch the server. If there's a server already running, kill it.
 */
var runServer = function(isTest){
	var params = ['bot.js'];
	
	if (node) node.kill()
	if (isTest) params = ['--inspect', 'bot.js'];
	
	node = spawn('node', params, {
		stdio: 'inherit'
	})
}
var runLiveServer = function(){
	var params = ['node','bot.js'];
	
	if (node) node.kill()	
	node = spawn('xvfb-run', params, {
		stdio: 'inherit'
	})
}
var runTestServer = function(){
	runServer(true);
}

gulp.task('server', function() {
	runLiveServer();
	node.on('close', function(code) {
		if (code === 8 || code === 12) {
			console.log('Error detected, attempting reboot...');
			setTimeout(runLiveServer, 500);
		} else {
			console.log('Relaunced with code: ', code);
		}
	});
})

/**
 * $ gulp server
 * description: launch the server. If there's a server already running, kill it.
 */
gulp.task('testserver', function() {
	runServer(true);
	node.on('close', function(code) {
		if (code === 8 || code === 12) {
			console.log('Error detected, waiting for changes...');
			setTimeout(runTestServer, 500);
			
		} else {
			console.log('Relaunced with code: ', code);
		}
	});
})


/**
 * $ gulp
 * description: start the development environment
 */
gulp.task('default', ['server'], function() {
	gulp.watch(['./bot.js', './skills/**/*.js', './submodules/**/*.js'], ['server']);
})

gulp.task('test', ['testserver'], function() {
	gulp.watch(['./bot.js', './skills/**/*.js', './submodules/**/*.js'], ['testserver']);
})


// clean up if an error goes unhandled.
process.on('exit', function() {
	if (node) node.kill()
})
