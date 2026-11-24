#!/usr/bin/env python3
"""Generated fallback colors from design image pixels; never maintain per design."""
import argparse,json,re
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'qa/design-system/artwork-backgrounds.generated.json'
LAB=ROOT/'qa/design-system/index.html'

def sample(path):
 with Image.open(path) as raw:
  im=raw.convert('RGBA').resize((48,60),Image.Resampling.BILINEAR)
 px=im.load();groups={};samples=[]
 for y in range(60):
  for x in range(48):
   corner=(x<6 or x>=42) and (y<6 or y>=54)
   perimeter=(x<2 or x>=46 or y<2 or y>=58)
   if not (corner or perimeter):continue
   r,g,b,a=px[x,y]
   if a<245:continue
   rgb=(r,g,b);weight=4 if corner else 1;key=(r>>4,g>>4,b>>4)
   count,total=groups.get(key,(0,[0,0,0]))
   groups[key]=(count+weight,[total[i]+rgb[i]*weight for i in range(3)])
   samples.append(rgb)
 if not samples:return None
 count,total=max(groups.values(),key=lambda it:it[0])
 center=[c/count for c in total]
 near=[rgb for rgb in samples if max(abs(rgb[c]-center[c]) for c in range(3))<=28]
 values=near if len(near)>=8 else samples
 med=[sorted(v[c] for v in values)[len(values)//2] for c in range(3)]
 return '#'+''.join(f'{v:02x}' for v in med)

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--print',dest='show',action='store_true')
 parser.add_argument('--check',action='store_true')
 args=parser.parse_args()
 colors={}
 for path in sorted((ROOT/'d').glob('*.webp')):
  value=sample(path)
  if value:colors[path.stem]=value
 result=json.dumps(colors,sort_keys=True,separators=(',',':'))
 if args.show:print('ICMX_ART_BG_JSON='+result)
 source=LAB.read_text(encoding='utf-8')
 matcher=re.search(r'const ART_BG_GENERATED=(\{[^\n]*\});',source)
 if not matcher:raise SystemExit('LAB missing generated background map marker')
 embedded=json.loads(matcher.group(1))
 if args.check:
  if not OUT.exists() or json.loads(OUT.read_text(encoding='utf-8'))!=colors or embedded!=colors:
   raise SystemExit('Generated color map is stale: run scripts/generate-artwork-backgrounds.py')
 else:
  OUT.write_text(result+'\n',encoding='utf-8')
  LAB.write_text(source[:matcher.start(1)]+result+source[matcher.end(1):],encoding='utf-8')
 print(f'Artwork backgrounds: {len(colors)}',flush=True)
if __name__=='__main__':main()
