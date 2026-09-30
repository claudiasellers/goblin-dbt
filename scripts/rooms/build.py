#!/usr/bin/env python3
"""Room palette blocks for src/index.css: one spec per room, contrast-checked, written between markers.

Edit a room here, then run:  python3 scripts/rooms/build.py
It rewrites the text between ROOMS:BEGIN and ROOMS:END in src/index.css and exits 1
if any text pair drops under WCAG AA (4.5:1). npm run check:palettes checks the result again.
Swatches in src/data/palettes.ts are copied by hand from these values.
See docs/design/den-rooms.md.
"""
import os, sys

TOK = ['page', 'page2', 'card', 'card-hover', 'elevated', 'input', 'border', 'border-subtle', 'border-accent',
       'ink', 'text2', 'text3', 'text-muted', 'accent', 'accent-hover', 'accent-fill', 'accent-fill-hover', 'on-accent',
       'accent-glow', 'success', 'warning', 'danger', 'on-danger', 'info', 'tag-purple', 'tag-blue', 'tag-orange',
       'tag-pink', 'tag-teal', 'sidebar', 'sidebar-border', 'q-hu', 'q-hu-text', 'q-hp', 'q-hp-text', 'q-lu', 'q-lu-text',
       'q-lp', 'q-lp-text', 'field', 'field-fg']

# The feeling square (check-in): halo opacity, centre shade, optional art layer over the colour
# (Tinted's glaze), edge light, the dot, and how strongly the page tints after a touch.
# Emitted as-is (keys starting with "--" skip the --color- prefix).
EDGE_GLASS = 'inset 0 0 0 1px rgba(255, 255, 255, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.25), inset 0 -18px 40px rgba(0, 0, 0, 0.18)'
SQUARE_DARK = {'--square-halo': '0.55', '--square-shade': 'rgba(28, 16, 32, 0.30)', '--square-art': 'none', '--square-edge': EDGE_GLASS,
               '--square-dot': '#FFFFFF', '--square-dot-shadow': '0 0 0 4px rgba(255, 255, 255, 0.35), 0 0 18px 6px rgba(255, 255, 255, 0.55)',
               '--square-tint': '0.34'}
SQUARE_LIGHT = {'--square-halo': '0.5', '--square-shade': 'rgba(255, 255, 255, 0.35)', '--square-art': 'none', '--square-edge': EDGE_GLASS,
                '--square-dot': 'var(--color-text-primary)', '--square-dot-shadow': '0 0 0 4px rgba(255, 255, 255, 0.85), 0 4px 12px rgba(42, 39, 66, 0.35)',
                '--square-tint': '0.45'}
# Tinted: plaster glaze with the four colours washing in from the corners (built from the room's own fills).
GLAZE = ('radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--color-q-hu-fill) 66%, transparent), transparent 56%), '
         'radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-q-hp-fill) 66%, transparent), transparent 56%), '
         'radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--color-q-lu-fill) 66%, transparent), transparent 56%), '
         'radial-gradient(circle at 100% 100%, color-mix(in srgb, var(--color-q-lp-fill) 66%, transparent), transparent 56%), '
         'radial-gradient(closest-side, rgba(255, 251, 244, 0.7), rgba(255, 251, 244, 0)), #F1EADF')

ROOMS = {}

