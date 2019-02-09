declare class EventSequenceListener {}

export type EventName = string

export interface ScheduleType {
  once: any
  repeat: any
}

export type ScheduleTypeKeys = keyof ScheduleType

export interface OnOffDispatcher {
  on: Function
  off: Function
}

export type EventListener = NodeJS.EventEmitter | EventTarget | OnOffDispatcher

export interface EventCallbackParameters {
  instance: EventSequenceListener
  data: any
  lastExeTimestamp: number
  delay: number
  isLastEvent: boolean
  isEnd: boolean
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
