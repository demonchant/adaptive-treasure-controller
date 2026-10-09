#!/bin/sh
set -eu

workspace_dir="${USER_DATA_DIRECTORY:-/var/data/workspaces}"
case "$workspace_dir" in
  /*) ;;
  *) workspace_dir="/app/$workspace_dir" ;;
esac
mkdir -p "$workspace_dir"
chown node:node "$workspace_dir"
exec su-exec node "$@"
