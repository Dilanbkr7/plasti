from pathlib import Path
from copy import deepcopy
from hashlib import sha256
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

B=Path(__file__).parent
SRC=Path(r'C:\Users\pauly\Downloads\TESIS_Dilan-Obando-13-10.docx')
OUT=B.parent/'CAPITULO_3_PLASTIMAD_MYSQL.docx'
digest=sha256(SRC.read_bytes()).hexdigest()
d=Document(SRC)
section=deepcopy(d.sections[2]._sectPr)
body=d.element.body
for child in list(body): body.remove(child)
for e in list(section):
    if e.tag in (qn('w:headerReference'),qn('w:footerReference'),qn('w:pgNumType')): section.remove(e)
body.append(section)

(B/'artifact.md').write_text(f'''# Capítulo 3 de PLASTIMAD
Referencia conservada: {SRC}
SHA256: {digest}
Referencia visual: referencia.pdf (52 páginas), páginas 17 y 23 inspeccionadas.
Salida independiente: únicamente capítulo 3. No editar capítulos aprobados ni anexos.
Se reutiliza el paquete y sus estilos, con un cuerpo nuevo y la geometría de la sección 2.
A4 vertical; márgenes superior e inferior 0.984 pulgadas, izquierda y derecha 1.181.
Arial 11, cuerpo justificado a interlineado 1.5; encabezado 16 y subtítulos 12/11 en negro.
Subtítulos numerados manualmente 3.1–3.6 con subniveles y sin numeración heredada.
Tablas de 5.9 pulgadas, Arial 10, cabecera gris, bordes visibles y filas no partidas.
Sin imágenes ni pies de figuras pendientes, según petición del usuario. Sin páginas preliminares.
Base de datos MySQL por confirmación expresa del usuario en este turno.
Se conservan 12HU y 240 horas del anexo del archivo recibido, incorporando HU011 y012 al SB003.
No se inventan proveedores de IA, alojamiento, URL, métricas o aprobación de pruebas.
Los procedimientos de validación se distinguen de los resultados observados no suministrados.
''',encoding='utf-8')

def para(text, kind='body'):
    p=d.add_paragraph(style='Texto')
    p.add_run(text)
    pf=p.paragraph_format
    pf.space_before=Pt(0); pf.space_after=Pt(7); pf.line_spacing=1.5
    pf.left_indent=Pt(0);pf.right_indent=Pt(0);pf.first_line_indent=Pt(0)
    pf.keep_with_next=kind in ('title','head','sub','caption')
    pf.widow_control=True
    p.alignment=WD_ALIGN_PARAGRAPH.JUSTIFY if kind=='body' else WD_ALIGN_PARAGRAPH.LEFT
    pr=p._p.get_or_add_pPr()
    for e in list(pr):
        if e.tag in (qn('w:numPr'),qn('w:pBdr')):pr.remove(e)
    ol=OxmlElement('w:outlineLvl'); ol.set(qn('w:val'),{'title':'0','head':'1','sub':'2'}.get(kind,'9'));pr.append(ol)
    for r in p.runs:
        r.font.name='Arial';r.font.size=Pt({'title':16,'head':12,'sub':11,'caption':10}.get(kind,11))
        r.bold=kind in ('title','head','sub','caption');r.font.color.rgb=RGBColor(0,0,0)
    if kind in ('head','sub'):pf.space_before=Pt(10)
    if kind=='caption':p.alignment=WD_ALIGN_PARAGRAPH.CENTER;pf.line_spacing=1.15
    return p

def bullets(items):
    for text in items:
        p=para('• '+text);p.paragraph_format.left_indent=Inches(.16);p.paragraph_format.first_line_indent=Inches(-.12);p.paragraph_format.space_after=Pt(2)

