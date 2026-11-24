from pathlib import Path
from copy import deepcopy
import json, re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from contenido import STORIES, REQUIREMENTS, NFR, SPRINTS, TESTS

BASE=Path(__file__).parent
OUT=BASE.parent/'PLASTIMAD_ANEXO_II_COMPLETO_Y_BIBLIOGRAFIA.docx'
d=Document(r'C:\Users\pauly\Downloads\ANTES ANEXO 2.docx')
original=d.paragraphs[:]
sources=json.loads((BASE/'fuentes.json').read_text(encoding='utf-8'))
assert len(sources)==45 and len(STORIES)==12
assert sum(s['hours'] for s in STORIES)==284
assert sum(s['hours'] for s in SPRINTS)+32==400
for s in STORIES: assert sum(x[1] for x in s['tasks'])==s['hours']
for s in SPRINTS:
    assert (sum(STORIES[i-1]['hours'] for i in s['stories']) if 'stories' in s else sum(t[1] for t in s['tasks']))==s['hours']

def style(name,size=11,bold=False):
    st=d.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH) if name not in d.styles else d.styles[name]
    st.base_style=d.styles['Normal']; st.font.name='Arial'; st.font.size=Pt(size); st.font.bold=bold; st.font.color.rgb=RGBColor(0,0,0)
    pf=st.paragraph_format; pf.space_before=Pt(0); pf.space_after=Pt(6); pf.line_spacing=1.12; pf.widow_control=True
    return st
style('AnexoTexto'); style('AnexoTitulo',14,True); style('AnexoSubtitulo',12,True); style('AnexoTabla',10); style('AnexoLeyenda',10,True); style('Referencia',10.5)
for n in ['AnexoTitulo','AnexoSubtitulo','AnexoLeyenda']:
    d.styles[n].paragraph_format.keep_with_next=True

def p(text='',sty='AnexoTexto',before=None):
    pp=d.add_paragraph(text,sty)
    if before is not None: before.addprevious(pp._p)
    return pp
def heading(text,page=False):
    pp=p(text,'AnexoSubtitulo'); pp.paragraph_format.space_before=Pt(8); pp.paragraph_format.page_break_before=page
    return pp
def caption(text): return p(text,'AnexoLeyenda')
def format_table(t,widths,header=True):
    t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    for col,w in zip(t.columns,widths): col.width=Inches(w)
    pr=t._tbl.tblPr
    borders=OxmlElement('w:tblBorders')
    for key in ['top','left','bottom','right','insideH','insideV']:
        e=OxmlElement('w:'+key); e.set(qn('w:val'),'single'); e.set(qn('w:sz'),'4'); e.set(qn('w:color'),'D9D9D9'); borders.append(e)
    pr.append(borders)
    margins=OxmlElement('w:tblCellMar')
    for key,val in [('top','90'),('bottom','90'),('left','100'),('right','100')]:
        e=OxmlElement('w:'+key); e.set(qn('w:w'),val); e.set(qn('w:type'),'dxa'); margins.append(e)
    pr.append(margins)
    for ri,row in enumerate(t.rows):
        row.height=None
        trpr=row._tr.get_or_add_trPr(); trpr.append(OxmlElement('w:cantSplit'))
        if ri==0 and header: trpr.append(OxmlElement('w:tblHeader'))
        for ci,c in enumerate(row.cells):
            if len(row.cells)==len(widths): c.width=Inches(widths[ci])
            c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if ri==0 and header:
                sh=OxmlElement('w:shd'); sh.set(qn('w:fill'),'E5E7EB'); c._tc.get_or_add_tcPr().append(sh)
            for pp in c.paragraphs:
                pp.style=d.styles['AnexoTabla']; pp.paragraph_format.space_after=Pt(2); pp.paragraph_format.space_before=Pt(0)
                pp.paragraph_format.keep_with_next=False; pp.paragraph_format.line_spacing=1.08
                for r in pp.runs:
                    r.font.name='Arial'; r.font.size=Pt(10); r.font.color.rgb=RGBColor(0,0,0)
                    if ri==0 and header: r.bold=True
    return t
def table(headers,rows,widths):
    t=d.add_table(rows=1,cols=len(headers))
    for c,txt in zip(t.rows[0].cells,headers): c.text=str(txt)
    for vals in rows:
        for c,txt in zip(t.add_row().cells,vals): c.text=str(txt)
    format_table(t,widths)
    p('').paragraph_format.space_after=Pt(1)
    return t
