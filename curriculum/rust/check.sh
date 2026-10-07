#!/usr/bin/env bash
# Compiles the lesson Rust written by `pnpm --filter web export:rust <dir>`, each file with its check
# crate: <dir>/stylus/*.rs against stylus-sdk 0.10.10, <dir>/openzeppelin/*.rs against
# openzeppelin-stylus 0.3.0 with --features export-abi (see openzeppelin/Cargo.toml).
#
#   curriculum/rust/check.sh <dir>
#
# Each file is copied to <crate>/src/lib.rs and checked with `cargo check --locked`. Warnings are
# allowed (starters have unused parameters); an error fails the run, which lists the failing files.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
sources="$(cd "${1:?usage: check.sh <dir written by export:rust>}" && pwd)"

group() { if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::group::$1"; else echo "== $1"; fi; }
endgroup() { if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::endgroup::"; fi; }

checked=0
failed=()
for crate in stylus openzeppelin; do
  [ -d "$sources/$crate" ] || continue
  features=()
  if [ "$crate" = openzeppelin ]; then features=(--features export-abi); fi
  mkdir -p "$here/$crate/src"
  for file in "$sources/$crate"/*.rs; do
    name="$(basename "$file" .rs)"
    cp "$file" "$here/$crate/src/lib.rs"
    group "$crate: $name"
    if (cd "$here/$crate" && cargo check --locked --quiet --lib "${features[@]}"); then
      checked=$((checked + 1))
    else
      failed+=("$crate: $name")
    fi
    endgroup
  done
done

if [ "$checked" -eq 0 ] && [ "${#failed[@]}" -eq 0 ]; then
  echo "No lesson Rust found in $sources" >&2
  exit 1
fi
if [ "${#failed[@]}" -gt 0 ]; then
  echo "cargo check failed for ${#failed[@]} file(s):" >&2
  for entry in "${failed[@]}"; do
    echo "  $entry" >&2
    if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::error title=cargo check failed::$entry"; fi
  done
  exit 1
fi
echo "cargo check passed for $checked lesson Rust files."
