/**
 * FileName: logger.js
 * Author: @mxfli
 * CreateTime: 2012-01-10 19:52
 * Description:
 *      Simple logger for nodejs.
 */

var levels = ["error", "warn", "info", "debug"];
var logger = function (options) {
    var debug = false;
    var colors = [31, 33, 36, 90];
    var innerLevel = {level:levels[2]};
    /**
     * real log function;
     * this value for log level: this.level
     */
    var log = function (level, levelStr) {
        var levelIndex = levels.indexOf(level);
        if (levels.indexOf(this.level) >= levelIndex) {
            console.log.apply(console, ['\033[' + colors[levelIndex] + 'm' + levelStr.toUpperCase() + '\033[39m']
                .concat(Array.prototype.slice.call(arguments, 2)));
        }
    };

    function bindLogMethod(that, options) {
        levels.forEach(function (level) {
            that[level] = log.bind(options, level, level + (level.length === 5 ? ':' : ':'));
        });
    }

    var innerLog = {};
    bindLogMethod(innerLog, innerLevel);

    if (levels.indexOf(process.env['LOG_LEVEL']) === -1) {
        process.env['LOG_LEVEL'] = levels[2]; //DEFAULT level is 1:info;
        debug && innerLog.warn("process.env['LOG_LEVEL'] accepted values: ", levels.join(';'), 'Yours:', process.env['LOG_LEVEL']);
        debug && innerLog.warn('Using default value:', levels[2]);
    }
    var that = {};

    options = options || {};
    options.enabled = true;
    options.color = false !== options.color;
    options.level = options.level || process.env['LOG_LEVEL'];

    debug && innerLog.info('Process logger options:', options);
    bindLogMethod(that, options);

    return that;
};

var self = {level:process.env['LOG_LEVEL'], color:true};
var _logger = logger(self);
_logger.info('Inner logger is working...');

/**
 * process level log
 * set log level use process.env['LOG_LEVEL'], default is level:INFO
 */
Object.keys(_logger).forEach(function (level) {
    exports[level] = function () {_logger[level].apply(self, Array.prototype.slice.call(arguments))};
});

/**
 * Custom level for debug is usfule.
 * @param {String} level Custom level bind to the logger.default is process.env['LOG_LEVEL']
 */
exports.getLogger = function (level) {
    level = level || process.env['LOG_LEVEL'];
    console.assert(typeof level === 'string');
    level = level.trim().toLowerCase();
    // Must set level correct
    console.assert(levels.indexOf(level) !== -1);
    return logger({level:level, color:true});
};