def link(pp,url):
    rel=pp.part.relate_to(url,RT.HYPERLINK,is_external=True)
    h=OxmlElement('w:hyperlink'); h.set(qn('r:id'),rel)
    r=OxmlElement('w:r'); rp=OxmlElement('w:rPr')
    color=OxmlElement('w:color'); color.set(qn('w:val'),'0563C1'); rp.append(color)
    r.append(rp); tx=OxmlElement('w:t'); tx.text=url; r.append(tx); h.append(r); pp._p.append(h)

# Conservar el documento previo al Anexo II y sustituir solamente su contenido.
start=original[439]._p
body=d._element.body
remove=False
for el in list(body):
    if el is start: remove=True
    if remove and el.tag!=qn('w:sectPr'): body.remove(el)
sec=d.sections[-1]
sec.page_width=Inches(8.268); sec.page_height=Inches(11.693)
sec.top_margin=sec.bottom_margin=Inches(.90); sec.left_margin=sec.right_margin=Inches(1.0)
sec.header_distance=sec.footer_distance=Inches(.4)

# Bibliografía en la sección que estaba vacía, respetando la numeración solicitada.
original[393].text='BIBLIOGRAFÍAS'; original[393].style=d.styles['AnexoTitulo']; original[393].paragraph_format.page_break_before=True
for pp in original[394:413]:
    if pp._p.getparent() is not None: pp._p.getparent().remove(pp._p)
original[413].paragraph_format.page_break_before=True
original[413].text='ANEXOS'; original[413].style=d.styles['AnexoTitulo']
anchor=original[413]._p
for i,(author,title,date,url) in enumerate(sources,1):
    pp=p(f'[{i}] {author}, «{title}», {date.rstrip(".")}. [En línea]. Available: ', 'Referencia',anchor)
    pp.paragraph_format.left_indent=Inches(.36); pp.paragraph_format.first_line_indent=Inches(-.36)
    pp.paragraph_format.keep_together=True; pp.paragraph_format.space_after=Pt(9)
    link(pp,url); pp.add_run('. [Accedido: 5 octubre 2026].')

# Ajustes puntuales de correspondencia, sin reescribir los capítulos de resultados.
original[417].text='ANEXO II. Requerimientos, historias de usuario y planificación del sistema web de PLASTIMAD.'
original[273].text='Las historias de usuario describen quién necesita una funcionalidad, qué requiere y para qué propósito [26]. La Tabla 2.3 presenta el formato de registro. Las 12 historias completas y sus criterios de aceptación se encuentran en el ANEXO II.'
original[222].text=original[222].text.replace('[4]','[5]')
original[267].text=original[267].text.replace('[25]','[4]')
original[229].text=original[229].text.replace('[9]','[9], [15]')
# Los diagnósticos propios y decisiones del proyecto no se atribuyen a fuentes genéricas.
original[176].text=original[176].text.replace(' [2]','')
original[177].text=original[177].text.replace(' [3]','')
req=d.tables[1]
req.rows[2].cells[0].text='Sistema web'; req.rows[2].cells[1].text='RR-001'; req.rows[2].cells[2].text=REQUIREMENTS[0][2]
for rr,role,txt,hu in REQUIREMENTS[1:]:
    row=req.add_row(); row.cells[0].text='Sistema web'; row.cells[1].text=rr; row.cells[2].text=role+': '+txt
hu=d.tables[2]
hu.rows[1].cells[1].text='Usuario: visitante, cliente y administrador'
hu.rows[4].cells[0].text='Iteración asignada: 1'
d.tables[3].rows[2].cells[2].text='1'; d.tables[3].rows[2].cells[3].text='Planificada'
d.tables[4].rows[2].cells[-1].text='20 h'

