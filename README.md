![build status](https://img.shields.io/travis/dustin71728/event-sequence-listener.svg?style=for-the-badge)
![npm version](https://img.shields.io/npm/v/event-sequence-listener.svg?style=for-the-badge)
![dependencies](https://img.shields.io/david/dustin71728/event-sequence-listener.svg?style=for-the-badge)
![bundle size](https://img.shields.io/bundlephobia/min/event-sequence-listener.svg?style=for-the-badge)

## Purpose

When it comes to reacting with a series of events, you may want to try this:

```javascript

video.on('loadedmetadata',function () {
  video.on('play', function() {
    video.on('pause', function() {
      // respond to loadedmetadata->play->pause
      // ...
    })
  })
})
```

The solution may issue undesired behavior because the play & pause event listeners are attached latter rather than the first stage,
it may accidentally change the callback calling order which arranges carefully; increases the difficulty to debug & trace.

Or you may want to flat the codes by using a lot of flags:

```javascript

let isLoadedmetadata = false
let isPlay = false

video.on('loadedmetadata',function () {
 isLoadedmetadata = true
})

video.on('play', function() {
  if(isLoadedmetadata) {
    isPlay = true
  }
})

video.on('pause', function() {
  if(isPlay) {
      // respond to loadedmetadata->play->pause
      // ...
    }
})

```


As you can see, it doesn't better than the first solution; it is annoyed to manage the tons of flags; also increase the complexity and not easy to understand the codes.

## Benefit
By using the tool, you can listen to the sequence of events in a beautiful way:

```javascript

import EventSequenceListener from 'event-sequence-listener'

const eventSequence = new EventequenceListener(
  ['loadedmetadata', 'play', 'pause'],
  {
    listener: video,
    scheduleType: 'repeat'
  }
})

function run() {
  eventSequence.promise.then(resolvedData => {
    // respond to loadedmetadata->play->pause
    // ...
    // Wait next sequence arrived
    run()
  })
}

run()
```
Watch more than one event sequences and get the result as soon as one of them get fulfilled or rejected.

```javascript

async eventSequenceRace() {
  const eventSequence = new EventequenceListener(
    [
      ['loadedmetadata', 'pause', 'play'],
      ['loadedmetadata', 'play'],
    ]
    {
      listener: video,
      unionScheduleType: 'race'
    }
  })

  const resolvedData = await eventSequence.promise
  // The value depends on which event sequences finished first
  console.log(resolvedData[0].passEvents)
}

```

If the event sequence is the right-most subset of other event sequences, make sure the longer event sequence put in front of the short one when there is a raced condition:

```javascript

async eventSequenceRace() {
  const eventSequence = new EventSequenceListener(
    [
      ['enter-vod', 'loadedmetadata', 'play'],
      ['loadedmetadata', 'play']
    ]
    {
      listener: video,
      unionScheduleType: 'race',
      scheduleType: 'repeat'
    }
  })

  while(true) {
    const [ result ] = await eventSequence.promise
    console.log(result)
  }
}

```
## Feature

#### define a callback for each event

The listened event can be a string or object, and the object can be assigned a function to `cb` property, which calls whenever the event gets triggered.

The callback `cb` defined in the second parameter gets executed when the event sequence is complete.

```javascript
  const eventSequence = new EventSequenceListener(
    [
      'event1',
      {
        name: 'event2',
        // optional property
        cb(metadata) {}
      }
    ]
    {
      // required property
      listener: eventTarget,
      // ended callback, optional property
      cb(metadata) {}
    }
  })
```

#### setup custom data

You can customize the data that passed to each event callback, and the data can be updated by returning it from the callback. The successor will receive last updated data.

If `cb` doesn't return truthy value, the predecessor's data will pass to the next event callback.

Also ended callback can return modified data; the promise retrieved by `promise` getter will resolve the data passed from the first event `cb` callback down to the ended callback.

```javascript
  const eventSequence = new EventSequenceListener(
    [
      'event1',
      {
        name: 'event2',
        cb(metadata) {
          const data = metadata[0].data
          data.count++
          return data
        }
      }
    ]
    {
      listener: eventTarget,
      cb(metadata) {
          const data = metadata[0].data
          data.count++
          return data
      },
      // optional property
      initData: {
        count: 0
      }
    }
  })

  eventSequence.promise.then(metadata => {
    console.log(metadata[0].data.count) // print 2
  })
```

#### get the arguments passed to each event listener
All the arguments passed to each event listener will be available by accessing `eventListenerArgs` property.
If the event is specified the threshold number,  all the arguments of events before the final one will ignore.

```javascript
  const eventSequenceListener = new EventSequenceListener(
    [
      'event1',
      {
        name: 'event2',
        cb(metadata) {
          console.log(metadata[0].eventListenerArgs)
        }
      },
      'event3'
    ],
    {
      listener,
      scheduleType: 'repeat',
      cb(metadata) {
        console.log(metadata[0].eventListenerArgs)
      }
    }
  )

  const result = await eventSequenceListener.promise
  console.log(result[0].eventListenerArgs)
```

#### Monitor more than one event sequences

For example, we have to do something after a pause event happened but only if at least one play event happened before the pause event, we can try this:

```javascript
  const eventSequence = new EventSequenceListener(
    [
      ['play','pause'],
      ['pause']
    ]
    {
      listener: video,
      unionScheduleType: 'race',
      scheduleType: 'repeat'
    }
  })

  while (true) {
    const [result] = await eventSequence.promise
    if (result.passEvents[0] === 'play') {
      break
    }
  }

  // Now we can do what we want because the play event has happened
  do {
    //...
  } while (true)
```

Or you can wait for all the event sequence:

```javascript
  const eventSequence = new EventSequenceListener(
    [
      ['play','pause'],
      ['seeking', 'seeked']
    ]
    {
      listener: video,
      unionScheduleType: 'all',
      scheduleType: 'repeat'
    }
  })

  while (true) {
    const [firstEventSeqResult, secondEventSeqResult] = await eventSequence.promise
    //...
  }
```

Check out the unit test files to learn how to use this module:
[examples](/src/EventSequenceListener/__test__/EventSequenceListener.spec.ts)

## Type Docs

For more detail information, read the following link:
https://dustin71728.github.io/event-sequence-listener/

## Fixed Bugs

2019-03-05

Fix the issue that may throw unhandled rejection when specifying the configurations:

```javascript
{
  unionScheduleType: 'race',
  scheduleType: 'repeat'
}
```
