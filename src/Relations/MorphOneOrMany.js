'use strict'

/**
 * adonis-lucid-polymorphic
 * Copyright(c) 2017 Evgeny Razumov
 * MIT Licensed
 */

const BaseRelation = require('@adonisjs/lucid/src/Lucid/Relations/BaseRelation')
const CE = require('@adonisjs/lucid/src/Exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')
const { ioc } = require('@adonisjs/fold')

class MorphOneOrMany extends BaseRelation {
  constructor (parent, related, determiner, primaryKey, foreignKey) {
    super(parent, ioc.use(related), primaryKey, foreignKey)
    this.fromKey = primaryKey || parent.constructor.primaryKey
    this.toKey = determiner ? `${determiner}_id` : 'parent_id'
    this.typeKey = determiner ? `${determiner}_type` : 'parent_type'
    this.typeValue = parent.constructor.morphKey || parent.table || parent.constructor.table
  }

  /**
   * decorates the current query chain before execution
   */
  _decorateRead () {
    this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .where(this.toKey, this.parentInstance[this.fromKey])
  }

  /**
   * Returns the existence query to be used when main
   * query is dependent upon childs.
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  exists (callback) {
    const relatedQuery = this.relatedQuery
      .whereRaw(`${this.RelatedModel.table}.${this.typeKey} = '${this.typeValue}'`)
      .whereRaw(`${this.RelatedModel.table}.${this.toKey} = ${this.parentInstance.constructor.table}.${this.fromKey}`)
    if (typeof (callback) === 'function') {
      callback(relatedQuery)
    }
    return relatedQuery.modelQueryBuilder
  }

  /**
   * Returns the counts query for a given relation
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  counts (callback) {
    const relatedQuery = this.relatedQuery
      .count('*')
      .whereRaw(`${this.RelatedModel.table}.${this.typeKey} = '${this.typeValue}'`)
      .whereRaw(`${this.RelatedModel.table}.${this.toKey} = ${this.parentInstance.constructor.table}.${this.fromKey}`)
    if (typeof (callback) === 'function') {
      callback(relatedQuery)
    }
    return relatedQuery.modelQueryBuilder
  }

  /**
   * saves a related model in reference to the parent model
   * and sets up foriegn key automatically.
   *
   * @param  {Object} relatedInstance
   * @return {Number}
   *
   * @public
   */
  async save (relatedInstance) {
    if (relatedInstance instanceof this.RelatedModel === false) {
      throw CE.ModelRelationException.relationMisMatch('save accepts an instance of related model')
    }
    if (this.parentInstance.isNew) {
      throw CE.ModelRelationException.unSavedTarget('save', this.parentInstance.constructor.name, this.RelatedModel.name)
    }
    if (!this.parentInstance[this.fromKey]) {
      logger.warn(`Trying to save relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    relatedInstance[this.toKey] = this.parentInstance[this.fromKey]
    relatedInstance[this.typeKey] = this.typeValue
    return relatedInstance.save()
  }
}

module.exports = MorphOneOrMany

