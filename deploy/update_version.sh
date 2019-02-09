#!/usr/bin/env bash

set -e

if [[ -z $TRAVIS_PULL_REQUEST_BRANCH ]]; then
	exit 0;
fi

git fetch origin "${TRAVIS_PULL_REQUEST_BRANCH}:${TRAVIS_PULL_REQUEST_BRANCH}"

git checkout -f "${TRAVIS_PULL_REQUEST_BRANCH}"

npm run release

git push "https://${GITHUB_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" "${TRAVIS_PULL_REQUEST_BRANCH}" --follow-tags
