import _ from 'lodash'

import * as Inf from 'EventSequenceListener/EventSequenceListener.interface'

const SequenceIsArray = 'First argument must be an array.'
const ElementIsMalformed = 'First argument contains malformed element.'
const SupplyListenerOptions = 'Supply listenerOptions if last sequence element does not specify listener or listener'
const ListenerBindFunctionIsMissing = 'Listener must have one of these bind function: addEventListener, addListener or on'
const ListenerUnbindFunctionIsMissing = 'Listener must have one of these unbind function: removeEventListener, removeListener or off'

const CancelSchedule = 'cancel'

type PromiseResolve<T> = (value: T | PromiseLike<T>) => void

enum PromiseState { pending, fulfilled, rejected }

interface PromiseWithResolveReject<T> {
  promise: Promise<T>
  resolve: PromiseResolve<T>
  reject: (reason: Error) => void
  state: PromiseState
  isRead: boolean
}

export default class EventSequenceListener {
  private _eventList: Inf.EventSequenceElementList = []
  private _unionEventSequenceList: Array<EventSequenceListener> = []
  private _schedule: IterableIterator<Inf.EventSequenceElement>
  private _promiseStore: PromiseWithResolveReject<Inf.EventCallbackParametersList>[] = []

  static cancelSchedule = CancelSchedule

