'use strict'

const process = require('process')
const Table = require('tty-table')
const json2csv = require('json2csv')
const Planner = require('../lib/planner')


const command = 'iterations'
const describe = 'Queries iterations and shows statistics'
const builder = function (yargs) {

  return yargs
    .usage(`usage: $0 iterations  [options]

Queries iterations in selected spaces and shows high level statistics`)
    .help('help')
    .wrap(null)
}

/* global console */
const handler = function(argv) {

  const planner = new Planner()

  planner.iterationsWithDetails(argv.space, argv.includeItemTypes)
    .then(iterations => {
      
      // sort iterations
      iterations = iterations.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })

      if(argv.tsv) {
        const parser = new json2csv.Parser({
          fields: [{
            label: 'Name',
            value: 'name'
          }, /*{
            label: 'ID',
            value: 'id',
          }, {
            label: 'Parent ID',
            value: 'parent'
          },*/ {
            label: 'Total WIs',
            value: 'total'
          }, {
            label: 'WIs',
            value: 'workitems'
          }, { 
            label: 'w/o SPs',
            value: 'workItemsWithoutSPs'
          }, { 
            label: 'w/o ACs',
            value: 'workItemsWithoutACs'
          }, { 
            label: 'completed SPs',
            value: 'spComplete'
          }, { 
            label: 'total SPs',
            value: 'spTotal'
          }],
          delimiter: '\t'
        })
        console.log(parser.parse(iterations))
      }
      // pretty print output
      else {
        const header = [
          { value: 'Name'},/*
          { value: 'ID'},
          { value: 'Parent ID'},*/
          { value: 'Total WIs'},
          { value: 'WIs'},
          { value: 'w/o SPs'},
          { value: 'w/o ACs'},
          { value: 'completed SPs'},
          { value: 'total SPs'}
        ]
        const table = Table(header, [], {defaultValue: ''})
        // transform data
        iterations.forEach(iteration => {
          table.push([iteration.name, /*iteration.id, iteration.parent,*/ iteration.total, iteration.workitems, 
            iteration.workItemsWithoutSPs, iteration.workItemsWithoutACs, iteration.spComplete, iteration.spTotal])
        })
  
        console.log(table.render())
      }

      
    })
    .catch(error => {
      console.log(error)
      process.exit(1)
    })
  
}

module.exports = {command, describe, builder, handler}