declare class EventOrder {}

export type EventName = string
export type Listener = (info: EventCallbackParameters, ...args: any[]) => void

export interface EmitType {
  once: any
  onlyend: any
  repeat: any
}

export type EmitTypeKeys = keyof EmitType

export interface OnOffDispatcher {
  on: Function
  off: Function
}

export type Emitter = NodeJS.EventEmitter | EventTarget | OnOffDispatcher

export interface EventCallbackParameters {
  eventOrderInstance: EventOrder
  data: any
  lastExeTimestamp: number
  delay: number
  isLastEvent: boolean
  isEnd: boolean
  passEvents: string[]
}

export interface EventOrderConfig {
  name: EventName
  cb?: Listener
  emitter?: Emitter
  threshold?: number
}

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
  scheduleType?: EmitTypeKeys
}

export type EventOrderSingleConfigList = Array<EventOrderConfig | EventName>

export type EventOrderUnionConfigList = Array<EventOrderSingleConfigList>

export type EventOrderConfigList = EventOrderSingleConfigList | EventOrderUnionConfigList

export type EventOrderElementList = Array<EventOrderElement>
