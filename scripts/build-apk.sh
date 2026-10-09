#!/usr/bin/env bash
# Builds the signed APK for Lorenzo's phone (arm64 only) from a clean prebuild.
# The signing key stays in ~/.android-keys (or $ANDROID_KEYS): never copied into the project, and
# its passwords reach apksigner through the environment, never through the command line.
set -euo pipefail
cd "$(dirname "$0")/.."

KEYS="${ANDROID_KEYS:-$HOME/.android-keys}"
PROPS="$KEYS/keystore.properties"
export ANDROID_HOME="${ANDROID_HOME:-$LOCALAPPDATA/Android/Sdk}"
export JAVA_HOME="${JAVA_HOME:-$LOCALAPPDATA/Programs/jdk-21}"
export PATH="$JAVA_HOME/bin:$PATH"
APKSIGNER="$ANDROID_HOME/build-tools/36.0.0/apksigner.bat"

prop() { grep -E "^$1=" "$PROPS" | head -1 | cut -d= -f2- | tr -d '\r'; }
[ -f "$PROPS" ] || { echo "Missing $PROPS" >&2; exit 1; }

# Prebuild rewrites the npm scripts for native runs; the project keeps its own.
saved_package=$(mktemp)
cp package.json "$saved_package"
npx expo prebuild --platform android --clean --no-install
cp "$saved_package" package.json
rm -f "$saved_package"

(cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain)

version=$(node -p "require('./app.json').expo.version")
out="dist/capolinea-$version.apk"
mkdir -p dist
store=$(prop storeFile)
case "$store" in /* | ?:*) ;; *) store="$KEYS/$store" ;; esac

CAPOLINEA_STORE_PASS=$(prop storePassword) CAPOLINEA_KEY_PASS=$(prop keyPassword) \
  "$APKSIGNER" sign --ks "$store" --ks-key-alias "$(prop keyAlias)" \
  --ks-pass env:CAPOLINEA_STORE_PASS --key-pass env:CAPOLINEA_KEY_PASS \
  --alignment-preserved --out "$out" android/app/build/outputs/apk/release/app-release.apk

"$APKSIGNER" verify --print-certs "$out" | grep -E '^Signer'
sha256sum "$out"
