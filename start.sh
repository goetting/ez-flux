#!/bin/bash

printf '\e[1;34m%-6s\e[m' "







                                        EZ










"

JOBS=(
  "npm run build:watch"
  "npm run eslint:watch"
  "npm run flow:watch"
  "npm run test:watch"
)
NAMES=" Babl , Lint , Flow , Test "
COLORS="green,yellow,magenta,blue"

IFS='%'
concurrently -k --prefix name --names "$NAMES" --prefix-colors "$COLORS" ${JOBS[*]}
unset IFS