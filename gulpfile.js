var gulp = require('gulp');

gulp.task('default', function () {
	gulp.src([
		'node_modules/bootstrap/dist/js/bootstrap.min.js',
		'node_modules/tether/dist/js/tether.min.js',
		'node_modules/bootstrap-3-typeahead/bootstrap3-typeahead.min.js',
		'node_modules/jquery/dist/jquery.min.js',
		'node_modules/leaflet/dist/leaflet.js',
		'node_modules/proj4/dist/proj4.js',
		'node_modules/proj4leaflet/src/proj4leaflet.js',
		'node_modules/datatables.net/js/jquery.dataTables.js',
		'node_modules/datatables.net-bs4/js/dataTables.bootstrap4.js',
		'node_modules/datatables.net-responsive/js/dataTables.responsive.js',
		'node_modules/datatables.net-responsive-bs4/js/responsive.bootstrap4.js'
	]).pipe(gulp.dest('public/libs/js'));
	gulp.src([
		'node_modules/bootswatch/dist/sketchy/bootstrap.min.css',
		'node_modules/tether/dist/css/tether.min.css',
		'node_modules/font-awesome/css/font-awesome.min.css',
		'node_modules/leaflet/dist/leaflet.css',
		'node_modules/datatables.net-bs4/css/dataTables.bootstrap4.css',
		'node_modules/datatables.net-responsive-bs4/css/responsive.bootstrap4.css'
	]).pipe(gulp.dest('public/libs/css'));
	gulp.src([
		'node_modules/font-awesome/fonts/FontAwesome.otf',
		'node_modules/font-awesome/fonts/fontawesome-webfont.eot',
		'node_modules/font-awesome/fonts/fontawesome-webfontfontawesome-webfont.svg',
		'node_modules/font-awesome/fonts/fontawesome-webfont.ttf',
		'node_modules/font-awesome/fonts/fontawesome-webfont.woff',
		'node_modules/font-awesome/fonts/fontawesome-webfont.woff2'
	]).pipe(gulp.dest('public/libs/fonts'));
});