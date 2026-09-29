# Moodboard broken cover inventory

Probe results for every `cover` URL in `src/content/moodboard/raindrop-collection.json`,
captured 2026-09-19 with a browser User-Agent: 81 of 133 returned 200, 52 did not.

> **Update 2026-09-29.** The collection has since been re-synced and now holds 158 items
> (42 added, 17 removed), so the counts below describe the 133-item dump as it stood on
> 2026-09-19 and are kept as a historical record rather than a current census. The probe
> has not been re-run in full. What *was* re-tested is the recovery hypothesis at the
> bottom of this section, and it is wrong — see below.

`Raindrop ID` matches `_id` in that file; the corresponding Item id is `raindrop:<id>`.
"Source page" is the Item's `link`, which is often still live even when the cover is not.

| Host | Count | HTTP | Recoverable? |
| --- | --- | --- | --- |
| `scontent.cdninstagram.com` (+2 shard variants) | 42 | 403 | No — expired signed URLs |
| `rdl.ink` | 7 | 500 ×6, 415 ×1 | Maybe — Raindrop's render service erroring |
| `pbs.twimg.com` | 2 | 404 | No — deleted tweets |
| `en.goodtimes.my` | 1 | timeout | Maybe — host may be down |

The 42 Instagram items carry signed URLs that expired years ago, with `file` null and
every `media[]` entry pointing at the same expired host.

**They do not come back by re-fetching from the Raindrop API.** This document originally
claimed the API re-signs them. That was never tested and is false: a re-fetch on 2026-09-29
returned byte-identical cover URLs (0 changed across the 116 items present in both dumps),
and 8 of 8 sampled Instagram covers still returned 403 afterwards, while 4 non-Instagram
controls from the same response returned 200. Raindrop stores the cover URL captured at
bookmark time; it does not re-derive it. These 42 are permanently lost unless re-captured
from Instagram directly.

Worked in `.scratch/moodboard-canvas/issues/` — ticket 01 (the `rdl.ink` seven),
then 16 → 17 for mirroring and host retirement. Ticket 15 (resync) is closed
`wontfix`: it ran, and recovered nothing.

### Instagram (42)

