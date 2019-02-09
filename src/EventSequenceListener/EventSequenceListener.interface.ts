declare class EventSequenceListener {}

export type EventName = string

/**
 * Define the behavior after receiving the specified event sequence.
 * once => detach all the event listeners
 * repeat => reset the state and wait next event sequence arrived
 */
export interface ScheduleType {
  once: any
  repeat: any
}

export type ScheduleTypeKeys = keyof ScheduleType

/**
 * An event emitter that has on, off method exposed.
 */
export interface OnOffDispatcher {
  on: Function
  off: Function
}

/**
 * A general event listener type that is capable of listen event and call the handler.
 */
export type EventListener = NodeJS.EventEmitter | EventTarget | OnOffDispatcher

/**
 * The metadata passed to event handler or resolver of the promise
 */
export interface EventCallbackParameters {
  /**
   * the received event instance of EventSequenceListener
   */
  instance: EventSequenceListener
  /**
   * data - the data passed from {@link GeneralConfig}
   */
  data: any
  /**
   * the executed timestamp of the event handler of the predecessor of the event sequence
   */
  lastExeTimestamp: number
  /**
   * The values is the distance between the current timestamp of running event handler with the timestamp of the predecessor
   */
  delay: number
  /**
   * true if this is the last event
   */
  isLastEvent: boolean
  /**
   * true if the calling event callback is the end
   */
  isEnd: boolean
  /**
   * a series of event names that passed through the matched sequence
   */
  passEvents: string[]
}

export type EventCallbackParametersList = EventCallbackParameters[]

export type EventCallback = (info: EventCallbackParametersList, ...args: any[]) => void

export interface EventSequenceConfig {
  name: EventName
  cb?: EventCallback
  listener?: EventListener
  threshold?: number
}

export type UnionScheduleType = 'race'

export interface EventSequenceElement extends EventSequenceConfig {
  eventReceivingNum: number
  sequenceReceivingNum: number
  delay: number
  timestamp: number
  data: any
  threshold: number
  internalListener: Function | null
  alwaysOn?: boolean
}

export interface GeneralConfig {
  listener: EventListener
  cb?: EventCallback
  context?: object
  threshold?: number
  initData?: any
  scheduleType?: ScheduleTypeKeys
  unionScheduleType?: UnionScheduleType
}

export type EventSequenceSingleConfigList = Array<EventSequenceConfig | EventName>

export type EventSequenceUnionConfigList = Array<EventSequenceSingleConfigList>

export type EventSequenceConfigList = EventSequenceSingleConfigList | EventSequenceUnionConfigList

export type EventSequenceElementList = Array<EventSequenceElement>