def table(headers,rows,widths):
    t=d.add_table(rows=1,cols=len(headers));t.autofit=False;t.alignment=WD_TABLE_ALIGNMENT.CENTER
    for c,w in zip(t.columns,widths):c.width=Inches(w)
    for c,v in zip(t.rows[0].cells,headers):c.text=v
    for row in rows:
        for c,v in zip(t.add_row().cells,row):c.text=v
    pr=t._tbl.tblPr
    borders=OxmlElement('w:tblBorders')
    for name in ['top','left','bottom','right','insideH','insideV']:
        e=OxmlElement('w:'+name);e.set(qn('w:val'),'single');e.set(qn('w:sz'),'4');e.set(qn('w:color'),'D9D9D9');borders.append(e)
    pr.append(borders)
    mar=OxmlElement('w:tblCellMar')
    for side in ['top','left','bottom','right']:
        e=OxmlElement('w:'+side);e.set(qn('w:w'),'90');e.set(qn('w:type'),'dxa');mar.append(e)
    pr.append(mar)
    for i,row in enumerate(t.rows):
        rp=row._tr.get_or_add_trPr();rp.append(OxmlElement('w:cantSplit'))
        if i==0:rp.append(OxmlElement('w:tblHeader'))
        for j,c in enumerate(row.cells):
            c.width=Inches(widths[j]);c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if i==0:
                sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'E7E6E6');c._tc.get_or_add_tcPr().append(sh)
            for p in c.paragraphs:
                p.paragraph_format.space_after=Pt(2);p.paragraph_format.line_spacing=1.1;p.paragraph_format.keep_with_next=False
                for r in p.runs:r.font.name='Arial';r.font.size=Pt(10);r.bold=i==0
    para('').paragraph_format.space_after=Pt(0)
    return t

para('3 RESULTADOS','title')
para('En este capítulo se presenta el desarrollo del sistema web para la gestión comercial de PLASTIMAD, de acuerdo con los objetivos, el alcance y la metodología establecidos en los capítulos anteriores. La solución integra la presentación interactiva de maceteros mediante scrollytelling, la consulta del catálogo, el asesoramiento con inteligencia artificial y el seguimiento de solicitudes comerciales. Sus funcionalidades se organizan según los permisos del administrador y del cliente.')
para('La exposición sigue la distribución de trabajo por sprints. Primero se describe la preparación del ambiente y del modelo de datos; posteriormente, las funcionalidades de acceso, administración y atención al cliente. Finalmente, se detallan los procedimientos de validación y los componentes necesarios para la puesta en producción. Las historias de usuario y los backlogs del Anexo II constituyen la referencia para relacionar cada funcionalidad con su requerimiento.')
para('La planificación comprende una etapa inicial de configuración y cinco sprints, además de las actividades de documentación. La Tabla 3.1 sintetiza esta organización y conserva el total de 240 horas estimadas. Estas horas corresponden a la planificación del trabajo y no representan mediciones de rendimiento del sistema.')
para('Tabla 3.1 Distribución de funcionalidades y esfuerzo por sprint','caption')
table(['Bloque','Contenido','HU relacionadas','Horas'],[
 ('SB-000','Configuración del ambiente de desarrollo','No aplica','10'),
 ('SB-001','Landing page y gestión de cuentas','HU-001 y HU-002','60'),
 ('SB-002','Funcionalidades del administrador','HU-003 a HU-006','40'),
 ('SB-003','Funcionalidades del cliente','HU-007 a HU-012','20'),
 ('SB-004','Pruebas integrales del sistema','HU-001 a HU-012','40'),
 ('SB-005','Validación final y despliegue','HU-001 a HU-012','30'),
 ('Trabajo escrito','Trabajo de Integración Curricular y anexos','Transversal','40'),
 ('Total','Esfuerzo estimado del proyecto','','240')],[.88,2.67,1.68,.67])

