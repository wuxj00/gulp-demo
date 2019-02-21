// Node Packages
const gulp = require('gulp');
const pump = require('pump');
const del = require('del');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const browserSync = require('browser-sync').create();
const vinylNamed = require('vinyl-named');
const through2 = require('through2');
const gulpZip = require('gulp-zip');
const gulpUglify = require('gulp-uglify');
const gulpSourcemaps = require('gulp-sourcemaps');
const gulpPostcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const postcssUncss = require('postcss-uncss');
const gulpSass = require('gulp-sass');
const sass = require('gulp-ruby-sass')
const gulpBabel = require('gulp-babel');
const gulpImagemin = require('gulp-imagemin');
const gulpHtmlmin = require('gulp-htmlmin');
const imageminPngquant = require('imagemin-pngquant');
const imageminJpegRecompress = require('imagemin-jpeg-recompress');
const eslint = require('gulp-eslint');



// Entry point retreive from webpack
const entry = require('./webpack/entry');

// Transform Entry point into an Array for defining in gulp file
const entryArray = Object.values(entry);

// Supported Browsers
const supportedBrowsers = [
  'last 3 versions', // http://browserl.ist/?q=last+3+versions
  'ie >= 10', // http://browserl.ist/?q=ie+%3E%3D+10
  'edge >= 12', // http://browserl.ist/?q=edge+%3E%3D+12
  'firefox >= 28', // http://browserl.ist/?q=firefox+%3E%3D+28
  'chrome >= 21', // http://browserl.ist/?q=chrome+%3E%3D+21
  'safari >= 6.1', // http://browserl.ist/?q=safari+%3E%3D+6.1
  'opera >= 12.1', // http://browserl.ist/?q=opera+%3E%3D+12.1
  'ios >= 7', // http://browserl.ist/?q=ios+%3E%3D+7
  'android >= 4.4', // http://browserl.ist/?q=android+%3E%3D+4.4
  'blackberry >= 10', // http://browserl.ist/?q=blackberry+%3E%3D+10
  'operamobile >= 12.1', // http://browserl.ist/?q=operamobile+%3E%3D+12.1
  'samsung >= 4', // http://browserl.ist/?q=samsung+%3E%3D+4
];

// Config
const autoprefixConfig = { browsers: supportedBrowsers, cascade: false };
const babelConfig = { targets: { browsers: supportedBrowsers } };

// Paths for reuse
const exportPath = './dist/**/*';
const srcPath = (file, watch = false) => {
  // if (file === 'scss' && watch === false) return './src/scss/styles.scss';
  if (file === 'scss') return './src/scss/**/*.scss';
  // if (file === 'js' && watch === false) return entryArray;
  if (file === 'js' ) return './src/js/**/*.js';
  if (file === 'html') return './src/**/*.html';
  if (file === 'img') return './src/img/**/*.{png,jpeg,jpg,svg,gif}';
  if (file === 'models') return './src/models/**/*';
  console.error('Unsupported file type entered into Gulp Task Runner for Source Path');
};
const distPath = (file, serve = false) => {
  if (['css', 'js', 'img', 'models'].includes(file)) return `./dist/${file}`;
  if (file === 'html' && serve === false) return './dist/**/*.html';
  if (file === 'html' && serve === true) return './dist';
  console.error('Unsupported file type entered into Gulp Task Runner for Dist Path');
};

/**
 * Cleaning Tasks
*/

// Clean Markup Task
const cleanMarkup = (mode) => () => {
  return ['development', 'production'].includes(mode) ? del([distPath('html')]) : undefined;
};

// Clean Images Task
const cleanImages = (mode) => () => {
  return ['development', 'production'].includes(mode) ? del([distPath('img')]) : undefined;
};

// Clean Styles Task
const cleanStyles = (mode) => () => {
  return ['development', 'production'].includes(mode) ? del([distPath('css')]) : undefined;
};

// Clean Scripts Task
const cleanScripts = (mode) => () => {
  return ['development', 'production'].includes(mode) ? del([distPath('js')]) : undefined;
};

// Clean the zip file
const cleanExport = (mode) => () => {
  return ['development', 'production'].includes(mode) ? del(['./dist.zip']) : undefined;
};

// Clean the models file
const cleanModels = (mode) => () => {
  return ['development', 'production'].includes(mode) ? del([distPath('models')]) : undefined;
};

