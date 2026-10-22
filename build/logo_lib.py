import json
import os
L=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logo.json')))
FULL_VB="244 206 414 96"
MARK_VB="244 206 182 96"
def mark(uid):
    letters=''.join(f'<path d="{d}"/>' for d in L['letters'])
    return (f'<defs><mask id="{uid}k" maskUnits="userSpaceOnUse" x="230" y="190" width="460" height="130"><rect x="230" y="190" width="460" height="130" fill="#fff"/>'
      f'<g transform="{L["LT"]}" fill="none" stroke="#000" stroke-width="27" stroke-linecap="round" stroke-linejoin="round">{letters}</g></mask>'
      f'<clipPath id="{uid}f"><rect x="240" y="233" width="190" height="80"/></clipPath></defs>'
      f'<g mask="url(#{uid}k)"><path class="lg-ob" pathLength="1" d="{L["back_d"]}" transform="{L["back_t"]}" fill="none" stroke-width="4.5" style="stroke:var(--lg-orbit)"/></g>'
      f'<g class="lg-letters" transform="{L["LT"]}" fill="none" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--lg-letter)">{letters}</g>'
      f'<g clip-path="url(#{uid}f)"><path class="lg-of" pathLength="1" d="{L["front_d"]}" transform="{L["LT"]}" fill="none" stroke-width="4.5" stroke-linecap="round" style="stroke:var(--lg-orbit)"/></g>'
      f'<g style="fill:var(--lg-dot)"><path class="lg-dot" d="{L["dots"][0]}"/><path class="lg-dot" d="{L["dots"][1]}"/></g>')
def web():
    return '<g class="lg-web" style="fill:var(--lg-web)">'+''.join(f'<path transform="translate({x} {y})" d="{g}"/>' for g,x,y in L['web'])+'</g>'
def full_svg(uid, cls='', label='AMweb'):
    return f'<svg class="{cls}" viewBox="{FULL_VB}" role="img" aria-label="{label}">{mark(uid)}{web()}</svg>'
def mark_svg(uid, cls='', label=None):
    a=f'role="img" aria-label="{label}"' if label else 'aria-hidden="true"'
    return f'<svg class="{cls}" viewBox="{MARK_VB}" {a}>{mark(uid)}</svg>'
def sprite():
    return (f'<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
            f'<symbol id="lg-full" viewBox="{FULL_VB}">{mark("sf")}{web()}</symbol>'
            f'<symbol id="lg-mark" viewBox="{MARK_VB}">{mark("sm")}</symbol></svg>')