  public constructor(
    private _configList: Inf.EventSequenceConfigList,
    private _listenerConfig: Inf.GeneralConfig) {
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

  public getPromise() {
    // Remove all the read & resolved/rejected promises
    this._promiseStore = this._promiseStore.filter(
      storedPromise => !(storedPromise.isRead && storedPromise.state !== PromiseState.pending)
    )

    if (!this._promiseStore.length) {
      this._createPromise()
    }

    const storedPromise = this._promiseStore[0]
    storedPromise.isRead = true

    return storedPromise.promise
  }

  protected _createPromise() {
    const storedPromise: any = {}
    const promise: Promise<Inf.EventCallbackParametersList> = new Promise((resolve, reject) => {
      storedPromise.state = PromiseState.pending
      storedPromise.isRead = false

      storedPromise.resolve = (value: any) => {
        if (storedPromise.state === PromiseState.pending) {
          storedPromise.state = PromiseState.fulfilled
          resolve(value)
        }
      }

      storedPromise.reject = (reason: any) => {
        if (storedPromise.state === PromiseState.pending) {
          storedPromise.state = PromiseState.rejected
          reject(reason)
        }
      }
    })

    storedPromise.promise = promise
    this._promiseStore.push(storedPromise)
  }

  protected _appendResolvedPromise(value: any, isResolveOrReject: boolean) {
    let foundPendingPromise = this._promiseStore.find(storedPromise => storedPromise.state === PromiseState.pending)

    if (!foundPendingPromise) {
      this._createPromise()
      foundPendingPromise = this._promiseStore[this._promiseStore.length - 1]
    }

    if (isResolveOrReject) {
      foundPendingPromise.resolve(value)
    }
    else {
      foundPendingPromise.reject(value)
    }
  }

  protected _getElement(element?: Inf.EventSequenceElement) {
    if (_.isUndefined(element)) {
      const lastIndex = this._eventList.length - 1
      return this._eventList[lastIndex]
    }
    return element
  }

  protected _getListener(element?: Inf.EventSequenceElement): Inf.EventListener {
    return <Inf.EventListener>(this._getElement(element).listener || this._listenerConfig.listener)
  }

  protected _getEventCallback(element?: Inf.EventSequenceElement, elementFirst = true): Inf.EventCallback | undefined {
    if (elementFirst) {
      return this._getElement(element).cb || this._listenerConfig.cb
    }

    return this._listenerConfig.cb
  }

  protected _getThreshold(element?: Inf.EventSequenceElement, elementFirst = true): number {
    if (elementFirst) {
      return this._getElement(element).threshold || this._listenerConfig.threshold || 1
    }

    return this._listenerConfig.threshold || 1
  }

  protected _getScheduleType(element?: Inf.EventSequenceElement): Inf.ScheduleTypeKeys {
    return this._listenerConfig.scheduleType || 'once'
  }

  protected _getContext(element?: Inf.EventSequenceElement, elementFirst = true): object | null {
    if (elementFirst) {
      return this._listenerConfig.context || null
    }

    return this._listenerConfig.context || null
  }

  protected _getInitData(element?: Inf.EventSequenceElement): any {
    return this._listenerConfig.initData || {}
  }

  protected _getUnionScheduleType(): Inf.UnionScheduleType {
    return this._listenerConfig.unionScheduleType || 'race'
  }

  protected _isLikeNodeJsListener(obj: any): obj is NodeJS.EventEmitter {
    return obj && _.isFunction(obj.addListener) && _.isFunction(obj.removeListener)
  }

  protected _isLikeDOMDispatcher(obj: any): obj is EventTarget {
    return obj && _.isFunction(obj.addEventListener) && _.isFunction(obj.removeEventListener)
  }

  protected _isOnOffDispatcher(obj: any): obj is Inf.OnOffDispatcher {
    return obj && _.isFunction(obj.on) && _.isFunction(obj.off)
  }

  protected _bind(element: Inf.EventSequenceElement, index: number) {
    const listener = this._getListener(element)
    let bind = null
    if (this._isLikeNodeJsListener(listener)) {
      bind = listener.addListener
    }
    else if (this._isLikeDOMDispatcher(listener)) {
      bind = listener.addEventListener
    }
    else if (this._isOnOffDispatcher(listener)) {
      bind = listener.on
    }
    else {
      throw new Error(ListenerBindFunctionIsMissing)
    }

    if (element.internalListener) {
      this._unbind(element, index)
    }

    element.internalListener = (...args: any[]) => {
      this._handleEvent(element, index, ...args)
    }

    bind.call(listener, element.name, element.internalListener)
  }

  protected _unbind(element: Inf.EventSequenceElement, index: number) {
    if (!element.internalListener) {
      return
    }

    const listener = this._getListener(element)
    let unbind = null
    if (this._isLikeNodeJsListener(listener)) {
      unbind = listener.removeListener
    }
    else if (this._isLikeDOMDispatcher(listener)) {
      unbind = listener.removeEventListener
    }
    else if (this._isOnOffDispatcher(listener)) {
      unbind = listener.off
    }
    else {
      throw new Error(ListenerUnbindFunctionIsMissing)
    }

    unbind.call(listener, element.name, element.internalListener)
    element.internalListener = null
  }

  protected _isEventCallback(obj: any): obj is Inf.EventCallback {
    return _.isFunction(obj)
  }

  protected _isListener(obj: any): obj is Inf.EventListener {
    return obj && (
      this._isLikeNodeJsListener(obj)
      || this._isLikeDOMDispatcher(obj)
      || this._isOnOffDispatcher(obj)
    )
  }

  protected _isElement(obj: any): obj is Inf.EventSequenceElement {
    return obj && _.isString(obj.name)
  }

  protected _isGeneralConfig(obj: any): obj is Inf.GeneralConfig {
    return obj && obj.listener
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

  protected _callListener(element: Inf.EventSequenceElement, index: number, args: any[]) {
    const context = this._getContext(element)

    const predecessor = this._getPredecessor(index)

    const data = predecessor ? predecessor.data : this._getInitData(element)
    const endCallback = this._getEventCallback(undefined, false)
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

      this._appendResolvedPromise(metadata, true)

      if (endCallback) {
        const context = this._getContext(undefined, false)
        endCallback.call(context, metadata)
      }
    }
  }

  protected _handleEvent(
    element: Inf.EventSequenceElement,
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

  protected _parseSingleEventSequenceConfigList(configList: Inf.EventSequenceSingleConfigList) {
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

  protected _isUnionEventSequenceConfigList(testValue: any): testValue is Inf.EventSequenceUnionConfigList {
    if (!Array.isArray(testValue)) {
      return false
    }

    const itemIsArray = testValue.filter(item => Array.isArray(item))

    return itemIsArray.length === testValue.length
  }

  protected _isSingleEventSequenceConfigList(testValue: any): testValue is Inf.EventSequenceSingleConfigList {
    if (!Array.isArray(testValue)) {
      return false
    }

    const itemIsArray = testValue.filter(item => _.isString(item) || this._isElement(item))

    return itemIsArray.length === testValue.length
  }

  protected async _handleRacedEventSequencesSchedule(configList: Inf.EventSequenceUnionConfigList, scheduleType: Inf.ScheduleTypeKeys) {
    if (this._getUnionScheduleType() !== 'race') {
      return
    }

    configList.forEach(value => {
      this._unionEventSequenceList.push(
        new EventSequenceListener(value, this._listenerConfig)
      )
    })

    const promiseList = this._unionEventSequenceList.map(evenOrderInstance => evenOrderInstance.getPromise())
    const resolvedValue = await Promise.race(promiseList)

    this._unionEventSequenceList.forEach(eventOrderInstance => {
      if (eventOrderInstance !== resolvedValue[0].instance) {
        eventOrderInstance.cancel()
      }
    })

    this._unionEventSequenceList = []
    this._appendResolvedPromise(resolvedValue, true)

    if (scheduleType === 'repeat') {
      this._handleRacedEventSequencesSchedule(configList, scheduleType)
    }
  }

  protected _parseConstructorOptions() {
    if (!Array.isArray(this._configList)) {
      throw new Error(SequenceIsArray)
    }

    if (this._isSingleEventSequenceConfigList(this._configList)) {
      this._parseSingleEventSequenceConfigList(this._configList)
    }
    else if (this._isUnionEventSequenceConfigList(this._configList)) {
      const scheduleTypeForUnionEventSequences = this._getScheduleType()
      this._listenerConfig.scheduleType = 'once'

      this._handleRacedEventSequencesSchedule(this._configList, scheduleTypeForUnionEventSequences)
    }

    const lastElement = this._eventList[this._eventList.length - 1]

    if (!this._isGeneralConfig(this._listenerConfig)
      && (
        !this._isElement(lastElement)
        || !this._isListener(lastElement.listener)
        || !this._isEventCallback(lastElement.cb)
      )) {
      throw new Error(SupplyListenerOptions)
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
    this._promiseStore = []
    this._unionEventSequenceList = []
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

      this._appendResolvedPromise(new Error(e.message), false)
    }
  }

  protected _attachListeners() {
    this._eventList.forEach((element, index) => {
      this._bind(element, index)
    })
  }

  protected _detachListeners(ignoreElement: Inf.EventSequenceElement | null = null) {
    this._eventList.forEach((element, index) => {
      if (!ignoreElement || ignoreElement !== element) {
        this._unbind(element, index)
      }
    })
  }
}
