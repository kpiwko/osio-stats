'use strict'

const process = require('process')
const Table = require('tty-table')
const json2csv = require('json2csv')
const chalk = require('chalk')
const Planner = require('../lib/planner')


const command = 'iterations'
const describe = 'Queries iterations and shows statistics'
const builder = function (yargs) {

  return yargs
    .usage(`usage: $0 iterations  [options]

Queries iterations in selected spaces and shows high level statistics
Available columns (select by providing [id] in --columns option): 

${Planner.COLUMNS.map(c => {return '['+c.id+']\t\t' + chalk.bold(c.title) + ' - ' + c.description}).join('\n')}`)
    .option('columns', {
      describe: 'Columns',
      type: 'array',
      default: Planner.COLUMNS.map(column => column.id),
      defaultDescription: `Include all columns: ${Planner.COLUMNS.map(column => column.id).join(', ')}`
    })
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

      const columns = Planner.COLUMNS.filter(column => {
        return argv.columns.includes(column.id)
      })

      if(argv.tsv) {
        const fields = columns.map(column => {
          return {
            label: column.title,
            value: column.id
          }
        })
        const parser = new json2csv.Parser({
          fields: fields,
          delimiter: '\t'
        })
        console.log(parser.parse(iterations))
      }
      // pretty print output
      else {
        const header = columns.map(column => {
          return {
            value: column.title
          }
        })
        const table = Table(header, [], {defaultValue: ''})
        // transform data
        iterations.forEach(iteration => {
          const entry = columns.reduce((acc, column) => {
            acc.push(iteration[column.id])
            return acc
          }, [])
          table.push(entry)
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