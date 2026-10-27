#!/usr/bin/env python3
"""Copy the Star Pets kid strings from the web (chorestar-nextjs/lib/i18n/kid.ts)
into the iOS string catalog, so both apps say the same thing in all four
languages and a translation is only ever fixed in one place.

    python3 ChoreStar-iOS/scripts/sync-pet-strings.py

Keys stay the web's (`pet.level`); `{var}` placeholders become positional
`%n$@` in the order they appear in English, and Swift passes every argument
as a String (PetText.t in Models/StarPets.swift). Re-run after editing kid.ts.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KID = ROOT / 'chorestar-nextjs/lib/i18n/kid.ts'
CATALOG = ROOT / 'ChoreStar-iOS/ChoreStar/Localizable.xcstrings'
BLOCKS = {'en': 'const en = {', 'es': 'const es:', 'pt-BR': 'const pt:', 'ar': 'const ar:'}

src = KID.read_text()
def block(start):
    i = src.index(start)
    return src[i:src.index('\n}\n', i)]

entry = re.compile(r"""^\s*'(pet\.[\w.]+)':\s*(['"])(.*?)\2,\s*$""", re.M)
langs = {lang: {k: v.replace("\\'", "'") for k, _, v in entry.findall(block(start))} for lang, start in BLOCKS.items()}
en = langs['en']
if not en:
    sys.exit('no pet.* strings found in kid.ts')

def positional(text, order):
    return re.sub(r'\{(\w+)\}', lambda m: f'%{order.index(m.group(1)) + 1}$@', text.replace('%', '%%'))

catalog = json.loads(CATALOG.read_text())
for key, english in en.items():
    order = list(dict.fromkeys(re.findall(r'\{(\w+)\}', english)))
    locs = {}
    for lang, table in langs.items():
        if key in table:
            locs[lang] = {'stringUnit': {'state': 'translated', 'value': positional(table[key], order)}}
    catalog['strings'][key] = {'extractionState': 'manual', 'localizations': locs}

out = json.dumps(catalog, ensure_ascii=False, indent=2, separators=(',', ' : '))
# Xcode writes an empty entry as "{", a blank line, "}"; match it so a sync
# only ever diffs the pet strings.
out = re.sub(r'^( *)(.*)\{\}', lambda m: f'{m.group(1)}{m.group(2)}{{\n\n{m.group(1)}}}', out, flags=re.M)
CATALOG.write_text(out)  # Xcode leaves no trailing newline
print(f'{len(en)} pet strings synced ({", ".join(f"{l} {len(t)}" for l, t in langs.items())})')
