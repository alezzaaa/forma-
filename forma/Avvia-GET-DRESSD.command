#!/usr/bin/env bash
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Per avviare il server serve Node.js 22.13 o superiore."
  echo "Puoi anche aprire GET-DRESSD.html direttamente nel browser."
  read -r -p "Premi Invio per chiudere."
  exit 1
fi
node serve.mjs
