# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="0.5.1"></a>
## [0.5.1](https://github.com/dustin71728/event-sequence-listener/compare/v0.5.0...v0.5.1) (2019-03-05)


### Bug Fixes

* call cancel when the promise is still pending ([282cd35](https://github.com/dustin71728/event-sequence-listener/commit/282cd35))



<a name="0.5.0"></a>
# [0.5.0](https://github.com/dustin71728/event-sequence-listener/compare/v0.4.0...v0.5.0) (2019-03-02)


### Bug Fixes

* carry either truthy value of the callback or predecessor's data ([f97d368](https://github.com/dustin71728/event-sequence-listener/commit/f97d368))


### Features

* expose publicPromiseQueueMax getter ([4847043](https://github.com/dustin71728/event-sequence-listener/commit/4847043))
* restirct promise store maximum length ([fc58b5b](https://github.com/dustin71728/event-sequence-listener/commit/fc58b5b))



<a name="0.4.0"></a>
# [0.4.0](https://github.com/dustin71728/event-sequence-listener/compare/v0.3.7...v0.4.0) (2019-02-26)


### Bug Fixes

* control single event sequence in the isolated promise ([8cad808](https://github.com/dustin71728/event-sequence-listener/commit/8cad808))


### Features

* recevie return value from last callback and pass to promise ([34e2aa6](https://github.com/dustin71728/event-sequence-listener/commit/34e2aa6))



<a name="0.3.7"></a>
## [0.3.7](https://github.com/dustin71728/event-sequence-listener/compare/v0.3.6...v0.3.7) (2019-02-22)



<a name="0.3.6"></a>
## [0.3.6](https://github.com/dustin71728/event-sequence-listener/compare/v0.3.5...v0.3.6) (2019-02-21)


### Bug Fixes

* correct import statement ([6d0531b](https://github.com/dustin71728/event-sequence-listener/commit/6d0531b))



<a name="0.3.5"></a>
## [0.3.5](https://github.com/dustin71728/event-sequence-listener/compare/v0.3.4...v0.3.5) (2019-02-21)



<a name="0.3.4"></a>
## [0.3.4](https://github.com/dustin71728/event-sequence-listener/compare/v0.3.3...v0.3.4) (2019-02-21)



<a name="0.3.3"></a>
## [0.3.3](https://github.com/dustin71728/event-sequence-listener/compare/v0.3.2...v0.3.3) (2019-02-21)



<a name="0.3.2"></a>
## [0.3.2](https://github.com/dustin71728/event-sequence-listener/compare/v0.3.1...v0.3.2) (2019-02-10)



<a name="0.3.1"></a>
## [0.3.1](https://github.com/dustin71728/event-sequence-listener/compare/v0.3.0...v0.3.1) (2019-02-10)



<a name="0.3.0"></a>
# [0.3.0](https://github.com/dustin71728/event-sequence-listener/compare/v0.2.1...v0.3.0) (2019-02-09)


### Features

* implement schedule type "all" for multiple event sequences ([b304b74](https://github.com/dustin71728/event-sequence-listener/commit/b304b74))



<a name="0.2.1"></a>
## [0.2.1](https://github.com/dustin71728/event-sequence-listener/compare/v0.2.0...v0.2.1) (2019-02-09)



<a name="0.2.0"></a>
# [0.2.0](https://github.com/dustin71728/event-sequence-listener/compare/v0.1.1...v0.2.0) (2019-02-09)


### Bug Fixes

* resolve promise when reaching the sequence threshold ([9e4205f](https://github.com/dustin71728/event-sequence-listener/commit/9e4205f))


### Features

* expose promise getter instead of getPromise method ([c56935a](https://github.com/dustin71728/event-sequence-listener/commit/c56935a))



<a name="0.1.1"></a>
## [0.1.1](https://github.com/dustin71728/event-sequence-listener/compare/v0.1.0...v0.1.1) (2019-02-09)



<a name="0.1.0"></a>
# [0.1.0](https://github.com/dustin71728/event-sequence-listener/compare/v0.0.4...v0.1.0) (2019-02-08)


### Features

* rename emitter to listener to match the meaning ([58e9ed8](https://github.com/dustin71728/event-sequence-listener/commit/58e9ed8))



<a name="0.0.4"></a>
## [0.0.4](https://github.com/dustin71728/event-sequence-listener/compare/v0.0.3...v0.0.4) (2019-02-08)



<a name="0.0.3"></a>
## 0.0.3 (2019-02-08)


### Bug Fixes

* check out to the target branch before updating the version ([43e48fd](https://github.com/dustin71728/event-sequence-listener/commit/43e48fd))
* fix up `onlyEnd` schedule type ([0297e88](https://github.com/dustin71728/event-sequence-listener/commit/0297e88))
* guarantee "getPromise" always return a pending promise ([50c534c](https://github.com/dustin71728/event-sequence-listener/commit/50c534c))
* remove promise wrapper when calling getPromise ([59f6736](https://github.com/dustin71728/event-sequence-listener/commit/59f6736))
* stay consistent in naming things ([36a3387](https://github.com/dustin71728/event-sequence-listener/commit/36a3387))



<a name="0.0.2"></a>
## 0.0.2 (2019-02-08)


### Bug Fixes

* check out to the target branch before updating the version ([43e48fd](https://github.com/dustin71728/event-sequence-listener/commit/43e48fd))
* fix up `onlyEnd` schedule type ([0297e88](https://github.com/dustin71728/event-sequence-listener/commit/0297e88))
* guarantee "getPromise" always return a pending promise ([50c534c](https://github.com/dustin71728/event-sequence-listener/commit/50c534c))
* remove promise wrapper when calling getPromise ([59f6736](https://github.com/dustin71728/event-sequence-listener/commit/59f6736))
* stay consistent in naming things ([36a3387](https://github.com/dustin71728/event-sequence-listener/commit/36a3387))



<a name="0.0.1"></a>
## 0.0.1 (2019-02-08)


### Bug Fixes

* check out to the target branch before updating the version ([43e48fd](https://github.com/dustin71728/event-sequence-listener/commit/43e48fd))
* fix up `onlyEnd` schedule type ([0297e88](https://github.com/dustin71728/event-sequence-listener/commit/0297e88))
* guarantee "getPromise" always return a pending promise ([50c534c](https://github.com/dustin71728/event-sequence-listener/commit/50c534c))
* remove promise wrapper when calling getPromise ([59f6736](https://github.com/dustin71728/event-sequence-listener/commit/59f6736))
* stay consistent in naming things ([36a3387](https://github.com/dustin71728/event-sequence-listener/commit/36a3387))



<a name="0.0.0"></a>
# 0.0.0 (2019-02-08)


### Bug Fixes

* fix up `onlyEnd` schedule type ([0297e88](https://github.com/dustin71728/event-sequence-listener/commit/0297e88))
* guarantee "getPromise" always return a pending promise ([50c534c](https://github.com/dustin71728/event-sequence-listener/commit/50c534c))
* remove promise wrapper when calling getPromise ([59f6736](https://github.com/dustin71728/event-sequence-listener/commit/59f6736))
* stay consistent in naming things ([36a3387](https://github.com/dustin71728/event-sequence-listener/commit/36a3387))
