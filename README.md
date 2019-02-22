![build status](https://travis-ci.com/dustin71728/event-sequence-listener.svg?branch=master)

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
  const eventSequence = new EventequenceListener(
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

Check out the unit test files to learn how to use this module:
[examples](/src/EventSequenceListener/__test__/EventSequenceListener.spec.ts)

## Type Docs

For more detail information, read the following link:
https://dustin71728.github.io/event-sequence-listener/