/**
 * Building Tasks 
*/

// Build Markup Tasks
const buildMarkup = (mode) => (done) => {
  ['development', 'production'].includes(mode) ? pump([
    gulp.src(srcPath('html')),
    ...((mode === 'production') ? [gulpHtmlmin({ collapseWhitespace: true })] : []),
    gulp.dest(distPath('html', true)),
  ], done) : undefined;
};

// Build Images Task
const buildImages = (mode) => (done) => {
  ['development', 'production'].includes(mode) ? pump([
    gulp.src(srcPath('img')),
    gulpImagemin([
      gulpImagemin.gifsicle(),
      gulpImagemin.jpegtran(),
      gulpImagemin.optipng(),
      gulpImagemin.svgo(),
      imageminPngquant(),
      imageminJpegRecompress(),
    ]),
    gulp.dest(distPath('img')),
    browserSync.stream(),
  ], done) : undefined;
};

const checkEslint = (mode) => (done) => {

  return new Promise((resolve, reject) => {
    (mode === 'development') && gulp.src(['./src/js/**/*.js','!models/**'])
    .pipe(eslint())
    .pipe(eslint.results(results => {
        // Called once for all ESLint results.
        console.log(`Total Results: ${results.length}`);
        console.log(`Total Warnings: ${results.warningCount}`);
        console.log(`Total Errors: ${results.errorCount}`);
        (results || []).forEach((result) => {
          console.log(result.filePath)
        })
        resolve()
    }))
  })
}

// Build Styles Task
const buildStyles = (mode) => (done) => {
  let outputStyle;
  if (mode === 'development') outputStyle = 'nested';
  else if (mode === 'production') outputStyle = 'compressed';
  else outputStyle = undefined;

  const postcssPlugins = [
    autoprefixer(autoprefixConfig),
    postcssUncss({ html: [distPath('html')] }),
  ];
  
  // sass(srcPath('scss'))// 编译文件
  //     .on('error', (err) => err) // 错误信息
  //     .pipe(distPath('css'));//输出路径
  ['development', 'production'].includes(mode) ? pump([
    gulp.src(srcPath('scss')),
    gulpSourcemaps.init({ loadMaps: true }),
    gulpSass({ outputStyle }),

    gulpPostcss(postcssPlugins),
    gulpSourcemaps.write('./'),
    gulp.dest(distPath('css')),
    browserSync.stream(),
  ], done) : undefined;
};




// Build Scripts Task
const buildScripts = (mode) => (done) => {
  let streamMode;
  if (mode === 'development') streamMode = require('./webpack/config.development.js');
  else if (mode === 'production') streamMode = require('./webpack/config.production.js');
  else streamMode = undefined;

  ['development', 'production'].includes(mode) ? pump([
    gulp.src(srcPath('js')),

    vinylNamed(),
    webpackStream(streamMode, webpack),
    gulpSourcemaps.init({ loadMaps: true }),
    through2.obj(function (file, enc, cb) {
      const isSourceMap = /\.map$/.test(file.path);
      if (!isSourceMap) this.push(file);
      cb();
    }),
    gulpBabel({ presets: [['env', babelConfig]] }),
    ...((mode === 'production') ? [gulpUglify()] : []),
    gulpSourcemaps.write('./'),
    gulp.dest(distPath('js')),
    browserSync.stream(),
  ], done) : undefined;
};


// Build Scripts Task
const copyModels = (mode) => (done) => {

  ['development', 'production'].includes(mode) ? pump([
    gulp.src(srcPath('models')),
    gulp.dest(distPath('models', true)),
  ], done) : undefined;
};
/**
 * Generic Task for all Main Gulp Build/Export Tasks
*/

