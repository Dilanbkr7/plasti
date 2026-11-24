from pathlib import Path
from pdf2image import convert_from_path
from PIL import Image, ImageDraw
base=Path(__file__).parent
import uuid
out=base/('paginas_'+uuid.uuid4().hex[:8]); out.mkdir(exist_ok=True)
imgs=convert_from_path(str(base/'verificacion.pdf'),dpi=100,output_folder=str(out),fmt='png',paths_only=True,thread_count=4,output_file='page')
for n,start in enumerate(range(0,len(imgs),8),1):
    canvas=Image.new('RGB',(1200,1760),'#dddddd'); draw=ImageDraw.Draw(canvas)
    for j,f in enumerate(imgs[start:start+8]):
        im=Image.open(f); im.thumbnail((570,408))
        x=(j%2)*600+(600-im.width)//2; y=(j//2)*440+24
        canvas.paste(im,(x,y)); draw.text(((j%2)*600+15,(j//2)*440+5),f'Página {start+j+1}',fill='black')
    canvas.save(base/f'contacto-{n}.png')
(base/'paginas.txt').write_text('\n'.join(imgs),encoding='utf-8')
print('Páginas renderizadas',len(imgs))
