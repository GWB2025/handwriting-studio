#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if ! /usr/bin/env python3 launch_handwriting_studio.py; then
  read -r -p "Press Return to close this window. "
  exit 1
fi
