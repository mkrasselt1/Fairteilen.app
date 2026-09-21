#!/bin/sh
# Reine Shell-Diagnose für Hostings wie Plesk – braucht kein funktionierendes Node.
# Als "Zusätzliche Bereitstellungsaktion" eintragen oder per SSH ausführen:
#   sh scripts/pruefe-umgebung.sh
#
# Findet heraus, welches Programm eine zu neue C-Bibliothek verlangt
# ("GLIBC_2.38 not found").

pruefung() {

echo "=== System ==="
(ldd --version 2>/dev/null || getconf GNU_LIBC_VERSION 2>/dev/null) | head -1
[ -r /etc/os-release ] && . /etc/os-release && echo "Betriebssystem: $PRETTY_NAME"
echo "Benutzer:       $(id -un)"
echo "Verzeichnis:    $(pwd)"

echo ""
echo "=== PATH dieser Shell ==="
echo "$PATH" | tr ':' '\n' | sed 's/^/  /'

echo ""
echo "=== Gefundene Node- und npm-Programme ==="
for name in node npm npx; do
  found=0
  echo "$PATH" | tr ':' '\n' | while read -r dir; do
    [ -x "$dir/$name" ] || continue
    real=$(readlink -f "$dir/$name" 2>/dev/null || echo "$dir/$name")
    need=$(grep -ao 'GLIBC_[0-9][0-9.]*' "$real" 2>/dev/null | sort -u -t_ -k2 -V | tail -1)
    ver=$("$dir/$name" --version 2>&1 | head -1)
    echo "  $dir/$name"
    echo "      Ziel:     $real"
    echo "      braucht:  ${need:-keine Angabe}"
    echo "      Version:  $ver"
  done
  [ "$found" = 0 ] || true
done

echo ""
echo "=== Von Plesk verwaltete Node-Versionen ==="
if [ -d /opt/plesk/node ]; then
  for dir in /opt/plesk/node/*/bin/node; do
    [ -x "$dir" ] || continue
    need=$(grep -ao 'GLIBC_[0-9][0-9.]*' "$dir" 2>/dev/null | sort -u -t_ -k2 -V | tail -1)
    echo "  $dir  →  $("$dir" --version 2>&1 | head -1), braucht ${need:-keine Angabe}"
  done
else
  echo "  /opt/plesk/node gibt es auf diesem Server nicht."
fi

echo ""
echo "=== Native Dateien der Anwendung ==="
if [ -d node_modules ]; then
  find node_modules \( -name '*.node' -o -name '*.so*' -o -name '*query-engine*' -o -name '*schema-engine*' \) 2>/dev/null |
    while read -r file; do
      need=$(grep -ao 'GLIBC_[0-9][0-9.]*' "$file" 2>/dev/null | sort -u -t_ -k2 -V | tail -1)
      [ -n "$need" ] && echo "  $need  $file"
    done | sort -t_ -k2 -Vr | head -10
  echo "  (Fairteilen selbst kommt mit glibc 2.28 aus.)"
else
  echo "  node_modules fehlt – npm install wurde noch nicht ausgeführt."
fi

echo ""
echo "Fertig. Ein Eintrag oben mit einer höheren GLIBC-Zahl als die"
echo "Systemversion ganz oben ist die Ursache der Fehlermeldung."
}

# Plesk zeigt die Ausgabe erfolgreicher Aktionen oft nicht an – deshalb
# zusätzlich in eine Datei schreiben, die sich im Dateimanager lesen lässt.
log="${PRUEF_LOG:-$(pwd)/umgebung.log}"
pruefung > "$log" 2>&1
cat "$log"
echo ""
echo "Dieses Protokoll steht auch in: $log"
