# -*- coding: utf-8 -*-
"""Rebuilds the free guide PDF from guide-site-web-maroc.html (local tool, not run by Vercel).

    pip install playwright && python -m playwright install chromium
    python build/guide/make_pdf.py
"""
import os
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'guide-site-web-maroc.html')
OUT = os.path.join(HERE, '..', '..', 'assets', 'guide', 'guide-site-web-maroc-amweb.pdf')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page()
    page.goto('file://' + SRC)
    page.wait_for_timeout(800)          # fonts
    page.pdf(path=OUT, format='A4', print_background=True, margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'})
    b.close()
print('wrote', os.path.normpath(OUT))
