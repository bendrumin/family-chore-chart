fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Android

### android bundle

```sh
[bundle exec] fastlane android bundle
```

Build the signed release bundle. JDK 21: the default JDK breaks Gradle's Kotlin DSL.

### android internal

```sh
[bundle exec] fastlane android internal
```

Upload the bundle to a track. Draft unless rollout:true.

### android metadata

```sh
[bundle exec] fastlane android metadata
```

Listing text and graphics, no binary.

### android promote

```sh
[bundle exec] fastlane android promote
```

Move a release from one track to another, e.g. from:internal to:production.

### android state

```sh
[bundle exec] fastlane android state
```

What is on each track (uses the node script, which prints more than supply does).

### android validate

```sh
[bundle exec] fastlane android validate
```

Dry run: check the listing and key against Play without writing anything.

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