para('3.1 Sprint 0 Configuración del ambiente de desarrollo','head')
para('La preparación técnica establece la base para construir e integrar los módulos del sistema. En esta etapa se relacionan los requerimientos de PLASTIMAD con la estructura del proyecto, la persistencia de la información y los permisos de acceso. El ambiente mantiene las tecnologías definidas en el capítulo 2: React en la interfaz, Node.js y Express en el servidor y MySQL como gestor de base de datos relacional. Las actividades de este sprint comprenden:')
bullets(['Organizar los requerimientos y las responsabilidades de los usuarios.','Configurar las herramientas, las dependencias y el repositorio del proyecto.','Estructurar los componentes del frontend y del backend.','Definir el modelo de datos y comprobar la comunicación entre los componentes.'])
para('3.1.1 Organización de requerimientos y permisos','sub')
para('El sistema contempla dos perfiles. El administrador mantiene los productos publicados, consulta los datos de los clientes y atiende las solicitudes comerciales, quejas y sugerencias. El cliente explora los maceteros, obtiene orientación, registra solicitudes y consulta su seguimiento. La landing page permite conocer la empresa antes de iniciar sesión, mientras que el registro público se reserva al cliente.')
para('Esta distribución determina los controles de acceso de cada operación. La interfaz muestra las opciones correspondientes al perfil y el backend verifica los permisos antes de consultar o modificar información. En los procesos personales, la autorización también depende de la pertenencia del registro: un cliente consulta sus propias solicitudes y mensajes. Los estados por confirmar, confirmado, finalizado y cancelado se aplican a las solicitudes comerciales.')
para('3.1.2 Configuración y organización del proyecto','sub')
para('El frontend se organiza mediante componentes reutilizables para la navegación, los formularios, las fichas de productos y los espacios de asesoramiento. React y TypeScript permiten estructurar estas interfaces, mientras que Vite interviene en el ambiente de desarrollo y la construcción de los archivos de la aplicación. Git y GitHub apoyan el control de cambios y la conservación del código fuente.')
para('En el backend, Express organiza la recepción de las peticiones y su comunicación con la lógica comercial. La distribución en capas mantiene separadas la presentación, el procesamiento y el acceso a MySQL, conforme al patrón descrito en el capítulo 2. La conexión con los servicios de inteligencia artificial se realiza desde el servidor para gestionar sus credenciales y coordinar las respuestas que recibe la interfaz.')
para('3.1.3 Modelo de datos relacional','sub')
para('La organización de la información relaciona las cuentas de usuario con las solicitudes comerciales y los mensajes registrados. Los productos contienen los datos utilizados en el catálogo, entre ellos el nombre, la descripción, las dimensiones, el precio referencial, las imágenes y su condición de publicación. Cada solicitud vincula al cliente con los productos seleccionados, las cantidades y la información necesaria para su atención.')
para('Las estimaciones conservan la información necesaria para relacionar el asesoramiento con una solicitud cuando el cliente decide continuar. Los cambios de estado y las observaciones permiten dar seguimiento a la atención comercial. Las respuestas a quejas y sugerencias se asocian con su mensaje de origen. Las claves y relaciones entre registros permiten mantener estas asociaciones y evitar que una operación altere información ajena al usuario.')
para('La integridad del historial requiere distinguir el precio vigente del catálogo del valor utilizado al registrar una solicitud. Del mismo modo, la actualización o desactivación de un producto no debe eliminar el detalle de solicitudes anteriores. Estos criterios orientan las validaciones de almacenamiento y consulta en MySQL.')
para('3.1.4 Comunicación inicial entre componentes','sub')
para('La comprobación inicial sigue el recorrido de una petición desde la interfaz hasta el servidor y la base de datos. Se revisa que el backend reciba los campos enviados, procese la operación y devuelva una respuesta que el frontend pueda interpretar. Postman permite examinar las respuestas de los servicios durante su integración. Las situaciones de error se comunican mediante mensajes comprensibles para evitar que el usuario interprete una operación fallida como un registro exitoso.')

