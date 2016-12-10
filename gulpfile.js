"use strict";
const gulp = require("gulp");
const ts = require("gulp-typescript");
const del = require("del");
const sourcemaps = require("gulp-sourcemaps");
const path = require("path");
const tslint = require("gulp-tslint");


const out = "./dist";
const src = ["./src/**/*.ts", "./src/**/*.d.ts", "./src/**/*.js"];

gulp.task("clean", () =>
    del(out)
);

let tsProject = ts.createProject("tsconfig.json");


gulp.task("ts-compile", ["clean"], () =>
    gulp.src(src)
        .pipe(sourcemaps.init())
        .pipe(tsProject(ts.reporter.longReporter()))
        .pipe(sourcemaps.write({
            includeContent: false,
            sourceRoot: "./src"
        }))
        .pipe(gulp.dest(out))
);

gulp.task("compile", ["ts-compile"]);

gulp.task("tslint", () =>
    gulp.src(src)
        .pipe(tslint({
            formatter: "verbose"
        }))
        .pipe(tslint.report())
);

gulp.task("build", ["tslint", "compile"]);
