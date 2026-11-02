#!/usr/bin/env python3
"""提出前の静的チェック。CI と手元の両方で使う（標準ライブラリのみ）。

    python3 scripts/check.py              # いつものチェック
    python3 scripts/check.py --tag v1.4.0 # タグと manifest の version が一致するかも見る

見ているもの:
- 各言語の messages.json のキーが既定の言語と揃っているか
- メッセージ中の $NAME$ が placeholders に定義され、言語間で数が揃っているか
- 拡張機能名・概要がストアの文字数の上限に収まっているか
- コードと HTML から参照しているキーが存在するか（使われていないキーは警告のみ）
- manifest と HTML が参照するファイルが存在し、package.sh の FILES に入っているか
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIMITS = {'name': 75, 'description': 132}

errors = []
warnings = []


def load_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as e:
        errors.append(f'{path.relative_to(ROOT)}: 読めません ({e})')
        return None


def placeholders_in(message):
    # $$ はドル記号そのもの、$1 などは位置指定なので除く
    return {m.lower() for m in re.findall(r'\$([A-Za-z0-9_@]+)\$', message.replace('$$', ''))}


def check_locales(manifest):
    default = manifest.get('default_locale')
    locales = {p.parent.name: load_json(p) for p in sorted((ROOT / '_locales').glob('*/messages.json'))}
    if default not in locales:
        errors.append(f'default_locale "{default}" の messages.json がありません')
        return {}
    base = locales[default] or {}

    for lang, msgs in locales.items():
        if msgs is None:
            continue
        where = f'_locales/{lang}'
        for key in sorted(set(base) - set(msgs)):
            errors.append(f'{where}: キー "{key}" がありません')
        for key in sorted(set(msgs) - set(base)):
            errors.append(f'{where}: キー "{key}" は {default} にありません')
        for key, entry in msgs.items():
            text = entry.get('message')
            if not isinstance(text, str):
                errors.append(f'{where}: "{key}" に message がありません')
                continue
            defined = {k.lower() for k in entry.get('placeholders', {})}
            used = placeholders_in(text)
            for name in sorted(used - defined):
                errors.append(f'{where}: "{key}" の ${name}$ が placeholders にありません')
            if key in base and lang != default:
                base_used = placeholders_in(base[key].get('message', ''))
                if used != base_used:
                    errors.append(f'{where}: "{key}" の置き換え文字 {sorted(used)} が {default} の {sorted(base_used)} と違います')
            if key in LIMITS and len(text) > LIMITS[key]:
                errors.append(f'{where}: "{key}" が {len(text)} 文字で、上限の {LIMITS[key]} を超えています')
    return base


def check_keys(manifest, base):
    sources = {p: p.read_text(encoding='utf-8') for p in sorted(ROOT.glob('*.js')) + sorted(ROOT.glob('*.html'))}
    sources[ROOT / 'manifest.json'] = json.dumps(manifest)

    patterns = [
        r'__MSG_(\w+)__',
        r'(?:i18n|getMessage)\(\s*[\'"](\w+)[\'"]',
        r'data-i18n[\w-]*="(\w+)"',
        r'titleKey:\s*[\'"](\w+)[\'"]',
        r'(?:i18n|getMessage)\([^;]*?\?\s*[\'"](\w+)[\'"]\s*:\s*[\'"](\w+)[\'"]',
    ]
    for path, text in sources.items():
        for pat in patterns:
            for m in re.finditer(pat, text):
                for key in filter(None, m.groups()):
                    if key not in base:
                        errors.append(f'{path.relative_to(ROOT)}: キー "{key}" が messages.json にありません')

    everything = '\n'.join(sources.values())
    for key in sorted(base):
        if key in ('name', 'description'):
            continue
        if not re.search(rf'[\'"]{key}[\'"]|__MSG_{key}__', everything):
            warnings.append(f'キー "{key}" はどこからも使われていないようです')


def package_files():
    text = (ROOT / 'scripts/package.sh').read_text(encoding='utf-8')
    m = re.search(r'FILES=\((.*?)\)', text, re.S)
    return set(m.group(1).split()) if m else set()


def referenced_files(manifest):
    refs = set()
    refs.update(manifest.get('icons', {}).values())
    action = manifest.get('action', {})
    refs.update(action.get('default_icon', {}).values())
    for key in ('default_popup',):
        if key in action:
            refs.add(action[key])
    if 'options_page' in manifest:
        refs.add(manifest['options_page'])
    if 'service_worker' in manifest.get('background', {}):
        refs.add(manifest['background']['service_worker'])
    for cs in manifest.get('content_scripts', []):
        refs.update(cs.get('js', []))
        refs.update(cs.get('css', []))
    for page in [r for r in list(refs) if r.endswith('.html')]:
        path = ROOT / page
        if path.exists():
            html = path.read_text(encoding='utf-8')
            refs.update(f for f in re.findall(r'(?:src|href)="([^":#?]+)"', html) if '//' not in f)
    return refs


def check_files(manifest):
    packaged = package_files()
    if not packaged:
        errors.append('scripts/package.sh の FILES を読めません')
        return
    needed = referenced_files(manifest) | {'manifest.json'}
    needed |= {str(p.relative_to(ROOT)) for p in (ROOT / '_locales').glob('*/messages.json')}
    for f in sorted(needed):
        if not (ROOT / f).is_file():
            errors.append(f'{f} が見つかりません')
        elif f not in packaged:
            errors.append(f'{f} が scripts/package.sh の FILES に入っていません')
    for f in sorted(packaged - needed):
        if not (ROOT / f).is_file():
            errors.append(f'scripts/package.sh の {f} が見つかりません')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--tag', help='リリースのタグ（例: v1.4.0）。manifest の version と比べる')
    args = parser.parse_args()

    manifest = load_json(ROOT / 'manifest.json')
    if manifest is not None:
        version = manifest.get('version', '')
        if not re.fullmatch(r'\d+(\.\d+){0,3}', version):
            errors.append(f'manifest.json の version "{version}" の形式が正しくありません')
        if args.tag and args.tag.removeprefix('v') != version:
            errors.append(f'タグ {args.tag} と manifest.json の version {version} が一致しません')
        base = check_locales(manifest)
        check_keys(manifest, base)
        check_files(manifest)

    for w in warnings:
        print(f'警告: {w}')
    for e in errors:
        print(f'エラー: {e}', file=sys.stderr)
    if errors:
        sys.exit(1)
    print('OK')


if __name__ == '__main__':
    main()
