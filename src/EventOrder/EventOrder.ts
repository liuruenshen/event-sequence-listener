import isString = require('lodash.isstring')
import isFunction = require('lodash.isfunction')
import isUndefined = require('lodash.isundefined')
import cloneDeep = require('lodash.clonedeep')

import * as Inf from 'EventOrder/interface'
import { EventSequenceElement } from 'EventOrder/interface';

const RunningTypeValue: Inf.RunningType = {
  on: true,
  once: true,
  repeat: true,
}
const SequenceIsArray = 'First argument must be an array.'
const SequenceElementIsMalformed = 'First argument contains malformed element.'
const RunningTypeIsUnvalid = `RunningType must be one of these: ${Object.keys(RunningTypeValue).join(',')}.`
const SupplyListenterWithRunningType = 'Supply listener when runningType does exist.'
const SupplyEmitterOptions = 'Supply emitterOptions if last sequence element does not specify emitter or listener'
const SupplyEmitter = 'Supply emitter in each/last sequence element or emitterOptions'

export class EventOrder {
  private _runtimeSequence: Inf.RuntimeSequence = []
  private _matchedIndex: number
  private _emitter: Inf.Emitter
  private _splitInstances: Array<EventOrder> = []
  private _runningGenerator: IterableIterator<Inf.RuntimeSequenceElement>

  public constructor(
    private _sequenceOptions: Inf.EventSequence,
    private _emitterOptions: Inf.EmitterConfig) {
    this._runningGenerator = this._generator()

    this._parseConstructorOptions()
    this._attachListeners()
    this._run()
  }

  protected _getElement(element?: Inf.RuntimeSequenceElement) {
    if (isUndefined(element)) {
      const lastIndex = this._runtimeSequence.length - 1
      return this._runtimeSequence[lastIndex]
    }
    return element
  }

  protected _getEmitter(element?: Inf.RuntimeSequenceElement): Inf.Emitter {
    return <Inf.Emitter>(this._getElement(element).emitter || this._emitterOptions.emitter)
  }

  protected _getTimes(element?: Inf.RuntimeSequenceElement): number {
    return this._getElement(element).times || this._emitterOptions.times || 1    
  }

  protected _bind(element: Inf.RuntimeSequenceElement) {
    const emitter = this._getEmitter(element)
    const bind = isFunction(emitter.addEventListener) ? emitter.addEventListener : emitter.on

    bind.call(emitter, element.name, (...args: any[]) => {
      this._processSequenceElement(element, ...args)
    })
  }

  protected _isListener(obj: any): obj is Inf.Listener {
    return isFunction(obj)
  }

  protected _isEmitter(obj: any): obj is Inf.Emitter {
    return obj
      && (
        isFunction(obj.addEventListener)
        || isFunction(obj.on)
      )
      && (
        isFunction(obj.removeEventListener)
        || isFunction(obj.off)
      )
      && isFunction(obj.trigger)
  }

  protected _isSequenceElement(obj: any): obj is Inf.EventSequenceElement {
    return obj && this._isListener(obj.cb)
  }

  protected _isRunningType(obj: any): obj is Inf.RunningTypeKey {
    return isString(obj) && (obj === 'once' || obj === 'on' || obj === 'repeat')
  }

  protected _callingListener(element: EventSequenceElement) {
  }

  protected _processSequenceElement(element: Inf.RuntimeSequenceElement, ...args: any[]) {
    if(isUndefined(element.times)) {
      element.times = 0
    }

    if(++element.times === element.counter) {
      const emitter = this._getEmitter(element)
      this._runningGenerator.next()
    } 
  }

  protected _parseConstructorOptions() {
    if (!Array.isArray(this._sequenceOptions)) {
      throw SequenceIsArray
    }

    this._sequenceOptions.forEach(value => {
      if (isString(value)) {
        this._runtimeSequence.push({
          name: value,
          counter: 0,
          delay: 0,
          data: null,
          travelEvents: [],
        })
      }
      else if (this._isSequenceElement(value)) {
        this._runtimeSequence.push({
          ...value,
          counter: 0,
          delay: 0,
          data: null,
          travelEvents: [],
        })

        if (!isUndefined(value.runningType)) {
          if (this._isRunningType(value.runningType)) {
            if (isFunction(value.cb)) {
              this._splitInstances.push(
                new EventOrder(
                  cloneDeep(this._runtimeSequence),
                  this._emitterOptions
                )
              )
            }
            else {
              throw SupplyListenterWithRunningType
            }
          }
          else {
            throw RunningTypeIsUnvalid
          }
        }
      }
      else {
        throw SequenceElementIsMalformed
      }
    })

    const lastElement = this._runtimeSequence[this._runtimeSequence.length - 1]

    if (!this._isSequenceElement(this._emitterOptions)
      && (
        !this._isSequenceElement(lastElement)
        || !this._isEmitter(lastElement.emitter)
        || !this._isListener(lastElement.cb)
      )) {
      throw SupplyEmitterOptions
    }
  }

  protected *_generator() {
    for (let i = 0; i < this._runtimeSequence.length; ++i) {
      const element = this._runtimeSequence[i]

      element.counter = 0
      if (element.times !== element.counter) {
        yield element
      }
    }
  }

  protected _attachListeners() {
    this._runtimeSequence.forEach(element => {
      this._bind(element)
    })
  }

  protected _run() {
    
  }
}