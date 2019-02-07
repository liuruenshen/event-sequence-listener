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
    emitter: video,
    scheduleType: 'repeat'
  }
})

function run() {
  eventSequence.getPromise().then(resolvedData => {
    // respond to loadedmetadata->play->pause
    // ...
    // Wait next sequence arrived
    run()
  })
}

run()
```

