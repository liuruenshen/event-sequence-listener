import * as eventEmitter from 'events'
import * as should from 'should'
import { EventOrder } from './EventOrder'
import { emit } from 'cluster'

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('EventOrder', () => {
  it('should accept an array and emitConfig', (done) => {
    const emitter = new eventEmitter()
    new EventOrder(['event1', 'event2'], {
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
    new EventOrder(
      [
        {
          name: 'event1',
          initData: {
            test: 0
          },
          threshold: 1
        },
        'event2',
        'event3'
      ],
      {
        cb: function (metadata, payload) {
          should(metadata).be.a.Object()
          should(metadata.data).be.a.Object()
          should(metadata.data.test).be.a.Number()
          done()
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
    new EventOrder(
      [
        {
          name: 'event1',
          initData: {
            test: 0
          },
        },
        {
          name: 'event2',
          cb: function (metadata) {
            should(metadata).be.a.Object()
            should(metadata.data).be.a.Object()
            should(metadata.data.test).be.a.Number()
            metadata.data.test++
            return metadata.data
          }
        },
        'event3'
      ],
      {
        cb: function (metadata) {
          should(metadata).be.a.Object()
          should(metadata.data).be.a.Object()
          should(metadata.data.test).be.a.Number()
          should(metadata.data.test).be.equal(1)
          done()
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
    new EventOrder(
      [
        {
          name: 'event1',
          initData: {
            count: 0
          },
          threshold: 2,
          cb: function (metadata) {
            metadata.data.count++
            return metadata.data
          }
        },
        {
          name: 'event2',
          threshold: 3,
          cb: function (metadata) {
            metadata.data.count++
            return metadata.data
          },
        },
        'event3'
      ],
      {
        cb: function (metadata) {
          should(metadata.data.count).be.equal(2)
          done()
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
    new EventOrder(
      [
        'event1',
        {
          name: 'event2',
          cb: function (metadata) {
            should(metadata.delay).be.greaterThanOrEqual(10)
            should(metadata.delay).be.lessThanOrEqual(11)
          },
        },
        'event3'
      ],
      {
        cb: function (metadata) {
          should(metadata.delay).be.greaterThanOrEqual(5)
          should(metadata.delay).be.lessThanOrEqual(6)
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
    new EventOrder(
      [
        {
          name: 'event1',
          cb: function (metadata) {
            should(metadata.eventOrderInstance).be.instanceOf(EventOrder)
            should(metadata.isLastEvent).be.false()
            should(metadata.isEnd).be.false()
            should(metadata.passEvents).be.Array()
            should(metadata.passEvents.length).be.equal(1)
            should(metadata.passEvents[0]).be.equal('event1')
          }
        },
        {
          name: 'event2',
          cb: function (metadata) {
            should(metadata.eventOrderInstance).be.instanceOf(EventOrder)
            should(metadata.isLastEvent).be.false()
            should(metadata.isEnd).be.false()
            should(metadata.passEvents).be.Array()
            should(metadata.passEvents.length).be.equal(2)
            should(metadata.passEvents[0]).be.equal('event1')
            should(metadata.passEvents[1]).be.equal('event2')
          }
        },
        {
          name: 'event3',
          cb: function (metadata) {
            should(metadata.eventOrderInstance).be.instanceOf(EventOrder)
            should(metadata.isLastEvent).be.false()
            should(metadata.isEnd).be.false()
            should(metadata.passEvents).be.Array()
            should(metadata.passEvents.length).be.equal(3)
            should(metadata.passEvents[0]).be.equal('event1')
            should(metadata.passEvents[1]).be.equal('event2')
            should(metadata.passEvents[2]).be.equal('event3')
          }
        },
        {
          name: 'event4',
          cb: function (metadata) {
            should(metadata.eventOrderInstance).be.instanceOf(EventOrder)
            should(metadata.isLastEvent).be.true()
            should(metadata.isEnd).be.false()
            should(metadata.passEvents).be.Array()
            should(metadata.passEvents.length).be.equal(4)
            should(metadata.passEvents[0]).be.equal('event1')
            should(metadata.passEvents[1]).be.equal('event2')
            should(metadata.passEvents[2]).be.equal('event3')
            should(metadata.passEvents[3]).be.equal('event4')
          }
        }
      ],
      {
        cb: function (metadata) {
          should(metadata.eventOrderInstance).be.instanceOf(EventOrder)
          should(metadata.isLastEvent).be.true()
          should(metadata.isEnd).be.true()
          should(metadata.passEvents).be.Array()
          should(metadata.passEvents.length).be.equal(4)
          should(metadata.passEvents[0]).be.equal('event1')
          should(metadata.passEvents[1]).be.equal('event2')
          should(metadata.passEvents[2]).be.equal('event3')
          should(metadata.passEvents[3]).be.equal('event4')
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
    new EventOrder(
      [
        'event1', 'event2', 'event3',
        {
          name: 'event4',
          cb: function (metadata) {
            should(metadata.isEnd).be.true()
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
})
