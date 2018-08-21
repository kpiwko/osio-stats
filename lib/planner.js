'use strict'

const flat = require('flat')
const andQuery = require('./queries')
const ApiEndpoint = require('./apiendpoint')

const AC_REGEX = RegExp(/acceptance criteria/, 'i')

/**
 * 
 * @param {string} id name of the 
 * @param {string} title column title
 * @param {string} description description of the column
 * @param {function} reducer function(acc, iteration[, workitems]) that is able to get the data from iteration and its workitems (optional)
 */
const columnTransformer = (id, title, description, reducer) => {
  return {
    id: id,
    title: title,
    description: description,
    reducer: reducer
  }
}
const COLUMNS = []
COLUMNS.push(columnTransformer('id', 'ID', 'ID of iteration', (acc, iteration) => {
  acc.id = iteration.id
  return acc
}))
COLUMNS.push(columnTransformer('pid', 'Parent ID', 'ID of iteration parent, if it exists', (acc, iteration) => {
  acc.pid = iteration.pid || iteration['relationships.parent.data.id']
  return acc
}))
COLUMNS.push(columnTransformer('name', 'Name', 'Name of iteration', (acc, iteration) => {
  acc.name = iteration.name || iteration['attributes.name']
  return acc
}))
COLUMNS.push(columnTransformer('total', '# Total WIs', 'Number of total workitems in iteration (including children and all workitem types)', (acc, iteration) => {
  acc.total = iteration.total !== undefined ? iteration.total : iteration['relationships.workitems.meta.total']
  return acc
}))
COLUMNS.push(columnTransformer('wis', '# WIs', 'Number of workitems in iteration (direct items only and filtered by work item type)', (acc, iteration, workitems) => {
  acc.wis = 0
  return workitems.reduce((innerAcc) => {
    innerAcc.wis++
    return innerAcc
  }, acc)
}))
COLUMNS.push(columnTransformer('woSPs', '# WIs w/o SPs', 'Number of workitems in iteration without story points', (acc, iteration, workitems) => {
  acc.woSPs = 0
  return workitems.reduce((innerAcc, wi) => {
    wi = flat.flatten(wi)
    const sp = wi['attributes.storypoints']
    if(sp) {
      innerAcc.woSPs++
    }
    return innerAcc
  }, acc)
}))
COLUMNS.push(columnTransformer('woACs', '# WIs w/o ACs', 'Number of workitems in iteration without acceptance criteria', (acc, iteration, workitems) => {
  acc.woACs = 0
  return workitems.reduce((innerAcc, wi) => {
    wi = flat.flatten(wi)
    const description = wi['attributes.system.description']
    if(!description || !Planner.AC_REGEX.test(description)) {
      innerAcc.woACs++
    }
    return innerAcc
  }, acc)
}))
COLUMNS.push(columnTransformer('spCom', 'SPs completed', 'Total story points completed in the iteration', (acc, iteration, workitems) => {
  acc.spCom = 0
  return workitems.reduce((innerAcc, wi) => {
    wi = flat.flatten(wi)
    const sp = wi['attributes.storypoints']
    if(sp && wi['attributes.system.state'] === 'Closed') {
      acc.spCom += sp  
    }
    return innerAcc
  }, acc)
}))
COLUMNS.push(columnTransformer('spTot', 'SPs total', 'Total story points estimated in the iteration', (acc, iteration, workitems) => {
  acc.spTot = 0
  return workitems.reduce((innerAcc, wi) => {
    wi = flat.flatten(wi)
    const sp = wi['attributes.storypoints']
    if(sp) {
      acc.spTot += sp  
    }
    return innerAcc
  }, acc)
}))

class Planner extends ApiEndpoint {
  constructor(options) {
    super(options)
  }

  static get AC_REGEX() {
    return AC_REGEX
  }

  static get COLUMNS() {
    return COLUMNS  
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
        const innerAcc = {}
        iteration = flat.flatten(iteration)
        Planner.COLUMNS
          // find columns that do not need additional query for workitems
          .filter(c => c.reducer && typeof c.reducer === 'function' && c.reducer.length <= 2)
          .forEach((column) => {
            if(typeof column.reducer === 'function') {
              column.reducer(innerAcc, iteration)
            }
          })
        acc.push(innerAcc)
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
            workItems = workItems ? workItems.data : []
            return Planner.COLUMNS.reduce((innerAcc, column) => {
              if(typeof column.reducer === 'function') {
                column.reducer(innerAcc, iteration, workItems)
              }
              return innerAcc
            }, {})
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