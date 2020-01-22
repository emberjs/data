#!/bin/bash

# Shamelessly stolen from the very awesome ShakingFingerAction
#  Written by the amazing https://twitter.com/jessfraz
#  https://github.com/jessfraz/shaking-finger-action
# Generified to enable this form of comment management
#  for our CI Reports (AssetSize | Perf Analysis etc.)

if [[ -z "$COMMENT_MARKER" ]]; then
  echo "Set the COMMENT_MARKER env variable."
  return 1
fi

if [[ -z "$COMMENT_TEXT" ]]; then
  echo "Set the COMMENT_TEXT env variable."
  return 1
fi

if [[ -z "$GITHUB_REPOSITORY" ]]; then
  echo "Set the GITHUB_REPOSITORY env variable."
  return 1
fi

# Github seems to be playin coy, getting access from
# a sourced script is extremely hard
if [[ -z "${GITHUB_TOKEN}" ]]; then
  echo "Configure the env to include the GITHUB_TOKEN secret variable."
  return 1
fi

URI=https://api.github.com
API_VERSION=v3
API_HEADER="Accept: application/vnd.github.${API_VERSION}+json; application/vnd.github.antiope-preview+json"
AUTH_HEADER="Authorization: token ${GITHUB_TOKEN}"

FOUND_EXISTING=1
update_comment_if_exists() {
  # Get all the comments for the pull request.
  body=$(curl -sSL -H "${AUTH_HEADER}" -H "${API_HEADER}" "${URI}/repos/${GITHUB_REPOSITORY}/issues/${NUMBER}/comments")

  for row in $(echo -E "${body}" | jq --raw-output  '.[] | @base64'); do
    comment=$(echo -E "${row}" | base64 --decode | jq --raw-output '{id: .id, body: .body, author: .user.login}')
    id=$(echo -E "$comment" | jq -r '.id')
    b=$(echo -E "$comment" | jq -r '.body')

    if [[ "$b" == *"${COMMENT_MARKER}"* ]]; then
      # We have found our comment.
      # Delete it.

      echo "Updating Existing Comment: $id"
      UPDATE_URL="${URI}/repos/${GITHUB_REPOSITORY}/issues/comments/${id}"
      curl -sSL -H "${AUTH_HEADER}" -H "${API_HEADER}" -d "$COMMENT_TEXT" -H "Content-Type: application/json" -X PATCH $UPDATE_URL
      FOUND_EXISTING=0
      return 0;
    fi
  done

  echo "No existing comment found."

  return 0;
}

post_comment() {
  echo "Posting A New Comment"
  curl -sSL -H "${AUTH_HEADER}" -H "${API_HEADER}" -d "$COMMENT_TEXT" -H "Content-Type: application/json" -X POST "${URI}/repos/${GITHUB_REPOSITORY}/issues/${NUMBER}/comments"
}

main() {
  # Validate the GitHub token.
  curl -o /dev/null -sSL -H "${AUTH_HEADER}" -H "${API_HEADER}" "${URI}/repos/${GITHUB_REPOSITORY}" || { echo "Error: Invalid repo, token or network issue!";  exit 1; }

  # Get the pull request number.
  NUMBER=$(jq --raw-output .number "$GITHUB_EVENT_PATH")
  echo "running $GITHUB_ACTION for PR #${NUMBER}"

  update_comment_if_exists
  if [ $FOUND_EXISTING -eq 1 ]; then
    post_comment;
  fi
}

main
