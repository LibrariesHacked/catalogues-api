var gulp = require('gulp');

gulp.task('default', function () {
    gulp.src([
        'node_modules/bootstrap/dist/js/bootstrap.min.js',
        'node_modules/bootstrap/node_modules/tether/dist/js/tether.min.js',
        'node_modules/bootstrap-3-typeahead/bootstrap3-typeahead.min.js',
        'node_modules/jquery/dist/jquery.min.js'
    ]).pipe(gulp.dest('public/libs/js'));
    gulp.src([
        'node_modules/bootstrap/dist/css/bootstrap.min.css',
        'node_modules/bootstrap/node_modules/tether/dist/css/tether.min.css',
        'node_modules/font-awesome/css/font-awesome.min.css'
    ]).pipe(gulp.dest('public/libs/css'));
    gulp.src([
        'node_modules/font-awesome/fonts/FontAwesome.otf',
        'node_modules/font-awesome/fonts/fontawesome-webfont.eot',
        'node_modules/font-awesome/fonts/fontawesome-webfontfontawesome-webfont.svg',
        'node_modules/font-awesome/fonts/fontawesome-webfont.ttf',
        'node_modules/font-awesome/fonts/fontawesome-webfont.woff',
        'node_modules/font-awesome/fonts/fontawesome-webfont.woff2',
    ]).pipe(gulp.dest('public/libs/fonts'));
});