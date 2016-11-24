var gulp = require('gulp');

gulp.task('default', function () {
    gulp.src([
        'node_modules/bootstrap/dist/js/bootstrap.min.js',
        'node_modules/bootstrap-3-typeahead/bootstrap3-typeahead.min.js',
        'node_modules/jquery/dist/jquery.min.js'
    ]).pipe(gulp.dest('public/libs/js'));
    gulp.src([
        'node_modules/bootstrap/dist/js/bootstrap.min.js',
        'node_modules/bootswatch/paper/bootstrap.min.css'
    ]).pipe(gulp.dest('public/libs/css'));
});