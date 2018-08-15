'use strict'

const iterationQuery = (iteration) => {
  return {
    'iteration': {
      '$EQ': iteration
    }
  }
}

const iterationAndItemTypeQuery = (iteration, itemType) => {
  return {
    '$AND': [{
      'iteration': {
        '$EQ': iteration
      }
    },
    {
      'workitemtype': {
      // this needs also refactoring
        '$EQ': itemType
      }
    }]
  }
}

const andQuery = (iteration, itemType) => {
  if(Array.isArray(itemType) && itemType.length === 1) {
    return iterationAndItemTypeQuery(iteration, itemType[0])
  }
  return iterationQuery(iteration)
}

module.exports = andQuery