from pathlib import Path
from copy import deepcopy
import hashlib, json, re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION_START
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.table import Table
from datos import HU, RR

B=Path(__file__).parent
SRC=Path(r'C:\Users\pauly\Downloads\CAP-3.docx')
OUT=B.parent/'CAP-3_PLASTIMAD_COMPLETO.docx'
d=Document(SRC)
sections=[deepcopy(s._sectPr) for s in d.sections]
hu_template=deepcopy(d.tables[1]._tbl)
source_hash=hashlib.sha256(SRC.read_bytes()).hexdigest()
(B/'artifact.md').write_text(f'''# Contrato de edición de CAP 3
Referencia: {SRC}
SHA256: {source_hash}
Referencia visual: original.pdf y original_contacto.png, 13 páginas.
Se conservan el título ANEXO II, la tipografía Arial, las fichas HU de dos columnas
y ocho filas, el orden requerimientos > HU > Product Backlog > Sprint Backlog,
los cinco campos del Product Backlog y los siete del Sprint Backlog.
Página: A4 vertical y A4 horizontal para el Sprint Backlog; se conservan las
propiedades de las tres secciones de la referencia y sus pies con numeración.
Vertical inicial: márgenes izquierda/superior 0.9847 pulgadas, derecha/inferior 1.18125.
Horizontal: izquierda 0.9847, derecha/superior 1.18125 e inferior 0.9847 pulgadas.
Se reemplaza todo el contenido del cuerpo, que mezcla apuntes y tablas de otro
proyecto; se mantienen estilos, encabezados, pies y relaciones del paquete original.
Se amplían las fichas a 12, se normaliza HU-001 a HU-012 y tablas 1 a 15.
Se elimina el contenido de alojamientos, otros responsables y referencias a MongoDB.
Las nuevas tablas usan borde gris claro, cabecera gris clara y Arial 10 puntos.
El cuerpo usa Arial 11 y los títulos 14/12, sin adornos; sin alturas fijas.
El Sprint Backlog conserva bloques con celdas ID y nombre combinadas y HU individuales.
Cambio autorizado: SQL con PostgreSQL en Supabase; 240 horas estimadas en total;
estado Finalizado según indicación del usuario. No se inventan resultados de pruebas.
Se añade al final una nota técnica breve con fuentes oficiales sobre la base SQL.
''',encoding='utf-8')

body=d._element.body
for child in list(body): body.remove(child)
body.append(deepcopy(sections[0]))

def mkstyle(name,size,bold=False):
    st=d.styles[name] if name in d.styles else d.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH)
    st.base_style=d.styles['Normal']; st.font.name='Arial'; st.font.size=Pt(size); st.font.bold=bold; st.font.color.rgb=RGBColor(0,0,0)
    pf=st.paragraph_format; pf.space_before=Pt(0); pf.space_after=Pt(6); pf.line_spacing=1.08
    pf.widow_control=True; pf.keep_with_next=bold
    return st
for name,size,bold in [('CapBody',11,False),('CapTitle',14,True),('CapHead',12,True),('CapCaption',10,True),('CapCell',10,False),('CapRef',10,False)]: mkstyle(name,size,bold)

def p(txt='',sty='CapBody',page=False):
    pp=d.add_paragraph(txt,sty); pp.paragraph_format.page_break_before=page
    return pp
def h(txt,page=False): return p(txt,'CapHead',page)
def cap(txt): return p(txt,'CapCaption')
def text_cell(c,text):
    c.text=text