para('3.2 Sprint 1 Landing page y gestión de cuentas','head')
para('Este sprint reúne las historias HU-001 y HU-002. Su propósito es presentar PLASTIMAD y permitir el acceso a las funcionalidades de acuerdo con el perfil del usuario. La planificación asigna 20 horas a la landing page y 40 horas a la gestión de cuentas. Las actividades incluyen la construcción de las interfaces, la integración con el backend y la validación de los formularios.')
para('3.2.1 Visualizar la landing page comercial','sub')
para('La HU-001 corresponde a la página inicial que presenta la empresa y sus productos. La interfaz organiza la sección principal, el formulario comercial y los accesos a quejas, sugerencias y asistente virtual. Esta distribución facilita que el visitante conozca la propuesta de PLASTIMAD e identifique cómo continuar hacia el catálogo o solicitar orientación.')
para('La navegación mantiene una relación clara entre las secciones y las acciones disponibles. La presentación se adapta al espacio de la pantalla para conservar la lectura y el acceso a los controles. Cuando una acción requiere identificar al cliente, el flujo dirige al registro o al inicio de sesión antes de acceder a información personal.')
para('3.2.2 Registro de clientes','sub')
para('El registro forma parte de la HU-002 y habilita la creación de cuentas de cliente. El formulario recopila los datos requeridos y comprueba su integridad antes de enviarlos al servidor. El backend valida nuevamente la información y controla que no se dupliquen las credenciales de identificación de una cuenta existente. La asignación de permisos administrativos queda fuera del registro público.')
para('La interfaz informa los campos que requieren corrección y comunica el resultado de la solicitud. El tratamiento de la contraseña debe impedir su conservación como texto legible. El proceso de registro se completa cuando la cuenta queda disponible para su posterior autenticación, sin conceder funciones que correspondan al administrador.')
para('3.2.3 Inicio y cierre de sesión','sub')
para('La autenticación comprueba las credenciales y habilita las opciones correspondientes al administrador o al cliente. El control de acceso no depende únicamente de ocultar elementos de la interfaz: las operaciones protegidas requieren que el servidor valide la sesión y el permiso asociado a la acción. Ante datos incorrectos o una sesión no válida, el sistema comunica la situación sin revelar información privada.')
para('El cierre de sesión termina el acceso desde la aplicación y devuelve al usuario a la navegación pública. La verificación de este flujo incluye comprobar que las pantallas y operaciones protegidas soliciten nuevamente la autenticación, en lugar de permitir que se continúe utilizando información de la sesión anterior.')
para('3.2.4 Consulta y modificación del perfil','sub')
para('La gestión del perfil permite consultar y modificar los datos personales de la cuenta autenticada. El formulario presenta la información registrada y valida los cambios antes de almacenarlos. La operación queda restringida a la cuenta correspondiente y no permite que el cliente modifique su rol ni los datos de otros usuarios. Una vez procesada la actualización, la interfaz comunica el resultado y presenta los valores conservados.')
para('3.2.5 Recuperación de contraseña','sub')
para('La recuperación de acceso permite iniciar el restablecimiento de la contraseña mediante el mecanismo de verificación asociado a la cuenta. El flujo debe comprobar la identidad antes de aceptar una nueva clave y rechazar las solicitudes inválidas o vencidas. Su validación considera tanto la recuperación correcta como los intentos con información incompleta, para mantener la protección de la cuenta durante todo el proceso.')

para('3.3 Sprint 2 Funcionalidades del administrador','head')
para('Este sprint corresponde a las historias HU-003, HU-004, HU-005 y HU-006. Su finalidad es centralizar el mantenimiento del catálogo y la atención de los requerimientos comerciales. Las actividades abarcan las interfaces administrativas, su integración con los servicios del servidor y la conservación de la información en MySQL.')
para('3.3.1 Gestión de usuarios','sub')
para('La HU-003 permite al administrador consultar la información de los clientes y gestionar los pedidos asociados a cada uno. Desde esta vista se relacionan los datos del cliente con sus requerimientos, de manera que el personal comercial pueda identificar a quién pertenece una solicitud y revisar su seguimiento. La actualización de un pedido conserva su vinculación con el cliente correspondiente.')
para('Las validaciones evitan que los cambios afecten registros de otro cliente. Cuando se contempla eliminar una cuenta, la operación debe respetar las relaciones existentes y la conservación del historial comercial. Esta funcionalidad se articula con la gestión de solicitudes de la HU-005, que concentra la consulta y atención de los requerimientos recibidos.')
para('3.3.2 Gestión de productos y catálogo','sub')
para('La HU-004 permite registrar, consultar y actualizar los productos de PLASTIMAD. El formulario incorpora nombre, descripción, dimensiones, precio e imágenes, de acuerdo con los datos establecidos en la historia de usuario. La validación comprueba los campos obligatorios y la coherencia de los valores numéricos para que el catálogo y las estimaciones utilicen información consistente.')
para('El administrador puede activar o desactivar la publicación de un producto. Esta condición determina su disponibilidad en la consulta del cliente y permite retirar temporalmente una opción sin borrar el historial asociado. La información comercial y los recursos visuales deben corresponder al mismo producto para evitar diferencias entre la presentación del macetero y los datos empleados en el asesoramiento.')
para('3.3.3 Gestión de solicitudes comerciales','sub')
para('La HU-005 reúne las solicitudes recibidas y permite revisar los productos, las cantidades y los datos del cliente. El administrador consulta cada detalle, registra observaciones y actualiza el estado entre por confirmar, confirmado, finalizado y cancelado. Estos cambios permiten distinguir las solicitudes pendientes de atención de aquellas cuyo proceso comercial ha concluido.')
para('El seguimiento conserva la relación entre la solicitud, sus observaciones y su estado. El cliente puede consultar la información actualizada desde su cuenta, mientras que la modificación administrativa queda protegida por los permisos correspondientes. Una solicitud con una estimación inicial proporciona un punto de partida para el asesoramiento y requiere revisión comercial antes de asumir cantidades o precios definitivos.')
para('3.3.4 Atención de quejas y sugerencias','sub')
para('La HU-006 permite consultar los mensajes recibidos, revisar su contenido y responder al cliente. Cada respuesta permanece vinculada con la queja o sugerencia que la originó, junto con su estado de atención. La interfaz administrativa facilita distinguir los mensajes que requieren seguimiento y aquellos que ya cuentan con respuesta.')
para('El backend comprueba que la operación provenga de un usuario autorizado y que el mensaje exista antes de registrar cambios. La consulta posterior del cliente presenta únicamente las respuestas asociadas a sus propios mensajes. De esta manera, la atención de observaciones se incorpora al mismo entorno utilizado para gestionar la relación comercial.')

