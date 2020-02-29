import events from 'events'
import runTest from './EventSequenceListener.spec'

class EmitterForTest extends events.EventEmitter {
  trigger(name: string, ...args: any[]) {
    this.emit(name, ...args)
  }
}

runTest(EmitterForTest)