def fmt(t,widths,repeat=1):
    t.autofit=False; t.alignment=WD_TABLE_ALIGNMENT.CENTER
    for col,w in zip(t.columns,widths): col.width=Inches(w)
    pr=t._tbl.tblPr
    for e in list(pr):
        if e.tag in [qn('w:tblBorders'),qn('w:tblCellMar'),qn('w:tblInd')]: pr.remove(e)
    borders=OxmlElement('w:tblBorders')
    for key in ['top','left','bottom','right','insideH','insideV']:
        e=OxmlElement('w:'+key); e.set(qn('w:val'),'single'); e.set(qn('w:sz'),'4'); e.set(qn('w:color'),'BFC3C8'); borders.append(e)
    pr.append(borders)
    mar=OxmlElement('w:tblCellMar')
    for key,value in [('top','80'),('bottom','80'),('left','90'),('right','90')]:
        e=OxmlElement('w:'+key); e.set(qn('w:w'),value); e.set(qn('w:type'),'dxa'); mar.append(e)
    pr.append(mar)
    visited=set()
    for ri,row in enumerate(t.rows):
        trpr=row._tr.get_or_add_trPr()
        for x in list(trpr):
            if x.tag in [qn('w:trHeight'),qn('w:tblHeader')]: trpr.remove(x)
        trpr.append(OxmlElement('w:cantSplit'))
        if ri<repeat: trpr.append(OxmlElement('w:tblHeader'))
        for ci,c in enumerate(row.cells):
            if c._tc in visited: continue
            visited.add(c._tc)
            if c.grid_span==1 and ci<len(widths): c.width=Inches(widths[ci])
            c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cp=c._tc.get_or_add_tcPr()
            for e in list(cp):
                if e.tag in [qn('w:shd'),qn('w:tcBorders')]: cp.remove(e)
            if ri<repeat:
                sh=OxmlElement('w:shd'); sh.set(qn('w:fill'),'E5E7EB'); cp.append(sh)
            for pp in c.paragraphs:
                pp.style=d.styles['CapCell']; pp.alignment=WD_ALIGN_PARAGRAPH.LEFT
                pf=pp.paragraph_format; pf.space_before=Pt(0); pf.space_after=Pt(2); pf.line_spacing=1.04; pf.keep_with_next=False
                for prop in ['left_indent','right_indent','first_line_indent']: setattr(pf,prop,Pt(0))
                ppr=pp._p.get_or_add_pPr()
                for el in list(ppr):
                    if el.tag in [qn('w:numPr'),qn('w:pBdr')]: ppr.remove(el)
                for r in pp.runs:
                    r.font.name='Arial'; r.font.size=Pt(10); r.font.color.rgb=RGBColor(0,0,0); r.font.highlight_color=None; r.bold=ri<repeat
    return t
def table(headers,rows,widths,title=None):
    t=d.add_table(rows=1 if not title else 2,cols=len(headers))
    if title: t.rows[0].cells[0].merge(t.rows[0].cells[-1]).text=title
    for c,txt in zip(t.rows[-1].cells,headers): c.text=str(txt)
    for vals in rows:
        for c,txt in zip(t.add_row().cells,vals): c.text=str(txt)
    fmt(t,widths,2 if title else 1)
    return t
def section(index):
    d.add_section(WD_SECTION_START.NEW_PAGE)
    old=body.sectPr; new=deepcopy(sections[index])
    for e in list(new):
        if e.tag==qn('w:pgNumType') and qn('w:start') in e.attrib: del e.attrib[qn('w:start')]
    body.replace(old,new)
def hyperlink(pp,url):
    rel=pp.part.relate_to(url,RT.HYPERLINK,is_external=True)
    hh=OxmlElement('w:hyperlink'); hh.set(qn('r:id'),rel)
    rr=OxmlElement('w:r'); rp=OxmlElement('w:rPr'); color=OxmlElement('w:color'); color.set(qn('w:val'),'0563C1'); rp.append(color); rr.append(rp)
    tx=OxmlElement('w:t'); tx.text=url; rr.append(tx); hh.append(rr); pp._p.append(hh)

p('ANEXO II','CapTitle')
h('Recopilación de requerimientos')
p('Este anexo reúne los requerimientos, las doce historias de usuario, el Product Backlog y el Sprint Backlog del sistema web de PLASTIMAD. El alcance comprende la presentación de maceteros, el scrollytelling, el asesoramiento mediante inteligencia artificial y la gestión comercial para administrador y cliente.')
cap('Tabla 1 Recopilación de requerimientos')
t=table(['TIPO DE SISTEMA','ID RR','ENUNCIADO DEL ÍTEM'],[('Sistema web',rid,txt) for rid,txt in RR],[1.03,.72,4.35], 'RECOPILACIÓN DE REQUERIMIENTOS')
t.cell(2,0).merge(t.cell(5,0)).text='Sistema web'; fmt(t,[1.03,.72,4.35],2)
p('')
p('La persistencia de la información se define mediante PostgreSQL alojado en Supabase. Las tablas relacionan usuarios, productos, estimaciones, solicitudes comerciales y quejas o sugerencias. Se mantienen React y TypeScript en el frontend y Node.js para la lógica del servidor.')
p('El registro público corresponde únicamente al cliente. El administrador gestiona el catálogo y la atención comercial. Las solicitudes utilizan los estados por confirmar, confirmado, finalizado y cancelado.')

