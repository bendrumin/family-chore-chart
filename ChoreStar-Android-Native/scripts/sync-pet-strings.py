#!/usr/bin/env python3
"""Copy the Star Pets kid strings from the web (chorestar-nextjs/lib/i18n/kid.ts)
into Android string resources, so all three apps say the same thing in all four
languages and a translation is only ever fixed in one place (the iOS twin is
ChoreStar-iOS/scripts/sync-pet-strings.py).

    python3 ChoreStar-Android-Native/scripts/sync-pet-strings.py

`pet.mood.happy` becomes `pet_mood_happy`; `{var}` placeholders become
positional `%n$s` in the order they appear in English, and Kotlin passes every
argument as a String (PetText.t in data/StarPets.kt). Re-run after editing kid.ts.
"""
import re, sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[2]
KID = ROOT / 'chorestar-nextjs/lib/i18n/kid.ts'
RES = ROOT / 'ChoreStar-Android-Native/app/src/main/res'
BLOCKS = {'values': 'const en = {', 'values-es': 'const es:', 'values-pt-rBR': 'const pt:', 'values-ar': 'const ar:'}

src = KID.read_text()
def block(start):
    i = src.index(start)
    return src[i:src.index('\n}\n', i)]

entry = re.compile(r"""^\s*'(pet\.[\w.]+)':\s*(['"])(.*?)\2,\s*$""", re.M)
langs = {d: {k: v.replace("\\'", "'") for k, _, v in entry.findall(block(start))} for d, start in BLOCKS.items()}
en = langs['values']
if not en:
    sys.exit('no pet.* strings found in kid.ts')

def android(text, order):
    text = escape(text.replace('%', '%%')).replace("'", "\\'").replace('"', '\\"')
    if text.startswith('@') or text.startswith('?'):
        text = '\\' + text
    return re.sub(r'\{(\w+)\}', lambda m: f'%{order.index(m.group(1)) + 1}$s', text)

for folder, table in langs.items():
    lines = ['<?xml version="1.0" encoding="utf-8"?>',
             '<!-- Generated from chorestar-nextjs/lib/i18n/kid.ts by scripts/sync-pet-strings.py. Do not edit by hand. -->',
             '<resources>']
    for key, english in en.items():
        if key not in table:
            continue
        order = list(dict.fromkeys(re.findall(r'\{(\w+)\}', english)))
        extra = ' formatted="false"' if not order and '%' in table[key] else ''
        lines.append(f'    <string name="{key.replace(".", "_")}"{extra}>{android(table[key], order)}</string>')
    lines.append('</resources>')
    (RES / folder / 'strings_pets.xml').write_text('\n'.join(lines) + '\n')
print(f'{len(en)} pet strings synced ({", ".join(f"{d} {len(t)}" for d, t in langs.items())})')
