import urllib.request, json

caps = [
    ('pikachu-original-cap', '皮卡丘 XY帽', 'Pikachu Original Cap'),
    ('pikachu-hoenn-cap',    '皮卡丘 ORAS帽', 'Pikachu Hoenn Cap'),
    ('pikachu-sinnoh-cap',   '皮卡丘 DPPT帽', 'Pikachu Sinnoh Cap'),
    ('pikachu-unova-cap',    '皮卡丘 BW帽', 'Pikachu Unova Cap'),
    ('pikachu-kalos-cap',    '皮卡丘 XY帽2', 'Pikachu Kalos Cap'),
    ('pikachu-alola-cap',    '皮卡丘 SM帽', 'Pikachu Alola Cap'),
    ('pikachu-partner-cap',  '皮卡丘 搭档帽', 'Pikachu Partner Cap'),
    ('pikachu-world-cap',    '皮卡丘 世界帽', 'Pikachu World Cap'),
]
event = [
    ('magearna-original',    '马盖娜 原色', 'Magearna Original Color'),
    ('zarude-dada',          '扎鲁德 爸爸', 'Zarude Dada'),
    ('calyrex-ice',          '蕾冠王 白马骑士', 'Calyrex Ice Rider'),
    ('calyrex-shadow',       '蕾冠王 黑马骑士', 'Calyrex Shadow Rider'),
    ('hoopa-unbound',        '胡帕 魔圈解放', 'Hoopa Unbound'),
    ('shaymin-sky',          '谢米 天空形', 'Shaymin Sky Forme'),
    ('keldeo-resolute',      '克雷色利亚 觉悟形', 'Keldeo Resolute Forme'),
    ('meloetta-pirouette',   '梅洛耶塔 歌舞形', 'Meloetta Pirouette Forme'),
    ('necrozma-dawn',        '奈克洛兹玛 日食', 'Necrozma Dawn Wings'),
    ('necrozma-dusk',        '奈克洛兹玛 月食', 'Necrozma Dusk Mane'),
    ('zygarde-complete',     '基格尔德 完全形', 'Zygarde Complete Forme'),
    ('urshifu-rapid-strike', '武道熊师 连击流', 'Urshifu Rapid Strike'),
]

results = []
for slug, zh, en in caps + event:
    try:
        url = 'https://pokeapi.co/api/v2/pokemon/' + slug
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
        home = data.get('sprites', {}).get('other', {}).get('home', {}).get('front_default')
        artwork = data.get('sprites', {}).get('other', {}).get('official-artwork', {}).get('front_default')
        basic = data.get('sprites', {}).get('front_default')
        sprite = home or artwork or basic
        results.append({'slug': slug, 'zh': zh, 'en': en, 'pokeId': data['id'], 'sprite': sprite})
        print('OK', slug, 'id=' + str(data['id']), 'home=' + ('yes' if home else 'no'))
    except Exception as e:
        print('MISS', slug, str(e))

with open('./data/event-sprites.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print('Saved', len(results), 'entries')