ROOMS['velvet'] = dict(
    title='Velvet (default, dark): deep plum walls, warm lamp light, brass action',
    pal=dict(page='#231827', page2='#1B121F', card='#33253A', **{'card-hover': '#3B2B42'}, elevated='#3E2C45', input='#2A1D2F',
             border='#4E3B56', **{'border-subtle': '#3C2C43', 'border-accent': '#62506B'},
             ink='#F5EBDF', text2='#CDBFB3', text3='#BBAD9F', **{'text-muted': '#978A7E'},
             accent='#F2C27E', **{'accent-hover': '#F7D39E', 'accent-fill': '#E8B56E', 'accent-fill-hover': '#F2C27E', 'on-accent': '#2A1806',
                                   'accent-glow': '#F2C27E'},
             success='#8ED8B4', warning='#F2C27E', danger='#F59A8A', **{'on-danger': '#2A0E0A'}, info='#A9BDF6',
             **{'tag-purple': '#C9B2F0', 'tag-blue': '#A9BDF6', 'tag-orange': '#F7A594', 'tag-pink': '#F3A9C6', 'tag-teal': '#8FD6CB'},
             sidebar='#1B121F', **{'sidebar-border': '#3C2C43'},
             **{'q-hu': '#EE6A55', 'q-hu-text': '#F7A594', 'q-hp': '#F4BC48', 'q-hp-text': '#F6CE7A', 'q-lu': '#5E7FEA', 'q-lu-text': '#A9BDF6',
                'q-lp': '#3FBF8E', 'q-lp-text': '#8ED8B4'}, field='#171019', **{'field-fg': '#F5EBDF'}),
    extra={'on-quadrant': '#1B121F', 'wall': 'radial-gradient(90% 42% at 50% -8%, rgba(255, 190, 130, 0.20), transparent 72%), linear-gradient(180deg, #2E1F33, #170F1B)',
           'accent-lip': '#8E6128', 'lip': '#120A15',
           'fam-dt': '#2B4A4D', 'fam-dt-text': '#A6E0D8', 'fam-dt-lip': '#132A2C',
           'fam-er': '#3A3160', 'fam-er-text': '#D3C9FF', 'fam-er-lip': '#211B3C',
           'fam-ie': '#4A2A3A', 'fam-ie-text': '#F5BCD1', 'fam-ie-lip': '#2A1520',
           **SQUARE_DARK})

ROOMS['dusk'] = dict(
    title='Dusk (dark): cool slate, muted colour, one warm brass light',
    pal=dict(page='#2E3542', page2='#262C37', card='#3A4252', **{'card-hover': '#424B5C'}, elevated='#4A5364', input='#343B49',
             border='#566073', **{'border-subtle': '#454E5E', 'border-accent': '#6A7488'},
             ink='#EEF2F5', text2='#C8D0DA', text3='#BAC3CE', **{'text-muted': '#949EAB'},
             accent='#E3C29E', **{'accent-hover': '#EDD1B2', 'accent-fill': '#D8B48C', 'accent-fill-hover': '#E3C29E', 'on-accent': '#2A1A0C',
                                   'accent-glow': '#D8B48C'},
             success='#A5D3BD', warning='#E3C29E', danger='#F2A898', **{'on-danger': '#2A0E0A'}, info='#B5C3E3',
             **{'tag-purple': '#C3BBE6', 'tag-blue': '#B5C3E3', 'tag-orange': '#EDB9A9', 'tag-pink': '#EDB6C7', 'tag-teal': '#A7D5D0'},
             sidebar='#262C37', **{'sidebar-border': '#454E5E'},
             **{'q-hu': '#C98C7C', 'q-hu-text': '#EDB9A9', 'q-hp': '#CFB17E', 'q-hp-text': '#EAD2A6', 'q-lu': '#8C9CC2', 'q-lu-text': '#BCC9E8',
                'q-lp': '#8DB5A2', 'q-lp-text': '#B5D8C7'}, field='#232934', **{'field-fg': '#EEF2F5'}),
    extra={'on-quadrant': '#1D2129', 'wall': 'radial-gradient(90% 42% at 50% -8%, rgba(214, 228, 255, 0.14), transparent 72%), linear-gradient(180deg, #3E4654, #222833)',
           'accent-lip': '#7A5A3B', 'lip': '#161A22',
           'fam-dt': '#3A5558', 'fam-dt-text': '#BDE6E0', 'fam-dt-lip': '#243638',
           'fam-er': '#4A4766', 'fam-er-text': '#D9D4F2', 'fam-er-lip': '#2E2C42',
           'fam-ie': '#594452', 'fam-ie-text': '#F0C9D6', 'fam-ie-lip': '#382A33',
           **dict(SQUARE_DARK, **{'--square-halo': '0.35', '--square-shade': 'rgba(230, 236, 244, 0.14)', '--square-tint': '0.28'})})

