#!/usr/bin/env node
'use strict'

const yargs = require('yargs')

const cli = function() {
  yargs
    .usage('usage: $0 <command>')
    .commandDir('./cmd')
    .demandCommand()
    .option('space', {
      describe: 'Space (id) to work with',
      default: 'e8864cfe-f65a-4351-85a4-3a585d801b45',
      defaultDescription: 'OpenShift_io'
    })
    .option('include-item-types', {
      describe: 'Filter any query by item type(s)',
      type: 'array',
      default: [],
      defaultDescription: 'Include all item types'
    })
    .option('tsv', {
      describe: 'Print out query outcome in Tab Separated Value format',
      default: false
    })
    .help('help')
    .version()
    //.wrap(null)
    .argv
}

cli()