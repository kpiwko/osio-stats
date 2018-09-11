'use strict'

const process = require('process')
const Table = require('tty-table')
const json2csv = require('json2csv')
const chalk = require('chalk')
const formatter = require('../lib/formatter')
const Planner = require('../lib/planner')
const datatransformers = require('../lib/datatransformers')

const command = 'iterations'
const describe = 'Queries iterations and shows statistics'
const builder = function (yargs) {

  return yargs
    .usage(`usage: $0 iterations  [options]

Queries iterations in selected spaces and shows high level statistics
Available columns (select by providing [id] in --columns option): 

${datatransformers.all.map(dt => {return '['+dt.id+']\t\t' + chalk.bold(dt.title) + ' - ' + dt.description}).join('\n')}`)
    .option('columns', {
      describe: 'Columns',
      type: 'array',
      default: datatransformers.all.map(dt => dt.id),
      defaultDescription: `Include all columns: ${datatransformers.all.map(dt => dt.id).join(', ')}`
    })
    .help('help')
    .wrap(null)
}

/* global console */
const handler = function(argv) {

  const planner = new Planner()

  planner.iterationsWithDetails(argv.space, argv['include-item-types'])
    .then(iterations => {
      
      // sort iterations
      iterations = iterations.sort((a, b) => {
        return a.name.localeCompare(b.name)
      })

      const columns = datatransformers.all.filter(dt => {
        return argv.columns.includes(dt.id)
      })

      // tsv output
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
      // json output
      else if(argv.json) {
        console.log(JSON.stringify(iterations, null, 2))
      }
      else if(argv.html) {
        (async () => {
          const metadata = Object.keys(argv).filter(k => k!=='_' && k!=='$0').map(k => {
            const value = argv[k]
            return `--${k} ${Array.isArray(value) ? (value.length ? value.join(' ') : '[]') : value}`
          }).join(' ')
          const data = iterationsHelper(iterations, columns)
          const date = new Date(Date.now()).toUTCString()

          const content = await formatter.html(command, {
            metadata,
            data,
            date,
            dts: datatransformers.all,
            title: 'OpenShift.io Iterations Statistics' 
          })
          console.log(content)
        })()
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

const iterationsHelper = (iterations, columns) => {
  const data = []
  iterations.forEach(iteration => {
    const entry = columns.reduce((acc, column) => {
      acc.push(iteration[column.id])
      return acc
    }, [])
    data.push(`<td>${entry.join('</td><td>')}</td>`)
  })
  return data
}

module.exports = {command, describe, builder, handler}