| Raindrop ID | Title | HTTP | Source page |
| --- | --- | --- | --- |
| `338402074` | FUTUREVVORLD on Instagram: “Design Common Sands Recycling e- | 403 | [link](https://www.instagram.com/p/CW6WNvOPngP/) |
| `340257936` | Moon Collective™ on Instagram: “Weekend Inspo.” | 403 | [link](https://www.instagram.com/p/CXHC0fMvy83/) |
| `326957612` | sabukaru.online on Instagram: “Acrobats Delivering Noodles - | 403 | [link](https://www.instagram.com/p/CVmu4D2BuPz/) |
| `390059030` | A post shared by Studio Airport (@studio.airport) | 403 | [link](https://www.instagram.com/p/CZwoC8EMNJi/?igshid=MDJmNzVkMjY=) |
| `399402894` | A post shared by Tomas Sanchez (@tomassanchezstudio) | 403 | [link](https://www.instagram.com/p/CeGZ4GqtwDg/?igshid=MDJmNzVkMjY=) |
| `399404878` | A post shared by Studio Ghibli (@ghibliarchives) | 403 | [link](https://www.instagram.com/p/CeFIBETJqVr/?igshid=MDJmNzVkMjY=) |
| `399992402` | A post shared by HIDDEN ⓗ (@hidden.ny) | 403 | [link](https://www.instagram.com/p/CeNOlBXL86k/?igshid=MDJmNzVkMjY=) |
| `399992596` | A post shared by Valenberg (@mr.valenberg) | 403 | [link](https://www.instagram.com/p/CeMRTbqIGWw/?igshid=MDJmNzVkMjY=) |
| `401160638` | A post shared by Tomas Sanchez (@tomassanchezstudio) | 403 | [link](https://www.instagram.com/p/CeVz0G_t-Cr/?igshid=MDJmNzVkMjY=) |
| `401160906` | A post shared by Studio Ghibli (@ghibliarchives) | 403 | [link](https://www.instagram.com/p/CeUaarJpZU_/?igshid=MDJmNzVkMjY=) |
| `403711809` | A post shared by 👁ee Яe⏪erse Ⓕ or C🧺re (@seereverseforcare) | 403 | [link](https://www.instagram.com/p/CemePFuv0es/?igshid=MDJmNzVkMjY=) |
| `403738404` | A post shared by @madebynelson | 403 | [link](https://www.instagram.com/p/Cd5zN_-hCHo/?igshid=MDJmNzVkMjY=) |
| `422177672` | A post shared by Lennard Schuurmans Tattoo (@lennyflash) | 403 | [link](https://www.instagram.com/p/CeLl39QsX14/?igshid=MDJmNzVkMjY=) |
| `441427780` | A post shared by MODERNNOTORIETY (@modernnotoriety) | 403 | [link](https://www.instagram.com/p/CiDZQDAOYDm/?igshid=MDJmNzVkMjY=) |
| `443924595` | A post shared by Rodrigo (@rodrigosalcedo.v) | 403 | [link](https://www.instagram.com/p/CN5ea9tDEZS/?igshid=MDJmNzVkMjY=) |
| `450155113` | A post shared by newbalance_t_house (@newbalance_t_house) | 403 | [link](https://www.instagram.com/reel/Ci4D8xQI655/?igshid=MDJmNzVkMjY=) |
| `459672676` | A post shared by Pruden Tatuaxes (@pruden.tt) | 403 | [link](https://www.instagram.com/p/CWtieUAL03n/?igshid=MDJmNzVkMjY=) |
| `484883247` | A post shared by HIDDEN ⓗ (@hidden.ny) | 403 | [link](https://www.instagram.com/p/CmF1PHKLmJL/?igshid=MDJmNzVkMjY=) |
| `490453908` | A post shared by Infinite Odyssey Magazine (@infiniteodyssey | 403 | [link](https://www.instagram.com/p/CmhG8mYOkAH/?igshid=MDJmNzVkMjY=) |
| `499400336` | A post shared by Tomas Sanchez (@tomassanchezstudio) | 403 | [link](https://www.instagram.com/p/CnO2yiatiI-/?igshid=MDJmNzVkMjY=) |
| `499524838` | A post shared by Anthony Bourdain Fan Club (@anthonybourdain | 403 | [link](https://www.instagram.com/reel/Cm91CYro5gb/?igshid=MDJmNzVkMjY=) |
| `506083995` | A post shared by See Яeverse for Care (@seereverseforcare) | 403 | [link](https://www.instagram.com/p/Cns4HPOLZ_b/?igshid=MDJmNzVkMjY=) |
| `506086861` | A post shared by Sporty & Rich (@sportyandrich) | 403 | [link](https://www.instagram.com/p/CnrrvEQr9oa/?igshid=MDJmNzVkMjY=) |
| `506094416` | A post shared by HIDDEN ⓗ (@hidden.ny) | 403 | [link](https://www.instagram.com/p/CnqCVKdvPHf/?igshid=MDJmNzVkMjY=) |
| `506099806` | A post shared by Kotaro Chiba / チバコウタロウ (@kotaro_chiba) | 403 | [link](https://www.instagram.com/p/CnpQLQFrWDI/?igshid=MDJmNzVkMjY=) |
| `507758694` | A post shared by MODERNNOTORIETY (@modernnotoriety) | 403 | [link](https://www.instagram.com/p/Cn2kskKO__L/?igshid=MDJmNzVkMjY=) |
| `510329374` | A post shared by Studio Ghibli (Archives) (@ghibliarchives) | 403 | [link](https://www.instagram.com/reel/CoDIEizJeGk/?igshid=MDJmNzVkMjY=) |
| `510332145` | A post shared by See Яeverse for Care (@seereverseforcare) | 403 | [link](https://www.instagram.com/p/CoC9oS2JJZJ/?igshid=MDJmNzVkMjY=) |
| `511089135` | A post shared by Anthony Bourdain Fan Club (@anthonybourdain | 403 | [link](https://www.instagram.com/reel/CoAYZ45rXMl/?igshid=MDJmNzVkMjY=) |
| `511153071` | A post shared by cozyvu (@cozyvu) | 403 | [link](https://www.instagram.com/reel/CoGOZzRDmGN/?igshid=MDJmNzVkMjY=) |
| `512260787` | A post shared by レトロジャパン (@retrojapan._) | 403 | [link](https://www.instagram.com/p/CoLTFypo32Z/?igshid=MDJmNzVkMjY=) |
| `512260813` | A post shared by cozyvu (@cozyvu) | 403 | [link](https://www.instagram.com/p/CoLP8xgjtFa/?igshid=MDJmNzVkMjY=) |
| `513402610` | A post shared by See Яeverse for Care (@seereverseforcare) | 403 | [link](https://www.instagram.com/p/CoQUojAydWc/?igshid=MDJmNzVkMjY=) |
| `517426325` | A post shared by MODERNNOTORIETY (@modernnotoriety) | 403 | [link](https://www.instagram.com/p/ColDujuulLL/?igshid=MDJmNzVkMjY=) |
| `518585637` | A post shared by See Яeverse for Care (@seereverseforcare) | 403 | [link](https://www.instagram.com/p/CosZg2Dvg4Q/?igshid=MDJmNzVkMjY=) |
| `518755701` | A post shared by cozyvu (@cozyvu) | 403 | [link](https://www.instagram.com/reel/Cos7pqfLwYX/?igshid=MDJmNzVkMjY=) |
| `518854887` | A post shared by HIDDEN ⓗ (@hidden.ny) | 403 | [link](https://www.instagram.com/reel/CoqCstGru7z/?igshid=MDJmNzVkMjY=) |
| `519259112` | A post shared by HIDDEN ⓗ (@hidden.ny) | 403 | [link](https://www.instagram.com/p/Covzq4jJgWo/?igshid=MDJmNzVkMjY=) |
| `519260343` | A post shared by MODERNNOTORIETY (@modernnotoriety) | 403 | [link](https://www.instagram.com/p/CovLl2kuKym/?igshid=MDJmNzVkMjY=) |
| `521773830` | A post shared by MODERNNOTORIETY (@modernnotoriety) | 403 | [link](https://www.instagram.com/p/Co3DyqAuIcw/?igshid=MDJmNzVkMjY=) |
| `524475788` | A post shared by MODERNNOTORIETY (@modernnotoriety) | 403 | [link](https://www.instagram.com/p/CnDzd1BOu65/) |
| `524479097` | A post shared by MODERNNOTORIETY (@modernnotoriety) | 403 | [link](https://www.instagram.com/p/Cna3M_GupBy/) |

### rdl.ink (7)

| Raindrop ID | Title | HTTP | Source page |
| --- | --- | --- | --- |
| `559163735` | 1637177188071129089.gif | 415 | [link](https://api.raindrop.io/v2/raindrop/559163735/file?type=image/gif) |
| `397697806` | image.png | 500 | [link](https://api.raindrop.io/v2/raindrop/397697806/file?type=image/png) |
| `407278234` | Original cb0fe83f7dbe0630ddd2e6be181e24ce | 500 | [link](https://d2w9rnfcy7mm78.cloudfront.net/8142042/original_cb0fe83f7dbe0630ddd2e6be181e24ce.jpg?1595857097?bc=0) |
| `495660822` | andres m. garza | 500 | [link](http://andresmgarza.com/) |
| `769657797` | Quote | 500 | [link](https://s3.eu-central-1.wasabisys.com/cache.raindrop.io/769/657/797/file?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=BE6X466RAMMR6TB09V4G%2F20241012%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20241012T003655Z&X-Amz-Expires=1800&X-Amz-Signature=672abb0345614757bbb53ec3f6235481c55bd7d83933de29eb1cd30276b20dea&X-Amz-SignedHeaders=host&x-id=GetObject) |
| `807249791` | Kakashi | 500 | [link](https://s3.eu-central-1.wasabisys.com/cache.raindrop.io/807/249/791/file?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=BE6X466RAMMR6TB09V4G%2F20241012%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Date=20241012T002805Z&X-Amz-Expires=1800&X-Amz-Signature=0e504823a76f3d50c33381d9af6acf800b9d5fa6ff54461a17100d9f17144cbf&X-Amz-SignedHeaders=host&x-id=GetObject) |
| `872257170` | Memories (1995) - Japan | 500 | [link](https://scontent.cdninstagram.com/v/t51.29350-15/452077227_456658530464385_9028884203222342293_n.jpg?stp=dst-jpg_e35&efg=eyJ2ZW5jb2RlX3RhZyI6ImltYWdlX3VybGdlbi4xNDQweDE4MDAuc2RyLmYyOTM1MC5kZWZhdWx0X2ltYWdlIn0&_nc_ht=scontent.cdninstagram.com&_nc_cat=109&_nc_ohc=jUpO3bHYVSQQ7kNvgHqw-u-&_nc_gid=fb175ede6d5d47ea9b240afb66c95c6a&edm=APs17CUBAAAA&ccb=7-5&ig_cache_key=MzQxODM4ODI2NTY4Njg3NTgwOA%3D%3D.3-ccb7-5&oh=00_AYCQP3vrFumnEHM7K8tv0ZHfg8HWFuGphfZ1cQaEajj4dg&oe=670F1DB6&_nc_sid=10d13b) |

### Twitter (2)

| Raindrop ID | Title | HTTP | Source page |
| --- | --- | --- | --- |
| `500222189` | Present & Correct on Twitter | 404 | [link](https://twitter.com/presentcorrect/status/1509149563264946181?s=12&t=IumCXuZD8pJW9GuLqMq6ZQ) |
| `507430687` | ActionMovieDad on Twitter | 404 | [link](https://twitter.com/actionmoviekid/status/1617989809087336448?s=12&t=VdD2x5tljFJZi2naWhd-fw) |

### Other (1)

| Raindrop ID | Title | HTTP | Source page |
| --- | --- | --- | --- |
| `492918659` | Old man spent 30 years planting flowers for his blind wife—t | timeout | [link](https://en.goodtimes.my/2018/03/19/old-man-spent-30-years-planting-flowers-blind-wife-result-unexpectedly-surprising/?utm_source=poolsuite-palmreport&utm_medium=palmreport-newsletter&utm_campaign=issue15) |
