import isString = require('lodash.isstring')
import isFunction = require('lodash.isfunction')
import isUndefined = require('lodash.isundefined')
import isFinite = require('lodash.isfinite')
import cloneDeep = require('lodash.clonedeep')

import * as Inf from 'EventOrder/EventOrder.interface'

const EmitTypeValue: Inf.EmitType = {
  onlyend: true,
  once: true,
  repeat: true,
}
const SequenceIsArray = 'First argument must be an array.'
const ElementIsMalformed = 'First argument contains malformed element.'
const EmitTypeIsInvalid = `EmitType must be one of these: ${Object.keys(EmitTypeValue).join(',')}.`
const SupplyListenerWithEmitType = 'Supply listener when scheduleType does exist.'
const SupplyEmitterOptions = 'Supply emitterOptions if last sequence element does not specify emitter or listener'
const SupplyEmitter = 'Supply emitter in each/last sequence element or emitterOptions'
const DefaultEmitType: Inf.EmitTypeKeys = 'once'
const EmitterBindFunctionIsMissing = 'Emitter must have one of these bind function: addEventListener, addListener or on'
const EmitterUnbindFunctionIsMissing = 'Emitter must have one of these unbind function: removeEventListener, removeListener or off'

export class EventOrder {
  private _eventList: Inf.EventOrderElementList = []
  private _splitInstances: Array<EventOrder> = []
  private _schedule: IterableIterator<Inf.EventOrderElement>

  public constructor(
    private _configList: Inf.EventOrderConfigList,
    private _emitterConfig: Inf.EmitterConfig) {
    this._schedule = this._generator()

    this._parseConstructorOptions()
    this._schedule.next()
    this._attachListeners()
  }

  protected _getElement(element?: Inf.EventOrderElement) {
    if (isUndefined(element)) {
      const lastIndex = this._eventList.length - 1
      return this._eventList[lastIndex]
    }
    return element
  }

  protected _getEmitter(element?: Inf.EventOrderElement): Inf.Emitter {
    return <Inf.Emitter>(this._getElement(element).emitter || this._emitterConfig.emitter)
  }

  protected _getListener(element?: Inf.EventOrderElement, elementFirst = true): Inf.Listener | undefined {
    if (elementFirst) {
      return this._getElement(element).cb || this._emitterConfig.cb
    }

    return this._emitterConfig.cb
  }

  protected _getCount(element?: Inf.EventOrderElement, elementFirst = true): number {
    if (elementFirst) {
      return this._getElement(element).threshold || this._emitterConfig.threshold || 1
    }

    return this._emitterConfig.threshold || 1
  }

  protected _getEmitType(element?: Inf.EventOrderElement): Inf.EmitTypeKeys {
    return this._getElement(element).scheduleType || this._emitterConfig.scheduleType || 'once'
  }

  protected _getContext(element?: Inf.EventOrderElement, elementFirst = true): object | null {
    if (elementFirst) {
      return this._getElement(element).context || this._emitterConfig.context || null
    }

    return this._emitterConfig.context || null
  }

  protected _getInitData(element?: Inf.EventOrderElement): any {
    return this._getElement(element).initData || this._emitterConfig.initData || {}
  }

  protected _isLikeNodeJsEmitter(obj: any): obj is NodeJS.EventEmitter {
    return obj && isFunction(obj.addListener) && isFunction(obj.removeListener)
  }

  protected _isLikeDOMDispatcher(obj: any): obj is EventTarget {
    return obj && isFunction(obj.addEventListener) && isFunction(obj.removeEventListener)
  }

  protected _isOnOffDispatcher(obj: any): obj is Inf.OnOffDispatcher {
    return obj && isFunction(obj.on) && isFunction(obj.off)
  }

  protected _bind(element: Inf.EventOrderElement, index: number) {
    const emitter = this._getEmitter(element)
    let bind = null
    if (this._isLikeNodeJsEmitter(emitter)) {
      bind = emitter.addListener
    }
    else if (this._isLikeDOMDispatcher(emitter)) {
      bind = emitter.addEventListener
    }
    else if (this._isOnOffDispatcher(emitter)) {
      bind = emitter.on
    }
    else {
      throw new Error(EmitterBindFunctionIsMissing)
    }

    if (element.internalListener) {
      this._unbind(element, index)
    }

    element.internalListener = (...args: any[]) => {
      this._handleEvent(element, index, ...args)
    }

    bind.call(emitter, element.name, element.internalListener)
  }

  protected _unbind(element: Inf.EventOrderElement, index: number) {
    if (!element.internalListener) {
      return
    }

    const emitter = this._getEmitter(element)
    let unbind = null
    if (this._isLikeNodeJsEmitter(emitter)) {
      unbind = emitter.removeListener
    }
    else if (this._isLikeDOMDispatcher(emitter)) {
      unbind = emitter.removeEventListener
    }
    else if (this._isOnOffDispatcher(emitter)) {
      unbind = emitter.off
    }
    else {
      throw new Error(EmitterUnbindFunctionIsMissing)
    }

    unbind.call(emitter, element.name, element.internalListener)
    element.internalListener = null
  }

  protected _isListener(obj: any): obj is Inf.Listener {
    return isFunction(obj)
  }

