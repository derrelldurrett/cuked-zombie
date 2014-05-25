/* globals __dirname */
var Browser = require('zombie');
var chai = require('chai');
var expect = chai.expect;
var execFile = require('child_process').execFile;
var path = require('path');
var os = require('os');
var extension;

if (os.platform() === 'win32') {
  extension = 'bat';
} else {
  extension = 'sh';
}

var cli = [__dirname, '..', '..', '..', 'bin', 'cli.' + extension].join(path.sep);
var CSSTest = require('css-tester')(chai);

var World = function World(callback) {

  var that = this;

  var hostname = os.hostname();

  var domains = {
    'pegasus.ps-webforge.net': 'ssc-testing.ps-webforge.com',
    'psc-laptop': 'ssc.laptop.ps-webforge.net',
    'psc-desktop': 'ssc.desktop.ps-webforge.net',
    'addorange-macbook': 'ssc.dev.192.168.2.222.xip.io'    
  };

  this.util = require('./zombie-utils')(that);
  this.browser = new Browser({
    site: 'http://'+domains[os.hostname()],
    debug: false,
    headers: {
      'X-Environment-In-Tests': 'from-zombie'
    },
    maxWait: 7
  });

  //this.browser.setCookie('staging_access', 'tokenU1V2pUK');
  this.browser.cookies.set({name: 'staging_access', value: 'tokenU1V2pUK', domain: domains[os.hostname()]});

  this.debug = {};
  this.debug.log = function() {
    /* globals console */
    console.log.apply(arguments);
  };

  this.css = function(selector) {
    if (!that.browser.window.jQuery) {
      throw new Error('cannot css() because jQuery is not defined');
    }

    return new CSSTest(that.browser.window.jQuery, selector);
  };

  this.visit = function(url, callback) {
    that.browser.visit(url, function(error) {
      if (error && error.filename === 'http://www.youtube.com/embed/tW2WGr--jy4:script') {
        that.debug.log('youtube error ignored');

        // just continue
        that.browser.wait(function() {
          callback.call(that, that.browser);
        });
      } else if (error) {
        throw error;
      } else {
        callback.call(that, that.browser);
      }
    });
  };

  this.waitForjQuery = function(callback) {
    that.browser.wait(
      function() {
        return that.browser.window.jQuery !== undefined;
      },
      function() {
        if (!that.browser.window.jQuery) {
          throw new Error('timedout while waiting for jQuery');
        }

        that.registerjQuery();
        callback.call(that, that.browser.window.jQuery);
      }
    );
  };

  this.requirejQuery = function(callback) {
    //that.browser.evaluate("window.require(['jquery']);");
    this.waitForjQuery(callback);
  };

  // should be called if for example a button has changed the site
  this.pageHasChanged = function(callback) {
    that.registerjQuery();
    callback.call(that);
  };

  this.getjQuery = function() {
    return that.browser.window.jQuery;
  };

  this.koContext = function($element) {
    var ko = that.browser.window.require('knockout');
    var context = ko.contextFor($element.get(0));

    expect(context, 'context from element: '+$element).to.be.ok;

    return context;
  };

  this.koData = function($element) {
    return that.koContext($element)['$data'];
  };

  this.registerjQuery = function() {
    if (that.browser.window.jQuery) {
      that.jQuery = that.browser.window.jQuery;

      that.ajaxRequests = [];

      that.jQuery(that.browser.document).ajaxSend( function(event, jqXHR, ajaxOptions) {
        that.ajaxRequests.push(ajaxOptions);
      });
    }
  };

  this.visitPage = function(path, callback) {
    return that.visit(path, function() {
      that.pageHasChanged(function() {
        callback.call(that, that.browser);
      });
    });
  };

  this.getLastAjaxRequest = function() {
    expect(that.ajaxRequests, 'list of made ajax Requests').to.be.ok.and.not.to.have.length(0);

    var lastRequest = this.ajaxRequests[this.ajaxRequests.length - 1];

    return lastRequest;
  };

  // expects something for the last ajax request done
  // .data an object, .url a string
  this.expectAjaxRequest = function(exp) {
    var lastRequest = this.getLastAjaxRequest();

    expect(lastRequest, 'lastAjaxRequest').to.have.property('url', exp.url);
    expect(lastRequest, 'lastAjaxRequest').to.have.property('data');
    expect(JSON.parse(lastRequest.data), 'lastAjaxRequest.data').to.be.eql(exp.data);
  };

  this.executeDQL = function(dql, parameters, callback) {
    execFile(cli, ["db:dql", dql, JSON.stringify(parameters)], function(error, stdout, stderr) {
      if (error) {
        that.debug.log(stderr, stdout);
        throw error;
      }

      var result = JSON.parse(stdout);

      callback.call(that, result);
    });
  };

  this.retrieveMailSpool = function(callback) {
    execFile(cli, ["mail:spool"], function(error, stdout, stderr) {
      if (error) {
        that.debug.log(stderr, stdout);
        throw error;
      }

      var result = JSON.parse(stdout);

      callback.call(that, result);
    });
  };

  this.clearMailSpool = function(callback) {
    execFile(cli, ["mail:spool", "--clear"], function(error, stdout, stderr) {
      if (error) {
        that.debug.log(stderr, stdout);
        throw error;
      }

      callback.call(that);
    });
  };

  this.loadFixture = function(name, callback) {
    execFile(cli, ["db:fixture", name], function(error, stdout, stderr) {
      if (error) {
        that.debug.log(stderr, stdout);
        throw error;
      }

      callback.call(that);
    });
  };

  callback(); // tell Cucumber we're finished and to use 'this' as the world instance
};

/* globals exports:true */
exports.World = World;