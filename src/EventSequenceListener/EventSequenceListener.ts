import _ from 'lodash'

import * as Inf from 'EventSequenceListener/EventSequenceListener.interface'

const SequenceIsArray = 'First argument must be an array.'
const ElementIsMalformed = 'First argument contains malformed element.'
const SupplyEmitterOptions = 'Supply emitterOptions if last sequence element does not specify emitter or listener'
const EmitterBindFunctionIsMissing = 'Emitter must have one of these bind function: addEventListener, addListener or on'
const EmitterUnbindFunctionIsMissing = 'Emitter must have one of these unbind function: removeEventListener, removeListener or off'

export const CancelSchedule = 'cancel'

type PromiseResolve<T> = (value: T | PromiseLike<T>) => void

enum PromiseState { pending, fulfilled, rejected }

interface PromiseWithResolveReject<T> {
  promise: Promise<T>
  resolve: PromiseResolve<T>
  reject: (reason: Error) => void
  state: PromiseState
}

export class EventSequenceListener {
  private _eventList: Inf.EventOrderElementList = []
  private _unionEventOrderList: Array<EventSequenceListener> = []
  private _schedule: IterableIterator<Inf.EventOrderElement>
  private _promiseStore!: PromiseWithResolveReject<Inf.EventCallbackParametersList>

  public constructor(
    private _configList: Inf.EventOrderConfigList,
    private _emitterConfig: Inf.EmitterConfig) {
    this._schedule = this._generator()

    this._parseConstructorOptions()
    this._createPromise()
    this._schedule.next()
    this._attachListeners()
  }

  public cancel() {
    if (this._schedule) {
      this._schedule.throw!(new Error(CancelSchedule))
    }
  }

  public async getPromise() {
    if (this._promiseStore.state !== PromiseState.pending) {
      this._createPromise()
    }
    return this._promiseStore.promise
  }

  protected _createPromise() {
    if (this._promiseStore && this._promiseStore.state === PromiseState.pending) {
      return
    }

    (<any>this._promiseStore) = {}
    const promise: Promise<Inf.EventCallbackParametersList> = new Promise((resolve, reject) => {
      this._promiseStore.state = PromiseState.pending

      this._promiseStore.resolve = (value) => {
        if (this._promiseStore.state === PromiseState.pending) {
          this._promiseStore.state = PromiseState.fulfilled
          resolve(value)
        }
      }

      this._promiseStore.reject = (reason) => {
        if (this._promiseStore.state === PromiseState.pending) {
          this._promiseStore.state = PromiseState.rejected
          reject(reason)
        }
      }
    })

    this._promiseStore!.promise = promise
  }