para('3.4 Sprint 3 Funcionalidades del cliente','head')
para('Este sprint comprende las historias HU-007 a HU-012. Integra la exploración visual de los maceteros con el catálogo, las recomendaciones, la estimación inicial y el registro de solicitudes. También incorpora el asistente conversacional y la comunicación de quejas o sugerencias. El recorrido permite que el cliente pase de conocer un producto a solicitar atención comercial con información previamente organizada.')
para('3.4.1 Visualización de productos mediante scrollytelling','sub')
para('La HU-007 presenta el macetero mediante un modelo tridimensional cuya posición y rotación se relacionan con el desplazamiento por la página. La experiencia combina la representación visual con información sobre materiales, dimensiones y aplicaciones, de manera que el cliente pueda explorar progresivamente el producto desde distintas perspectivas.')
para('Three.js, React Three Fiber y Drei constituyen las herramientas definidas para integrar la escena tridimensional en la interfaz de React. La coordinación entre el desplazamiento, la animación y el contenido debe mantener una secuencia comprensible. Su validación considera la carga del modelo, la correspondencia entre cada etapa visual y su información, y la continuidad de la navegación en diferentes tamaños de pantalla.')
para('3.4.2 Consulta de productos y catálogo','sub')
para('La HU-008 permite consultar los productos publicados y acceder a sus imágenes, descripciones, dimensiones y precios referenciales. Esta información procede de los registros administrados en el sistema, por lo que la publicación de un producto depende de su condición activa. La selección de un macetero facilita continuar hacia el asesoramiento o el registro de una solicitud comercial.')
para('La consulta mantiene coherencia con la información utilizada en las recomendaciones y estimaciones. Si un producto cambia de condición o deja de estar disponible, su selección debe verificarse nuevamente antes de registrar una solicitud. Este control evita que la interfaz ofrezca como vigente una opción que el administrador ya retiró del catálogo.')
para('3.4.3 Recomendaciones y estimación inicial de productos y costos','sub')
para('La HU-009 permite cargar una imagen e ingresar el largo y el ancho del espacio. La imagen proporciona contexto visual para identificar características relevantes del entorno; las medidas aportadas por el cliente y las dimensiones de los productos sustentan el cálculo de la cantidad estimada. Esta separación evita tratar una fotografía sin escala como una medición física exacta.')
para('El componente de inteligencia artificial apoya la recomendación de alternativas pertenecientes al catálogo de PLASTIMAD. La respuesta se relaciona con los productos disponibles y se presenta junto con la estimación de unidades y su costo referencial. El importe se obtiene a partir de las cantidades calculadas y los precios de los productos seleccionados; cuando intervienen varias alternativas, el total reúne sus respectivos subtotales.')
para('El flujo valida el archivo enviado, la presencia de las medidas y la coherencia de los valores ingresados. Si faltan datos o el servicio de análisis no entrega una respuesta utilizable, la interfaz debe explicar la situación y permitir corregir la entrada o solicitar atención comercial. La estimación es orientativa y no constituye una confirmación de venta. Cuando el cliente desea continuar, puede vincularla con una solicitud de la HU-010.')
para('3.4.4 Registro y consulta de solicitudes comerciales','sub')
para('La HU-010 permite registrar una solicitud con productos, cantidades y datos de contacto. Cuando corresponde, el cliente incorpora la estimación obtenida durante el asesoramiento para que el administrador revise el contexto de su requerimiento. El servidor comprueba la identidad del cliente y la validez de los datos antes de conservar la solicitud.')
para('Desde su cuenta, el cliente consulta el detalle, el estado y las observaciones comerciales de sus propias solicitudes. La actualización de estados corresponde al administrador. La integración de ambas vistas permite dar continuidad al mismo requerimiento sin que el cliente deba volver a proporcionar toda la información al personal comercial.')
para('3.4.5 Consultas al asistente conversacional','sub')
para('La HU-011 proporciona una interfaz de conversación para realizar consultas sobre características, dimensiones, materiales y precios referenciales de los productos de PLASTIMAD. El asistente utiliza la información disponible del negocio para orientar al cliente y facilitar la continuidad hacia una solicitud comercial cuando se requiere atención personalizada.')
para('La interacción distingue las respuestas de orientación de los compromisos comerciales que requieren confirmación del personal de la empresa. Cuando la información disponible es insuficiente, el asistente debe comunicar esa limitación y dirigir al cliente hacia la atención correspondiente. La validación contempla preguntas relacionadas con el catálogo, consultas sin información suficiente y fallos del servicio, procurando que la conversación no presente datos no confirmados como hechos del negocio.')
para('3.4.6 Registro de quejas y sugerencias','sub')
para('La HU-012 permite enviar una queja o sugerencia con asunto y descripción, consultar los mensajes propios y revisar su estado de atención. Las respuestas registradas por el administrador se muestran dentro del mensaje correspondiente. La funcionalidad permite comunicar observaciones sobre la experiencia de uso y la atención comercial desde la misma plataforma.')
para('El formulario controla los campos obligatorios y presenta el resultado del envío. La asociación entre cuenta y mensaje permite restringir la consulta a su propietario. La comprobación del flujo incluye el registro por parte del cliente, la respuesta administrativa y la consulta posterior, para verificar que la información se conserve y se muestre a la persona correcta.')

