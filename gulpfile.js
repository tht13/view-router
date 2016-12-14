"use strict";
const gulp = require("gulp");
const ts = require("gulp-typescript");
const del = require("del");
const sourcemaps = require("gulp-sourcemaps");
const path = require("path");
const typedoc = require("gulp-typedoc");
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

gulp.task("typedoc", () =>
    gulp.src(src)
        .pipe(typedoc({
            // TypeScript options (see typescript docs) 
            module: "commonjs",
            target: "es6",
            includeDeclarations: true,

            // Output options (see typedoc docs) 
            out: "./docs",
            json: "./docs.json",

            // TypeDoc options (see typedoc docs) 
            name: "view-router",
            ignoreCompilerErrors: false,
            version: true,
            excludePrivate: true,
            excludeExternals:true
        }))
);

gulp.task("tslint", () =>
    gulp.src(src)
        .pipe(tslint({
            formatter: "verbose"
        }))
        .pipe(tslint.report())
);

gulp.task("build", ["tslint", "compile"]);