p('ANEXO II','AnexoTitulo')
p('Requerimientos y planificación del sistema web de PLASTIMAD','AnexoSubtitulo')
p('Este anexo desarrolla las 12 historias de usuario previstas para el sistema web de gestión comercial de PLASTIMAD. Relaciona los requerimientos con el Product Backlog, las tareas del Sprint Backlog y los criterios de aceptación de los módulos de maceteros, scrollytelling, inteligencia artificial y atención comercial.')
p('La planificación se deriva del alcance y de los perfiles del documento base. Las horas son estimaciones de esfuerzo y los estados indican trabajo planificado; no acreditan implementación, pruebas ejecutadas o aceptación. Los parámetros operativos aquí definidos constituyen una propuesta para validación con el responsable del producto.')
heading('1 Recopilación de requerimientos')
caption('Tabla A2.1 Requerimientos funcionales y trazabilidad')
table(['Código','Usuario','Requerimiento','Historias'],REQUIREMENTS,[.72,1.03,3.18,1.33])
p('El administrador asume la gestión comercial y el cliente realiza consultas y solicitudes. El visitante únicamente accede a la presentación y al catálogo públicos. No se incorpora un rol adicional de vendedor ni funciones de pago, facturación, inventario o entrega, porque no forman parte del alcance descrito.')
p('Responsabilidades según la Tabla 2.1 del documento base: Product Owner y Scrum Master, Ing. Byron Loarte, MSc.; desarrollo, Dilan Obando. La concentración de funciones se trata como una adaptación del contexto académico; estas asignaciones no sustituyen la validación comercial de PLASTIMAD.')
heading('1.1 Requisitos de calidad',True)
p('Los siguientes criterios complementan los requisitos funcionales para hacer verificables la seguridad, la experiencia visual y la fiabilidad. Los umbrales son objetivos propuestos, no mediciones obtenidas. Se consideran las pautas de accesibilidad y Web Vitals [31], [32] y las guías de seguridad de OWASP [33]–[37].')
caption('Tabla A2.2 Requisitos no funcionales')
table(['Código','Aspecto','Criterio propuesto','Aplicación'],NFR,[.77,.97,3.24,1.28])
p('Para la carga de imágenes se propone admitir JPEG, PNG y WebP hasta 10 MB, validar tipo real y extensión y conservar acceso restringido. El plazo de conservación de las imágenes debe acordarse con PLASTIMAD antes del despliegue; no se habilita reutilización para entrenar modelos por defecto.')
p('La prueba de rendimiento registrará dispositivo, navegador, red, volumen de datos y versión. Una medición de laboratorio sirve para detectar problemas, pero no acredita por sí sola los objetivos de campo en percentil 75.')

for idx,s in enumerate(STORIES,1):
    heading(('2 Historias de usuario' if idx==1 else 'Historias de usuario'),True)
    if idx==1: p('Se conserva el conjunto de 12 historias del documento base y se normalizan sus identificadores desde HU-001 hasta HU-012. Cada historia expresa una necesidad y añade condiciones verificables de aceptación [26].')
    caption(f'Tabla A2.{idx+2} {s["id"]} {s["name"]}')
    t=d.add_table(rows=0,cols=2)
    def pair(a,b):
        cells=t.add_row().cells; cells[0].text=a; cells[1].text=b
    def full(txt):
        cells=t.add_row().cells; cells[0].merge(cells[1]).text=txt
    full('HISTORIA DE USUARIO')
    pair('Identificador: '+s['id'],'Usuario: '+s['role'])
    full('Nombre de la historia: '+s['story'])
    pair('Prioridad en negocio: '+s['priority'],'Riesgo en desarrollo: '+s['risk'])
    pair('Iteración asignada: '+str(s['sprint']),'Esfuerzo estimado: '+str(s['hours'])+' h')
    full('Responsable: Dilan Obando')
    full('Descripción: '+s['desc'])
    full('Criterios de aceptación:\n'+'\n'.join(f'CA-{idx:03d}.{j} {v}' for j,v in enumerate(s['criteria'],1)))
    full('Observación: '+s['obs'])
    full('Trazabilidad: '+s['rr']+'. Dependencias: '+s['dep']+'.')
    format_table(t,[3.13,3.13])
    p('')

