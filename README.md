# PG Apps Website

Public deployment for [pg-apps.github.io](https://pg-apps.github.io/). This repository contains only the generated website files that passed the publication gate; application source code is not part of this repository.

The RLY? area publishes the app's support, legal and Universal Link paths. Its public App Store status is checked separately and must never be inferred from the presence of these pages.

The public JSON catalog contains confirmed releases only, matched by Apple ID,
bundle ID and Philipp Graef's developer account. Unreleased projects appear as
anonymous Coming-soon cards; their private inventory is maintained outside this
repository. Existing legal/support and explicitly maintained landing pages remain
available independently of launch status.

The local weekly maintenance task reconciles project changes and confirmed App
Store and Google Play production releases on Mondays at 09:00 Europe/Berlin. It
can publish reviewed website updates, but cannot release apps or change prices.
Google Play records contain only verified production versions and public store
links, with package and developer checks. Test tracks stay private. Store consoles
are read-only during maintenance. The GitHub workflow refreshes public Apple
release metadata while preserving the confirmed Android records and their actual
check dates. Failed or conflicting lookups keep the last confirmed release. No
build artifacts are uploaded by this workflow.

Before deployment run `node scripts/test-store-record.mjs`,
`node scripts/test-google-play-presentation.mjs` and
`node scripts/verify-public-deployment.mjs`. Local maintenance additionally checks
all internal links, legal anchors, anonymous previews and responsive layout.