ROOMS['tinted'] = dict(
    title='Tinted (light): warm plaster, colour washing in from the corners',
    pal=dict(page='#E8DFD1', page2='#E1D7C8', card='#F6F0E7', **{'card-hover': '#FBF7F1'}, elevated='#EFE7DA', input='#FCF9F4',
             border='#D2C5B2', **{'border-subtle': '#E0D6C6', 'border-accent': '#C1B29C'},
             ink='#2A241D', text2='#554B3F', text3='#5E5346', **{'text-muted': '#7D7163'},
             accent='#6E5128', **{'accent-hover': '#58401E', 'accent-fill': '#7A5B2E', 'accent-fill-hover': '#6E5128', 'on-accent': '#FBF6EC',
                                  'accent-glow': '#8A6734'},
             success='#3E6E4A', warning='#7A5A12', danger='#9A3B2A', **{'on-danger': '#FFFFFF'}, info='#3C5183',
             **{'tag-purple': '#524686', 'tag-blue': '#3C5183', 'tag-orange': '#8A3B28', 'tag-pink': '#853A55', 'tag-teal': '#2A5F64'},
             sidebar='#E4DACB', **{'sidebar-border': '#D2C5B2'},
             **{'q-hu': '#C4705A', 'q-hu-text': '#8A3B28', 'q-hp': '#CFA24E', 'q-hp-text': '#6E5010', 'q-lu': '#7488B0', 'q-lu-text': '#3C5183',
                'q-lp': '#7CA886', 'q-lp-text': '#3E6E4A'}, field='#2A241D', **{'field-fg': '#F6F0E7'}),
    extra={'on-quadrant': '#1F1A14', 'wall': 'radial-gradient(60% 40% at 0% 0%, rgba(196, 112, 90, 0.22), transparent 70%), radial-gradient(60% 40% at 100% 8%, rgba(207, 162, 78, 0.22), transparent 70%), radial-gradient(70% 40% at 0% 100%, rgba(116, 136, 176, 0.24), transparent 70%), radial-gradient(70% 40% at 100% 100%, rgba(124, 168, 134, 0.24), transparent 70%), linear-gradient(180deg, #EDE5D9, #E4DACB)',
           'accent-lip': '#46321A', 'lip': '#CDBEA8',
           'fam-dt': '#DCEBEA', 'fam-dt-text': '#2A5F64', 'fam-dt-lip': '#A8CDCB',
           'fam-er': '#E7E3F2', 'fam-er-text': '#524686', 'fam-er-lip': '#C7BFE2',
           'fam-ie': '#F4E0E6', 'fam-ie-text': '#853A55', 'fam-ie-lip': '#E5B7C5',
           **dict(SQUARE_LIGHT, **{'--square-halo': '0', '--square-art': GLAZE, '--square-shade': 'transparent', '--square-tint': '0.38',
              '--square-edge': 'inset 0 3px 8px rgba(70, 52, 34, 0.28), inset 0 -1px 0 rgba(255, 255, 255, 0.7), 0 1px 0 rgba(255, 255, 255, 0.8)'})})

PASTEL_Q = {'q-hu': '#FFA898', 'q-hu-text': '#A33E2E', 'q-hp': '#FFDC7E', 'q-hp-text': '#7A5600', 'q-lu': '#A5BCFF', 'q-lu-text': '#34498F',
            'q-lp': '#A2E3C0', 'q-lp-text': '#276B48'}

ROOMS['pastel'] = dict(
    title='Pastel (light): blush into sky, candy corners, coral action',
    pal=dict(page='#F6E6F0', page2='#EFE3F2', card='#FFF7F3', **{'card-hover': '#FFF1EC'}, elevated='#FFEDE4', input='#FFFFFF',
             border='#EAD0D8', **{'border-subtle': '#F2E1E6', 'border-accent': '#DDBEC9'},
             ink='#2A2742', text2='#555170', text3='#5E5A78', **{'text-muted': '#847F9C'},
             accent='#A8423A', **{'accent-hover': '#8F352E', 'accent-fill': '#FFA898', 'accent-fill-hover': '#FF9C8A', 'on-accent': '#3A1820',
                                  'accent-glow': '#FF9C8A'},
             success='#2F7A55', warning='#7A5600', danger='#B0443A', **{'on-danger': '#FFFFFF'}, info='#3D5BAE',
             **{'tag-purple': '#6A4FA8', 'tag-blue': '#3D5BAE', 'tag-orange': '#A8492C', 'tag-pink': '#A8386B', 'tag-teal': '#1E6E66'},
             sidebar='#F3E3EC', **{'sidebar-border': '#EAD0D8'}, **PASTEL_Q, field='#3A3656', **{'field-fg': '#FFF7F3'}),
    extra={'on-quadrant': '#2A2742', 'wall': 'radial-gradient(90% 40% at 50% -8%, rgba(255, 247, 214, 0.9), transparent 72%), linear-gradient(180deg, #FFDDE8, #D9E6FF)',
           'accent-lip': '#D8766A', 'lip': '#EDBBA7',
           'fam-dt': '#DDF7F3', 'fam-dt-text': '#1E6B66', 'fam-dt-lip': '#93D5CC',
           'fam-er': '#EEE8FF', 'fam-er-text': '#4E3F99', 'fam-er-lip': '#BCAEF2',
           'fam-ie': '#FFE9F1', 'fam-ie-text': '#9A2F5C', 'fam-ie-lip': '#F2A9C4',
           **SQUARE_LIGHT})

