import runTest from './EventSequenceListener.spec'

class EventEmitter {
  private __emitter: EventTarget
  constructor() {
    this.__emitter = document.createElement('div')
  }

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    this.__emitter.addEventListener(type, listener, options)
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions
  ) {
    this.__emitter.removeEventListener(type, listener, options)
  }

  trigger(name: string, ...args: any[]) {
    const event = new CustomEvent(name, { detail: args })
    this.__emitter.dispatchEvent(event)
  }

  dispatchEvent(event: Event): boolean {
    return this.__emitter.dispatchEvent(event)
  }
}

runTest(EventEmitter)