// Generic Task
const genericTask = (mode, context = 'building') => {
  let port;
  let modeName;

  if (mode === 'development') {
    port = '3000';
    modeName = 'Development Mode';
  } else if (mode === 'production') {
    port = '8000';
    modeName = 'Production Mode';
  } else {
    port = undefined;
    modeName = undefined;
  }

  // Combine all booting tasks into one array!
  const allBootingTasks = [
    Object.assign(cleanMarkup(mode), { displayName: `Booting Markup Task: Clean - ${modeName}` }),
    Object.assign(buildMarkup(mode), { displayName: `Booting Markup Task: Build - ${modeName}` }),
    Object.assign(cleanImages(mode), { displayName: `Booting Images Task: Clean - ${modeName}` }),
    Object.assign(buildImages(mode), { displayName: `Booting Images Task: Build - ${modeName}` }),
    Object.assign(cleanStyles(mode), { displayName: `Booting Styles Task: Clean - ${modeName}` }),
    Object.assign(buildStyles(mode), { displayName: `Booting Styles Task: Build - ${modeName}` }),
    Object.assign(cleanScripts(mode), { displayName: `Booting Scripts Task: Clean - ${modeName}` }),
    Object.assign(buildScripts(mode), { displayName: `Booting Scripts Task: Build - ${modeName}` }),
    Object.assign(cleanModels(mode), { displayName: `Booting Models Task: Clean - ${modeName}` }),  
    Object.assign(copyModels(mode), { displayName: `Booting copyModels Task: copy - ${modeName}` }),
    Object.assign(checkEslint(mode), { displayName: `Booting checkEslint Task: eslint - ${modeName}` }),

  ];
  // Browser Loading & Watching
  const browserLoadingWatching = (done) => {
    browserSync.init({ port, server: distPath('html', true) });

    // Watch - Markup
    gulp.watch(srcPath('html'), true)
      .on('all', gulp.series(
        Object.assign(cleanMarkup(mode), { displayName: `Watching Markup Task: Clean - ${modeName}` }),
        Object.assign(buildMarkup(mode), { displayName: `Watching Markup Task: Build - ${modeName}` }),
      ), browserSync.reload);
    done();

    // Watch - Images
    gulp.watch(srcPath('img', true))
      .on('all', gulp.series(
        Object.assign(cleanImages(mode), { displayName: `Watching Images Task: Clean - ${modeName}` }),
        Object.assign(buildImages(mode), { displayName: `Watching Images Task: Build - ${modeName}` }),
      ), browserSync.reload);

    // Watch - Styles
    gulp.watch(srcPath('scss', true))
      .on('all', gulp.series(
        Object.assign(cleanStyles(mode), { displayName: `Watching Styles Task: Clean - ${modeName}` }),
        Object.assign(buildStyles(mode), { displayName: `Watching Styles Task: Build - ${modeName}` }),
      ), browserSync.reload);

    // Watch - Scripts
    gulp.watch(srcPath('js', true))
      .on('all', gulp.series(
        Object.assign(cleanScripts(mode), { displayName: `Watching Scripts Task: Clean - ${modeName}` }),

        Object.assign(buildScripts(mode), { displayName: `Watching Scripts Task: Build - ${modeName}` }),
      ), browserSync.reload);

    // Watch - models
    gulp.watch(srcPath('models', true))
      .on('all', gulp.series(
        Object.assign(cleanModels(mode), { displayName: `Watching models Task: Clean - ${modeName}` }),
        Object.assign(copyModels(mode), { displayName: `Watching models Task: copy - ${modeName}` }),
      ), browserSync.reload);
  };
  
  // Exporting Zip
  const exportingZip = (done) => {
    pump([
      gulp.src(exportPath),
      gulpZip('./dist.zip'),
      gulp.dest('./'),
    ], done);
  };

  // Returning Tasks based on Building Context
  if (context === 'building') {
    return [
      ...allBootingTasks,
      Object.assign(browserLoadingWatching, { displayName: `Browser Loading & Watching Task - ${modeName}` }),
    ];
  }
  
  // Returning Tasks based on Exporting Context 
  if (context === 'exporting') {
    return [
      cleanExport(mode), 
      ...allBootingTasks,
      Object.assign(exportingZip, { displayName: `Exporting Zip Task - ${modeName}` }),
    ];
  }

  // No Side-Effects Please
  return undefined;
};

/**
 * Main Gulp Build/Export Tasks that are inserted within `package.json`
*/

gulp.task('clean-all', function () {
  return del('./dist');
});

// Default (`npm start` or `yarn start`) => Production
gulp.task('default', gulp.series(...genericTask('production', 'building')));

// Dev (`npm run dev` or `yarn run dev`) => Development
gulp.task('dev', gulp.series(...genericTask('development', 'building')));

// Export (`npm run export` or `yarn run export`)
gulp.task('export', gulp.series(...genericTask('production', 'exporting')));
