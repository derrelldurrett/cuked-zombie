# cuked-zombie [![Build Status](https://travis-ci.org/webforge-labs/cuked-zombie.svg?branch=master)](https://travis-ci.org/webforge-labs/cuked-zombie)

Use cucumber and zombie in your acceptance tests

[Cucumber](https://github.com/cucumber/cucumber-js) is the Javascript reference-implementation for [Behaviour Driven Development](http://cukes.info/). Cucumber allows you to write acceptance tests at a higher abstraction level than unit tests.
[Zombie](http://zombie.labnotes.org/) is a headless browser written in node, based on Contextify and JSDOM.

Combined they are the best available system to acceptance test your web-application in a browser.

## features

cuked-zombie bridges the small gap between this libraries. It provides an api to infect your native cucumber steps. Infected cucumber steps have new (zombie-)features:

  - chai exceptions (and other) will be automatically converted to cucumber failures
  - you can pass arguments to your infected step definitions
  - a bunch of tools that extend the behaviour of zombie (visiting Pages, sending Cookies, using jQuery from the tested site, etc)
  - an easy integration with [CSSTester](https://github.com/webforge-labs/css-tester)
  - the stack trace from assertions is shortened

other features:

  - a simple task to run all or just single cucumber steps, filter by expression and filter by tags
  - some convenient functions to manage different hosts your testing environment runs on

## installation

[![NPM](https://nodei.co/npm/cuked-zombie.png?downloads=true)](https://www.npmjs.org/package/cuked-zombie)

```
npm install cuked-zombie
```
(this will install Zombie and cucumber-js as well)

## Usage

To use cucumber with zombie you need to infect your step definitions and create an infected world (a world that knows how to invoke zombie(s)).

1. create a step definitions bootstrap and use it as the only stepDefinition in cucumber
2. create your infected steps (they are compatible to native cucumber steps)
3. run cucumber with the bootstrap or use the internal task `grunt cucumber`

*For this example* it is assumed that your features are stored in `features/something.feature`. Your infected step definitions should be stored in files grouped by domain in: `tests/js/cucumber/domain-step-definitions.js`. For example: `tests/js/cucumber/database-step-definitions.js` includes all steps dealing with database stuff. Have a look at [tests/files/my-blog](https://github.com/webforge-labs/cuked-zombie/blob/master/tests/files/my-blog) for a full, working structure.

### 1. creating a step definitions bootstrap 

We need to create a native step definition for cucumber, which then infects the other step definitions and creates a new zombie world.

create the file: `tests/js/cucumber/bootstrap.js` and fill in:

```js
module.exports = function() {
  var cucumberStep = this;
  var cukedZombie = require('cuked-zombie');

  var infected = cukedZombie.infect(cucumberStep, {
    world: require('../world-config'),
    steps: {
      dir: __dirname
    }
  });
};
```

with this bootstrap config cuked-zombie will search for all files in `__dirname` (next to your bootstrap.js) with the glob: `*-step-definitions.js`. These found step definitions are called "infected" because cuked-zombie adds cool (zombie-)features to them.

#### infected steps options

`dir` should be an absolute path name, or something that glob() (from current pwd) and require() will find. So its best to use something relative to `__dirname`

#### infected world options

Here are some examples for the world-config,js:

```js
module.exports = {
  cli: // path to your symfony command line interface,
  domains: {
    // os.hostname(): domain
    'my-server-name': 'staging.my-blog.com'
  },
  cookies: [{
    name: 'staging_access',
    value: 'tokenU1V2pUK'
  }]
};
```

If you don't want to switch per `os.hostname()` you can provide a domain directly: 

```
  domain: 'staging.my-blog.com'
```

### 2. creating an infected step

basically every cucumber step can be an infected step (they are backwards compatible, allthough doomed to die). Goto the `tests/js/cucumber` directory and create a node module like: `database-step-definitions.js`. The base content is just like this:

```js
module.exports = function() {

  this.Given(..., function(callback) {

  };
  
}
```

You can paste the `this.Given/When/Then()` statements from the cucumber-js runner cli output.

### 3. running cucumber

The easiest way is to run cucumber with the built in grunt task:

adjust your Gruntfile.js accordingly:
```js
  grunt.loadNpmTasks('cuked-zombie');

  grunt.initConfig({
    'cuked-zombie': {
      options: {
        features: 'features',
        bootstrap: "tests/js/cucumber/bootstrap.js",
        format: "pretty"
      }
    }
  });
```

The full configuration is optional. The values above are the defaults, so if they match for you, you don't have to call `grunt.initConfig`.

to run all tests, use:
```
grunt cucumber
``` 

to run just the `post.feature` and `post-admin.feature`, use: 
```
grunt cucumber --filter post
``` 

to filter the scenarios using @-tags apply tags to your scenarios like this:

```gherkin
  @post
  Scenario: Writing a new post
  ...

  @delete
  Scenario: Delete a post
  ...

  @post
  Scenario: Rename a post
  ...

  Scenario: Edit a post
  ...
```

Now you can run scenarios with the selected tag(s). For example, you can use

```
grunt cucumber --tags @post
```

to run the 1st and the 3rd scenarios. Or

```
grunt cucumber --tags @post,@delete
```

to run the first three scenarios.

## Debugging

Often its REALLY difficult to see what zombie is doing. Starting with version 2.0.x cuked-zombie has now a better fine-grained debug possibility.  
Use node debug for this:

```
DEBUG=* grunt cucumber
```

windows:
```
set DEBUG=*
grunt cucumber
```

You can use debug like this: `DEBUG=*,-fixtures` this will include all debug messages except for fixtures

 - `fixtures`: the output from cuked zombie, when fixtures are loaded (with symfony bridge)
 - `cuked-zombie`: internals from cuked zombie
 - `zombie`: all messages from zombie (event loop, etc)
 - `requests`: shows all http resonses and http requests that zombie does during a test (very useful for debugging ajax)


## Migration to 2.0.0 from 1.2.x
 - read the changelog for zombie 3.x.x from zombie 2.0.x-alpha
 - use the new troubleshooting debug-mode for cuked zombie

## Migration to 1.2.x from 1.0.x and 1.1.x

 - uninstall the `grunt-cucumber` task from your package.json
 - remove the `cucumberjs: { ... }` section from your Gruntfile
 - if your features are not in the directory `features` next to the `Gruntfile.js` or your `bootstrap.js` is not in `tests\js\cucumber` adjust the config-section `cuked-zombie` in your Gruntfile like explained above