  protected _isEmitter(obj: any): obj is Inf.Emitter {
    return obj && (
      this._isLikeNodeJsEmitter(obj)
      || this._isLikeDOMDispatcher(obj)
      || this._isOnOffDispatcher(obj)
    )
  }

  protected _isElement(obj: any): obj is Inf.EventOrderElement {
    return obj && isString(obj.name)
  }

  protected _isEmitterConfig(obj: any): obj is Inf.EmitterConfig {
    return obj && obj.emitter
  }

  protected _isEmitType(obj: any): obj is Inf.EmitTypeKeys {
    return isString(obj) && (obj === 'once' || obj === 'on' || obj === 'repeat')
  }

  protected _callListener(element: Inf.EventOrderElement, index: number, args: any[]) {
    const context = this._getContext(element)

    const lastElement = this._eventList[this._eventList.length - 1]
    const predecessor = index > 0
      ? this._eventList[index - 1] : lastElement.timestamp
        ? lastElement : null

    const data = predecessor ? predecessor.data : this._getInitData(element)
    const endCallback = this._getListener(undefined, false)
    const isLastEvent = index === this._eventList.length - 1

    element.timestamp = Date.now()
    element.delay = predecessor ? element.timestamp - predecessor.timestamp : 0


    if (!isUndefined(element.cb)) {
      element.data = element.cb.call(
        context,
        {
          eventOrderInstance: this,
          data,
          lastExeTimestamp: predecessor ? predecessor.timestamp : 0,
          delay: element.delay,
          isLastEvent,
          isEnd: isLastEvent && !endCallback ? true : false,
          passEvents: this._eventList.filter((v, i) => i <= index).map(element => element.name)
        },
        ...args
      )
    }
    else {
      element.data = data
    }

    if (isLastEvent && endCallback) {
      const context = this._getContext(undefined, false)

      endCallback.call(
        context,
        {
          eventOrderInstance: this,
          data: element.data,
          lastExeTimestamp: predecessor ? predecessor.timestamp : 0,
          delay: element.delay,
          isLastEvent: true,
          isEnd: true,
          passEvents: this._eventList.map(element => element.name)
        }
      )
    }
  }

  protected _handleEvent(
    element: Inf.EventOrderElement,
    index: number,
    ...args: any[]
  ) {
    const predecessor = index > 0 ? this._eventList[index - 1] : null
    if (predecessor && predecessor.current < predecessor.threshold) {
      return
    }

    if (element.threshold === ++element.current) {
      this._callListener(element, index, args)
      this._schedule.next()
    }
    else if (element.alwaysOn) {
      this._callListener(element, index, args)
    }
  }

  protected _parseConstructorOptions() {
    if (!Array.isArray(this._configList)) {
      throw new Error(SequenceIsArray)
    }

    this._configList.forEach(value => {
      if (isString(value)) {
        this._eventList.push({
          name: value,
          current: 0,
          delay: 0,
          data: null,
          timestamp: 0,
          internalListener: null,
          threshold: 1,
        })
      }
      else if (this._isElement(value)) {
        this._eventList.push({
          ...value,
          current: 0,
          delay: 0,
          data: null,
          timestamp: 0,
          threshold: isFinite(value.threshold) ? value.threshold : 1,
          internalListener: null,
        })

        if (!isUndefined(value.scheduleType)) {
          if (this._isEmitType(value.scheduleType)) {
            if (isFunction(value.cb)) {
              this._splitInstances.push(
                new EventOrder(
                  cloneDeep(this._eventList),
                  this._emitterConfig
                )
              )
            }
            else {
              throw new Error(SupplyListenerWithEmitType)
            }
          }
          else {
            throw new Error(EmitTypeIsInvalid)
          }
        }
      }
      else {
        throw new Error(ElementIsMalformed)
      }
    })

    const lastElement = this._eventList[this._eventList.length - 1]

    if (!this._isEmitterConfig(this._emitterConfig)
      && (
        !this._isElement(lastElement)
        || !this._isEmitter(lastElement.emitter)
        || !this._isListener(lastElement.cb)
      )) {
      throw new Error(SupplyEmitterOptions)
    }
  }

  protected _resetCounter() {
    this._eventList.forEach(element => {
      element.current = 0
    })
  }

  protected *_generator() {
    const threshold = this._getCount(undefined, false)
    for (let i = 0; i < threshold; ++i) {
      this._resetCounter()

      for (let j = 0; j < this._eventList.length; ++j) {
        const element = this._eventList[j]

        element.current = 0
        if (element.threshold > element.current) {
          yield element
        }
      }
    }

    if (this._getEmitType() === 'once') {
      this._detachListeners()
      this._eventList = []
    }
    else if (this._getEmitType() === 'repeat') {
      setTimeout(() => {
        this._schedule = this._generator()
        this._schedule.next()
      }, 0)
    }
    else if (this._getEmitType() === 'onlyend') {
      const lastElement = this._eventList[this._eventList.length - 1]
      lastElement.alwaysOn = true
    }
  }

  protected _attachListeners() {
    this._eventList.forEach((element, index) => {
      this._bind(element, index)
    })
  }

  protected _detachListeners() {
    this._eventList.forEach((element, index) => {
      this._unbind(element, index)
    })
  }
}
