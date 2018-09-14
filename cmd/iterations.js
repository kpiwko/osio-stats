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

const executor = async function(argv) {

  const planner = new Planner()
  
  const columns = datatransformers.all.filter(dt => {
    return argv.columns.includes(dt.id)
  })

  let iterations = await planner.iterationsWithDetails(argv.space, argv['include-item-types'])

  // sort iterations
  iterations = iterations.sort((a, b) => {
    return a.name.localeCompare(b.name)
  })

  if(argv.tsv) {
    const fields = columns.map(column => {
      return {
        label: column.title,
        value: column.id
      }
    })
    return formatter.tsv(iterations, fields)
  }
  else if(argv.json) {
    return formatter.json(iterations)
  }
  else if(argv.html) {

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

    const metadata = Object.keys(argv).filter(k => k!=='_' && k!=='$0').map(k => {
      const value = argv[k]
      return `--${k} ${Array.isArray(value) ? (value.length ? value.join(' ') : '[]') : value}`
    }).join(' ')
    const data = iterationsHelper(iterations, columns)
    const date = new Date(Date.now()).toUTCString()

    return await formatter.html({
      metadata,
      data,
      date,
      dts: datatransformers.all,
      title: 'OpenShift.io Iterations Statistics' 
    }, command)
  }
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
    return table.render()  
  }
}

/* global console */
const handler = function(argv) {
  (async ()=> {
    try {
      const output = await executor(argv)
      console.log(output)
    }
    catch(err) {
      console.log(err)
      process.exit(1)
    }
  })()
}

module.exports = {command, describe, builder, handler, executor}