  protected _getElement(element?: Inf.EventOrderElement) {
    if (_.isUndefined(element)) {
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

  protected _getThreshold(element?: Inf.EventOrderElement, elementFirst = true): number {
    if (elementFirst) {
      return this._getElement(element).threshold || this._emitterConfig.threshold || 1
    }

    return this._emitterConfig.threshold || 1
  }

  protected _getScheduleType(element?: Inf.EventOrderElement): Inf.ScheduleTypeKeys {
    return this._emitterConfig.scheduleType || 'once'
  }

  protected _getContext(element?: Inf.EventOrderElement, elementFirst = true): object | null {
    if (elementFirst) {
      return this._emitterConfig.context || null
    }

    return this._emitterConfig.context || null
  }

  protected _getInitData(element?: Inf.EventOrderElement): any {
    return this._emitterConfig.initData || {}
  }

  protected _getUnionScheduleType(): Inf.UnionScheduleType {
    return this._emitterConfig.unionScheduleType || 'race'
  }

  protected _isLikeNodeJsEmitter(obj: any): obj is NodeJS.EventEmitter {
    return obj && _.isFunction(obj.addListener) && _.isFunction(obj.removeListener)
  }

  protected _isLikeDOMDispatcher(obj: any): obj is EventTarget {
    return obj && _.isFunction(obj.addEventListener) && _.isFunction(obj.removeEventListener)
  }

  protected _isOnOffDispatcher(obj: any): obj is Inf.OnOffDispatcher {
    return obj && _.isFunction(obj.on) && _.isFunction(obj.off)
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
    return _.isFunction(obj)
  }

  protected _isEmitter(obj: any): obj is Inf.Emitter {
    return obj && (
      this._isLikeNodeJsEmitter(obj)
      || this._isLikeDOMDispatcher(obj)
      || this._isOnOffDispatcher(obj)
    )
  }

  protected _isElement(obj: any): obj is Inf.EventOrderElement {
    return obj && _.isString(obj.name)
  }

  protected _isEmitterConfig(obj: any): obj is Inf.EmitterConfig {
    return obj && obj.emitter
  }

  protected _getPredecessor(index: number) {
    if (!this._eventList[index]) {
      return null
    }

    const lastElement = this._eventList[this._eventList.length - 1]
    const element = this._eventList[index]

    return index > 0
      ? this._eventList[index - 1] : lastElement.timestamp
        ? lastElement : null
  }

  protected _callListener(element: Inf.EventOrderElement, index: number, args: any[]) {
    const context = this._getContext(element)

    const predecessor = this._getPredecessor(index)

    const data = predecessor ? predecessor.data : this._getInitData(element)
    const endCallback = this._getListener(undefined, false)
    const isLastEvent = index === this._eventList.length - 1

    element.timestamp = Date.now()
    element.delay = predecessor ? element.timestamp - predecessor.timestamp : 0


    if (!_.isUndefined(element.cb)) {
      element.data = element.cb.call(
        context,
        [{
          instance: this,
          data,
          lastExeTimestamp: predecessor ? predecessor.timestamp : 0,
          delay: element.delay,
          isLastEvent,
          isEnd: isLastEvent && !endCallback ? true : false,
          passEvents: this._eventList.filter((v, i) => i <= index).map(element => element.name)
        }],
        ...args
      )
    }
    else {
      element.data = data
    }

    if (isLastEvent) {
      const metadata: Inf.EventCallbackParameters[] = [{
        instance: this,
        data: element.data,
        lastExeTimestamp: predecessor ? predecessor.timestamp : 0,
        delay: element.delay,
        isLastEvent: true,
        isEnd: true,
        passEvents: this._eventList.map(element => element.name)
      }]

      this._promiseStore.resolve(metadata)

      if (endCallback) {
        const context = this._getContext(undefined, false)
        endCallback.call(context, metadata)
      }
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
  }

  protected _parseSingleEventOrderConfigList(configList: Inf.EventOrderSingleConfigList) {
    configList.forEach(value => {
      if (_.isString(value)) {
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
      }
      else {
        throw new Error(ElementIsMalformed)
      }
    })
  }

  protected _isUnionEventOrderConfigList(testValue: any): testValue is Inf.EventOrderUnionConfigList {
    if (!Array.isArray(testValue)) {
      return false
    }

    const itemIsArray = testValue.filter(item => Array.isArray(item))

    return itemIsArray.length === testValue.length
  }

  protected _isSingleEventOrderConfigList(testValue: any): testValue is Inf.EventOrderSingleConfigList {
    if (!Array.isArray(testValue)) {
      return false
    }

    const itemIsArray = testValue.filter(item => _.isString(item) || this._isElement(item))

    return itemIsArray.length === testValue.length
  }

  protected async _handleRacedEventOrdersSchedule(configList: Inf.EventOrderUnionConfigList, scheduleType: Inf.ScheduleTypeKeys) {
    if (this._getUnionScheduleType() !== 'race') {
      return
    }

    configList.forEach(value => {
      this._unionEventOrderList.push(
        new EventSequenceListener(value, this._emitterConfig)
      )
    })

    const promiseList = this._unionEventOrderList.map(evenOrderInstance => evenOrderInstance.getPromise())
    const resolvedValue = await Promise.race(promiseList)

    this._unionEventOrderList.forEach(eventOrderInstance => {
      if (eventOrderInstance !== resolvedValue[0].instance) {
        eventOrderInstance.cancel()
      }
    })

    this._unionEventOrderList = []
    this._promiseStore.resolve(resolvedValue)

    if (scheduleType === 'repeat') {
      this._handleRacedEventOrdersSchedule(configList, scheduleType)
    }
  }

  protected _parseConstructorOptions() {
    if (!Array.isArray(this._configList)) {
      throw new Error(SequenceIsArray)
    }

    if (this._isSingleEventOrderConfigList(this._configList)) {
      this._parseSingleEventOrderConfigList(this._configList)
    }
    else if (this._isUnionEventOrderConfigList(this._configList)) {
      const scheduleTypeForUnionEventOrders = this._getScheduleType()
      this._emitterConfig.scheduleType = 'once'

      this._handleRacedEventOrdersSchedule(this._configList, scheduleTypeForUnionEventOrders)
    }

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

  protected _dispose() {
    this._detachListeners()
    this._eventList = []
  }

  protected *_generator() {
    try {
      const threshold = this._getThreshold(undefined, false)
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

      if (this._getScheduleType() === 'once') {
        this._dispose()
      }
      else if (this._getScheduleType() === 'repeat') {
        setTimeout(() => {
          this._schedule = this._generator()
          this._schedule.next()
        }, 0)
      }
    }
    catch (e) {
      if (e.message === CancelSchedule) {
        this._dispose()
      }

      this._promiseStore.reject(new Error(e.message))
    }
  }

  protected _attachListeners() {
    this._eventList.forEach((element, index) => {
      this._bind(element, index)
    })
  }

  protected _detachListeners(ignoreElement: Inf.EventOrderElement | null = null) {
    this._eventList.forEach((element, index) => {
      if (!ignoreElement || ignoreElement !== element) {
        this._unbind(element, index)
      }
    })
  }
}