heading('3 Product Backlog',True)
p('El objetivo del producto es facilitar la exploración de los maceteros y convertir el asesoramiento inicial en solicitudes trazables para PLASTIMAD. El Product Backlog organiza las funcionalidades por valor y dependencias [25]. Las historias de prioridad alta sostienen el flujo principal; las de prioridad media aportan presentación o retroalimentación. El orden propuesto puede ajustarse durante el refinamiento.')
p('Estado común: Planificada. La prioridad expresa valor de negocio y no obliga a ejecutar una historia antes de sus dependencias. El orden de la tabla propone una secuencia viable; HU-005 y HU-006 se construyen inicialmente con datos de prueba y se integran con HU-010 y HU-012 en SB-003.')
caption('Tabla A2.15 Product Backlog priorizado')
order=[2,1,4,3,5,6,8,7,9,11,10,12]
table(['ID','Historia','Iteración','Estado','Prioridad','Horas'],[(STORIES[n-1]['id'],STORIES[n-1]['name'],STORIES[n-1]['sprint'],'Planificada',STORIES[n-1]['priority'],STORIES[n-1]['hours']) for n in order],[.73,2.50,.70,1.00,.73,.60])
p('Total funcional estimado: 284 horas. Las 116 horas restantes corresponden a preparación, validación integral, despliegue y documentación. Las horas de las historias ya incluyen sus pruebas de desarrollo; SB-004 agrega la comprobación conjunta del sistema y la aceptación.')
heading('3.1 Condiciones para considerar una historia terminada')
p('Una historia se considera terminada cuando cumple sus criterios de aceptación, integra interfaz y servidor cuando corresponda, aplica permisos y validaciones, supera sus pruebas, cuenta con evidencia revisable y tiene documentación actualizada. Los defectos que impidan su uso o expongan datos bloquean la entrega. El incremento debe poder demostrarse al responsable del producto [4].')

heading('4 Sprint Backlog',True)
p('Se conserva la identificación SB-000 a SB-005 del borrador. SB-000 representa preparación técnica; SB-001 a SB-005 corresponden a cinco sprints propuestos. La preparación no es un evento obligatorio de Scrum. En cada Sprint Planning se confirmarán el objetivo, las historias seleccionadas y el plan de trabajo [4], [27].')
p('Se propone un límite de cuatro semanas por sprint, con revisión de capacidad antes de comprometer el trabajo. Las horas siguientes expresan esfuerzo, no duración calendario. Si la disponibilidad de Dilan Obando no permite cubrir un bloque, se deberá reducir su alcance o distribuirlo en sprints adicionales. No se fijan fechas de inicio ni de cierre sin un calendario aprobado.')
caption('Tabla A2.16 Resumen de esfuerzo por bloque')
table(['Bloque','Contenido','Historias','Horas'],[(s['id'],s['name'],', '.join(f'HU-{i:03d}' for i in s.get('stories',[])) or 'Transversal',s['hours']) for s in SPRINTS]+[('DOC','Documentación transversal','Todas',32),('TOTAL','Esfuerzo estimado del proyecto','12 historias',400)],[.85,2.6,2.15,.66])
p('Las pruebas y la documentación acompañan el desarrollo. SB-004 concentra regresión, comprobaciones integrales y aceptación; SB-005 completa la puesta en producción. Estos bloques no eliminan la obligación de revisar y demostrar los incrementos previos.')
p('En cada ciclo se prevén planificación, seguimiento diario breve, revisión del incremento y retrospectiva. Su organización se adapta al trabajo académico individual y mantiene una revisión periódica con el responsable del producto [4], [28].')

for k,s in enumerate(SPRINTS):
    heading(f'4.{k+1} {s["id"]} {s["name"]}',True)
    p('Objetivo: '+s['goal'])
    p('Módulo: '+s['module']+'. Responsable de desarrollo: Dilan Obando. Estado: Planificado.')
    p('Dependencias: '+s['dep'])
    caption(f'Tabla A2.{17+k} Tareas de {s["id"]}')
    rows=[]
    if 'stories' in s:
        for n in s['stories']:
            story=STORIES[n-1]
            for j,(task,h) in enumerate(story['tasks'],1): rows.append((f'{n:02d}.{j}',story['id'],task,h))
    else:
        rows=[(f'{k:02d}.{j}','Transversal',task,h) for j,(task,h) in enumerate(s['tasks'],1)]
    rows.append(('TOTAL','',s['name'],s['hours']))
    if k==3:
        table(['Tarea','ID HU','Actividad','Horas'],rows[:12],[.70,.85,4.05,.66])
        heading('SB-003 Continuación de las tareas',True)
        caption('Tabla A2.20 Tareas de SB-003 continuación')
        table(['Tarea','ID HU','Actividad','Horas'],rows[12:],[.70,.85,4.05,.66])
    else:
        table(['Tarea','ID HU','Actividad','Horas'],rows,[.70,.85,4.05,.66])
    p('Entregable esperado: '+s['deliver'])
    if k==3:
        p('La integración se ordena por dependencias: catálogo, experiencia 3D, estimación, conversación, solicitudes y quejas. El volumen de este bloque exige confirmar capacidad y dividirlo si no cabe en la duración acordada.')
    elif k==4:
        p('Las herramientas de apoyo propuestas son Vitest, React Testing Library, Postman, Playwright y k6 [24], [38]–[41]. Su mención describe opciones de validación; no afirma que se hayan ejecutado pruebas.')
    elif k==5:
        p('Vercel se considera una opción para el frontend Vite [43]. El documento base no identifica el proveedor definitivo: el backend Node.js y MySQL requieren servicios compatibles, configuración independiente y procedimientos de respaldo [44].')

