'use strict'

const request = require('request-promise-native')
const flat = require('flat')
const andQuery = require('./queries')


const AC_REGEX = RegExp(/acceptance criteria/, 'i')
const UUID_REGEX = RegExp(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)

class Planner {
  constructor(options={
    baseurl:'https://api.openshift.io/api',
    pageLimit: 10000 
  }) {
    this.options = options
  }

  static get AC_REGEX() {
    return AC_REGEX
  }

  static get UUID_REGEX() {
    return UUID_REGEX
  }

  /**
   * Replaces user friendly values for iteration and work item type with UUIDs
   * @param {object} query query
   * @param {uuid} space OpenShift.io space to search
   */
  async normalizeQuery(query={}, space) {

    const itemTypes = await this.workitemTypes(space)
    const iterations = await this.iterations(space)

    query = flat.flatten(query)
    Object.keys(query).forEach(key => {
      if(key.endsWith('iteration.$EQ')) {
        const value = query[key]
        if(!UUID_REGEX.test(value)) {
          const id = iterations.find(i => i.name === value)
          query[key] = id ? id.id : query[key]
        }
      }
      if(key.endsWith('workitemtype.$EQ')) {
        const value = query[key]
        if(!UUID_REGEX.test(value)) {
          const id = itemTypes.find(i => i.name === value)
          query[key] = id ? id.id : query[key]
        }
      }
    })

    return flat.unflatten(query)
  }

  /**
   * Finds all work item types in a particular space
   * @param {uuid} space 
   */
  async workitemTypes(space) {
    try {
      const spaceDetails = await request.get({
        url: `${this.options.baseurl}/spaces/${space}`,
        json: true
      })

      const workItemTypesUrl = spaceDetails.data.links.workitemtypes
      const types = await request.get({
        url: workItemTypesUrl,
        json: true
      })

      return types.data.reduce((acc, type) => {
        acc.push({
          id: type.id,
          name: type.attributes.name
        })
        return acc
      }, [])
    }
    catch(error) {
      throw error
    }
  }

  /**
   * Finds all iterations in a particular space
   * @param {uuid} space 
   */
  async iterations(space) {
    try {
      const iters = await request.get({
        url: `${this.options.baseurl}/spaces/${space}/iterations`,
        json: true
      })

      return iters.data.reduce((acc, iteration) => {
        acc.push({
          name: iteration.attributes.name,
          id: iteration.id,
          parent: iteration.relationships.parent ? iteration.relationships.parent.data.id : null,
          total: iteration.relationships.workitems.meta.total,
        })
        return acc
      }, [])
    }
    catch(error) {
      throw error
    }
  }

  /**
   * Finds all work items by particular query. Normalizes query first
   * @param {object} query 
   * @param {uuid} space 
   */
  async search(query={}, space) {
    try {
      query = await this.normalizeQuery(query, space)
      const data = await request.get({
        url: `${this.options.baseurl}/search?page[limit]=${this.options.pageLimit}&filter[expression]=${JSON.stringify(query)}`,
        json: true
      })

      return data
    }
    catch(error) {
      throw error
    }
  }

  /**
   * Provides detailed statistics over iterations
   * @param {uuid} space 
   * @param {array} includeTypes 
   */
  async iterationsWithDetails(space, includeTypes=[]) {
    try {
      const iters = await this.iterations(space)
      
      const iterDetails = iters.reduce((acc, iteration) => {
        const query = andQuery(iteration.id, includeTypes)
        const details = this.search(query, space)
          .then(workItems => {
            const stats = workItems.data.reduce((acc, wi) => {

              acc.total++

              // compute story points stats
              const sp = wi.attributes.storypoints
              if(sp) {
                acc.spTotal += sp
                if(wi.attributes['system.state'] === 'Closed') {
                  acc.spComplete += sp
                }
              }
              else {
                acc.woSPs++
              }

              // compute acceptance criteria stats
              const description = wi.attributes['system.description']
              if(!description || !Planner.AC_REGEX.test(description)) {
                acc.woACs++
              }

              return acc
            }, {
              total: 0,
              woSPs: 0,
              woACs: 0,
              spComplete: 0,
              spTotal: 0
            })  

            return {
              name: iteration.name,
              id: iteration.id,
              parent: iteration.parent,
              total: iteration.total,
              workitems: stats.total,
              workItemsWithoutSPs: stats.woSPs,
              workItemsWithoutACs: stats.woACs,
              spComplete: stats.spComplete,
              spTotal: stats.spTotal
            }
          }).catch(error => {
            return Promise.reject(error)
          })

        acc.push(details)
        return acc
      }, [])

      return await Promise.all(iterDetails)
    }
    catch(error) {
      throw error
    }
  }
}

module.exports = Planner