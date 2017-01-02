var gulp = require('gulp');

gulp.task('default', function () {
    gulp.src([
        'node_modules/bootstrap/dist/js/bootstrap.min.js',
        'node_modules/tether/dist/js/tether.min.js',
        'node_modules/bootstrap-3-typeahead/bootstrap3-typeahead.min.js',
        'node_modules/jquery/dist/jquery.min.js',
        'node_modules/leaflet/dist/leaflet.js',
        'node_modules/datatables.net/js/jquery.dataTables.js'
    ]).pipe(gulp.dest('public/libs/js'));
    gulp.src([
        'node_modules/bootstrap/dist/css/bootstrap.min.css',
        'node_modules/bootstrap/dist/css/bootstrap.min.css.map',
        'node_modules/tether/dist/css/tether.min.css',
        'node_modules/font-awesome/css/font-awesome.min.css',
        'node_modules/leaflet/dist/leaflet.css'
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