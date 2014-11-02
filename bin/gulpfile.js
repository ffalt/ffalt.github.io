var gulp = require('gulp');

gulp.task('default', function() {

	gulp.src('./bower_components/jquery/dist/jquery.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/angular/angular.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/ng-slider/dist/ng-slider.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/angular-sanitize/angular-sanitize.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/ui-router/release/angular-ui-router.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/html5shiv/dist/html5shiv.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/respond/dest/respond.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/bootstrap/dist/js/bootstrap.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/zeroclipboard/dist/ZeroClipboard.min.js')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/zeroclipboard/dist/ZeroClipboard.swf')
		.pipe(gulp.dest('../assets/js'));
	gulp.src('./bower_components/ng-clip/dest/ng-clip.min.js')
		.pipe(gulp.dest('../assets/js'));

	gulp.src('./bower_components/bootstrap/dist/css/bootstrap.min.css')
		.pipe(gulp.dest('../assets/css'));

	gulp.src('./bower_components/bootstrap/dist/fonts/*')
		.pipe(gulp.dest('../assets/fonts'));

	gulp.src('./bower_components/ng-slider/dist/img/jslider.round.plastic.png')
		.pipe(gulp.dest('../assets/img'));

});