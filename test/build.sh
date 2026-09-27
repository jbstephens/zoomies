#!/bin/bash
# ZOOMIES! — assemble the single self-contained index.html from source parts.
#
# Part order is EXPLICIT (not glob order) because p1-three.html is the
# vendored minified three.js r147 block copied verbatim from
# ~/Developer/stephensgames/fairwayclassic (known-good on the Pi) and it has
# to land INSIDE the document that p2-head.html opens.
#
#   p2-head.html   <!DOCTYPE> … metas … controller.js … CSS … </head><body> + DOM
#   p1-three.html  <script> three.min.js </script>   (vendored, never edited)
#   p3..pN         game code, in glob order
#   </body></html>                 ← BUNDLER LAW: ship.sh's overlay injection
#                                    needs a literal </head> and this exact
#                                    tail, or the game is silently skipped.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$DIR/test/src"
OUT="$DIR/index.html"
{
  cat "$SRC/p2-head.html"
  cat "$SRC/p1-three.html"
  for f in "$SRC"/p*.html; do
    case "$f" in
      "$SRC/p1-three.html"|"$SRC/p2-head.html") continue ;;
    esac
    cat "$f"
  done
  printf '</body>\n</html>\n'
} > "$OUT"
echo "built $OUT ($(wc -c < "$OUT") bytes)"

# bundler anchors — fail loudly rather than shipping a game ship.sh skips
grep -q '</head>' "$OUT" || { echo 'FATAL: no literal </head> in built file'; exit 1; }
tail -c 24 "$OUT" | tr -d '\n' | grep -q '</body></html>' || { echo 'FATAL: file does not end </body></html>'; exit 1; }

# node --check every inline script block except the vendored three.min.js one
node - "$OUT" <<'EOF'
const fs = require('fs'), cp = require('child_process'), os = require('os'), path = require('path');
const html = fs.readFileSync(process.argv[2], 'utf8');
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
let checked = 0;
for (const b of blocks) {
  if (b.includes('three.js Authors') || b.length > 400000) continue; // vendored lib
  const f = path.join(os.tmpdir(), 'zoomies-check-' + (checked++) + '.js');
  fs.writeFileSync(f, b);
  const r = cp.spawnSync('node', ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) { console.error('SYNTAX FAIL block', checked, '\n', r.stderr); process.exit(1); }
}
console.log('node --check passed on', checked, 'inline game script block(s)');
EOF
