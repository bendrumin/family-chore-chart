#!/usr/bin/env python3
"""Copy named phrases from the iOS string catalog into Android resources
(res/values*/strings_ios.xml), so a sentence both apps show is translated once.

    python3 ChoreStar-Android-Native/scripts/sync-ios-strings.py

KEYS maps an Android resource name to the iOS catalog key. `%@` and `%lld`
become positional `%n$s` / `%n$d`. A key missing from the catalog, or missing a
language, stops the script rather than shipping English to a Spanish phone.
"""
import json, re, sys
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'ChoreStar-iOS/ChoreStar/Localizable.xcstrings'
RES = ROOT / 'ChoreStar-Android-Native/app/src/main/res'
FOLDERS = {'en': 'values', 'es': 'values-es', 'pt-BR': 'values-pt-rBR', 'ar': 'values-ar'}

KEYS = {
    # Kids on their own device (QR)
    'kidqr_title_named': "%@'s own login",
    'kidqr_step1_named': "1. On %@'s tablet or an old phone, scan this code or open the link.",
    'kidqr_step1_any': "1. On your kid's tablet or an old phone, scan this code or open the link.",
    'kidqr_step2_named': '2. %@ taps their name and enters their PIN.',
    'kidqr_step3': "3. That's it. Checked-off chores show up for you right away.",
    'kidqr_family_code': 'Family code',
    'kidqr_send_link': 'Send the link',
    'kidqr_show': "Show QR code for a kid's device",
    'kidqr_image_named': "QR code for %@'s kid login",
    'kidqr_image_any': 'QR code for kid login',
    'kidqr_your_kid': 'Your kid',
    # Star Pets, parent side
    'pets_title': 'Star Pets',
    'pets_child_pet': "%@'s Star Pet",
    'pets_opens': "Opens %@'s Star Pet",
    'pets_adopt': 'Adopt',
    'pets_on_for': 'Pets on for',
    'pets_not_adopted': 'Not adopted yet',
    'pets_name_level': '%@, level %lld',
    'pets_off_footer': 'Turning a pet off hides it. Nothing is deleted, so turning it back on brings the same pet back.',
    'pets_free_footer': 'Every family gets a pup that grows to its kid stage. Premium adds five more pets, outfits, monthly prizes and growing all the way up.',
    'pets_explainer': 'Each kid adopts a pet that grows every time they finish a chore or a routine. Kids pick and name theirs from their own screen in kid mode.',
    'pets_wants': '%@ wants the %@',
    # Paywall spotlights
    'spot_templates_title': '%lld more routines, ready to go',
    'spot_templates_list': '%@ and %lld more.',
    'spot_templates_fill': 'Each one fills the builder, so you can change any step, icon or timer.',
    'spot_templates_ai': 'Plus Build with AI: describe a routine and get the steps.',
    'spot_pets_title': 'All six Star Pets',
    'spot_pets_species': 'Kitty, bunny, dino, panda and owl, as well as the pup.',
    'spot_pets_outfits': 'Hats, extras and new places to unlock as they level up.',
    'spot_pets_prize': 'A new prize to collect every month.',
    'spot_pets_grow': 'Pets grow all the way up, with a rare star form.',
    'spot_sharing_title': 'Run chores together',
    'spot_sharing_invite': 'Invite a co-parent with a link or code.',
    'spot_sharing_approve': 'You both see every chore and can approve from your own phone.',
    'spot_sharing_same': 'Allowance, goals and the reward store stay the same on both phones.',
    # Yearly upsell
    'yearly_title': 'Switch to yearly and save %lld%%',
    'yearly_switch': 'Switch to yearly',
    # Premium ended over the free limits (iOS PlanLimitsCard)
    'plan_ends_on': 'Premium ends %@',
    'plan_set_to_end': 'Premium is set to end',
    'plan_ending_body': 'After that, %@ pause, since the free plan has %lld kids and %lld chores. Turn renewal back on to keep them.',
    'plan_paused_title': '%@ paused',
    'plan_paused_body': 'Premium ended, and the free plan has %lld kids and %lld chores. Nothing is deleted: resume Premium and everything comes back, or choose what stays on.',
    'plan_resume': 'Resume Premium',
    'plan_choose': 'Choose what stays on',
    'plan_kids_count': 'Kids (%lld/%lld)',
    'plan_chores_footer': 'Chores on: %lld/%lld. Everything else is paused, not deleted, and comes back with Premium.',
    'plan_save_offline': "Couldn't save. Check your connection.",
    'plan_save_failed': "Couldn't save. Try again.",
    'plan_n_chores': '%lld chores',
    'plan_paused_badge': 'Paused',
    'plan_paused_word': 'paused',
}

