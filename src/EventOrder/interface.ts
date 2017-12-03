export type EventName = string
export type Listener = Function

export interface RunningType {
  once: any
  on: any
  repeat: any
}

export type RunningTypeKey = keyof RunningType

export interface Emitter {
  addEventListener: Function
  on: Function
  removeEventListener: Function
  off: Function
  trigger: Function
}

export interface EventSequenceElement {
  name: EventName
  cb?: Listener
  emitter?: Emitter
  context?: object
  times?: number
  runningType?: RunningType
}

export interface RuntimeSequenceElement extends EventSequenceElement {
  counter: number
  delay: number
  data: any
  travelEvents: Array<string>
}

export type EmitterConfig = Pick<EventSequenceElement, "cb" | "emitter" | "context" | "times" | "runningType">

export type EventSequence = Array<EventSequenceElement|EventName>
export type RuntimeSequence = Array<RuntimeSequenceElement>
