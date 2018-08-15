'use strict'

const prettyjson = require('prettyjson')
const process = require('process')
const json2csv = require('json2csv')
const Planner = require('../lib/planner')
const andQuery = require('../lib/queries')


const command = 'work-items <iteration>'
const describe = 'Queries work items in particular iteration and shows related statistics'
const builder = function (yargs) {

  return yargs
    .usage(`usage: $0 work-items <iteration> [options]

Queries work items in particular <iteration> and shows related statistics`)
    .help('help')
    .wrap(null)
}

/* global console */
const handler = function(argv) {

  const planner = new Planner()

  const query = andQuery(argv.iteration, argv.includeItemTypes)
  
  planner.search(query, argv.space)
    .then(workItems => {
      if(argv.tsv) {
        const parser = new json2csv.Parser({
          fields: [{
            label: 'Name',
            value: 'attributes.system.title'
          }, {
            label: 'State',
            value: 'attributes.system.state'
          }, {
            label: 'SPs',
            value: 'attributes.storypoints'
          }, {
            label: 'Description',
            value: 'attributes.system.description'
          }],
          delimiter: '\t',
          flatten: true
        })
        console.log(parser.parse(workItems.data))
      }
      else {
        console.log(prettyjson.render(workItems))
      }
    })
    .catch(error => {
      console.log(error)
      process.exit(1)
    })
}

module.exports = {command, describe, builder, handler}