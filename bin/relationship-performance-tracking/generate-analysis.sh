#!/bin/bash

verify_installed_or_exit() {
  # https://stackoverflow.com/questions/592620/how-can-i-check-if-a-program-exists-from-a-bash-script#677212
  command -v $1 >/dev/null 2>&1 || { echo >&2 "Please install $1 to run this script.  Aborting."; exit 1; }
}

verify_installed_or_exit node
verify_installed_or_exit pm2
verify_installed_or_exit tracerbench
HAR_REMIX_SCRIPT="bin/relationship-performance-tracking/src/har-remix.js"
WORKSPACE="relationship-performance-test-app"
TEST_APP_PATH="packages/unpublished-relationship-performance-test-app"
INITIAL_BRANCH=$(git rev-parse --symbolic-full-name --abbrev-ref HEAD)

if [[ -z "$USE_EXISTING_DISTS" ]]; then
  echo "Creating production builds for commits"
  if [[ -z "$CONTROL_COMMIT" ]]; then
    echo "Set the CONTROL_COMMIT env variable."
    return 1
  fi

  if [[ -z "$EXPERIMENT_COMMIT" ]]; then
    echo "Set the EXPERIMENT_COMMIT env variable."
    return 1
  fi

  echo "Checking out control $CONTROL_COMMIT"
  git checkout $CONTROL_COMMIT
  yarn install
  yarn workspace $WORKSPACE ember build -e production --output-path dist-control
  echo "Checking out experiment $EXPERIMENT_COMMIT"
  git checkout $EXPERIMENT_COMMIT
  yarn install
  yarn workspace $WORKSPACE ember build -e production --output-path dist-experiment
fi

HR_PORT=4200 HR_GROUP=control pm2 start $HAR_REMIX_SCRIPT --name control
HR_PORT=4201 HR_GROUP=experiment pm2 start $HAR_REMIX_SCRIPT --name experiment
node ./bin/relationship-performance-tracking/src/tracerbench.js
for result in "$TEST_APP_PATH"/tracerbench-results/*-trace-results.json; do
  echo
  echo ===============================================================================
  echo Processing $(basename ${result} -trace-results.json)
  tracerbench compare:analyze "${result}";
done
pm2 kill
git checkout "$INITIAL_BRANCH"
