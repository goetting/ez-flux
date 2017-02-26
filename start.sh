#!/bin/bash

printf '\e[1;34m%-6s\e[m' "







                                        EZ










"

JOBS=(
  "babel src --out-dir lib --watch"
  "nodemon -q --watch src --ext js -x 'eslint --color --ext .js ./src; echo'"
  "nodemon -q --watch src --ext js -x 'flow; echo'"
  "NODE_ENV=test jest --watch"
)
NAMES="Babel,Lint,Flow,Test"
COLORS="bgGreen.black,bgYellow.black,bgMagenta.black,bgBlue.black"

IFS='%'
concurrently -k --prefix name --names "$NAMES" --prefix-colors "$COLORS" ${JOBS[*]}
unset IFS