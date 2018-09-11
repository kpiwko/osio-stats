'use strict'

const fs = require('fs')
const path = require('path')
const mustache = require('mustache')

const html = async (template, data) => {
  try {
    const masterTemplate = await loadFile('templates/index.mst')
    const contentTemplate = await loadFile(`templates/${template}.mst`)
    const css = await loadFile('node_modules/bootstrap/dist/css/bootstrap.min.css')
    return mustache.render(masterTemplate, Object.assign({}, {css}, data), {content: contentTemplate})
  }
  catch(err) {
    throw Error(`Unable to format html for ${template}, ${err}`)
  }
}

const loadFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(__dirname, '../', filePath), 'utf8', (err, content) => {
      if(err) {
        return reject(err)
      }
      return resolve(content)
    })
  }).catch(err => {
    throw Error(`Unable to load template ${filePath}, ${err}`)
  })
}

module.exports = {
  html
}