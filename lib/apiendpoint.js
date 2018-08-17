'use strict'

const request = require('request-promise-native')
const isWebUri = require('valid-url').isWebUri

const UUID_REGEX = RegExp(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)

const DEFAULT_OPTIONS = {
  baseurl:'https://api.openshift.io/api',
  pageLimit: 10000
}

class ApiEndpoint {
  constructor(options) {
    this.options = Object.assign({}, DEFAULT_OPTIONS, options)

    if(!isWebUri(this.options.baseurl)) {
      throw Error(`Provided baseurl ${this.options.baseurl} is not a valid URL`)
    }

    // by default, parse as json
    this.request = request.defaults({
      json: true,
      qsStringifyOptions: { 
        encodeValuesOnly: true
      }
    })
  }

  static isUUID(string) {
    return UUID_REGEX.test(string)
  }

  /**
   * Asynchronously fetches data from url and returns it as JSON.
   * Url can be relative to baseurl provided when constructing this class
   * @param {string} url 
   * @papam {object} options Request object options
   */
  async get(url, qs=null, opts=null) {
    url = isWebUri(url) ? url: `${this.options.baseurl}${url}`
    qs = qs ? {qs: qs} : null

    let options = {uri: url}
    options = Object.assign({uri: url}, opts, qs)
    /*
    if(opts) {
      options = Object.assign(options, opts)
    }
    if(qs) {
      options = Object.assign(options, {qs: qs})
    }
    */

    const data = await this.request.get(options)
      .catch(error => {
        throw error
      })
    return data
  }

}

module.exports = ApiEndpoint