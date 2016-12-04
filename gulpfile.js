"use strict";
const gulp = require("gulp");
const ts = require("gulp-typescript");
const del = require("del");
const sourcemaps = require("gulp-sourcemaps");
const path = require("path");
// const tslint = require("gulp-tslint");


const out = "./dist";
const src = ["./src/**/*.ts", "./src/**/*.d.ts", "./src/**/*.js"];

gulp.task("clean", () => {
    return del(out);
});

let tsProject = ts.createProject("tsconfig.json");


gulp.task("ts-compile", ["clean"], function () {
    var tsResult = gulp.src(src)
        .pipe(sourcemaps.init())
        .pipe(tsProject(ts.reporter.longReporter()))
        .pipe(sourcemaps.write({
            includeContent: false,
            sourceRoot: "./src"
        }))
        .pipe(gulp.dest(out));
    return tsResult;
});

gulp.task("compile", ["ts-compile"]);

// gulp.task("tslint", () =>
//     gulp.src(src)
//         .pipe(tslint())
//         .pipe(tslint.report("verbose"))
// );

// gulp.task("abstract_build", ["tslint"], () => {
//     return gulp.src(sources)
//         .pipe(compilation())
//         .pipe(gulp.dest(output));
// });

// gulp.task("build", ["clean", "tslint"], () => {
//     return gulp.src(sources)
//         .pipe(compilation())
//         .pipe(gulp.dest(output));
// });

// gulp.task("watch", ["abstract_build"], () => {
//     gulp.watch(sources, ["abstract_build"]);
// });
