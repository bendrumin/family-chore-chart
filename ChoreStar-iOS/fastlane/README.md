fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios pull

```sh
[bundle exec] fastlane ios pull
```

Download the CURRENTLY LIVE metadata and screenshots from App Store Connect.

Run this before your first upload, then `git diff` to see where local text has drifted.

### ios stage_screenshots

```sh
[bundle exec] fastlane ios stage_screenshots
```

Copy captured screenshots into the flat layout deliver expects.

### ios check

```sh
[bundle exec] fastlane ios check
```

Scan the metadata for common App Store rejection reasons before submitting.

### ios metadata

```sh
[bundle exec] fastlane ios metadata
```

Upload metadata (and staged screenshots) to App Store Connect. No binary.

Options: overwrite:true replaces ALL screenshots; force:true skips the HTML preview.

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
