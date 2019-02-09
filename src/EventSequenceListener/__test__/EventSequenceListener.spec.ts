import EventSequenceListener from '../EventSequenceListener'
import should from 'should'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface NodeJSEmitter extends NodeJS.EventEmitter {
  trigger(name: string): void
}

interface WebEmitter extends EventTarget {
  trigger(name: string): void
}

interface EmitterConstructor {
  new(): NodeJSEmitter | WebEmitter
}

export default function runTest(eventEmitter: EmitterConstructor) {

  describe('EventSequenceListener', () => {
    it('should accept an array and emitConfig', (done) => {
      const listener = new eventEmitter()
      new EventSequenceListener(['event1', 'event2'], {
        cb: function (metadata) {
          done()
        },
        threshold: 1,
        listener
      })

      async function run() {
        await sleep(5)
        listener.trigger('event1')
        await sleep(10)
        listener.trigger('event2')
      }
      run()
    })

    it('should receive custom data attribute in listener', (done) => {
      const listener = new eventEmitter()
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
          listener
        })

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(2)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event3')
      }
      run()
    })

    it('should call intermediate callbacks and get modified data', (done) => {
      const listener = new eventEmitter()
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
          listener
        })

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(2)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event3')
      }
      run()
    })

    it('should detach all the event listeners after receiving the event sequence', (done) => {
      let resolvedPromiseNumber = 0
      const listener = new eventEmitter()
      const eventSequence = new EventSequenceListener(
        ['event1', 'event2', 'event3'],
        {
          listener,
          threshold: 2,
          scheduleType: 'once'
        }
      )

      function run() {
        for (let i = 0; i < 4; ++i) {
          listener.trigger('event1')
          listener.trigger('event2')
          listener.trigger('event3')
        }
      }

      run()

      for (let i = 0; i < 4; ++i) {
        eventSequence.promise.then(() => {
          resolvedPromiseNumber++
        })
      }

      setTimeout(() => {
        should(resolvedPromiseNumber).be.equal(1)
        done()
      }, 50)
    })

    it('should enter callback when the triggered times of the event reaches the threshold', (done) => {
      const listener = new eventEmitter()
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
          listener
        })

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(2)
        listener.trigger('event1')
        await sleep(2)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event1')
        await sleep(2)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event3')
      }
      run()
    })

    it('should retrieve the delay value that is as close as the real delay time', (done) => {
      const listener = new eventEmitter()
      new EventSequenceListener(
        [
          'event1',
          {
            name: 'event2',
            cb: function (metadata) {
              should(metadata[0].delay).be.greaterThanOrEqual(9)
              should(metadata[0].delay).be.lessThanOrEqual(13)
            },
          },
          'event3'
        ],
        {
          cb: function (metadata) {
            should(metadata[0].delay).be.greaterThanOrEqual(4)
            should(metadata[0].delay).be.lessThanOrEqual(7)
            done()
          },
          listener
        })

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(10)
        listener.trigger('event2')
        await sleep(5)
        listener.trigger('event3')
      }
      run()
    })

    it('should have expected metadata values', (done) => {
      const listener = new eventEmitter()
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
          listener
        })

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(10)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event4')
        await sleep(5)
        listener.trigger('event3')
        await sleep(3)
        listener.trigger('event4')
      }
      run()
    })

    it('should regarded final event callback as the end of event callback when listener config is absent', (done) => {
      const listener = new eventEmitter()
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
        { listener })

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(10)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event4')
        await sleep(5)
        listener.trigger('event3')
        await sleep(3)
        listener.trigger('event4')
      }
      run()
    })

    it('should cancel EventSequenceListener successfully', (done) => {
      const listener = new eventEmitter()
      const eventOrder = new EventSequenceListener(
        ['event1', 'event2', 'event3'],
        { listener }
      )

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(10)
        listener.trigger('event2')
        await sleep(3)
        eventOrder.cancel()
      }

      eventOrder.promise.catch(e => {
        should(e.message).be.equal(EventSequenceListener.cancelSchedule)
        done()
      })

      run()
    })

    it('should resolve promise successfully', (done) => {
      const listener = new eventEmitter()
      const eventOrder = new EventSequenceListener(
        ['event1', 'event2', 'event3', 'event4'],
        { listener }
      )

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(10)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event4')
        await sleep(3)
        listener.trigger('event3')
        await sleep(3)
        listener.trigger('event4')
        await sleep(3)
      }

      eventOrder.promise.then(metadata => {
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
      const listener = new eventEmitter()
      const repeatTimes = 4
      const eventOrder = new EventSequenceListener(
        ['event1', 'event2', 'event3'],
        { listener, scheduleType: 'repeat' }
      )

      async function run() {
        for (let i = 0; i < repeatTimes; ++i) {
          await sleep(1)
          listener.trigger('event1')
          await sleep(10)
          listener.trigger('event2')
          await sleep(3)
          listener.trigger('event4')
          await sleep(3)
          listener.trigger('event3')
          await sleep(5)
        }
      }

      let resolveTimes = 0
      function resolvePromise() {
        eventOrder.promise.then(metadata => {
          should(metadata[0].instance).be.instanceOf(EventSequenceListener)
          should(metadata[0].isLastEvent).be.true()
          should(metadata[0].isEnd).be.true()
          should(metadata[0].delay).be.greaterThanOrEqual(5)
          should(metadata[0].delay).be.lessThanOrEqual(12)
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
          .catch(e => {
            console.error(e)
          })
      }

      resolvePromise()
      run()
    })

    it('should resolve multiple raced event sequences successfully', (done) => {
      let firstSequenceExecuted = false

      const listener = new eventEmitter()
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
          listener,
          unionScheduleType: 'race',
          initData: {
            event3TriggerTimes: 0
          }
        }
      )

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(3)
        listener.trigger('event4')
        await sleep(3)
        listener.trigger('event5')
        await sleep(5)
        listener.trigger('event3')
        await sleep(3)
        listener.trigger('event2')
        await sleep(5)
        listener.trigger('event5')
        await sleep(5)
        listener.trigger('event3')
        await sleep(3)
      }

      eventOrder.promise.then(metadata => {
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

      const listener = new eventEmitter()
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
          listener,
          unionScheduleType: 'race',
          initData: {
            firstSequence: false,
            secondSequence: false
          }
        }
      )

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(3)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event5')
        await sleep(5)
        listener.trigger('event3')
        await sleep(3)
        listener.trigger('event4')
      }

      eventOrder.promise.then(metadata => {
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

      const listener = new eventEmitter()
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
          listener,
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
        listener.trigger('event1')
        await sleep(3)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event5')
        await sleep(5)
        listener.trigger('event3')
        await sleep(3)
        listener.trigger('event4')
      }

      async function run2() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(3)
        listener.trigger('event3')
        await sleep(3)
        listener.trigger('event1')
        await sleep(5)
        listener.trigger('event2')
        await sleep(3)
        listener.trigger('event4')
        await sleep(3)
        listener.trigger('event3')
      }

      function runEventOrder1() {
        eventOrder.promise.then(metadata => {
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
        return eventOrder.promise.then(metadata => {
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

    it('should never resolve any event sequence because the threshold is never satisfied', (done) => {
      const listener = new eventEmitter()
      let isResolved = false

      const eventSequence = new EventSequenceListener(
        [
          ['event1', 'event2', 'event3'],
          ['event2', 'event4', 'event5']
        ], {
          threshold: 2,
          listener
        }
      )

      async function run() {
        listener.trigger('event1')
        listener.trigger('event2')
        listener.trigger('event3')
        listener.trigger('event4')
        listener.trigger('event5')
        listener.trigger('event1')
        listener.trigger('event2')
        listener.trigger('event4')
      }

      eventSequence.promise.then(() => {
        isResolved = true
      })


      run()

      setTimeout(() => {
        should(isResolved).be.false()
        done()
      }, 50)
    })
  })
}