ROOMS['pastel-mix'] = dict(
    title='Pastel mix (light): warm and cool pastels on every screen, periwinkle action',
    pal=dict(page='#F6EEF0', page2='#EFEAF6', card='#FFFBF9', **{'card-hover': '#FFF6F2'}, elevated='#F7F1F8', input='#FFFFFF',
             border='#E3D8E4', **{'border-subtle': '#EEE7EF', 'border-accent': '#D6C8DA'},
             ink='#2A2742', text2='#565272', text3='#5E5A79', **{'text-muted': '#86829E'},
             accent='#3F55B8', **{'accent-hover': '#33479C', 'accent-fill': '#B3C1FF', 'accent-fill-hover': '#A3B3FB', 'on-accent': '#1C2350',
                                  'accent-glow': '#9CAEFA'},
             success='#1E6B66', warning='#7A5600', danger='#B0443A', **{'on-danger': '#FFFFFF'}, info='#3F55B8',
             **{'tag-purple': '#4E3F99', 'tag-blue': '#3F55B8', 'tag-orange': '#A8492C', 'tag-pink': '#9A2F5C', 'tag-teal': '#1E6B66'},
             sidebar='#F3EEF5', **{'sidebar-border': '#E3D8E4'}, **PASTEL_Q, field='#3A3656', **{'field-fg': '#FFFBF9'}),
    extra={'on-quadrant': '#2A2742', 'wall': 'radial-gradient(75% 42% at 0% 0%, rgba(255, 190, 165, 0.60), transparent 70%), radial-gradient(60% 38% at 100% 4%, rgba(178, 232, 214, 0.50), transparent 70%), radial-gradient(65% 40% at 0% 100%, rgba(255, 218, 150, 0.42), transparent 70%), radial-gradient(80% 45% at 100% 100%, rgba(168, 196, 255, 0.62), transparent 70%), linear-gradient(160deg, #FFF0E8, #F3F0FA 50%, #EAF1FF)',
           'accent-lip': '#6E83DA', 'lip': '#DCD0E2',
           'fam-dt': '#DDF7F3', 'fam-dt-text': '#1E6B66', 'fam-dt-lip': '#93D5CC',
           'fam-er': '#EEE8FF', 'fam-er-text': '#4E3F99', 'fam-er-lip': '#BCAEF2',
           'fam-ie': '#FFE9F1', 'fam-ie-text': '#9A2F5C', 'fam-ie-lip': '#F2A9C4',
           **SQUARE_LIGHT})

