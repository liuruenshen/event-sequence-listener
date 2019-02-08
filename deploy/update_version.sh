#!/usr/bin/env bash

git checkout -f "${TRAVIS_BRANCH}"

npm run release

git push "https://${GITHUB_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" "${TRAVIS_BRANCH}" --follow-tags