# The Premium routine library (iOS RoutineTemplate.premiumLibrary): names and step titles.
TEMPLATE_TEXT = [
    'School Morning Express', 'Homework Hour', 'Weekend Room Reset', 'Pet Care', 'Teen Morning', 'Calm-Down Bedtime',
    'Sports Practice Prep', 'Kitchen Helper', 'Music Practice', 'Get Moving',
    'Wake Up', 'Use the Bathroom', 'Get Dressed', 'Eat Breakfast', 'Brush Teeth', 'Check Backpack', 'Shoes On',
    'Have a Snack', 'Drink Water', 'Clear the Desk', 'Do Homework', 'Read for 15 Minutes', "Pack Tomorrow's Bag",
    'Make Bed', 'Put Away Toys', 'Fold Laundry', 'Dust', 'Vacuum', 'Take Out Trash',
    'Feed the Pet', 'Fresh Water Bowl', 'Walk the Dog', 'Wash Hands',
    'Shower', 'Deodorant', 'Put On Pajamas', 'Floss', 'Read a Book', 'Calm Music', 'Lights Out',
    'Eat Some Fruit', 'Fill Water Bottle', 'Practice Clothes On', 'Pack the Gear Bag',
    'Set the Table', 'Help Cook', 'Eat Dinner', 'Clear the Dishes',
    'Warm Up', 'Practice Your Piece', 'Listen to Something New', 'Stretch', 'Exercise', 'Play Outside',
]
for text in TEMPLATE_TEXT:
    KEYS['tpl_' + re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')] = text

strings = json.loads(CATALOG.read_text())['strings']

def convert(value):
    n = 0
    def sub(m):
        nonlocal n
        if m.group(0) == '%%':
            return '%%'
        pos, kind = m.group(1), m.group(2)
        n += 1
        idx = pos[:-1] if pos else str(n)
        return f'%{idx}${"d" if kind == "lld" else "s"}'
    out = re.sub(r'%%|%(\d+\$)?(@|lld)', sub, value)
    out = escape(out).replace("'", "\\'").replace('"', '\\"').replace('\n', '\\n')
    return '\\' + out if out[:1] in '@?' else out

missing = []
for lang, folder in FOLDERS.items():
    lines = ['<?xml version="1.0" encoding="utf-8"?>',
             '<!-- Generated from ChoreStar-iOS/ChoreStar/Localizable.xcstrings by scripts/sync-ios-strings.py. Do not edit by hand. -->',
             '<resources>']
    for name, key in KEYS.items():
        entry = strings.get(key)
        if entry is None:
            missing.append(f'{key!r} (not in catalog)'); continue
        value = key if lang == 'en' and 'en' not in entry.get('localizations', {}) else \
            entry.get('localizations', {}).get(lang, {}).get('stringUnit', {}).get('value')
        if value is None:
            missing.append(f'{key!r} [{lang}]'); continue
        lines.append(f'    <string name="{name}">{convert(value)}</string>')
    lines.append('</resources>')
    (RES / folder / 'strings_ios.xml').write_text('\n'.join(lines) + '\n')
if missing:
    sys.exit('missing:\n  ' + '\n  '.join(missing))
print(f'{len(KEYS)} strings synced in {len(FOLDERS)} languages')
