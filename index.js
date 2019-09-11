'use strict';

var _ = require('underscore'),
    childProcess = require('child_process'),
    mime = require('mime'),
    Q = require('q');

var unoconv = exports = module.exports = {};

/**
* Parse options object to arguments.
*
* @param {Object} options
* @return {Array}
* @api public
*/

var parseOptions = function(options){
  var args = [];

  // for convert

  if (options.doctype) {
    args.push('-d' + options.doctype);
  }

  if (options.export) {
    args.push('-e' + options.export);
  }

  if (options.format) {
    args.push('-f' + options.format);
  }

  if (options.field) {
    args.push('-F' + options.field);
  }

  if (options.import) {
    args.push('-i' + options.import);
  }

  if (options.nolaunch) {
    args.push('-n');
  }

  if (options.output) {
    args.push('--output');
    args.push(options.output);
  }

  if (options.pipe) {
    args.push('--pipe');
    args.push(options.pipe);
  }

  if(options.preserve) {
    args.push('--preserve');
  }

  if (options.stdout) {
    args.push('--stdout');
  }
  if (options.template) {
    args.push('-t' + options.template);
  }

  if (options.timeout) {
    args.push('-T' + options.timeout);
  }

  if (options.verbosity) {
    switch(options.verbosity){
      case "3":
        args.push('-vvv');
      break;
      case "2":
        args.push('-vv');
      break;
      default:
        args.push('-v');
      break;
    }
  }

  // for listener

  if(options.connection) {
    args.push('-c' + options.connection);
  }

  if (options.port) {
    args.push('-p' + options.port);
  }

  if(options.server){
    args.push('-s' + options.server);
  }

  return args;
}

/**
* Convert a document.
*
* @param {String} file
* @param {Object} options
* @param {Function} callback
* @return {ChildProcess}
* @api public
*/

unoconv.convert = function(file, options) {
    var self = this,
        args = [],
        bin = 'unoconv',
        child,
        stdout = [],
        stderr = [],
        done = false,
        deferred = Q.defer();

    if(!options || !options.format){
      return deferred.reject(new Error("format is a required parameter for options"));
    }

    args = args.concat(parseOptions(options));
    if (options.bin) {
      bin = options.bin;
    }

    args.push(file);

    child = childProcess.spawn(bin, args, {detached: true});

    child.stdout.on('data', function (data) {
        console.log("[UNOCONV] -", data);
        stdout.push(data);
    });

    child.stderr.on('data', function (data) {
        console.error("[UNOCONV] -", data);
        stderr.push(data);
    });

    child.on('close', function (code) {
        done = true;
        if (code !== 0 && stderr.length) {
          return deferred.reject(Buffer.concat(stderr).toString());
        }
        deferred.resolve(Buffer.concat(stdout));
    });

    if(options.kill_after){
      setTimeout(() => {
        if(!done){
          process.kill(-child.pid)
          //child.kill('SIGTERM');
          var child2 = childProcess.spawn('/usr/bin/killall soffice.bin');
          child2.stdout.on('data', function (data) {
              console.log("[UNOCONV] -", data);
              stdout.push(data);
          });

          child2.stderr.on('data', function (data) {
              console.error("[UNOCONV] -", data);
              stderr.push(data);
          });
          child.on('close', function (code) {
              deferred.reject(new Error("killing hung process"));
          });
        }
      }, options.kill_after);

    }

    return deferred.promise;
};

/**
* Start a listener.
*
* @param {Object} options
* @return {ChildProcess}
* @api public
*/
unoconv.listen = function (options) {
    var args = [ '--listener' ];
        bin = 'unoconv',
        deferred = Q.defer();

    if(options){
      args = args.concat(parseOptions(options));
      if (options.bin) {
        bin = options.bin;
      }
    }

    child = childProcess.spawn(bin, args);

    child.stdout.on('data', function (data) {
        stdout.push(data);
    });

    child.stderr.on('data', function (data) {
        stderr.push(data);
    });

    child.on('close', function (code) {
        if (code !== 0 && stderr.length) {
            deferred.reject(Buffer.concat(stderr).toString());
        }
        deferred.resolve(Buffer.concat(stdout));
    });
    return deferred.promise;
};

/**
* Detect supported conversion formats.
*
* @param {Object|Function} options
* @param {Function} callback
*/
unoconv.detectSupportedFormats = function (options) {
    var self = this,
        docType,
        detectedFormats = {
            document: [],
            graphics: [],
            presentation: [],
            spreadsheet: []
        },
        args = [ '--show' ],
        bin = 'unoconv',
        deferred = Q.defer();

    if (options && options.bin) {
        bin = options.bin;
    }

    childProcess.execFile(bin, args, function (err, stdout, stderr) {
        if (err) {
            return callback(err);
        }

        // For some reason --show outputs to stderr instead of stdout
        var lines = stderr.split('\n');

        lines.forEach(function (line) {
            if (line === 'The following list of document formats are currently available:') {
                docType = 'document';
            } else if (line === 'The following list of graphics formats are currently available:') {
                docType = 'graphics';
            } else if (line === 'The following list of presentation formats are currently available:') {
                docType = 'presentation';
            } else if (line === 'The following list of spreadsheet formats are currently available:') {
                docType = 'spreadsheet';
            } else {
                var format = line.match(/^(.*)-/);

                if (format) {
                    format = format[1].trim();
                }

                var extension = line.match(/\[(.*)\]/);

                if (extension) {
                    extension = extension[1].trim().replace('.', '');
                }

                var description = line.match(/-(.*)\[/);

                if (description) {
                    description = description[1].trim();
                }

                if (format && extension && description) {
                    detectedFormats[docType].push({
                        'format': format,
                        'extension': extension,
                        'description': description,
                        'mime': mime.lookup(extension)
                    });
                }
            }
        });

        if (detectedFormats.document.length < 1 &&
            detectedFormats.graphics.length < 1 &&
            detectedFormats.presentation.length < 1 &&
            detectedFormats.spreadsheet.length < 1) {
            deferred.reject(new Error('Unable to detect supported formats'))
        }

        deferred.resolve(detectedFormats);
    });
};
