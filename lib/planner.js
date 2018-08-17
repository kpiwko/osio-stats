'use strict'

const flat = require('flat')
const andQuery = require('./queries')
const ApiEndpoint = require('./apiendpoint')

const AC_REGEX = RegExp(/acceptance criteria/, 'i')

class Planner extends ApiEndpoint {
  constructor(options) {
    super(options)
  }

  static get AC_REGEX() {
    return AC_REGEX
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
        if(!ApiEndpoint.isUUID(value)) {
          const id = iterations.find(i => i.name === value)
          query[key] = id ? id.id : query[key]
        }
      }
      if(key.endsWith('workitemtype.$EQ')) {
        const value = query[key]
        if(!ApiEndpoint.isUUID(value)) {
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
      const spaceDetails = await this.get(`/spaces/${space}`)

      const workItemTypesUrl = spaceDetails.data.links.workitemtypes
      const types = await this.get(workItemTypesUrl)

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
      const iters = await this.get(`/spaces/${space}/iterations`)

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
      return await this.get('/search', {
        page: {
          limit: this.options.pageLimit
        },
        filter: {
          // this is an inconsistency in API
          expression: JSON.stringify(query)
        }
      })
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