// Local Figma builder. Uses only existing product and background layers.
// The source page is preserved; all generated content goes to a new page.
const PAGE = 'Hero listo · Escritorio y móvil';
const SOURCE = 'https://www.wwf.org.ec/?389213/Ecuador-lidera-una-historica-hoja-de-ruta-para-reducir-la-contaminacion--por-plasticos';
const copy = [
  ['UN MATERIAL. OTRA HISTORIA.', 'El plástico merece\notra historia.', 'Basureros hechos con plástico reciclado.\nUna segunda vida para el material,\nun nuevo objeto para tu espacio.'],
  ['ECUADOR · EL DESAFÍO', '627.000\ntoneladas.', 'Residuos plásticos municipales generados en Ecuador en 2022. Una razón para aprovechar los materiales que ya existen.'],
  ['ECUADOR · LA OPORTUNIDAD', 'Solo el 7,7 %\nse recicló.', 'Esa fue la proporción reciclada en 2022. Dar una nueva aplicación al plástico abre más posibilidades para su aprovechamiento.'],
  ['DEL MATERIAL AL OBJETO', 'El cambio\ntoma forma.', 'Plástico reciclado convertido en un basurero. Un material recuperado que vuelve a tener una función.'],
  ['DISEÑO PARA LO COTIDIANO', 'Una segunda vida.\nTodos los días.', 'Un objeto cotidiano puede contar una historia distinta. La de este basurero empieza con el plástico que lo compone.'],
  ['LA HISTORIA CONTINÚA CONTIGO', 'Dale espacio\nal cambio.', 'Elige un basurero hecho con plástico reciclado para tu próximo proyecto.']
];
const rgb = hex => ({r:parseInt(hex.slice(0,2),16)/255,g:parseInt(hex.slice(2,4),16)/255,b:parseInt(hex.slice(4,6),16)/255});
const solid = (hex,opacity=1) => ({type:'SOLID',color:rgb(hex),opacity});
function box(parent,name,x,y,w,h,fill){const n=figma.createRectangle();parent.appendChild(n);n.name=name;n.x=x;n.y=y;n.resize(w,h);n.fills=fill?[fill]:[];return n;}
function text(parent,name,value,x,y,w,size=20,style='Regular',color='F5F4ED',line=1.3){const n=figma.createText();parent.appendChild(n);n.name=name;n.fontName={family:'Inter',style};n.fontSize=size;n.characters=value;n.fills=[solid(color)];n.lineHeight={unit:'PIXELS',value:Math.round(size*line)};n.resize(w,10);n.textAutoResize='HEIGHT';n.x=x;n.y=y;return n;}
function frame(parent,name,x,y,w,h){const n=figma.createFrame();parent.appendChild(n);n.name=name;n.x=x;n.y=y;n.resize(w,h);n.fills=[];n.clipsContent=false;return n;}
function cloneAt(source,parent,name,x,y,w,h){const n=source.clone();parent.appendChild(n);n.name=name;n.locked=false;n.visible=true;n.opacity=1;n.rotation=0;n.resize(w,h);n.x=x;n.y=y;return n;}
function button(parent,name,label,x,y,w,primary){const n=frame(parent,name,x,y,w,52);n.cornerRadius=26;n.fills=[solid(primary?'D6F29A':'071810',primary?1:0.7)];n.strokes=primary?[]:[solid('F5F4ED',0.3)];const t=text(n,'Etiqueta',label,16,15,w-32,15,'Medium',primary?'102019':'F5F4ED',1.4);t.textAlignHorizontal='CENTER';return n;}
function gradient(parent,w,h,mobile){const n=box(parent,'Oscurecimiento',0,0,w,h);const c=rgb('06120E');n.fills=[{type:'GRADIENT_LINEAR',gradientTransform:mobile?[[0,1,0],[-1,0,1]]:[[1,0,0],[0,1,0]],gradientStops:[{position:0,color:{...c,a:mobile?0.96:0.94}},{position:0.52,color:{...c,a:mobile?0.62:0.72}},{position:1,color:{...c,a:0.22}}]}];return n;}
function transition(last=false){return {type:'SMART_ANIMATE',duration:2,easing:{type:'CUSTOM_CUBIC_BEZIER',easingFunctionCubicBezier:{x1:last?0.41:0.43,y1:-0.01,x2:0.14,y2:1}}};}
async function connect(node,dest,auto=false,last=false){await node.setReactionsAsync([{trigger:auto?{type:'AFTER_TIMEOUT',timeout:0.001}:{type:'ON_CLICK'},actions:[{type:'NODE',destinationId:dest.id,navigation:'NAVIGATE',transition:transition(last),preserveScrollPosition:false}]}]);}
function makeScene(page,product,background,index,mobile){
  const w=mobile?390:1440,h=mobile?844:900,pad=mobile?24:88;
  const f=frame(page,(mobile?'Móvil':'Escritorio')+' · '+String(index+1).padStart(2,'0')+' · '+['Presentación','El desafío','La oportunidad','Transformación','Detalle','Decisión'][index],index*(w+100),mobile?1190:0,w,h);
  f.clipsContent=true;f.fills=[solid('06120E')];f.exportSettings=[{format:'PNG',constraint:{type:'SCALE',value:1}}];
  // Preserve the user's chosen landscape and original image crop.
  const bh=mobile?1000:1080,bw=bh*background.width/background.height;
  const bg=cloneAt(background,f,'Fondo',(w-bw)/2,mobile?(-120+index*16):(-160+index*30),bw,bh);
  bg.effects=index===3||index===4?[{type:'LAYER_BLUR',radius:index===3?3:6.7,visible:true}]:[];
  gradient(f,w,h,mobile);
  // A restrained halo separates the grey product from the green scene.
  const halo=figma.createEllipse();f.appendChild(halo);halo.name='Luz del producto';halo.resize(mobile?280:580,mobile?280:580);halo.x=mobile?55:790;halo.y=mobile?385:185;halo.fills=[solid('D6F29A',0.10)];halo.effects=[{type:'LAYER_BLUR',radius:mobile?55:100,visible:true}];
  const heights=mobile?[305,270,290,330,365,305]:[560,470,520,620,700,570];
  const ph=heights[index],pw=ph*product.width/product.height;
  const productX=mobile?(w-pw)/2:[910,990,940,880,855,925][index];
  const productY=mobile?[409,435,420,397,375,410][index]:[180,255,220,145,100,175][index];
  cloneAt(product,f,'Producto',productX,productY,pw,ph);
  text(f,'Marca','OTRA HISTORIA',pad,mobile?26:38,mobile?215:320,mobile?13:18,'Semi Bold','F5F4ED');
  text(f,'Material','PLÁSTICO RECICLADO',mobile?24:1090,mobile?51:41,mobile?280:262,mobile?10:12,'Medium','D6F29A');
  box(f,'Línea superior',pad,mobile?80:86,w-pad*2,1,solid('F5F4ED',0.18));
  for(let j=0;j<copy.length;j++){
    const width=mobile?342:610,baseY=mobile?111:235;
    const g=frame(f,'Copy-'+String(j+1).padStart(2,'0'),pad,baseY+(j===index?0:j<index?-70:70),width,mobile?285:380);g.opacity=j===index?1:0;
    const eyebrow=text(g,'Antetítulo',copy[j][0],0,0,width,mobile?10:12,'Medium','D6F29A');eyebrow.letterSpacing={unit:'PERCENT',value:12};
    const title=text(g,'Titular',copy[j][1],0,mobile?28:37,width,mobile?38:(j===1?92:j===2?76:70),'Semi Bold','F5F4ED',1.03);title.letterSpacing={unit:'PERCENT',value:-3};
    const body=text(g,'Descripción',copy[j][2].replace(mobile?/\n/g:/$^/g,' '),0,title.y+title.height+(mobile?17:26),mobile?330:530,mobile?15:20,'Regular','E1E7DF',1.5);
    if(j===1||j===2){const source=text(g,'Fuente','WWF Ecuador · 2024 / Datos de 2022',0,body.y+body.height+12,width,mobile?11:12,'Regular','B8C8B9');source.hyperlink={type:'URL',value:SOURCE};}
  }
  const footerY=mobile?757:786;
  button(f,'Anterior','←',pad,footerY,52,false);
  button(f,'Siguiente',index===5?'Volver al inicio ↺':index===0?'Descubrir →':'Continuar →',mobile?90:160,footerY,mobile?276:216,true);
  text(f,'Paso',String(index+1).padStart(2,'0')+' / 06',mobile?300:1244,mobile?28:794,100,mobile?12:14,'Medium');
  const track=box(f,'Progreso base',pad,mobile?829:874,w-pad*2,2,solid('F5F4ED',0.18));
  box(f,'Progreso',track.x,track.y,(w-pad*2)*(index+1)/6,2,solid('D6F29A'));
  if(!mobile)text(f,'Nota de navegación','EXPLORA LA HISTORIA',990,800,220,11,'Medium','CCD9C8');
  return f;
}
async function main(){
  const sourcePage=figma.root.children.find(p=>p.name!==PAGE);
  await sourcePage.loadAsync();
  const sourceFrame=sourcePage.findOne(n=>n.type==='FRAME'&&n.children.some(c=>c.name==='Producto')&&n.children.some(c=>c.name==='Fondo'));
  if(!sourceFrame)throw new Error('No se encontró el marco con las capas Producto y Fondo.');
  const product=sourceFrame.findOne(n=>n.name==='Producto'),background=sourceFrame.findOne(n=>n.name==='Fondo');
  if(!product||!background)throw new Error('Faltan imágenes del producto o del fondo.');
  await Promise.all(['Regular','Medium','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
  const page=figma.root.children.find(p=>p.name===PAGE)||figma.createPage();page.name=PAGE;await figma.setCurrentPageAsync(page);
  const desktop=[],mobile=[];
  for(let i=0;i<6;i++){desktop.push(page.children.find(n=>n.name.startsWith('Escritorio · '+String(i+1).padStart(2,'0')))||makeScene(page,product,background,i,false));mobile.push(page.children.find(n=>n.name.startsWith('Móvil · '+String(i+1).padStart(2,'0')))||makeScene(page,product,background,i,true));}
  for(const list of [desktop,mobile])for(let i=0;i<6;i++){
    await connect(list[i].findOne(n=>n.name==='Siguiente'),list[(i+1)%6],false,i===4);
    await connect(list[i].findOne(n=>n.name==='Anterior'),list[(i+5)%6]);
  }
  const starts=[];
  for(const list of [desktop,mobile]){
    const intro=list[0].clone();intro.name=(list===desktop?'Escritorio':'Móvil')+' · 00 · Entrada';intro.x=-(intro.width+100);
    intro.findAll(n=>/^Copy-/.test(n.name)).forEach(n=>{n.opacity=0;n.y+=60;});
    intro.findOne(n=>n.name==='Producto').y=intro.height+40;
    intro.findOne(n=>n.name==='Luz del producto').opacity=0;
    await connect(intro,list[0],true);starts.push({nodeId:intro.id,name:list===desktop?'Escritorio · Recorrido inmersivo':'Móvil · Recorrido inmersivo'});
  }
  page.flowStartingPoints=starts;
  const guide=frame(page,'LEER · Guía y entrega a web',0,-650,1440,440);guide.fills=[solid('102019')];
  text(guide,'Título','Tu hero está organizado.',48,40,1300,38,'Semi Bold');
  text(guide,'Guía','1. Selecciona Entrada o Presentación y pulsa ▶.\n2. Usa Descubrir / Continuar y ← para recorrer las seis escenas.\n3. Edita cada Copy-01…06: solo el mensaje de su escena tiene opacidad 100 %.\n4. Escritorio: 1440 × 900. Móvil: 390 × 844. La web se adaptará entre tamaños.\n5. Smart Animate: 2000 ms; curva 0.43, -0.01, 0.14, 1. El scroll se implementa en la web.\n6. Para publicar falta conectar el CTA comercial a tu contacto o formulario real.',48,108,1320,20,'Regular','E1E7DF',1.65);
  text(guide,'Fuente','Cifras: WWF Ecuador, publicación 2024, datos 2022. El diseño original se conserva en Page 1.',48,358,1320,16,'Regular','D6F29A');
  const expected=14,actual=page.children.filter(n=>n.type==='FRAME'&&/^(Escritorio|Móvil) ·/.test(n.name)).length;
  if(actual!==expected)throw new Error('Validación: se esperaban 14 pantallas y hay '+actual);
  for(const f of [...desktop,...mobile]){
    if(f.findAll(n=>/^Copy-/.test(n.name)&&n.opacity===1).length!==1)throw new Error('Copy visible incorrecto: '+f.name);
    if(f.findOne(n=>n.name==='Siguiente').reactions.length!==1)throw new Error('Falta navegación: '+f.name);
  }
  figma.currentPage.selection=[desktop[0]];figma.viewport.scrollAndZoomIntoView([desktop[0]]);
  figma.closePlugin('Listo: 6 escenas de escritorio + 6 móviles, 2 entradas y navegación conectada. Original conservado.');
}
async function refine(){
  await Promise.all(['Regular','Medium','Semi Bold'].map(style=>figma.loadFontAsync({family:'Inter',style})));
  const page=figma.root.children.find(p=>p.name===PAGE);
  if(!page)throw new Error('Primero debe existir la página del hero.');
  await figma.setCurrentPageAsync(page);
  const starts=[];
  for(const mobile of [false,true]){
    const prefix=mobile?'Móvil':'Escritorio',w=mobile?390:1440,h=mobile?844:900,pad=mobile?24:88;
    const list=Array.from({length:6},(_,i)=>page.children.find(n=>n.name.startsWith(prefix+' · '+String(i+1).padStart(2,'0'))));
    if(list.some(n=>!n))throw new Error('Faltan escenas de '+prefix);
    const first=list[0],get=(f,name)=>f.children.find(n=>n.name===name);
    function backdrop(f,y,height,blur){const bg=get(f,'Fondo'),ratio=bg.width/bg.height;bg.resize(height*ratio,height);bg.x=(w-bg.width)/2;bg.y=y;bg.effects=[{type:'LAYER_BLUR',blurType:'PROGRESSIVE',startRadius:0,radius:blur,startOffset:{x:0.1,y:0.9},endOffset:{x:0.7,y:0.2},visible:true}];}
    function productAt(f,height,y,x){const p=get(f,'Producto'),ratio=p.width/p.height;p.rotation=0;p.resize(height*ratio,height);p.x=x===undefined?(w-p.width)/2:x;p.y=y;}
    function black(f,opacity){let n=get(f,'Entrada negra');if(!n)n=box(f,'Entrada negra',0,0,w,h,solid('000000'));n.opacity=opacity;return n;}
    for(let i=0;i<6;i++){
      const f=list[i];f.x=(i===0?0:i+1)*(w+100);
      backdrop(f,mobile?[-260,-180,-155,-130,-105,-80][i]:[-480,-280,-230,-180,-130,-80][i],mobile?1200:1500,i===0?0:6.7);
      f.children.filter(n=>/^Copy-/.test(n.name)).forEach(n=>{const j=Number(n.name.slice(-2))-1;n.opacity=j===i?1:0;n.y=j===i?(mobile?111:235):j<i?-600:h+80;});
      black(f,0);
      const c=get(f,'Copy-01');c.x=mobile?24:260;c.resize(mobile?342:920,400);
      const title=get(c,'Titular'),body=get(c,'Descripción'),eyebrow=get(c,'Antetítulo');
      for(const t of [title,body,eyebrow]){t.resize(mobile?342:920,t.height);t.textAlignHorizontal='CENTER';}
      title.fontSize=mobile?44:84;title.lineHeight={unit:'PIXELS',value:mobile?46:87};
      body.characters='Basureros hechos con plástico reciclado.\nUna segunda vida para el material.';body.y=title.y+title.height+(mobile?20:24);
      if(i===0){
        c.y=mobile?150:220;
        productAt(f,mobile?310:420,mobile?600:690);
        get(f,'Oscurecimiento').opacity=0.74;
        get(f,'Luz del producto').opacity=0.35;
        get(f,'Anterior').opacity=0;
        const next=get(f,'Siguiente');next.x=(w-next.width)/2;next.y=mobile?451:570;
        get(f,'Paso').opacity=0;get(f,'Progreso').opacity=0;get(f,'Progreso base').opacity=0;
        if(!mobile)get(f,'Nota de navegación').opacity=0;
      }
    }
    const bridge=page.children.find(n=>n.name===prefix+' · 01B · Producto al centro')||first.clone();
    bridge.name=prefix+' · 01B · Producto al centro';bridge.x=w+100;
    bridge.children.filter(n=>/^Copy-/.test(n.name)).forEach(n=>{n.opacity=0;n.y=n.name==='Copy-01'?-600:h+80;});
    backdrop(bridge,mobile?-215:-360,mobile?1200:1500,0);
    productAt(bridge,mobile?420:620,mobile?180:145);
    get(bridge,'Oscurecimiento').opacity=0.28;get(bridge,'Luz del producto').opacity=0.5;
    const next=get(bridge,'Siguiente');next.x=mobile?90:160;next.y=mobile?757:786;get(next,'Etiqueta').characters='Continuar →';
    const back=get(bridge,'Anterior');back.x=pad;back.y=next.y;back.opacity=1;
    await connect(get(first,'Siguiente'),bridge);
    await connect(next,list[1],false,true);await connect(back,first);
    await connect(get(list[1],'Anterior'),bridge);
    for(let i=1;i<6;i++){await connect(get(list[i],'Siguiente'),list[(i+1)%6],false,true);if(i>1)await connect(get(list[i],'Anterior'),list[i-1]);}
    const intro=page.children.find(n=>n.name===prefix+' · 00 · Entrada');
    if(!intro)throw new Error('Falta la entrada de '+prefix);
    // The existing entry keeps its node ID so presentation links remain valid.
    for(const n of [...intro.children])n.remove();
    for(const n of first.children){const c=n.clone();intro.appendChild(c);}
    intro.children.filter(n=>/^Copy-/.test(n.name)).forEach(n=>{n.opacity=0;n.y+=120;});
    for(const name of ['Marca','Material','Línea superior','Siguiente','Anterior']){const n=get(intro,name);n.opacity=0;n.y+=60;}
    productAt(intro,mobile?310:420,h+40);backdrop(intro,mobile?-340:-620,mobile?1320:1680,0);black(intro,1);
    await connect(intro,first,true);starts.push({nodeId:intro.id,name:prefix+' · Recorrido inmersivo'});
  }
  page.flowStartingPoints=starts;
  const guide=page.children.find(n=>n.name==='LEER · Guía y entrega a web');
  guide.findOne(n=>n.name==='Guía').characters='1. Pulsa ▶ y Reiniciar para ver la entrada desde negro.\n2. Descubrir: el texto sale arriba y el basurero sube al centro. Continuar: producto a un lado.\n3. Hay 6 mensajes + 1 plano del producto + 1 entrada por dispositivo (8 marcos).\n4. Escritorio: 1440 × 900. Móvil: 390 × 844. Recortar contenido activado.\n5. Smart Animate: 2000 ms; curvas 0.43, -0.01, 0.14, 1 y 0.41, -0.01, 0.14, 1.\n6. Fondo: desenfoque progresivo 0 → 6.7. En Figma se avanza con clic; el scroll va en la web.';
  const scenes=page.children.filter(n=>n.type==='FRAME'&&/^(Escritorio|Móvil) ·/.test(n.name));
  if(scenes.length!==16)throw new Error('Se esperaban 16 marcos; hay '+scenes.length);
  for(const f of scenes.filter(n=>!n.name.includes('00 ·'))){const next=f.children.find(n=>n.name==='Siguiente');if(next.reactions.length!==1)throw new Error('Falta conexión en '+f.name);}
  figma.currentPage.selection=[page.children.find(n=>n.name==='Escritorio · 00 · Entrada')];figma.viewport.scrollAndZoomIntoView(figma.currentPage.selection);
  figma.closePlugin('Recorrido corregido: entrada negra → titular → producto al centro → seis mensajes. Escritorio y móvil conectados.');
}
refine().catch(error=>{figma.notify('No se completó: '+error.message,{error:true,timeout:15000});figma.closePlugin();});
