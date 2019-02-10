#!/usr/bin/env bash

set -e

if [[ -z $TRAVIS_BRANCH ]]; then
	exit 0;
fi

git checkout -f "${TRAVIS_BRANCH}"

touch docs/.nojekyll

git add docs/.nojekyll

git commit -m "add .nojekyll"

git push "https://${GITHUB_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" "${TRAVIS_BRANCH}"