para('3.5 Sprint 4 Pruebas integrales del sistema','head')
para('La validación integral relaciona las doce historias de usuario con sus flujos de funcionamiento. Este sprint considera tanto las operaciones administrativas como las acciones del cliente y la comunicación entre ambas. El procedimiento distingue el resultado esperado de cada caso del resultado observado durante su ejecución; la aceptación de una funcionalidad requiere conservar el registro de esa comparación.')
para('3.5.1 Pruebas unitarias','sub')
para('La revisión por unidades se concentra en reglas que pueden verificarse de forma independiente: validación de formularios, tratamiento de cantidades y precios, comprobación de permisos y procesamiento de respuestas. Los casos deben incluir entradas correctas, campos ausentes, valores numéricos inválidos y operaciones no autorizadas. Para los componentes que dependen de la IA, la lógica de la aplicación puede evaluarse con respuestas controladas, separando esa comprobación del comportamiento del servicio externo.')
para('3.5.2 Pruebas de integración y persistencia','sub')
para('La integración se comprueba siguiendo el recorrido completo de la información. Un caso comercial inicia con la selección de un producto, continúa con una solicitud del cliente y termina con su atención administrativa y la consulta del estado actualizado. Otro caso relaciona el envío de una queja con la respuesta del administrador. En ambos se revisa que MySQL conserve los registros correctos y que cada usuario acceda únicamente a la información permitida.')
para('La Tabla 3.2 relaciona las historias con los criterios que orientan esta verificación. La descripción de los resultados esperados permite preparar las pruebas sin confundir la existencia de una funcionalidad con la evidencia de su ejecución satisfactoria.')
para('Tabla 3.2 Criterios de verificación de las historias de usuario','caption')
table(['HU','Caso de verificación','Resultado esperado'],[
 ('HU-001','Recorrer la landing page y sus accesos.','Secciones legibles y navegación hacia las funciones correspondientes.'),
 ('HU-002','Registrar cliente, iniciar sesión, editar perfil y recuperar acceso.','Datos válidos, cuenta protegida y permisos de acuerdo con el rol.'),
 ('HU-003','Consultar un cliente y sus pedidos asociados.','Correspondencia correcta entre el cliente y sus registros.'),
 ('HU-004','Registrar, editar y desactivar un producto.','Catálogo actualizado y conservación del historial relacionado.'),
 ('HU-005','Cambiar el estado de una solicitud y registrar observaciones.','Seguimiento almacenado y disponible para el cliente correspondiente.'),
 ('HU-006','Responder una queja desde administración.','Respuesta vinculada con el mensaje y su remitente.'),
 ('HU-007','Recorrer la secuencia de scrollytelling.','Modelo, animación e información coordinados durante el desplazamiento.'),
 ('HU-008','Consultar productos publicados y seleccionar uno.','Información vigente y selección de una opción disponible.'),
 ('HU-009','Enviar imagen y medidas válidas e inválidas.','Estimación coherente con los datos y mensajes de validación cuando corresponda.'),
 ('HU-010','Crear una solicitud y consultar su seguimiento.','Registro asociado al cliente y acceso restringido a su propietario.'),
 ('HU-011','Consultar datos del catálogo y datos no disponibles.','Orientación basada en información de PLASTIMAD y reconocimiento de información insuficiente.'),
 ('HU-012','Enviar un mensaje y consultar la respuesta.','Mensaje conservado y respuesta visible únicamente para el cliente correspondiente.')],[.70,2.20,3.00])
