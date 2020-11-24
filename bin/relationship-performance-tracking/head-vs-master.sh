#!/bin/bash

export CONTROL_COMMIT=$(git rev-parse origin/master)
export EXPERIMENT_COMMIT=$(git rev-parse HEAD)
./bin/relationship-performance-tracking/generate-analysis.sh
