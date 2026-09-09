#!/bin/sh
# Vollständige Bereitstellung in einem einzigen Befehl.
#
# In Plesk unter "Zusätzliche Bereitstellungsaktionen" als EINE Zeile eintragen:
#
#     sh ./scripts/plesk-deploy.sh
#
# Warum eine Zeile? Plesk führt die Zeilen dieses Feldes unabhängig voneinander
# aus. Ein `export PATH=...` oder `cd ...` in einer Zeile wirkt deshalb nicht auf
# die nächste – genau daran scheitern die üblichen Anleitungen. Dieses Skript
# wechselt selbst ins richtige Verzeichnis und sucht sich ein passendes Node.
set -e

# --- 1. Ins Projektverzeichnis wechseln, egal von wo aufgerufen wird ----------
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$script_dir/.."
echo "Projektverzeichnis: $(pwd)"

if [ ! -f package.json ]; then
  echo "FEHLER: Hier liegt keine package.json. Liegt der Code wirklich im Anwendungsstamm?" >&2
  exit 1
fi

# --- 2. Version der C-Bibliothek bestimmen -----------------------------------
system_glibc=$( (getconf GNU_LIBC_VERSION 2>/dev/null || ldd --version 2>/dev/null | head -1) |
  grep -o '[0-9][0-9]*\.[0-9][0-9]*' | tail -1 )
echo "C-Bibliothek:       glibc ${system_glibc:-unbekannt}"

# Verlangt die Datei eine neuere glibc als vorhanden? 0 = brauchbar
vertraeglich() {
  [ -n "$system_glibc" ] || return 0
  needed=$(grep -ao 'GLIBC_[0-9][0-9]*\.[0-9][0-9]*' "$1" 2>/dev/null |
    sed 's/GLIBC_//' | sort -u -V | tail -1)
  [ -n "$needed" ] || return 0
  [ "$(printf '%s\n%s\n' "$needed" "$system_glibc" | sort -V | tail -1)" = "$system_glibc" ]
}

# --- 3. Brauchbares Node suchen ----------------------------------------------
# Zuerst die von Plesk verwalteten Versionen (neueste zuerst), dann der Suchpfad.
kandidaten=$(ls -d /opt/plesk/node/*/bin/node 2>/dev/null | sort -Vr)
kandidaten="$kandidaten $(command -v node 2>/dev/null || true)"
kandidaten="$kandidaten /usr/local/bin/node /usr/bin/node"

NODE=""
for kandidat in $kandidaten; do
  [ -x "$kandidat" ] || continue
  vertraeglich "$kandidat" || { echo "  übersprungen (glibc zu neu): $kandidat"; continue; }
  version=$("$kandidat" -v 2>/dev/null) || { echo "  übersprungen (startet nicht): $kandidat"; continue; }
  major=$(echo "$version" | sed 's/^v//' | cut -d. -f1)
  [ "$major" -ge 18 ] 2>/dev/null || { echo "  übersprungen (zu alt, $version): $kandidat"; continue; }
  NODE="$kandidat"
  echo "Node:               $version  ($NODE)"
  break
done

if [ -z "$NODE" ]; then
  echo "FEHLER: Kein brauchbares Node gefunden." >&2
  echo "        'sh scripts/pruefe-umgebung.sh' zeigt, was auf dem Server vorhanden ist." >&2
  exit 1
fi

# npm derselben Installation verwenden
node_bin=$(dirname "$NODE")
PATH="$node_bin:$PATH"
export PATH
hash -r 2>/dev/null || true

if [ ! -x "$node_bin/npm" ]; then
  echo "FEHLER: Zu $NODE gibt es kein npm in $node_bin." >&2
  exit 1
fi
echo "npm:                $("$node_bin/npm" -v)"

# --- 4. Bauen ----------------------------------------------------------------
echo ""
echo "→ npm install"
"$node_bin/npm" install --no-audit --no-fund

echo ""
echo "→ npm run setup  (Prisma-Client, Tabellen, Build)"
"$node_bin/npm" run setup

echo ""
echo "✓ Bereitstellung abgeschlossen. Jetzt in Plesk noch »App neu starten« drücken."
