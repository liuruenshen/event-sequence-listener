import eventEmitter from 'events'
import runTest from './EventSequenceListener.spec'

class EmitterForTest extends eventEmitter {
  trigger(name: string, ...args: any[]) {
    this.emit(name, ...args)
  }
}

runTest(EmitterForTest)
