from pathlib import Path
from pdf2image import convert_from_path
from PIL import Image, ImageDraw
from pypdf import PdfReader
import uuid, re
B=Path(__file__).parent
out=B/('revision_'+uuid.uuid4().hex[:8]);out.mkdir()
pages=PdfReader(B/'final.pdf').pages
paths=convert_from_path(str(B/'final.pdf'),dpi=110,output_folder=str(out),fmt='png',paths_only=True,thread_count=3,output_file='page')
assert len(pages)==len(paths)
for start in range(0,len(paths),6):
    canvas=Image.new('RGB',(1500,1600),'#dddddd'); draw=ImageDraw.Draw(canvas)
    for j,f in enumerate(paths[start:start+6]):
        im=Image.open(f);im.thumbnail((725,490));x=(j%2)*750+(750-im.width)//2;y=(j//2)*530+28
        canvas.paste(im,(x,y));draw.text(((j%2)*750+10,(j//2)*530+8),f'Página {start+j+1}',fill='black')
    canvas.save(out/f'contacto-{start//6+1}.png')
print('RENDER',out)
for i,pg in enumerate(pages):
    tx=pg.extract_text(); print(i+1, len(tx),tx[:125].replace('\n',' | '))
(B/'imagenes_actuales.txt').write_text('\n'.join(paths),encoding='utf-8')
(B/'render_actual.txt').write_text(str(out),encoding='utf-8')
text='\n'.join(pg.extract_text() for pg in pages)
for bad in ['MongoDB','MySQL','Paulo Cisneros','arrendatario','residencias','Marcador no definido']:
    assert bad.lower() not in text.lower(),bad
print('Sin contenido ajeno o marcadores rotos')
