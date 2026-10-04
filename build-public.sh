#!/usr/bin/env bash
# Builds the `public/` folder for `wasmer deploy`.
# Run this from the LINUXBOSS folder whenever you change the site,
# then run `wasmer deploy` to publish the update.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf public
mkdir -p public
cp index.html admin.html 404.html 50x.html public/
cp -r css js data assets public/
find public -name ".gitkeep" -delete
echo "public/ is ready. Now run:  wasmer deploy"