heading('4.7 Documentación transversal',True)
caption('Tabla A2.23 Documentación y transferencia')
table(['Actividad','Horas'],[('Actualizar requerimientos, historias y matriz de trazabilidad',8),('Documentar arquitectura, datos, API y decisiones de IA',8),('Preparar manual de usuario y guía de despliegue',8),('Organizar evidencias, bibliografía y anexos',8),('TOTAL',32)],[5.56,.7])
p('La documentación se produce durante los sprints. Los anexos de Turnitin, video de usuario y credenciales requieren sus evidencias reales. Los accesos se entregan por un canal seguro y no se publican contraseñas dentro del trabajo académico.')
heading('5 Reglas para recomendación y atención comercial')
p('La estimación combina dimensiones confirmadas por el usuario con información vigente del catálogo. La imagen aporta contexto visual y puede ayudar a identificar obstáculos; cualquier dimensión u obstáculo relevante debe confirmarse. La propuesta se revisa manualmente cuando el espacio es irregular o la imagen resulta ambigua [11], [13], [45].')
p('Para una superficie útil rectangular se propone calcular dos orientaciones. Sean L y A el largo y ancho útiles; l y a, la huella del macetero; y s, la separación entre unidades, todas en metros. Las zonas de paso y los obstáculos deben descontarse antes de definir L y A.')
p('N1 = piso((L + s) / (l + s)) × piso((A + s) / (a + s))\nN2 = piso((L + s) / (a + s)) × piso((A + s) / (l + s))\nN = máximo(N1, N2)\nCosto referencial = N × precio unitario vigente')
p('La función piso toma el entero inferior. Esta regla estima una capacidad en cuadrícula para una sola referencia de producto y no garantiza una distribución óptima ni constituye, por sí sola, una recomendación estética. La cantidad recomendada puede ser menor para conservar circulación y composición visual.')
p('Ejemplo de prueba con datos ficticios: L = 4 m, A = 3 m, l = 0,8 m, a = 0,5 m y s = 0,2 m. Resultan N1 = 16 y N2 = 18; la capacidad calculada es 18 unidades. Si el precio de prueba es USD 25, el costo referencial es USD 450. Estos valores no corresponden a una cotización ni a una ficha confirmada de PLASTIMAD.')
p('Si no existe precio vigente, se indica que requiere consulta. Transporte, instalación, impuestos y personalización solo se agregan si existen reglas comerciales confirmadas. La estimación debe mostrar sus supuestos y mantener la separación entre asesoramiento automatizado y aprobación comercial.')

heading('6 Plan de comprobación y aceptación',True)
p('La matriz siguiente vincula cada historia con una comprobación mínima. Estado de todos los casos: pendiente de ejecución. Al ejecutar cada prueba se registrarán versión, datos, pasos, resultado obtenido, evidencia, fecha y responsable. Los criterios de aceptación se revisan con el responsable del producto [42].')
caption('Tabla A2.24 Casos de comprobación de las historias')
table(['Caso','Historia','Comprobación','Resultado esperado'],TESTS,[.7,.75,2.52,2.29])
heading('6.1 Evaluación de los componentes de IA',True)
p('Para el análisis visual se preparará un conjunto de imágenes autorizadas con distintas condiciones de iluminación, perspectiva y obstáculos. Las medidas manuales serán la referencia para comprobar los cálculos. Se registrarán casos correctos, fallos y solicitudes de información adicional; no se informarán porcentajes de precisión sin un conjunto de evaluación y resultados documentados.')
p('Para el asistente se usará un conjunto de preguntas sobre productos, precios, datos inexistentes y solicitudes fuera del alcance. Se evaluará correspondencia con el catálogo, reconocimiento de incertidumbre y protección de información. Los errores relevantes se registrarán antes de aprobar la entrega [12], [45].')
heading('6.2 Evidencias y aceptación final')
p('La aceptación requiere demostrar el flujo catálogo → recomendación → solicitud → seguimiento administrativo y comprobar la atención de quejas. El acta de revisión debe identificar versión, historias aceptadas, defectos abiertos y decisión del responsable del producto. Este anexo define la comprobación; no reemplaza el acta ni presenta resultados no obtenidos.')

