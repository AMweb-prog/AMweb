# -*- coding: utf-8 -*-
"""Tell Bing, Yandex, Seznam, Naver and the other IndexNow engines that the site changed.

    python build/indexnow.py          -> submits every URL of https://www.amweb.ma/sitemap.xml

Run it after a push, once Vercel shows the deployment as "Ready".
The key file 3d1a167b246d445a6eb654fe50899a16.txt (repo root) is published at https://www.amweb.ma/3d1a167b246d445a6eb654fe50899a16.txt
and proves the site is ours. Google does not use IndexNow: use Search Console for Google.
"""
import json, re, sys, urllib.request, urllib.error

HOST = 'www.amweb.ma'
KEY = '3d1a167b246d445a6eb654fe50899a16'


def main():
    xml = urllib.request.urlopen(f'https://{HOST}/sitemap.xml', timeout=30).read().decode('utf-8')
    urls = re.findall(r'<loc>(.*?)</loc>', xml)
    if not urls:
        sys.exit('No URL found in the sitemap.')
    body = json.dumps({'host': HOST, 'key': KEY, 'keyLocation': f'https://{HOST}/{KEY}.txt', 'urlList': urls}).encode('utf-8')
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=body, method='POST',
                                 headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f'OK ({r.status}): {len(urls)} URLs sent to IndexNow (Bing, Yandex, Seznam, Naver...).')
    except urllib.error.HTTPError as e:
        msg = {400: 'bad request', 403: 'key not found online yet: wait for the Vercel deployment, then retry',
               422: 'URLs do not match the host or the key', 429: 'too many requests: retry later'}.get(e.code, '')
        sys.exit(f'IndexNow answered {e.code} {msg}')


if __name__ == '__main__':
    main()