for i,item in enumerate(HU,1):
    name,role,priority,risk,sprint,hours,actions,obs,tasks=item
    if i%2==1:
        h('Historias de usuario' if i==1 else 'Historias de usuario continuación',True)
        if i==1: p('Las doce historias se presentan desde la Tabla 2 hasta la Tabla 13. Cada ficha identifica el usuario, la prioridad, el riesgo, el sprint y las acciones del sistema. Estado de las historias: Finalizado.')
    else:
        p('')
    suffix=' por administrador' if i in [5,6] else (' por cliente' if i in [10,12] else '')
    cap(f'Tabla {i+1} Historia de usuario {name.lower()}{suffix}')
    node=deepcopy(hu_template); body.insert(len(body)-1,node); t=Table(node,d._body)
    t.cell(0,0).text='HISTORIA DE USUARIO'
    t.cell(1,0).text=f'Identificador (ID): HU-{i:03d}'; t.cell(1,1).text='Usuario: '+role
    t.cell(2,0).text='Nombre de la historia: '+name+'.'
    t.cell(3,0).text='Prioridad en negocio: '+priority; t.cell(3,1).text='Riesgo en desarrollo: '+risk
    t.cell(4,0).text=f'Sprint asignado: SB-{sprint:03d}'
    t.cell(5,0).text='Programador responsable: Dilan Obando'
    t.cell(6,0).text='Descripción: El sistema permite realizar las siguientes acciones:\n'+'\n'.join('• '+a for a in actions)
    t.cell(7,0).text='Observación: '+obs
    fmt(t,[2.4,3.7],1)
    # Cada ficha se conserva completa en la página.
    cells=[]
    for row in t.rows:
        for c in row.cells:
            if c._tc not in [x._tc for x in cells]: cells.append(c)
    for c in cells:
        for pp in c.paragraphs: pp.paragraph_format.keep_with_next=True
    cells[-1].paragraphs[-1].paragraph_format.keep_with_next=False

h('Product Backlog',True)
p('El Product Backlog reúne las funcionalidades del sistema, su prioridad de negocio, la iteración asignada y su estado. Las historias se organizan según los perfiles y las dependencias de desarrollo. La Tabla 14 conserva la correspondencia con las doce fichas anteriores.')
cap('Tabla 14 Product Backlog')
rows=[]
for i,item in enumerate(HU,1):
    name,role,priority,risk,sprint,*_=item
    if i in [5,6,10,12]: name+=' ('+role.lower()+')'
    rows.append((f'HU-{i:03d}',name,str(sprint),'Finalizado',priority))
table(['ID HU','DESCRIPCIÓN DE LA HISTORIA','ITERACIÓN ASIGNADA','ESTADO','PRIORIDAD'],rows,[.77,2.41,.9,1.02,1.0], 'PRODUCT BACKLOG')
p('')
p('Las historias de prioridad alta sostienen el acceso, la administración, la experiencia de producto y la atención comercial. La prioridad media corresponde a quejas y sugerencias, y la prioridad baja a la landing page. La asignación considera las dependencias, por lo que una historia de prioridad baja puede desarrollarse al inicio.')
p('Distribución: SB-001, HU-001 y HU-002; SB-002, HU-003 a HU-006; SB-003, HU-007 a HU-012. SB-004 y SB-005 corresponden a validación integral y despliegue.')