heading('7 Sustento documental de las decisiones')
p('La información institucional de PLASTIMAD fundamenta la descripción de sus productos de plástico reciclado [1]. Los informes de PNUMA y OCDE aportan el contexto de circularidad y residuos plásticos [29], [30]; no validan por sí mismos precios, consumos energéticos o resultados ambientales específicos de la empresa.')
p('La arquitectura cliente-servidor y la organización de los datos se apoyan en MDN, Node.js y MySQL [2], [14], [18]. React, JavaScript, TypeScript y Vite corresponden a las tecnologías declaradas en el documento base [10], [16], [17], [19]. No se sustituye esta arquitectura por otra plataforma.')
p('Los criterios de experiencia de usuario y prototipado se relacionan con Nielsen Norman Group y Figma [3], [20]. El scrollytelling se consulta como patrón narrativo [5]; glTF, WebGL, Three.js, React Three Fiber y Drei sustentan la representación tridimensional [6]–[9], [15]. La referencia sobre Scrollama no implica incorporar esa librería al proyecto.')
p('Git y GitHub sustentan el control de versiones; Visual Studio Code, el entorno de edición; y Postman, la comprobación de servicios [21]–[24]. Estas herramientas apoyan la reproducibilidad y la revisión del trabajo, sin constituir evidencia de ejecución por sí mismas.')
p('Las fuentes de visión, conversación y recomendación describen capacidades técnicas relacionadas con HU-009 y HU-011 [11]–[13]. Se incluyen como sustento conceptual; el documento base no selecciona Google Cloud ni otro proveedor concreto. La evaluación de limitaciones y fallos se orienta con el marco de riesgos de IA del NIST [45].')
p('La guía Scrum, las definiciones de backlog y las historias de usuario fundamentan la planificación y la trazabilidad [4], [25]–[28]. Las referencias de accesibilidad, rendimiento, seguridad, pruebas y operación apoyan los requisitos no funcionales y los bloques de validación y entrega [31]–[44].')
p('Las 45 entradas de la sección BIBLIOGRAFÍAS siguen la estructura numérica solicitada: autor o entidad, título, fecha, indicación [En línea], Available y enlace. La abreviatura s. f. indica que no se identifica una fecha editorial estable; la fecha de consulta se registra por separado.')

# Evitar propiedades heredadas que alteren la numeración o el color de los títulos nuevos.
for pp in d.paragraphs:
    if pp.style.name.startswith('Anexo') or pp.style.name=='Referencia':
        pr=pp._p.get_or_add_pPr()
        for el in list(pr):
            if el.tag in [qn('w:numPr'),qn('w:pBdr')]: pr.remove(el)
        for r in pp.runs: r.font.color.rgb=RGBColor(0,0,0)

d.core_properties.title='Sistema web de PLASTIMAD con Anexo II y bibliografía'
d.core_properties.subject='Historias de usuario, Product Backlog, Sprint Backlog y 45 referencias'
# Regenerar el índice obsoleto para eliminar referencias a marcadores del proyecto anterior.
for el in list(body):
    if el.tag==qn('w:sdt') and any('TOC ' in (x.text or '') for x in el.iter(qn('w:instrText'))):
        content=el.find(qn('w:sdtContent'))
        for child in list(content): content.remove(child)
        pp=OxmlElement('w:p')
        for kind,txt in [('begin',None),('instr',' TOC \\o "1-2" \\h \\z \\u '),('separate',None),('text','Actualizar índice'),('end',None)]:
            rr=OxmlElement('w:r')
            if kind=='instr':
                child=OxmlElement('w:instrText'); child.set(qn('xml:space'),'preserve'); child.text=txt
            elif kind=='text': child=OxmlElement('w:t'); child.text=txt
            else: child=OxmlElement('w:fldChar'); child.set(qn('w:fldCharType'),kind)
            rr.append(child); pp.append(rr)
        content.append(pp)
for pp in original[101:121]:
    if not pp.text.strip() and pp._p.getparent() is not None: pp._p.getparent().remove(pp._p)
original[121].paragraph_format.page_break_before=True
outline=OxmlElement('w:outlineLvl'); outline.set(qn('w:val'),'0'); d.styles['AnexoTitulo']._element.get_or_add_pPr().append(outline)
d.save(OUT)
print(OUT)
print('Historias: 12 | Fuentes: 45 | Horas funcionales: 284 | Horas totales: 400')
