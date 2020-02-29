import _ from 'lodash'

import {
  EventCallback,
  EventCallbackParameters,
  EventCallbackParametersList,
  EventListener,
  EventSequenceConfigList,
  EventSequenceElement,
  EventSequenceElementList,
  EventSequenceSingleConfigList,
  EventSequenceUnionConfigList,
  GeneralConfig,
  OnOffDispatcher,
  ScheduleTypeKeys,
  UnionScheduleType,
  EventListenerArgumentsList
} from './EventSequenceListener.interface'

const sequenceIsArray = 'First argument must be an array.'
const elementIsMalformed = 'First argument contains malformed element.'
const supplyListenerOptions = 'Supply listenerOptions if last sequence element does not specify listener or listener'
const listenerBindFunctionIsMissing = 'Listener must have one of these bind function: addEventListener, addListener or on'
const listenerUnbindFunctionIsMissing = 'Listener must have one of these unbind function: removeEventListener, removeListener or off'

const cancelSchedule = 'cancel'
const defaultPromiseQueueLength = 1000

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
  private _eventList: EventSequenceElementList = []
  private _unionEventSequenceList: Array<EventSequenceListener> = []
  private _schedule: IterableIterator<EventSequenceElement>
  private _publicPromiseStore: PromiseWithResolveReject<EventCallbackParametersList>[] = []
  private _controlSchedulePromise: PromiseWithResolveReject<void> | null = null
  private _eventListenerArgumentsStore: EventListenerArgumentsList = []
  private _isScheduleClosed: boolean = false

  static cancelSchedule = cancelSchedule

  public constructor(
    private _configList: EventSequenceConfigList,
    private _listenerConfig: GeneralConfig) {
    this._schedule = this._generator()

    this._parseConstructorOptions()
    this._addPublicPromise()
    this._attachListeners()
  }

  public cancel() {
    if (this._schedule && !this._isScheduleClosed) {
      const { done } = this._schedule.throw!(new Error(cancelSchedule))
      this._isScheduleClosed = done!
    }
  }

  public getPromiseState(target: Promise<EventCallbackParameters[]>) {
    const foundPromise = this._publicPromiseStore.find(publicPromise => publicPromise.promise === target)
    if (!foundPromise) {
      return false
    }

    return foundPromise.state
  }

  public get isScheduleClosed() {
    return this._isScheduleClosed
  }

  public get publicPromiseQueueMax() {
    return this._getPublicPromiseQueueMax()
  }

  public get promise() {
    // Remove all the read & resolved/rejected promises
    this._publicPromiseStore = this._publicPromiseStore.filter(
      storedPromise => !(storedPromise.isRead && storedPromise.state !== PromiseState.pending)
    )

    if (!this._publicPromiseStore.length) {
      this._addPublicPromise()
    }

    const storedPromise = this._publicPromiseStore[0]
    storedPromise.isRead = true

    return storedPromise.promise
  }

  protected _addNewEventListenerArguments(eventName: string, args: any[]) {
    this._eventListenerArgumentsStore.push({ eventName, arguments: args })
  }

  protected _clearEventListenerArguments() {
    this._eventListenerArgumentsStore = []
  }

  protected _getEventListenerArguments() {
    return this._eventListenerArgumentsStore
  }

  protected _runSchedule() {
    if (!this._schedule || this._isScheduleClosed) {
      this._schedule = this._generator()
    }

    const { done } = this._schedule.next()
    this._isScheduleClosed = done!
  }

  protected _createPromiseWithResolveReject() {
    const storedPromise: any = {}
    const promise: Promise<EventCallbackParametersList> = new Promise((resolve, reject) => {
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
    return storedPromise
  }

  protected _addPublicPromise() {
    if (this._publicPromiseStore.length > this._getPublicPromiseQueueMax()) {
      let discardedPromises = this._publicPromiseStore.length - this._getPublicPromiseQueueMax() + 1
      if (discardedPromises > this._publicPromiseStore.length - 1) {
        this._publicPromiseStore = []
      }
      else {
        this._publicPromiseStore = this._publicPromiseStore.slice(discardedPromises)
      }
    }

    this._publicPromiseStore.push(
      this._createPromiseWithResolveReject()
    )
  }

  protected _createControllingSchedulePromise() {
    if (!this._controlSchedulePromise || this._controlSchedulePromise.state !== PromiseState.pending) {
      this._controlSchedulePromise = this._createPromiseWithResolveReject()
    }
  }

  protected _resolveControllingSchedulePromise() {
    this._createControllingSchedulePromise()
    this._controlSchedulePromise!.resolve()
  }

  protected _rejectControllingSchedulePromise(e: Error) {
    this._createControllingSchedulePromise()
    this._controlSchedulePromise!.reject(e)
  }

  protected _getControllingSchedulePromise() {
    this._createControllingSchedulePromise()
    return this._controlSchedulePromise!
  }

  protected _resolvePublicPromise(value: any, isResolveOrReject: boolean) {
    let foundPendingPromise = this._publicPromiseStore.find(storedPromise => storedPromise.state === PromiseState.pending)

    if (!foundPendingPromise) {
      this._addPublicPromise()
      foundPendingPromise = this._publicPromiseStore[this._publicPromiseStore.length - 1]
    }

    if (isResolveOrReject) {
      foundPendingPromise.resolve(value)
    }
    else {
      foundPendingPromise.reject(value)
    }
  }

  protected _getElement(element?: EventSequenceElement) {
    if (_.isUndefined(element)) {
      const lastIndex = this._eventList.length - 1
      return this._eventList[lastIndex]
    }
    return element
  }

  protected _getListener(element?: EventSequenceElement): EventListener {
    return <EventListener>(this._getElement(element).listener || this._listenerConfig.listener)
  }

  protected _getPublicPromiseQueueMax() {
    if (_.isUndefined(this._listenerConfig.promiseQueueMax) || !_.isFinite(this._listenerConfig.promiseQueueMax)) {
      return defaultPromiseQueueLength
    }

    if (this._listenerConfig.promiseQueueMax < 1) {
      return 1
    }

    return this._listenerConfig.promiseQueueMax
  }

  protected _getEventCallback(element?: EventSequenceElement, elementFirst = true): EventCallback | undefined {
    if (elementFirst) {
      return this._getElement(element).cb || this._listenerConfig.cb
    }

    return this._listenerConfig.cb
  }

  protected _getThreshold(element?: EventSequenceElement, elementFirst = true): number {
    if (elementFirst) {
      return this._getElement(element).threshold || this._listenerConfig.threshold || 1
    }

    return this._listenerConfig.threshold || 1
  }

  protected _getScheduleType(element?: EventSequenceElement): ScheduleTypeKeys {
    return this._listenerConfig.scheduleType || 'once'
  }

  protected _getContext(element?: EventSequenceElement, elementFirst = true): object | null {
    if (elementFirst) {
      return this._listenerConfig.context || null
    }

    return this._listenerConfig.context || null
  }

  protected _getInitData(element?: EventSequenceElement): any {
    return this._listenerConfig.initData || {}
  }

  protected _getUnionScheduleType(): UnionScheduleType {
    return this._listenerConfig.unionScheduleType || 'race'
  }

  protected _isLikeNodeJsListener(obj: any): obj is NodeJS.EventEmitter {
    return obj && _.isFunction(obj.addListener) && _.isFunction(obj.removeListener)
  }

  protected _isLikeDOMDispatcher(obj: any): obj is EventTarget {
    return obj && _.isFunction(obj.addEventListener) && _.isFunction(obj.removeEventListener)
  }

  protected _isOnOffDispatcher(obj: any): obj is OnOffDispatcher {
    return obj && _.isFunction(obj.on) && _.isFunction(obj.off)
  }

  protected _bind(element: EventSequenceElement, index: number) {
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
      throw new Error(listenerBindFunctionIsMissing)
    }

    if (element.internalListener) {
      this._unbind(element, index)
    }

    element.internalListener = (...args: any[]) => {
      this._handleEvent(element, index, ...args)
    }

    bind.call(listener, element.name, element.internalListener)
  }

  protected _unbind(element: EventSequenceElement, index: number) {
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
      throw new Error(listenerUnbindFunctionIsMissing)
    }

    unbind.call(listener, element.name, element.internalListener)
    element.internalListener = null
  }

  protected _isEventCallback(obj: any): obj is EventCallback {
    return _.isFunction(obj)
  }

  protected _isListener(obj: any): obj is EventListener {
    return obj && (
      this._isLikeNodeJsListener(obj)
      || this._isLikeDOMDispatcher(obj)
      || this._isOnOffDispatcher(obj)
    )
  }

  protected _isElement(obj: any): obj is EventSequenceElement {
    return obj && _.isString(obj.name)
  }

  protected _isGeneralConfig(obj: any): obj is GeneralConfig {
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

  protected _callListener(element: EventSequenceElement, index: number, args: any[]) {
    const context = this._getContext(element)

    const predecessor = this._getPredecessor(index)

    const data = predecessor ? predecessor.data : this._getInitData(element)
    const endCallback = this._getEventCallback(undefined, false)
    const isLastEvent = index === this._eventList.length - 1
    const matchSequenceThreshold = element.sequenceReceivingNum + 1 === this._getThreshold(undefined, false)

    this._addNewEventListenerArguments(element.name, args)

    element.timestamp = Date.now()
    element.delay = predecessor ? element.timestamp - predecessor.timestamp : 0

    let result = null
    if (!_.isUndefined(element.cb)) {
      result = element.cb.call(
        context,
        [{
          instance: this,
          data,
          lastExeTimestamp: predecessor ? predecessor.timestamp : 0,
          delay: element.delay,
          isLastEvent,
          isEnd: isLastEvent && !endCallback ? true : false,
          passEvents: this._eventList.filter((v, i) => i <= index).map(element => element.name),
          eventListenerArgs: this._getEventListenerArguments()
        }],
      )
    }

    element.data = result || data

    if (isLastEvent && matchSequenceThreshold) {
      const metadata: EventCallbackParameters[] = [{
        instance: this,
        data: element.data,
        lastExeTimestamp: predecessor ? predecessor.timestamp : 0,
        delay: element.delay,
        isLastEvent: true,
        isEnd: true,
        passEvents: this._eventList.map(element => element.name),
        eventListenerArgs: this._getEventListenerArguments()
      }]

      if (endCallback) {
        const context = this._getContext(undefined, false)

        let result: any = endCallback.call(context, metadata)
        if (result) {
          metadata[0].data = result
        }
      }

      this._clearEventListenerArguments()
      this._resolvePublicPromise(metadata, true)
      this._resolveControllingSchedulePromise()
    }
  }

  protected _handleEvent(
    element: EventSequenceElement,
    index: number,
    ...args: any[]
  ) {
    const predecessor = index > 0 ? this._eventList[index - 1] : null
    if (predecessor && predecessor.eventReceivingNum < predecessor.threshold) {
      return
    }

    if (element.threshold === ++element.eventReceivingNum) {
      this._callListener(element, index, args)
      this._runSchedule()
    }
  }

  protected _parseSingleEventSequenceConfigList(configList: EventSequenceSingleConfigList) {
    configList.forEach(value => {
      if (_.isString(value)) {
        this._eventList.push({
          name: value,
          eventReceivingNum: 0,
          sequenceReceivingNum: 0,
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
          eventReceivingNum: 0,
          sequenceReceivingNum: 0,
          delay: 0,
          data: null,
          timestamp: 0,
          threshold: isFinite(value.threshold) ? value.threshold : 1,
          internalListener: null,
        })
      }
      else {
        throw new Error(elementIsMalformed)
      }
    })
  }

  protected _isUnionEventSequenceConfigList(testValue: any): testValue is EventSequenceUnionConfigList {
    if (!Array.isArray(testValue)) {
      return false
    }

    const itemIsArray = testValue.filter(item => Array.isArray(item))

    return itemIsArray.length === testValue.length
  }

  protected _isSingleEventSequenceConfigList(testValue: any): testValue is EventSequenceSingleConfigList {
    if (!Array.isArray(testValue)) {
      return false
    }

    const itemIsArray = testValue.filter(item => _.isString(item) || this._isElement(item))

    return itemIsArray.length === testValue.length
  }

  protected _controlScheduleBehavior(method: Function) {
    if (this._getScheduleType() === 'repeat') {
      method()
    }
    else if (this._getScheduleType() === 'once') {
      this._dispose()
    }
  }

  protected async _handleRacedEventSequencesSchedule() {
    if (this._getUnionScheduleType() !== 'race') {
      return
    }

    try {
      const promiseList = this._unionEventSequenceList.map(evenOrderInstance => evenOrderInstance.promise)
      const resolvedValue = await Promise.race(promiseList)

      this._unionEventSequenceList.forEach((eventOrderInstance, index) => {
        if (eventOrderInstance.getPromiseState(promiseList[index]) === PromiseState.pending) {
          eventOrderInstance.cancel()
        }
      })

      this._resolvePublicPromise(resolvedValue, true)
    }
    catch (e) {
      this._resolvePublicPromise(new Error(e.message), false)
    }

    this._controlScheduleBehavior(this._handleRacedEventSequencesSchedule.bind(this))
  }

  protected async _handleAllEventSequencesSchedule() {
    if (this._getUnionScheduleType() !== 'all') {
      return
    }

    try {
      const promiseList = this._unionEventSequenceList.map(evenOrderInstance => evenOrderInstance.promise)
      const resolvedValue = await Promise.all(promiseList)

      this._resolvePublicPromise(resolvedValue.map(item => item[0]), true)
    }
    catch (e) {
      this._resolvePublicPromise(new Error(e.message), false)
    }

    this._controlScheduleBehavior(this._handleAllEventSequencesSchedule.bind(this))
  }

  protected async _handleSingleEventSequenceSchedule() {
    try {
      this._runSchedule()
      await this._getControllingSchedulePromise().promise
    }
    catch (e) { }

    this._controlScheduleBehavior(this._handleSingleEventSequenceSchedule.bind(this))
  }

  protected _parseConstructorOptions() {
    if (!Array.isArray(this._configList)) {
      throw new Error(sequenceIsArray)
    }

    if (!this._isGeneralConfig(this._listenerConfig)) {
      throw new Error(supplyListenerOptions)
    }

    if (this._isSingleEventSequenceConfigList(this._configList)) {
      this._parseSingleEventSequenceConfigList(this._configList)
      this._handleSingleEventSequenceSchedule()
    }
    else if (this._isUnionEventSequenceConfigList(this._configList)) {
      this._configList.forEach(value => {
        this._unionEventSequenceList.push(
          new EventSequenceListener(value, this._listenerConfig)
        )
      })

      this._handleRacedEventSequencesSchedule()
      this._handleAllEventSequencesSchedule()
    }
  }

  protected _resetCounter() {
    this._eventList.forEach(element => {
      element.eventReceivingNum = 0
    })
  }

  protected _dispose() {
    this._detachListeners()
    this._eventList = []
    this._unionEventSequenceList = []
  }

  protected *_generator() {
    try {
      const threshold = this._getThreshold(undefined, false)
      for (let i = 0; i < threshold; ++i) {
        this._resetCounter()

        for (let j = 0; j < this._eventList.length; ++j) {
          const element = this._eventList[j]

          element.eventReceivingNum = 0
          element.sequenceReceivingNum = i
          if (element.threshold > element.eventReceivingNum) {
            yield element
          }
        }
      }
    }
    catch (e) {
      this._resolvePublicPromise(new Error(e.message), false)
      this._rejectControllingSchedulePromise(new Error(e.message))
    }
  }

  protected _attachListeners() {
    this._eventList.forEach((element, index) => {
      this._bind(element, index)
    })
  }

  protected _detachListeners(ignoreElement: EventSequenceElement | null = null) {
    this._eventList.forEach((element, index) => {
      if (!ignoreElement || ignoreElement !== element) {
        this._unbind(element, index)
      }
    })
  }
}
