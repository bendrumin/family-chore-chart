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

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Capture RAW App Store screenshots on every device in the Snapfile.

Drives ChoreStarUITests/ScreenshotTests against The Star Family (the

seeded screenshot account); output lands in appstore-screenshots/raw/.

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

### ios testflight_link

```sh
[bundle exec] fastlane ios testflight_link
```

Report the TestFlight beta groups and any public (open) join link.

### ios beta_review_status

```sh
[bundle exec] fastlane ios beta_review_status
```

Show what Beta App Review still needs before an external build can ship:

reviewer contact details, the app-level description, and What to Test.

### ios beta_test_info

```sh
[bundle exec] fastlane ios beta_test_info
```

Fill in the tester-facing TestFlight text: the app-level beta description

and the newest build's What to Test.

e.g. fastlane ios beta_test_info feedback_email:you@example.com

### ios beta_submit

```sh
[bundle exec] fastlane ios beta_submit
```

Set the Beta App Review contact details and submit the newest build for

review. Apple requires all four: first_name, last_name, phone, email.

e.g. fastlane ios beta_submit first_name:Ben last_name:Siegel phone:+15551234567 email:you@example.com

### ios testflight_public_link

```sh
[bundle exec] fastlane ios testflight_public_link
```

Create (or reuse) an external TestFlight group with an open public join

link, attach the newest build, and print the URL for the website.

### ios testers

```sh
[bundle exec] fastlane ios testers
```

Count the testers in each TestFlight group -- the number the public

link exists to move.

### ios release

```sh
[bundle exec] fastlane ios release
```

Attach the newest processed build to the editable App Store version and

submit it for App Review. DRY-RUNS by default and prints what it would

do; only confirm:true actually submits.

e.g. fastlane ios release            # inspect

     fastlane ios release confirm:true

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
