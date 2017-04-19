# node-unoconv

A node.js wrapper for converting documents with [unoconv](http://dag.wieers.com/home-made/unoconv/).

## Requirements

[Unoconv](http://dag.wieers.com/home-made/unoconv/) is required, which requires [LibreOffice](http://www.libreoffice.org/) (or OpenOffice.)

## Install

Install with:

    npm install unoconv

## Converting documents

    var unoconv = require('unoconv')

    var options = {
      format: "pdf",
      output: "myfile.pdf"
    };

    unoconv.convert('myfile.docx', options)
      .then(
        function (result) {
    	    // do some other stuff
        })
      .catch(
        function(e){    
          console.error(e)
        });


OR

    var unoconv = require('unoconv');
    var fs = require('fs');

    var options = {
      format: "pdf",
      stdout: true
    };

    unoconv.convert('myfile.docx', options)
      .then(
        function (result) {
           fs.writeFile('myfile.pdf', result);
        })
      .catch(
        function(e){    
          console.error(e)
        });


## Starting a listener

You can also start a unoconv listener to avoid launching Libre/OpenOffice on every conversion:

	unoconv.listen();

## API

### unoconv.convert(file, outputFormat, [options], callback)

Converts `file` to the specified `outputFormat`. `options` is an object with the following properties:

* `bin` Path to the unoconv binary
* `doctype` Specify document type (document, graphics, presentation, spreadsheet)
* `export` Set export filter options
* `format` Specify output format
* `field` Replace user defined text field with value
* `import` Set input filter option string
* `nolaunch` Fail if no listener is found
* `output` Output basename, filename or directory
* `pipe` Output pipe
* `preserve` Keep timestamp and permissions of original document
* `stdout` Write output to stdout
* `template` Import style from template (.ott) file
* `timeout` Timeout after seconds if connection to listener fails
* `verbosity` (1,2,3) how verbose output should be

`callback` gets the arguments `err` and `result`. `result` is returned as a Buffer object.

Returns a `Promise`

### unoconv.listen([options])

Starts a new unoconv listener. `options` is an object with the following properties:

* `bin` Path to the unoconv binary
* `connection` Use custom connection string
* `port` Unoconv listener port to connect to
* `server` Specify the server address

You can handle errors by listening to the `stderr` property:

	var listener = unoconv.listen({ port: 2002 });

	listener.stderr.on('data', function (data) {
		console.log('stderr: ' + data.toString('utf8'));
	});

Returns a `Promise`.

### unoconv.detectSupportedFormats([options])

This function parses the output of `unoconv --show` to attempt to detect supported output formats.

`options` is an object with the following properties:

* `bin` Path to the unoconv binary

      unoconv.detectSupportedFormats()
        .then(function(result){
          console.log(result);
        })
        .catch(function(e){
          console.error(e);
        })

Returns a `Promise`