para('3.5.3 Compatibilidad y adaptación de interfaces','sub')
para('La revisión de compatibilidad contempla la navegación, los formularios y el contenido visual en distintos tamaños de pantalla y navegadores. En el scrollytelling se comprueba especialmente que el desplazamiento permita consultar la información sin impedir el acceso a los demás controles. También se revisan la presentación de imágenes, la lectura del catálogo y la interacción con el asistente y los formularios comerciales.')
para('Cada ejecución debe identificar el navegador, el dispositivo o tamaño de pantalla y el comportamiento observado. Si se detecta una diferencia que impide completar una tarea, se registra la incidencia, se ajusta el componente afectado y se repite el caso. La compatibilidad se valora por la posibilidad de realizar las acciones previstas, además de la apariencia de la interfaz.')
para('3.5.4 Rendimiento de los flujos principales','sub')
para('La evaluación de rendimiento considera la carga inicial de la página, la disponibilidad del modelo tridimensional, la consulta del catálogo y los tiempos de respuesta del asesoramiento. En los flujos de IA conviene distinguir el procesamiento del servidor del tiempo utilizado por el servicio externo, para identificar dónde se presenta una demora.')
para('El registro de una prueba debe indicar las condiciones de ejecución, la cantidad de solicitudes o usuarios simulados, los tiempos de respuesta y los errores observados. Estos datos permiten interpretar el comportamiento bajo la carga evaluada. Una conclusión sobre rapidez o estabilidad requiere las mediciones correspondientes y no se obtiene únicamente porque una consulta individual haya respondido.')
para('3.5.5 Pruebas de aceptación','sub')
para('Las pruebas de aceptación comprueban que los flujos respondan a las necesidades comerciales establecidas. Cada caso identifica la historia evaluada, las condiciones de entrada, las acciones que debe ejecutar el usuario y el resultado esperado. La Tabla 3.3 presenta el formato aplicado a la estimación inicial de productos y costos, una funcionalidad directamente relacionada con el objetivo del proyecto.')
para('Tabla 3.3 Formato de prueba de aceptación de la estimación inicial','caption')
table(['Campo','Contenido'],[
 ('Designación','PA-009'),
 ('Historia de usuario','HU-009 Visualizar recomendaciones y estimación de costos y productos.'),
 ('Nombre','Obtener una estimación inicial a partir de la imagen y las medidas del espacio.'),
 ('Descripción','El cliente proporciona una imagen y las medidas de su espacio para recibir alternativas del catálogo y consultar una estimación orientativa.'),
 ('Condiciones previas','Cuenta de cliente disponible, productos publicados con dimensiones y precios y servicio de análisis configurado.'),
 ('Instrucciones de funcionamiento','1. Acceder al módulo de asesoramiento.\n2. Cargar una imagen e ingresar largo y ancho válidos.\n3. Solicitar la recomendación y revisar productos, cantidades e importe.\n4. Continuar hacia una solicitud comercial.\n5. Repetir con campos vacíos o medidas inválidas para comprobar la validación.'),
 ('Resultado deseado','Las alternativas corresponden al catálogo; el cálculo utiliza medidas y precios registrados; el importe se presenta como referencial. Los datos inválidos impiden continuar hasta su corrección.'),
 ('Evaluación','Registrar aprobado o no aprobado después de ejecutar el caso y comparar el resultado observado con el esperado. Asociar la evidencia y cualquier incidencia detectada.')],[1.48,4.42])