section(1)
h('Sprint Backlog')
p('El Sprint Backlog detalla las historias seleccionadas y las tareas asociadas. Se organiza en una preparación técnica SB-000 y cinco sprints SB-001 a SB-005. La documentación es transversal. El esfuerzo estimado total es de 240 horas y el estado de los bloques es Finalizado.')
cap('Tabla 15 Sprint Backlog')
SW=[.65,1.20,1.18,.72,1.69,3.12,.96]
HEAD=['ID SB','NOMBRE','MÓDULO','HU','HISTORIAS DE USUARIO','TAREAS','TIEMPO ESTIMADO']
def sprint_table(rows,groups=(),title='ELABORACIÓN DEL SPRINT BACKLOG'):
    t=table(HEAD,rows,SW,title)
    for start,end,cols in groups:
        for col in cols:
            txt=t.cell(start+2,col).text
            c=t.cell(start+2,col).merge(t.cell(end+2,col)); c.text=txt
    fmt(t,SW,2)
    for ri,row in enumerate(t.rows):
        for ci in [0,3,6]:
            for pp in row.cells[ci].paragraphs: pp.alignment=WD_ALIGN_PARAGRAPH.CENTER
    return t
def hurow(i,sb,name,module):
    x=HU[i-1]
    return (sb,name,module,f'HU-{i:03d}',x[0],'\n'.join('• '+s for s in x[8]),f'{x[5]} H')
prep=('SB-000','Configuración del ambiente de desarrollo','General','N/A','Preparación técnica','• Delimitar requisitos y roles.\n• Configurar repositorio, React, TypeScript y Node.js.\n• Definir tablas, claves y relaciones en PostgreSQL de Supabase.\n• Comprobar conexión entre aplicación y base de datos.','10 H')
rows=[prep]+[hurow(i,'SB-001','Landing page y gestión de cuentas','Presentación' if i==1 else 'Gestión de cuenta') for i in [1,2]]
sprint_table(rows,[(1,2,[0,1])])
p('')
p('Objetivo de SB-001: permitir conocer PLASTIMAD y acceder a las funcionalidades según el rol. Subtotal SB-000: 10 H. Subtotal SB-001: 35 H.')

h('Sprint Backlog continuación',True)
cap('Tabla 15 Sprint Backlog continuación de SB-002')
sprint_table([hurow(i,'SB-002','Funcionalidades del administrador','Administrador') for i in [3,4,5,6]],[(0,3,[0,1,2])])
p('')
p('Objetivo de SB-002: disponer del mantenimiento de clientes y catálogo y de la atención de solicitudes y mensajes. Subtotal: 45 H. Las comprobaciones iniciales utilizan datos de prueba y se integran con los flujos del cliente en SB-003.')

h('Sprint Backlog continuación',True)
cap('Tabla 15 Sprint Backlog continuación de SB-003')
sprint_table([hurow(i,'SB-003','Funcionalidades del cliente','Cliente') for i in [7,8,9]],[(0,2,[0,1,2])])
h('Sprint Backlog continuación',True)
cap('Tabla 15 Sprint Backlog continuación de SB-003')
sprint_table([hurow(i,'SB-003','Funcionalidades del cliente','Cliente') for i in [10,11,12]],[(0,2,[0,1,2])])
p('')
p('Objetivo de SB-003: conectar la exploración del producto con el asesoramiento, la estimación y las solicitudes del cliente. Subtotal: 70 H. Los servicios de IA se integran mediante el backend y utilizan la información comercial del catálogo.')

h('Sprint Backlog continuación',True)
cap('Tabla 15 Sprint Backlog pruebas despliegue y documentación')
last=[
('SB-004','Pruebas integrales del sistema','Administrador y cliente','HU-001 a HU-012','Validar las doce historias de usuario','• Ejecutar pruebas unitarias, de compatibilidad, rendimiento y aceptación.\n• Comprobar permisos, formularios y persistencia.\n• Validar catálogo, scrollytelling, estimaciones y conversación.\n• Revisar el flujo solicitud-atención y las quejas.\n• Corregir incidencias y organizar evidencias.','30 H'),
('SB-005','Despliegue del sistema web','Infraestructura','HU-001 a HU-012','Publicar el sistema de PLASTIMAD','• Configurar entornos y secretos.\n• Publicar el frontend en Netlify.\n• Habilitar el backend Node.js y su conexión con Supabase.\n• Aplicar esquema SQL y permisos.\n• Comprobar HTTPS, funciones principales y recuperación de datos.','20 H'),
('Documentación','Documentación del proyecto','Transversal','HU-001 a HU-012','Documentar el sistema','• Actualizar el Trabajo de Integración Curricular.\n• Completar anexos y manual de usuario.\n• Documentar pruebas, configuración y despliegue.\n• Organizar evidencias del proyecto.','30 H'),
('TOTAL','','','','','Esfuerzo total estimado','240 H')]
t=sprint_table(last)
t.cell(4,0).merge(t.cell(4,1)).text='Documentación'
t.cell(5,0).merge(t.cell(5,5)).text='TOTAL DEL PROYECTO'; fmt(t,SW,2)
p('')
p('Resumen del esfuerzo: SB-000, 10 H; SB-001, 35 H; SB-002, 45 H; SB-003, 70 H; SB-004, 30 H; SB-005, 20 H; documentación, 30 H. Total: 240 H.')

