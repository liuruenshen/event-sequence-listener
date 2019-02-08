#!/usr/bin/env bash

set -e

git config user.name ${USER}
git config user.email ${EMAIL}
npm run release
git push "https://${GITHUB_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" "${TRAVIS_BRANCH}" --follow-tags