para('La validación final de cada caso debe conservar su resultado observado y la evidencia que lo respalda. Las incidencias detectadas requieren una nueva ejecución después de su corrección. Este registro permite relacionar las conclusiones del proyecto con comprobaciones concretas y distinguir los criterios definidos de los resultados efectivamente obtenidos.')

para('3.6 Sprint 5 Validación final y despliegue del sistema','head')
para('El último sprint reúne la revisión final de compatibilidad y aceptación y la preparación del sistema para su publicación. El despliegue comprende el frontend, el backend y la base de datos MySQL como componentes relacionados. La disponibilidad de la interfaz por sí sola no demuestra que los procesos comerciales funcionen; también se requiere comprobar la comunicación con el servidor y la persistencia de la información.')
para('3.6.1 Configuración del entorno de producción','sub')
para('La preparación del entorno incluye las direcciones de los servicios, la conexión con MySQL y las credenciales utilizadas por las integraciones externas. Los datos de acceso se gestionan mediante la configuración del servidor y no deben incorporarse en los archivos públicos del frontend. Asimismo, se revisan los permisos y la comunicación entre los dominios utilizados por los componentes.')
para('El esquema de datos debe estar disponible antes de habilitar los flujos que requieren almacenamiento. La configuración también contempla el acceso administrativo y la carga de la información comercial necesaria para presentar los productos. La conservación de respaldos y la definición del procedimiento de recuperación permiten atender fallos sin depender únicamente de la copia activa de los datos.')
para('3.6.2 Publicación de los componentes','sub')
para('La publicación del frontend utiliza los archivos generados para producción y comprueba que la navegación funcione al acceder directamente a sus rutas. El backend requiere un entorno compatible con Node.js y Express, con acceso a MySQL y a los servicios de inteligencia artificial. La comunicación pública del sistema debe utilizar una conexión segura y mantener las credenciales de infraestructura fuera del alcance del cliente.')
para('La configuración de despliegue debe registrar el servicio utilizado para cada componente, sus direcciones y las instrucciones necesarias para reproducir la publicación. Esta información corresponde al anexo de acceso y despliegue. La documentación de operación permite identificar qué componente revisar ante un fallo de conexión, una respuesta incorrecta o un recurso visual que no se encuentre disponible.')
para('3.6.3 Comprobación de los flujos en producción','sub')
para('La revisión posterior a la publicación recorre la landing page, el acceso a cuentas, el catálogo y la experiencia de scrollytelling. A continuación, verifica la recomendación con imagen y medidas, la consulta al asistente, el envío de una solicitud y su atención administrativa. El mismo recorrido se aplica a una queja o sugerencia para comprobar la comunicación entre los dos perfiles.')
para('La información registrada debe mantenerse al cerrar la sesión y volver a consultar desde la cuenta correspondiente. Las comprobaciones también incluyen accesos no autorizados y errores de entrada para revisar que el sistema conserve sus controles fuera del ambiente de desarrollo. El registro de estas verificaciones, junto con el manual de usuario y las instrucciones de despliegue, proporciona el soporte para la entrega del sistema al personal de PLASTIMAD.')

d.core_properties.title='Capítulo 3 Resultados del sistema web de PLASTIMAD'
d.core_properties.subject='Desarrollo por sprints con React Express y MySQL'
d.core_properties.author='Dilan Artemio Obando Suarez'
d.save(OUT)
assert sha256(SRC.read_bytes()).hexdigest()==digest
assert sum([10,60,40,20,40,30,40])==240
full='\n'.join(t.text or '' for t in d.element.body.iter(qn('w:t')))
assert 'MongoDB' not in full and 'Supabase' not in full
assert all(f'HU-{i:03d}' in full for i in range(1,13))
print(OUT)
print('PALABRAS',len(full.split()),'TABLAS',len(d.tables))