section(2)
h('Base de datos y despliegue del sistema')
p('Se selecciona PostgreSQL alojado en Supabase como base de datos SQL del sistema. Su modelo relacional permite vincular clientes, productos y solicitudes mediante claves primarias y foráneas. Supabase proporciona una base PostgreSQL administrada y herramientas para gestionar tablas y consultas SQL [1].')
p('La estructura de datos comprende usuarios, productos, estimaciones, solicitudes, detalles de solicitud, historial de estados y mensajes de quejas o sugerencias. Una solicitud pertenece a un cliente y puede contener varios productos. El detalle conserva cantidad y precio referencial aplicado, para que los cambios del catálogo no alteren el historial.')
p('La selección responde a la necesidad de una base SQL administrada, integración con el backend y control de acceso a datos propios. La autorización debe comprobarse en cada operación. Las tablas expuestas mediante las API de Supabase requieren políticas de seguridad por fila; las credenciales privilegiadas se mantienen únicamente en el servidor [2].')
p('Los archivos de imagen y modelos tridimensionales se gestionan como recursos de almacenamiento, mientras que sus rutas y metadatos se relacionan con los registros de la base de datos. Supabase Storage ofrece un servicio integrado para este propósito [3].')
p('El frontend React con Vite se publica en Netlify [4]. La lógica comercial y las llamadas a los servicios de IA permanecen en el backend Node.js, conectado con PostgreSQL en Supabase. La publicación del frontend y la disponibilidad del backend se verifican como componentes distintos dentro de SB-005.')
h('Referencias técnicas')
refs=[('Supabase','Database','https://supabase.com/docs/guides/database/overview'),('Supabase','Row Level Security','https://supabase.com/docs/guides/database/postgres/row-level-security'),('Supabase','Storage','https://supabase.com/docs/guides/storage'),('Netlify','Vite on Netlify','https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/')]
for i,(a,title,url) in enumerate(refs,1):
    pp=p(f'[{i}] {a}, «{title}», s. f. [En línea]. Available: ','CapRef'); hyperlink(pp,url); pp.add_run('. [Accedido: 13 octubre 2026].'); pp.paragraph_format.keep_together=True

assert sum(x[5] for x in HU)==150
assert sum([10,35,45,70,30,20,30])==240
alltext='\n'.join(e.text or '' for e in body.iter(qn('w:t')))
for bad in ['MongoDB','MySQL','arrendatario','estudiante','residencias','Paulo Cisneros','Gestionar categorías']:
    assert bad.lower() not in alltext.lower(),bad
assert len([t for t in d.tables if 'HISTORIA DE USUARIO'==t.cell(0,0).text])==12
assert len(d.sections)==3
d.core_properties.title='PLASTIMAD Anexo II requerimientos e historias de usuario'
d.core_properties.subject='Product Backlog y Sprint Backlog de 240 horas con PostgreSQL en Supabase'
d.core_properties.author='Dilan Obando'
d.save(OUT)
assert hashlib.sha256(SRC.read_bytes()).hexdigest()==source_hash
(B/'control.json').write_text(json.dumps({'historias':12,'estado':'Finalizado','horas':240,'bloques':{'SB-000':10,'SB-001':35,'SB-002':45,'SB-003':70,'SB-004':30,'SB-005':20,'Documentación':30},'base':'PostgreSQL en Supabase','original_sha256':source_hash,'output':str(OUT)},ensure_ascii=False,indent=2),encoding='utf-8')
print(OUT)
