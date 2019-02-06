import * as eventEmitter from 'events'
import should from 'should'
import { EventSequenceListener, CancelSchedule } from './EventSequenceListener'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('EventSequenceListener', () => {
  it('should accept an array and emitConfig', (done) => {
    const emitter = new eventEmitter()
    new EventSequenceListener(['event1', 'event2'], {
      cb: function (metadata) {
        done()
      },
      threshold: 1,
      emitter
    })

    async function run() {
      await sleep(5)
      emitter.emit('event1')
      await sleep(10)
      emitter.emit('event2')
    }
    run()
  })

  it('should receive custom data attribute in listener', (done) => {
    const emitter = new eventEmitter()
    new EventSequenceListener(
      [
        {
          name: 'event1',
          threshold: 1
        },
        'event2',
        'event3'
      ],
      {
        cb: function (metadata, payload) {
          should(metadata).be.a.Array()
          should(metadata[0]).be.a.Object()
          should(metadata[0].data).be.a.Object()
          should(metadata[0].data.test).be.a.Number()
          done()
        },
        initData: {
          test: 0
        },
        threshold: 1,
        emitter
      })

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(2)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event3')
    }
    run()
  })

  it('should call intermediate callbacks and get modified data', (done) => {
    const emitter = new eventEmitter()
    new EventSequenceListener(
      [
        {
          name: 'event1',
        },
        {
          name: 'event2',
          cb: function (metadata) {
            should(metadata).be.a.Array()
            should(metadata[0]).be.a.Object()
            should(metadata[0].data).be.a.Object()
            should(metadata[0].data.test).be.a.Number()
            metadata[0].data.test++
            return metadata[0].data
          }
        },
        'event3'
      ],
      {
        cb: function (metadata) {
          should(metadata).be.a.Array()
          should(metadata[0]).be.a.Object()
          should(metadata[0].data).be.a.Object()
          should(metadata[0].data.test).be.a.Number()
          should(metadata[0].data.test).be.equal(1)
          done()
        },
        initData: {
          test: 0
        },
        threshold: 1,
        emitter
      })

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(2)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event3')
    }
    run()
  })

  it('should enter callback when the triggered times of the event reaches the threshold', (done) => {
    const emitter = new eventEmitter()
    new EventSequenceListener(
      [
        {
          name: 'event1',
          threshold: 2,
          cb: function (metadata) {
            metadata[0].data.count++
            return metadata[0].data
          }
        },
        {
          name: 'event2',
          threshold: 3,
          cb: function (metadata) {
            metadata[0].data.count++
            return metadata[0].data
          },
        },
        'event3'
      ],
      {
        cb: function (metadata) {
          should(metadata[0].data.count).be.equal(2)
          done()
        },
        initData: {
          count: 0
        },
        threshold: 1,
        emitter
      })

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(2)
      emitter.emit('event1')
      await sleep(2)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event1')
      await sleep(2)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event3')
    }
    run()
  })

  it('should retrieve the delay value that is as close as the real delay time', (done) => {
    const emitter = new eventEmitter()
    new EventSequenceListener(
      [
        'event1',
        {
          name: 'event2',
          cb: function (metadata) {
            should(metadata[0].delay).be.greaterThanOrEqual(10)
            should(metadata[0].delay).be.lessThanOrEqual(11)
          },
        },
        'event3'
      ],
      {
        cb: function (metadata) {
          should(metadata[0].delay).be.greaterThanOrEqual(5)
          should(metadata[0].delay).be.lessThanOrEqual(6)
          done()
        },
        emitter
      })

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(10)
      emitter.emit('event2')
      await sleep(5)
      emitter.emit('event3')
    }
    run()
  })

  it('should have expected metadata values', (done) => {
    const emitter = new eventEmitter()
    new EventSequenceListener(
      [
        {
          name: 'event1',
          cb: function (metadata) {
            should(metadata[0].instance).be.instanceOf(EventSequenceListener)
            should(metadata[0].isLastEvent).be.false()
            should(metadata[0].isEnd).be.false()
            should(metadata[0].passEvents).be.Array()
            should(metadata[0].passEvents.length).be.equal(1)
            should(metadata[0].passEvents[0]).be.equal('event1')
          }
        },
        {
          name: 'event2',
          cb: function (metadata) {
            should(metadata[0].instance).be.instanceOf(EventSequenceListener)
            should(metadata[0].isLastEvent).be.false()
            should(metadata[0].isEnd).be.false()
            should(metadata[0].passEvents).be.Array()
            should(metadata[0].passEvents.length).be.equal(2)
            should(metadata[0].passEvents[0]).be.equal('event1')
            should(metadata[0].passEvents[1]).be.equal('event2')
          }
        },
        {
          name: 'event3',
          cb: function (metadata) {
            should(metadata[0].instance).be.instanceOf(EventSequenceListener)
            should(metadata[0].isLastEvent).be.false()
            should(metadata[0].isEnd).be.false()
            should(metadata[0].passEvents).be.Array()
            should(metadata[0].passEvents.length).be.equal(3)
            should(metadata[0].passEvents[0]).be.equal('event1')
            should(metadata[0].passEvents[1]).be.equal('event2')
            should(metadata[0].passEvents[2]).be.equal('event3')
          }
        },
        {
          name: 'event4',
          cb: function (metadata) {
            should(metadata[0].instance).be.instanceOf(EventSequenceListener)
            should(metadata[0].isLastEvent).be.true()
            should(metadata[0].isEnd).be.false()
            should(metadata[0].passEvents).be.Array()
            should(metadata[0].passEvents.length).be.equal(4)
            should(metadata[0].passEvents[0]).be.equal('event1')
            should(metadata[0].passEvents[1]).be.equal('event2')
            should(metadata[0].passEvents[2]).be.equal('event3')
            should(metadata[0].passEvents[3]).be.equal('event4')
          }
        }
      ],
      {
        cb: function (metadata) {
          should(metadata[0].instance).be.instanceOf(EventSequenceListener)
          should(metadata[0].isLastEvent).be.true()
          should(metadata[0].isEnd).be.true()
          should(metadata[0].passEvents).be.Array()
          should(metadata[0].passEvents.length).be.equal(4)
          should(metadata[0].passEvents[0]).be.equal('event1')
          should(metadata[0].passEvents[1]).be.equal('event2')
          should(metadata[0].passEvents[2]).be.equal('event3')
          should(metadata[0].passEvents[3]).be.equal('event4')
          done()
        },
        emitter
      })

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(10)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event4')
      await sleep(5)
      emitter.emit('event3')
      await sleep(3)
      emitter.emit('event4')
    }
    run()
  })

  it('should regarded final event callback as the end of event callback when emitter config is absent', (done) => {
    const emitter = new eventEmitter()
    new EventSequenceListener(
      [
        'event1', 'event2', 'event3',
        {
          name: 'event4',
          cb: function (metadata) {
            should(metadata[0].isEnd).be.true()
            done()
          }
        }
      ],
      { emitter })

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(10)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event4')
      await sleep(5)
      emitter.emit('event3')
      await sleep(3)
      emitter.emit('event4')
    }
    run()
  })

  it('should cancel EventSequenceListener successfully', (done) => {
    const emitter = new eventEmitter()
    const eventOrder = new EventSequenceListener(
      ['event1', 'event2', 'event3'],
      { emitter }
    )

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(10)
      emitter.emit('event2')
      await sleep(3)
      eventOrder.cancel()
    }

    eventOrder.getPromise().catch(e => {
      should(e.message).be.equal(CancelSchedule)
      done()
    })

    run()
  })

  it('should resolve promise successfully', (done) => {
    const emitter = new eventEmitter()
    const eventOrder = new EventSequenceListener(
      ['event1', 'event2', 'event3', 'event4'],
      { emitter }
    )

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(10)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event4')
      await sleep(3)
      emitter.emit('event3')
      await sleep(3)
      emitter.emit('event4')
      await sleep(3)
    }

    eventOrder.getPromise().then(metadata => {
      should(metadata[0].instance).be.instanceOf(EventSequenceListener)
      should(metadata[0].isLastEvent).be.true()
      should(metadata[0].isEnd).be.true()
      should(metadata[0].passEvents).be.Array()
      should(metadata[0].passEvents.length).be.equal(4)
      should(metadata[0].passEvents[0]).be.equal('event1')
      should(metadata[0].passEvents[1]).be.equal('event2')
      should(metadata[0].passEvents[2]).be.equal('event3')
      should(metadata[0].passEvents[3]).be.equal('event4')
      done()
    })

    run()
  })

  it('should resolve the promise repeatedly', (done) => {
    const emitter = new eventEmitter()
    const repeatTimes = 4
    const eventOrder = new EventSequenceListener(
      ['event1', 'event2', 'event3'],
      { emitter, scheduleType: 'repeat' }
    )

    async function run() {
      for (let i = 0; i < repeatTimes; ++i) {
        await sleep(1)
        emitter.emit('event1')
        await sleep(10)
        emitter.emit('event2')
        await sleep(3)
        emitter.emit('event4')
        await sleep(3)
        emitter.emit('event3')
        await sleep(5)
      }
    }

    let resolveTimes = 0
    function resolvePromise() {
      eventOrder.getPromise().then(metadata => {
        should(metadata[0].instance).be.instanceOf(EventSequenceListener)
        should(metadata[0].isLastEvent).be.true()
        should(metadata[0].isEnd).be.true()
        should(metadata[0].delay).be.greaterThanOrEqual(5)
        should(metadata[0].delay).be.lessThanOrEqual(8)
        should(metadata[0].passEvents).be.Array()
        should(metadata[0].passEvents.length).be.equal(3)
        should(metadata[0].passEvents[0]).be.equal('event1')
        should(metadata[0].passEvents[1]).be.equal('event2')
        should(metadata[0].passEvents[2]).be.equal('event3')
        if (++resolveTimes === repeatTimes) {
          done()
        }
        else {
          resolvePromise()
        }
      })
    }

    resolvePromise()
    run()
  })

  it('should resolve multiple raced event sequences successfully', (done) => {
    let firstSequenceExecuted = false

    const emitter = new eventEmitter()
    const eventOrder = new EventSequenceListener(
      [
        [
          'event1',
          'event2',
          {
            name: 'event3',
            cb: function () {
              firstSequenceExecuted = true
            }
          }
        ],
        ['event1', 'event3', 'event5'],
      ],
      {
        emitter,
        unionScheduleType: 'race',
        initData: {
          event3TriggerTimes: 0
        }
      }
    )

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(3)
      emitter.emit('event4')
      await sleep(3)
      emitter.emit('event5')
      await sleep(5)
      emitter.emit('event3')
      await sleep(3)
      emitter.emit('event2')
      await sleep(5)
      emitter.emit('event5')
      await sleep(5)
      emitter.emit('event3')
      await sleep(3)
    }

    eventOrder.getPromise().then(metadata => {
      should(metadata[0].instance).be.instanceOf(EventSequenceListener)
      should(metadata[0].isLastEvent).be.true()
      should(metadata[0].isEnd).be.true()
      should(metadata[0].passEvents).be.Array()
      should(metadata[0].passEvents.length).be.equal(3)
      should(metadata[0].passEvents[0]).be.equal('event1')
      should(metadata[0].passEvents[1]).be.equal('event3')
      should(metadata[0].passEvents[2]).be.equal('event5')
      setTimeout(() => {
        should(firstSequenceExecuted).be.false()
        done()
      }, 5)
    })

    run()
  })

  it('should return first resolved event sequence in raced schedule type', (done) => {
    let secondSequence = false

    const emitter = new eventEmitter()
    const eventOrder = new EventSequenceListener(
      [
        [
          'event1',
          {
            name: 'event2',
            cb: function (metadata) {
              const data = { ...metadata[0].data }
              data.firstSequence = true
              return data
            }
          },
          'event3'
        ],
        [
          'event1',
          {
            name: 'event2',
            cb: function (metadata) {
              secondSequence = true

              const data = { ...metadata[0].data }
              data.secondSequence = true
              return data
            }
          },
          'event4'
        ]
      ],
      {
        emitter,
        unionScheduleType: 'race',
        initData: {
          firstSequence: false,
          secondSequence: false
        }
      }
    )

    async function run() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(3)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event5')
      await sleep(5)
      emitter.emit('event3')
      await sleep(3)
      emitter.emit('event4')
    }

    eventOrder.getPromise().then(metadata => {
      should(metadata[0].instance).be.instanceOf(EventSequenceListener)
      should(metadata[0].isLastEvent).be.true()
      should(metadata[0].isEnd).be.true()
      should(metadata[0].passEvents).be.Array()
      should(metadata[0].passEvents.length).be.equal(3)
      should(metadata[0].passEvents[0]).be.equal('event1')
      should(metadata[0].passEvents[1]).be.equal('event2')
      should(metadata[0].passEvents[2]).be.equal('event3')
      should(metadata[0].data.firstSequence).be.true()

      should(secondSequence).be.true()

      setTimeout(() => {
        should(metadata[0].data.secondSequence).be.false()
        done()
      }, 5)
    })

    run()
  })

  it('should return first resolved event sequence in raced schedule type repeatedly', (done) => {
    let firstSequence = false
    let secondSequence = false

    const emitter = new eventEmitter()
    const eventOrder = new EventSequenceListener(
      [
        [
          'event1',
          {
            name: 'event2',
            cb: function (metadata) {
              firstSequence = true

              const data = { ...metadata[0].data }
              data.firstSequence = true
              return data
            }
          },
          'event3'
        ],
        [
          'event1',
          {
            name: 'event2',
            cb: function (metadata) {
              secondSequence = true

              const data = { ...metadata[0].data }
              data.secondSequence = true
              return data
            }
          },
          'event4'
        ]
      ],
      {
        emitter,
        unionScheduleType: 'race',
        scheduleType: 'repeat',
        initData: {
          firstSequence: false,
          secondSequence: false
        }
      }
    )

    async function run1() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(3)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event5')
      await sleep(5)
      emitter.emit('event3')
      await sleep(3)
      emitter.emit('event4')
    }

    async function run2() {
      await sleep(1)
      emitter.emit('event1')
      await sleep(3)
      emitter.emit('event3')
      await sleep(3)
      emitter.emit('event1')
      await sleep(5)
      emitter.emit('event2')
      await sleep(3)
      emitter.emit('event4')
      await sleep(3)
      emitter.emit('event3')
    }

    function runEventOrder1() {
      eventOrder.getPromise().then(metadata => {
        should(metadata[0].instance).be.instanceOf(EventSequenceListener)
        should(metadata[0].isLastEvent).be.true()
        should(metadata[0].isEnd).be.true()
        should(metadata[0].passEvents).be.Array()
        should(metadata[0].passEvents.length).be.equal(3)
        should(metadata[0].passEvents[0]).be.equal('event1')
        should(metadata[0].passEvents[1]).be.equal('event2')
        should(metadata[0].passEvents[2]).be.equal('event3')
        should(metadata[0].data.firstSequence).be.true()

        should(secondSequence).be.true()

        setTimeout(() => {
          should(metadata[0].data.secondSequence).be.false()
        }, 5)
      })
    }

    function runEventOrder2() {
      return eventOrder.getPromise().then(metadata => {
        should(metadata[0].instance).be.instanceOf(EventSequenceListener)
        should(metadata[0].isLastEvent).be.true()
        should(metadata[0].isEnd).be.true()
        should(metadata[0].passEvents).be.Array()
        should(metadata[0].passEvents.length).be.equal(3)
        should(metadata[0].passEvents[0]).be.equal('event1')
        should(metadata[0].passEvents[1]).be.equal('event2')
        should(metadata[0].passEvents[2]).be.equal('event4')
        should(metadata[0].data.secondSequence).be.true()

        should(firstSequence).be.true()

        setTimeout(() => {
          should(metadata[0].data.firstSequence).be.false()
          done()
        }, 5)
        return metadata
      })
    }

    runEventOrder1()
    run1()
      .then(() => {
        runEventOrder2()
        run2()
      })
  })
})

