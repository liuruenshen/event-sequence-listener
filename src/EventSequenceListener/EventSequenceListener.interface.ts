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

export type Emitter = NodeJS.EventEmitter | EventTarget | OnOffDispatcher

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

export type Listener = (info: EventCallbackParametersList, ...args: any[]) => void

export interface EventOrderConfig {
  name: EventName
  cb?: Listener
  emitter?: Emitter
  threshold?: number
}

export type UnionScheduleType = 'race'

export interface EventOrderElement extends EventOrderConfig {
  current: number
  delay: number
  timestamp: number
  data: any
  threshold: number
  internalListener: Function | null
  alwaysOn?: boolean
}

export interface EmitterConfig {
  emitter: Emitter
  cb?: Listener
  context?: object
  threshold?: number
  initData?: any
  scheduleType?: ScheduleTypeKeys
  unionScheduleType?: UnionScheduleType
}

export type EventOrderSingleConfigList = Array<EventOrderConfig | EventName>

export type EventOrderUnionConfigList = Array<EventOrderSingleConfigList>

export type EventOrderConfigList = EventOrderSingleConfigList | EventOrderUnionConfigList

export type EventOrderElementList = Array<EventOrderElement>
