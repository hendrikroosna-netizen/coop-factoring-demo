#!/usr/bin/env bash
# Deploy: build → gh-pages → GitHub Pages
# Kasutamine: ./deploy.sh ["commit sõnum"]
set -euo pipefail
cd "$(dirname "$0")"

MSG="${1:-Update demo build}"
WT=$(mktemp -d /tmp/coop-demo-pages.XXXXXX)

echo "→ Build..."
npm run build

echo "→ gh-pages worktree..."
git worktree add --force "$WT" gh-pages >/dev/null 2>&1 || {
  git branch -f gh-pages origin/gh-pages >/dev/null 2>&1 || true
  git worktree add --force "$WT" gh-pages >/dev/null
}

# Puhasta vana sisu (jäta .git), kopeeri uus build
find "$WT" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r dist/. "$WT/"

cd "$WT"
git add -A
if git diff --cached --quiet; then
  echo "→ Muudatusi pole, deploy pole vajalik."
else
  git -c user.name="Hendrik" -c user.email="hendrikroosna-netizen@users.noreply.github.com" commit -qm "$MSG"
  git push -q origin gh-pages
  echo "→ Deployed: https://hendrikroosna-netizen.github.io/coop-factoring-demo/"
fi

cd - >/dev/null
git worktree remove --force "$WT" >/dev/null
echo "→ Valmis."
