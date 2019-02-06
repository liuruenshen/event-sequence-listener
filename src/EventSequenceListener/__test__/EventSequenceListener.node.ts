import eventEmitter from 'events'
import runTest from './EventSequenceListener.spec'

class EmitterForTest extends eventEmitter {
  trigger(name: string) {
    this.emit(name)
  }
}

runTest(EmitterForTest)
