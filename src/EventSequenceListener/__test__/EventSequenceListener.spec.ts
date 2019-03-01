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

    it('should return predecessor\'s data if the calling callback does not return truthy value', async () => {
      const listener = new eventEmitter()
      const eventSequenceListener = new EventSequenceListener(
        [
          {
            name: 'event1',
            cb(metadata) {
              return {
                test: true
              }
            }
          },
          {
            name: 'event2',
            cb() { }
          },
          'event3'
        ],
        {
          cb() { },
          listener
        })

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(1)
        listener.trigger('event2')
        await sleep(1)
        listener.trigger('event3')
      }
      run()

      const result = await eventSequenceListener.promise
      should(result[0].data.test).be.true()
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
              should(metadata[0].delay).be.lessThanOrEqual(20)
            },
          },
          'event3'
        ],
        {
          cb: function (metadata) {
            should(metadata[0].delay).be.greaterThanOrEqual(4)
            should(metadata[0].delay).be.lessThanOrEqual(10)
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

    it('should return first resolved event sequence in raced schedule type repeatedly', async () => {
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

      async function runEventOrder1() {
        const metadata = await eventOrder.promise

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

        return new Promise(resolve => {
          setTimeout(() => {
            should(metadata[0].data.secondSequence).be.false()
            resolve()
          }, 5)
        })
      }

      async function runEventOrder2() {
        const metadata = await eventOrder.promise

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

        return new Promise(resolve => {
          setTimeout(() => {
            should(metadata[0].data.firstSequence).be.false()
            resolve()
          }, 5)
        })
      }

      runEventOrder1()
      await run1()
      runEventOrder2()
      await run2()
      runEventOrder1()
      await run1()
      const result = runEventOrder2()
      await run2()
      return await result
    })

    it('should be able to share data among the event sequences', async () => {
      const listener = new eventEmitter()
      const eventOrder = new EventSequenceListener(
        [
          ['event1', 'event2', 'event3'],
          ['event1', 'event2', 'event4']
        ],
        {
          listener,
          unionScheduleType: 'race',
          scheduleType: 'repeat',
          cb(metadata) {
            const data = metadata[0].data
            if (metadata[0].passEvents.join(' ') === 'event1 event2 event3') {
              data.firstEventPassed = true
            }
            else if (data.firstEventPassed && metadata[0].passEvents.join(' ') === 'event1 event2 event4') {
              data.secondEventPassed = true
            }

            return data
          },
          initData: {
            firstEventPassed: false,
            secondEventPassed: false
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

      async function runEventOrder1() {
        const metadata = await eventOrder.promise

        should(metadata[0].data.firstEventPassed).be.true()
        should(metadata[0].data.secondEventPassed).be.false()
      }

      async function runEventOrder2() {
        const metadata = await eventOrder.promise

        should(metadata[0].data.firstEventPassed).be.true()
        should(metadata[0].data.secondEventPassed).be.true()
      }

      runEventOrder1()
      await run1()
      const result = runEventOrder2()
      await run2()

      return await result
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

    it('should return all the resolved event sequences', async () => {
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
            'event2',
            {
              name: 'event4',
              cb: function (metadata) {
                const data = { ...metadata[0].data }
                data.secondSequence = true
                return data
              }
            },
            'event6'
          ]
        ],
        {
          listener,
          unionScheduleType: 'all',
          initData: {
            firstSequence: false,
            secondSequence: false
          }
        }
      )

      async function run() {
        await sleep(5)
        listener.trigger('event1')
        await sleep(5)
        listener.trigger('event2')
        await sleep(5)
        listener.trigger('event4')
        await sleep(5)
        listener.trigger('event3')
        await sleep(5)
        listener.trigger('event6')
      }

      run()

      const metadata = await eventOrder.promise

      should(metadata[0].instance).be.instanceOf(EventSequenceListener)
      should(metadata[0].isLastEvent).be.true()
      should(metadata[0].isEnd).be.true()
      should(metadata[0].passEvents).be.Array()
      should(metadata[0].passEvents.length).be.equal(3)
      should(metadata[0].passEvents[0]).be.equal('event1')
      should(metadata[0].passEvents[1]).be.equal('event2')
      should(metadata[0].passEvents[2]).be.equal('event3')
      should(metadata[0].data.firstSequence).be.true()

      should(metadata[1].instance).be.instanceOf(EventSequenceListener)
      should(metadata[1].isLastEvent).be.true()
      should(metadata[1].isEnd).be.true()
      should(metadata[1].passEvents).be.Array()
      should(metadata[1].passEvents.length).be.equal(3)
      should(metadata[1].passEvents[0]).be.equal('event2')
      should(metadata[1].passEvents[1]).be.equal('event4')
      should(metadata[1].passEvents[2]).be.equal('event6')
      should(metadata[1].data.secondSequence).be.true()
      should(metadata[1].lastExeTimestamp).be.greaterThanOrEqual(metadata[0].lastExeTimestamp)
    })

    it('should resolve all the event sequences with the specified threshold values', async () => {
      const listener = new eventEmitter()
      const eventOrder = new EventSequenceListener(
        [
          [
            {
              name: 'event1',
              threshold: 3,
              cb: function (metadata) {
                const data = { ...metadata[0].data }
                data.event1Times++
                return data
              }
            },
            {
              name: 'event2',
              threshold: 4,
              cb: function (metadata) {
                const data = { ...metadata[0].data }
                data.event2Times++
                return data
              }
            },
            {
              name: 'event3',
              cb: function (metadata) {
                const data = { ...metadata[0].data }
                data.firstSequence = true
                data.endTimestamp = Date.now()
                return data
              }
            }
          ],
          [
            {
              name: 'event1',
              threshold: 2,
              cb: function (metadata) {
                const data = { ...metadata[0].data }
                data.event1Times++
                return data
              }
            },
            {
              name: 'event2',
              threshold: 6,
              cb: function (metadata) {
                const data = { ...metadata[0].data }
                data.event2Times++
                return data
              }
            },
            {
              name: 'event4',
              cb: function (metadata) {
                const data = { ...metadata[0].data }
                data.secondSequence = true
                data.endTimestamp = Date.now()
                return data
              }
            }
          ]
        ],
        {
          listener,
          unionScheduleType: 'all',
          initData: {
            event1Times: 0,
            event2Times: 0,
            firstSequence: false,
            secondSequence: false,
            endTimestamp: 0
          }
        }
      )

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(1)
        listener.trigger('event1')
        await sleep(1)
        listener.trigger('event2')
        await sleep(1)
        listener.trigger('event1')
        await sleep(1)
        listener.trigger('event2')
        await sleep(1)
        listener.trigger('event2')
        await sleep(1)
        listener.trigger('event3')
        await sleep(1)
        listener.trigger('event2')
        await sleep(1)
        listener.trigger('event2')
        await sleep(1)
        listener.trigger('event2')
        await sleep(1)
        listener.trigger('event4')
        await sleep(1)
        listener.trigger('event3')
      }

      run()

      const metadata = await eventOrder.promise

      should(metadata[0].instance).be.instanceOf(EventSequenceListener)
      should(metadata[0].isLastEvent).be.true()
      should(metadata[0].isEnd).be.true()
      should(metadata[0].passEvents).be.Array()
      should(metadata[0].passEvents.length).be.equal(3)
      should(metadata[0].passEvents[0]).be.equal('event1')
      should(metadata[0].passEvents[1]).be.equal('event2')
      should(metadata[0].passEvents[2]).be.equal('event3')
      should(metadata[0].data.firstSequence).be.true()
      should(metadata[0].data.secondSequence).be.false()
      should(metadata[0].data.event1Times).be.equal(1)
      should(metadata[0].data.event2Times).be.equal(1)

      should(metadata[1].instance).be.instanceOf(EventSequenceListener)
      should(metadata[1].isLastEvent).be.true()
      should(metadata[1].isEnd).be.true()
      should(metadata[1].passEvents).be.Array()
      should(metadata[1].passEvents.length).be.equal(3)
      should(metadata[1].passEvents[0]).be.equal('event1')
      should(metadata[1].passEvents[1]).be.equal('event2')
      should(metadata[1].passEvents[2]).be.equal('event4')
      should(metadata[1].data.firstSequence).be.false()
      should(metadata[1].data.secondSequence).be.true()
      should(metadata[1].data.event1Times).be.equal(1)
      should(metadata[1].data.event2Times).be.equal(1)

      should(metadata[1].data.endTimestamp).be.lessThanOrEqual(metadata[0].data.endTimestamp)
      should(metadata[1].lastExeTimestamp).be.greaterThanOrEqual(metadata[0].lastExeTimestamp)
    })

    /**
     * it will failed if the following commit are reverted:
     *
     * 7ca889e refactor: check if generator is closed before throwing an exception
     */
    it('should resolve raced event sequences without any unhandled rejection', async () => {
      const listener = new eventEmitter()
      const eventOrder = new EventSequenceListener(
        [
          ['event1', 'event2', 'event3', 'event4'],
          ['event2', 'event3', 'event4'],
          ['event3', 'event4']
        ],
        {
          listener,
          unionScheduleType: 'race',
        }
      )

      async function run() {
        await sleep(1)
        listener.trigger('event1')
        await sleep(1)
        listener.trigger('event2')
        await sleep(1)
        listener.trigger('event3')
        await sleep(1)
        listener.trigger('event4')
      }

      run()

      const metadata = await eventOrder.promise

      should(metadata[0].instance).be.instanceOf(EventSequenceListener)
      should(metadata[0].isLastEvent).be.true()
      should(metadata[0].isEnd).be.true()
      should(metadata[0].passEvents).be.Array()
      should(metadata[0].passEvents.length).be.equal(4)
      should(metadata[0].passEvents[0]).be.equal('event1')
      should(metadata[0].passEvents[1]).be.equal('event2')
      should(metadata[0].passEvents[2]).be.equal('event3')
      should(metadata[0].passEvents[3]).be.equal('event4')
    })

    it('should discard promises when the promise store is full', async function () {
      this.timeout(3000)

      const listener = new eventEmitter()
      const eventOrder = new EventSequenceListener(
        ['event1', 'event2', 'event3'],
        {
          listener,
          scheduleType: 'repeat',
          promiseQueueMax: 100
        }
      )

      async function run() {
        const overMaxQueue = eventOrder.publicPromiseQueueMax + 100
        for (let i = 0; i < overMaxQueue; ++i) {
          listener.trigger('event1')
          listener.trigger('event2')
          listener.trigger('event3')
          await sleep(1)
        }
      }

      await run()

      let promiseNumber = 0
      let timeoutId: any = 0
      let lcResolve: () => void
      const promise = new Promise<void>((resolve) => {
        lcResolve = resolve
      })

      function calculatePromiseNumber() {
        timeoutId = setTimeout(() => {
          should(promiseNumber).be.equal(eventOrder.publicPromiseQueueMax)
          lcResolve()
        }, 50)

        eventOrder.promise.then(() => {
          if (timeoutId) {
            clearTimeout(timeoutId)
          }

          promiseNumber++
          calculatePromiseNumber()
        })
      }

      calculatePromiseNumber()

      return promise
    })
  })
}