ROOMS['daylight'] = dict(
    title='Daylight (light): bright and clear, full-strength colour, indigo action',
    pal=dict(page='#E6ECFD', page2='#DDE5FA', card='#FFFFFF', **{'card-hover': '#F6F8FF'}, elevated='#EEF2FF', input='#FFFFFF',
             border='#CBD4EE', **{'border-subtle': '#DDE3F5', 'border-accent': '#B7C2E2'},
             ink='#191C35', text2='#4B5275', text3='#555C80', **{'text-muted': '#7A809F'},
             accent='#2F3FA8', **{'accent-hover': '#24338F', 'accent-fill': '#2F3FA8', 'accent-fill-hover': '#24338F', 'on-accent': '#FFFFFF',
                                  'accent-glow': '#5B6BD6'},
             success='#1D6E46', warning='#7A5600', danger='#B01240', **{'on-danger': '#FFFFFF'}, info='#2B4FA3',
             **{'tag-purple': '#6A4FB0', 'tag-blue': '#2B4FA3', 'tag-orange': '#A8492C', 'tag-pink': '#A8306A', 'tag-teal': '#1F6E66'},
             sidebar='#E1E8FB', **{'sidebar-border': '#CBD4EE'},
             **{'q-hu': '#EE6A55', 'q-hu-text': '#A33A28', 'q-hp': '#F4BC48', 'q-hp-text': '#7A5600', 'q-lu': '#5E7FEA', 'q-lu-text': '#2B4FA3',
                'q-lp': '#3FBF8E', 'q-lp-text': '#1D6E46'}, field='#191C35', **{'field-fg': '#FFFFFF'}),
    extra={'on-quadrant': '#191C35', 'wall': 'radial-gradient(90% 42% at 50% -8%, rgba(255, 255, 255, 0.9), transparent 72%), linear-gradient(180deg, #EEF2FF, #DCE4FB)',
           'accent-lip': '#161F5E', 'lip': '#B7C2E2',
           'fam-dt': '#DDF3F0', 'fam-dt-text': '#1F6B66', 'fam-dt-lip': '#A8D8D1',
           'fam-er': '#E7E4FA', 'fam-er-text': '#4B3F9E', 'fam-er-lip': '#C3BAF0',
           'fam-ie': '#FBE3EC', 'fam-ie-text': '#96305C', 'fam-ie-lip': '#EDB3C8',
           **dict(SQUARE_LIGHT, **{'--square-halo': '0.42', '--square-shade': 'rgba(255, 255, 255, 0.2)', '--square-tint': '0.3'})})


def lum(h):
    h = h.lstrip('#'); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + .05) / (min(la, lb) + .05)


fail = 0
for rid, r in ROOMS.items():
    p, e = r['pal'], r['extra']
    missing = [t for t in TOK if t not in p]
    assert not missing, (rid, missing)
    checks = [('ink/page', p['ink'], p['page']), ('text2/page', p['text2'], p['page']), ('text3/card', p['text3'], p['card']),
              ('on-accent/fill', p['on-accent'], p['accent-fill']), ('accent/page', p['accent'], p['page']), ('accent/card', p['accent'], p['card']),
              ('on-danger/danger', p['on-danger'], p['danger'])]
    checks += [('%s/card' % q, p['%s-text' % q], p['card']) for q in ('q-hu', 'q-hp', 'q-lu', 'q-lp')]
    checks += [('%s text/tile' % f, e['%s-text' % f], e[f]) for f in ('fam-dt', 'fam-er', 'fam-ie')]
    # Tool cards put the room's ink and secondary text on the family tile too.
    checks += [('%s/%s tile' % (t, f), p[t], e[f]) for f in ('fam-dt', 'fam-er', 'fam-ie') for t in ('ink', 'text2')]
    checks += [('on-quadrant/%s' % q, e['on-quadrant'], p[q]) for q in ('q-hu', 'q-hp', 'q-lu', 'q-lp')]
    for name, fg, bg in checks:
        r_ = ratio(fg, bg)
        if r_ < 4.5:
            fail += 1
            print('%-10s %-18s %.2f FAIL' % (rid, name, r_))
print('contrast failures:', fail)

out = []
for rid, r in ROOMS.items():
    p, e = r['pal'], r['extra']
    out.append('/* ── Room: %s ── */' % r['title'])
    sel = ':root[data-palette="%s"]' % rid
    if rid == 'velvet':
        sel = ':root:not([data-palette]),\n' + sel
    out.append(sel + ' {')
    for t in TOK:
        out.append('  --pal-%s-light: %s;  --pal-%s-dark: %s;' % (t, p[t], t, p[t]))
    out.append('  /* room-only tokens (a room has one mode, so these skip the light/dark pairing) */')
    for k, v in e.items():
        out.append('  %s: %s;' % (k, v) if k.startswith('--') else '  --color-%s: %s;' % (k, v))
    out.append('}')
    out.append('')
if fail:
    sys.exit(1)
css_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'index.css')
css = open(css_path, encoding='utf8').read()
begin, end = '/* ROOMS:BEGIN', '/* ROOMS:END */'
i, j = css.index(begin), css.index(end)
i = css.index('*/', i) + 2
css = css[:i] + '\n' + '\n'.join(out) + css[j:]
open(css_path, 'w', encoding='utf8').write(css)
print('wrote', len(ROOMS), 'rooms to src/index.css')
