"use strict";

/* -- Variabili per la gestione dei movimenti -- */
var degreeX=0;     //variabile cumulativa di gradi di rotazione delle eliche
var degreeY=0;     //variabile cumulativa di gradi di rotazione delle chiavi e della bolla
let then = 0;     //variabile per il calcolo del deltaTime

let accelleration = 1.25; //accellerazione movimento
let velocity=0;   //velocità del movimento del sottomairno
let maxVelocity = 25; //massima velocità del sottomarino
let bubbleVelocity =0; //velocità della bolla

async function main() {
  //Definisco WebGL context
  const canvas = document.getElementById("mainCanva");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }
  //Definisco l'estensione per le ombre
  const ext = gl.getExtension('WEBGL_depth_texture');
  if (!ext) {
    return alert('need WEBGL_depth_texture');
  }

  //Setup program
  const programInfo = webglUtils.createProgramInfo(gl, ["vertex-shader", "fragment-shader"]);
  const colorProgramInfo = webglUtils.createProgramInfo(gl, ["color-vertex-shader", "color-fragment-shader"]);
  const skyboxProgramInfo = webglUtils.createProgramInfo(gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);

  
  const depthTexture = gl.createTexture();
  const depthTextureSize = 2048;
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
      gl.TEXTURE_2D,      // target
      0,                  // mip level
      gl.DEPTH_COMPONENT, // internal format
      depthTextureSize,   // width
      depthTextureSize,   // height
      0,                  // border
      gl.DEPTH_COMPONENT, // format
      gl.UNSIGNED_INT,    // type
      null);              // data
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,       // target
      gl.DEPTH_ATTACHMENT,  // attachment point
      gl.TEXTURE_2D,        // texture target
      depthTexture,         // texture
      0);                   // mip level

    
  const unusedTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, unusedTexture);
  gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      depthTextureSize,
      depthTextureSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // attach it to the framebuffer
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER,        // target
      gl.COLOR_ATTACHMENT0,  // attachment point
      gl.TEXTURE_2D,         // texture target
      unusedTexture,         // texture
      0);                    // mip level


  // Buffer delle posizioni
  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
 
  // Buffer delle normali
  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);

    

  /* -- Definisco la sky box -- */
  // Crea texture
  var texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  const faceInfos = [
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
      url: './res/skybox/px.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
      url: './res/skybox/nx.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
      url: './res/skybox/py.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
      url: './res/skybox/ny.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
      url: './res/skybox/pz.png',
    },
    {
      target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
      url: './res/skybox/nz.png',
    },
  ];
  
  faceInfos.forEach((faceInfo) => {
    const {target, url} = faceInfo;

    // Upload the canvas to the cubemap face.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 512;
    const height = 512;
    const format = gl.RGBA;
    const type = gl.UNSIGNED_BYTE;

    // setup each face so it's immediately renderable
    gl.texImage2D(target, level, internalFormat, width, height, 0, format, type, null);

    // Asynchronously load an image
    const image = new Image();
    image.src = url;
    image.addEventListener('load', function() {
      // Now that the image has loaded make copy it to the texture.
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(target, level, internalFormat, format, type, image);
      
      // Check if the image is a power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
        // Yes, it's a power of 2. Generate mips.
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      } else {
          // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      
    });
  });
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);


  
  /* - array di tutti gli elementi da disegnare - */
  var elementsToDraw =[];

  /* -- Dichiaro il sottomarino -- */
  const subBody = await generateBuffer('./res/sub-body.obj');
  const submarine = new SeaObject(subBody);
  elementsToDraw.push(submarine);  

  /* -- Dichiaro le eliche -- */
  const subPropellers = await generateBuffer('./res/sub-eliche.obj');
  const propellers = new SeaObject(subPropellers);
  propellers.animateX=true;
  elementsToDraw.push(propellers);  

  /*--Dichiaro il fondale--*/
  const seabed = await generateBuffer('./res/seabed.obj');
  const bed = new SeaObject(seabed);
  bed.translateObj(0, -10.5, 0);
  elementsToDraw.push(bed);
    

  /* -- Dichiaro la chiave -- */
  const singleKey = await generateBuffer('./res/key.obj');
  var level = 3;
  const totalKeys = [];
  for(let i=0; i<level; i++){
    const key = new SeaObject(singleKey);
    var x = getRandomNumber(-120, 120);
    var y = getRandomNumber(-4, 50);
    var z = getRandomNumber(-120, 120);
    key.translateObj(x=0 ? x+getRandomNumber(-100, 100) : x, y ,z);
    key.animateY=true;
    elementsToDraw.push(key);
    totalKeys.push(key);
  }


  /* -- Dichiaro gli squali-- */
  const sharkBuff = await generateBuffer('res/SHARK.obj');
  var sharks =[];
  var sharkNumber = 15;
  for(let nShark=0; nShark<sharkNumber; nShark++){
    const shark = new SeaObject(sharkBuff);
    shark.translateObj(getRandomNumber(-80, 80), getRandomNumber(-6, 50), getRandomNumber(-80, 80));
    shark.degree = 0;
    if(nShark%2!=0){
      m4.yRotate(shark.uniformMatrix, degToRad(90*nShark), shark.uniformMatrix);
    }
    shark.radius = getRandomNumber(2., 5.);
    sharks.push(shark);
    elementsToDraw.push(shark);
  }
  


  /*-- Definisco il tesoro --*/
  const treasure = await generateBuffer('./res/treasure/treasure-closed.obj');
  const closedTrasure = new SeaObject(treasure);
  closedTrasure.translateObj(getRandomNumber(-100, 100), 1, getRandomNumber(-100, 100));

  const finishTreasure = await generateBuffer('./res/treasure/treasure-open.obj');
  const openTreasure = new SeaObject(finishTreasure);

  /*--Dichiaro la bolla dentro il tesoro-- */
  const bubble = await generateBuffer('./res/bubble.obj');
  const faceBubble = new SeaObject(bubble);



  /* -- Gestione della navigazione -- */
  const moves = new Move();
  //test con tasti
  window.addEventListener("keydown", (event)=>{
   moves.pressKey(event.keyCode);
  });
  
  window.addEventListener("keyup", (event)=>{
    moves.releaseKey(event.keyCode);
  });
  


  /*-- Gestione bottoni --*/
  const btnUp = document.getElementById("up");
  btnUp.addEventListener("mousedown", function(){moves.foward=true;});
  btnUp.addEventListener("mouseup", function(){moves.foward = false;});
  const btnDown = document.getElementById("down");
  btnDown.addEventListener("mousedown", function(){moves.back=true;});
  btnDown.addEventListener("mouseup", function(){moves.back = false;});
  const btnLeft = document.getElementById("left");
  btnLeft.addEventListener("mousedown", function(){moves.rotateLeft=true;});
  btnLeft.addEventListener("mouseup", function(){moves.rotateLeft = false;});
  const btnRight = document.getElementById("right");
  btnRight.addEventListener("mousedown", function(){moves.rotateRight=true;});
  btnRight.addEventListener("mouseup", function(){moves.rotateRight = false;});
  const btnDive = document.getElementById("dive");
  btnDive.addEventListener("mousedown", function(){moves.dive = true; moves.foward = true;});
  btnDive.addEventListener("mouseup", function(){moves.dive = false; moves.foward = false;});
  const btnEmerge = document.getElementById("emerge");
  btnEmerge.addEventListener("mousedown", function(){moves.emerge=true; moves.foward=true;});
  btnEmerge.addEventListener("mouseup", function(){moves.emerge = false; moves.foward = false;});



  /* -- Gestione della camera -- */
  const cameraTarget = [0, 0, 0];
  const cameraPosition= [0, 2, 8];
  const cameraPositionVector = m4.addVectors(cameraTarget, cameraPosition);
/* =========================================================================================== */
/* =========================================================================================== */
  /*-- Gestione della luce --*/
  var positionAmbientLight =[2.5, 98, 4.3]; //posizione della luce - z: -2
  var target = [2.5, 95, 3.5];
/* =========================================================================================== */
/* =========================================================================================== */


  /*-- Variabili di gioco --*/
  var treasureFound = false;
  const counter = document.getElementById("counter");
  totalKeys.forEach(element => {
    counter.innerHTML +=" &#128477;";
  });
  var sign = true;
  let lightIntensity = 45;

  /*-- Gestione evento fine gioco --*/
  var showSkybox = true;
  var endGame = false;
  function gameOver(reason){
    const endTitle = document.getElementById("endGame");
    const endSubtitle = document.getElementById("endSubtitle");
    
    elementsToDraw = [];
    sharks = [];
    showSkybox = false;
    endGame = true;
    submarine.uniformMatrix = m4.identity();
    propellers.uniformMatrix = m4.identity();
    elementsToDraw.push(submarine);
    elementsToDraw.push(propellers);

    if(reason === "shark"){
      const shark = new SeaObject(sharkBuff);
      shark.translateObj(-2.5, 0, 0);
      m4.yRotate(shark.uniformMatrix, degToRad(90), shark.uniformMatrix);
      elementsToDraw.push(shark);
      positionAmbientLight = [0, 10, 0];
      target = [2, 3, 0];
      endTitle.innerHTML = 'Game Over';
      endSubtitle.innerHTML = "Oh no, you've hit a shark!";

    } else if(reason === "seabed"){
      positionAmbientLight = [0, 5, 0];
      target = [-2, 2, 0];
      endTitle.innerHTML = 'Game Over';
      endSubtitle.innerHTML = "Oh no, you crushed into the seabed, pay more attention!";

    } else if(reason === "treasure"){
      m4.yRotate(submarine.uniformMatrix, degToRad(180), submarine.uniformMatrix);
      m4.yRotate(propellers.uniformMatrix, degToRad(180), propellers.uniformMatrix);
      faceBubble.uniformMatrix = m4.identity();
      faceBubble.translateObj(2, 2, 1);
      elementsToDraw.push(faceBubble);
      positionAmbientLight = [0, 10, 0];
      target = [4, 3, 0];

      endTitle.innerHTML = 'Congrats!';
      endSubtitle.innerHTML = "You've found the treasure!";
   
    }
  }

  /*-- Gestione ritrovamento del tesoro --*/
  var timer=0;
  var count = false;
  canvas.addEventListener("click", function(event){
    if(treasureFound){
      console.log("apriti sesamo");
      //tesoro diventa aperto
      let t = elementsToDraw.pop();
      openTreasure.uniformMatrix = m4.copy(t.uniformMatrix);
      
      //controllo al fine di non far comparire troppi tesori aperti
      if(!elementsToDraw.includes(openTreasure)){
        elementsToDraw.push(openTreasure);
      }
      //bolla compare
      faceBubble.translateObj(openTreasure.getX(), openTreasure.getY(), openTreasure.getZ());
      faceBubble.animateY=true;
      if(!elementsToDraw.includes(faceBubble)){
        elementsToDraw.push(faceBubble);
      }

      //aggiungi luce dentro tesoro
      positionAmbientLight = [openTreasure.getX(), 10, openTreasure.getZ()];
      count= true;
      treasureFound =false;
    }
  });


  /*-- Variabili modificabili dall'utente --*/
  setupSlider("#numKeys", {name:"Level:", slide: updateLevel, min: 2, max: 15, value:level, step:1});
  setupSlider("#numSharks", {name:"Difficulty:", slide: updateSharks, min: 5, max: 50, value:sharkNumber, step:1});
  setupSlider("#light", {name:"Light:", slide: updateLight, min: 0, max: 80, value:lightIntensity, step:1});
  setupSlider("#posX", {name:"PosX:", slide: upPx, min: -100, max: 100, value:positionAmbientLight[0], step:1});
  setupSlider("#posY", {name:"PosY:", slide: upPy, min: -300, max: 100, value:positionAmbientLight[1], step:1});
  setupSlider("#posZ", {name:"PosZ:", slide: upPz, min: -100, max: 100, value:positionAmbientLight[2], step:1});
  setupSlider("#directionX", {name:"DirectionX:", slide: upDx, min: -100, max: 100, value:target[0], step:0.1, precision:0.1});
  setupSlider("#directionY", {name:"DirectionY:", slide: upDy, min: -100, max: 100, value:target[1], step:0.1});
  setupSlider("#directionZ", {name:"DirectionZ:", slide: upDz, min: -100, max: 100, value:target[2], step:0.1});

  function updateLevel(event, ui) {
    let newLevel = ui.value;
    if(newLevel > level){
      while(totalKeys.length != newLevel){
        const key = new SeaObject(singleKey);
        var x = getRandomNumber(-120, 120);
        var y = getRandomNumber(-4, 50);
        var z = getRandomNumber(-120, 120);
        key.translateObj(x=0 ? x+getRandomNumber(-100, 100) : x, y ,z);
        key.animateY=true;
        elementsToDraw.push(key);
        totalKeys.push(key);
        counter.innerHTML +=" &#128477;";
      }
    } else if(newLevel < level){
      while(totalKeys.length != newLevel){
        let k = totalKeys.pop();
        let index = elementsToDraw.indexOf(k);
        elementsToDraw.splice(index, 1);
        
      }

      counter.innerHTML = "";
      totalKeys.forEach(element => {
        counter.innerHTML +=" &#128477;";
      });
    }
    level = newLevel;
  }

  function updateSharks(event, ui){
    let newDifficulty = ui.value;

    if(newDifficulty > sharkNumber){
      while(sharks.length != newDifficulty){
        let s = sharks.length;
        const shark = new SeaObject(sharkBuff);
        shark.translateObj(getRandomNumber(-80, 80), getRandomNumber(-6, 50), getRandomNumber(-80, 80));
        shark.degree = 0;
        if(s%2!=0){
          m4.yRotate(shark.uniformMatrix, degToRad(90*s), shark.uniformMatrix);
        }
        shark.radius = getRandomNumber(2., 5.);
        sharks.push(shark);
        elementsToDraw.push(shark);
      }
    } else if(newDifficulty< sharkNumber){
      while(sharks.length != newDifficulty){
        let iShark = sharks.pop();
        let index = elementsToDraw.indexOf(iShark);
        elementsToDraw.splice(index, 1);
      }
    }
    sharkNumber= newDifficulty;
  }

  function updateLight(event, ui){
    lightIntensity = ui.value;
  }

  function upDx(event, ui){
    target[0]= ui.value;
  }
  function upDy(event, ui){
    target[1]= ui.value;
  }
  function upDz(event, ui){
    target[2]= ui.value;
  }
  function upPx(event, ui){
    positionAmbientLight[0]= ui.value;
  }
  function upPy(event, ui){
    positionAmbientLight[1]= ui.value;
  }
  function upPz(event, ui){
    positionAmbientLight[2]= ui.value;
  }


  /*-- Render Time --*/
  function render(time) {
    time *= 0.001;  // convert to seconds
    const deltaTime = time-then;
    then = time;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    //gl.clear(gl.DEPTH_TEST);


    /*-- Gestione camera --*/
    var camera = null;
    if(!endGame){
      camera = m4.yRotate(submarine.uniformMatrix, degToRad(90));
      m4.translate(camera, cameraPosition[0], cameraPosition[1], cameraPosition[2], camera);  
    } else {
      camera = m4.lookAt(cameraPosition, [submarine.getX(), submarine.getY(), submarine.getZ()], [0, 1, 0]);
    }
    

    /*--Gestione nebbia--*/
    var fogColor= [0.0039, 0.207, 0.29, 1]; 

    /*-- Gestione trasparenze --*/
    let alphaEnable = true;
    if (alphaEnable) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    } else {
        gl.disable(gl.BLEND);
    }

    /*-- Gestione dei movimenti --*/
    updateVars();
    moves.stopTarget();
    if(!endGame){
      if(moves.foward && moves.ableFoward){
        moves.setTarget(-1);
      }
      if(moves.rotateLeft){
        elementsToDraw[0].uniformMatrix= yRotateMatrix(elementsToDraw[0].uniformMatrix, degToRad(-2), elementsToDraw[0].uniformMatrix);
        elementsToDraw[1].uniformMatrix = adaptPropellersRotateY(elementsToDraw[0].uniformMatrix, elementsToDraw[1].uniformMatrix);
        treasureFound=false; //se il sottomarino si sposta allora va via dal tesoro
      }
      if(moves.rotateRight){
        elementsToDraw[0].uniformMatrix= yRotateMatrix(elementsToDraw[0].uniformMatrix, degToRad(2), elementsToDraw[0].uniformMatrix);
        elementsToDraw[1].uniformMatrix = adaptPropellersRotateY(elementsToDraw[0].uniformMatrix, elementsToDraw[1].uniformMatrix);
        treasureFound=false;
      }
      if(moves.back && moves.ableBack){
        moves.setTarget(1);
        treasureFound=false;
      }
      if(moves.dive){
        m4.zRotate(elementsToDraw[0].uniformMatrix, degToRad(2), elementsToDraw[0].uniformMatrix);
        m4.zRotate(elementsToDraw[1].uniformMatrix, degToRad(2), elementsToDraw[1].uniformMatrix);
        treasureFound=false;
      }
      if(moves.emerge){
        m4.zRotate(elementsToDraw[0].uniformMatrix, degToRad(-2), elementsToDraw[0].uniformMatrix);
        m4.zRotate(elementsToDraw[1].uniformMatrix, degToRad(-2), elementsToDraw[1].uniformMatrix);
        treasureFound=false;
      }

    }

    velocity = lerp(velocity, maxVelocity * moves.target, deltaTime * accelleration); //variabile velocità di spostamento
    let trasl = velocity * deltaTime; //quantità di spostamento

    let valY = submarine.getY() + trasl; //variabile di controllo
    let posFromTreasure = m4.distance(submarine.getPos(), closedTrasure.getPos());


    //controllo la distanza dalle chiavi
    totalKeys.forEach(k => {
      if(m4.distance(submarine.getPos(), k.getPos()) <= 2.5){

        var i = totalKeys.indexOf(k);
        totalKeys.splice(i, 1);
        i = elementsToDraw.indexOf(k);
        elementsToDraw.splice(i, 1);
        counter.innerHTML ='';
        totalKeys.forEach(element => {
          counter.innerHTML +=" &#128477;";
        });
        if(totalKeys.length == 0){
          elementsToDraw.push(closedTrasure);
        }
      }
    });

    //controllo rispetto agli squali
    sharks.forEach(s =>{
      if(m4.distance(submarine.getPos(), s.getPos()) <= 2.0){
        gameOver("shark");
        moves.stopTarget();
        velocity = 0;
      }else if(m4.distance(submarine.getPos(), s.getPos()) >= 100){
        m4.yRotate(s.uniformMatrix, degToRad(180), s.uniformMatrix);
      }
    })
    
    //controllo rispetto al fondale
    if(valY <= bed.getY()+2.0){ //controllo posizione rispetto al fondale
      moves.stopTarget();
      velocity = 0;
      gameOver("seabed");
    } else if(velocity != 0 && posFromTreasure < 2.0){ //controllo posizione rispetto al tesoro
      treasureFound=true;
    } else{
      moves.ableFoward = true;
      moves.ableBack = true;
      //tresureFound = false; ?
      m4.translate(elementsToDraw[0].uniformMatrix, trasl,0,0, elementsToDraw[0].uniformMatrix);
      elementsToDraw[1].uniformMatrix = adaptPropellersTransl(elementsToDraw[0].uniformMatrix, elementsToDraw[1].uniformMatrix);
    }

    /*-- Gestione movimenti della bolla --*/
    if(faceBubble.animateY && faceBubble.getY() < (openTreasure.getY() + 2.5)){
        bubbleVelocity = lerp(bubbleVelocity, 10, deltaTime);
        let bubbleTrasl = bubbleVelocity * deltaTime;
        m4.translate(faceBubble.uniformMatrix, 0, bubbleTrasl, 0, faceBubble.uniformMatrix);
    }

    //timer per schermata di fine gioco
    if(count){
      timer++;
    } 
    if(timer > 6000){
      gameOver("treasure");
    }
 
    /*-- Gestione movimento squali --*/
    sharks.forEach(squalo =>{
      if(squalo.degree > 0.1 && sign){
        sign = false;
      } else if(squalo.degree < -0.15 && !sign){
        sign = true;
      }
      squalo.degree = (squalo.degree + (sign ? 0.01 : -0.01));
      m4.yRotate(squalo.uniformMatrix, degToRad( squalo.degree), squalo.uniformMatrix);
      if(squalo.degree % 5 ==0){
        m4.zRotate(squalo.uniformMatrix, Math.cos(degToRad(time)), squalo.uniformMatrix);
      }
      let traslX = -squalo.radius*(Math.cos(degToRad(20))) +1;
      let traslZ = -squalo.radius*(Math.sin(degToRad(20))) +1 ;
      m4.translate(squalo.uniformMatrix, traslX * 0.03, 0, traslZ * 0.03, squalo.uniformMatrix);
      m4.yRotate(squalo.uniformMatrix, degToRad(Math.sin(time/2)*0.5), squalo.uniformMatrix);
    });

    /*-- Gestione frustum --*/
    //campo della vista nell'asse y in radianti
    const fovy = degToRad(60);
    //aspect ratio 
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projection = m4.perspective(fovy, aspect, 1, 2000);

    // Make a view matrix from the camera matrix.
    const view = m4.inverse(camera);
    // We only care about direction so remove the translation
    var viewDirectionMatrix = m4.copy(view);
    viewDirectionMatrix[12] = 0;
    viewDirectionMatrix[13] = 0;
    viewDirectionMatrix[14] = 0;

    var viewDirectionProjectionMatrix = m4.multiply(
      projection, viewDirectionMatrix);
    var viewDirectionProjectionInverseMatrix =
      m4.inverse(viewDirectionProjectionMatrix);

/* =========================================================================================== */
/* =========================================================================================== */

    /*-- Gestione delle ombre - Z-Buffer--*/
    //disegno dal POV della luce
    const lightWorldMatrix =m4.lookAt(positionAmbientLight, target,  [0, 1, 0],);
    const lightProjectionMatrix = m4.orthographic(
      -100,  // left
       100, // right
       -100, // bottom
       100,    // top
        0.1, // near
      200// far dalla luce
        );          
/* =========================================================================================== */
/* =========================================================================================== */

    // draw to the depth texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(colorProgramInfo.program);
    //set le uniform della luce
    webglUtils.setUniforms(colorProgramInfo, {
      u_view: m4.inverse(lightWorldMatrix),
      u_color: [1, 1, 1, 1],
      u_projection: lightProjectionMatrix,
      u_textureMatrix: m4.identity(),
      u_projectedTexture: depthTexture,
      u_reverseLightDirection: lightWorldMatrix.slice(8, 11),
      u_bias: 0.016,
      u_lightDirection: lightWorldMatrix.slice(8, 11).map(v => -v),
      u_lightWorldPosition: positionAmbientLight,
      u_viewWorldPosition: lightWorldMatrix.slice(12, 15),
    });

    drawObjects(colorProgramInfo, elementsToDraw);

    // now draw scene to the canvas projecting the depth texture into the scene
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //matrice che mi permette di trasformare i punti dal punti di vista della luce a quello dell'osservatore
    var textureMatrix = m4.identity();
    textureMatrix = m4.translate(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.scale(textureMatrix, 0.5, 0.5, 0.5);
    textureMatrix = m4.multiply(textureMatrix, lightProjectionMatrix);
    // use the inverse of this world matrix to make
    // a matrix that will transform other positions
    // to be relative this world space.
    textureMatrix = m4.multiply(
        textureMatrix,
        m4.inverse(lightWorldMatrix));


    /*-- Informazioni condivise -- */
    let u_world= m4.identity();
    const u_worldInverseTraspose = m4.transpose(m4.inverse(u_world));

    var sharedUniforms = {
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: camera.slice(12, 15),//cameraPositionVector,
      u_lightWorldPosition: positionAmbientLight,
      u_lightWorldIntensity: lightIntensity/100,
      u_lightDirection: lightWorldMatrix.slice(8, 11).map(v => -v),
      u_worldInverseTraspose: u_worldInverseTraspose,
      u_projectedTexture: depthTexture,
      u_textureMatrix: textureMatrix,
      opacity:0.4,
      u_bias: 0.016,
      u_fogColor: fogColor,
    };
    gl.useProgram(programInfo.program);
    // calls gl.uniform
    webglUtils.setUniforms(programInfo, sharedUniforms);


    

    // ------ Draw the objects --------
    drawObjects(programInfo, elementsToDraw);


    // ----- Skybox ----------
    //Check the value
    if(showSkybox){
      //quadBufferInfo contiene le informazioni del cubo che contiene la skybox
      const quadBufferInfo =  {
        position: { numComponents: 2, data: null, },
      };
      quadBufferInfo.position.data = [
        -1, -1,
        1, -1,
        -1, 1,
        -1, 1,
        1, -1,
        1, 1,
      ];

    
      gl.depthFunc(gl.LEQUAL);


      //cambio il program per lavorare sulla skybox
      gl.useProgram(skyboxProgramInfo.program);
      //assegno il buffer
      var bufferSkybox = webglUtils.createBufferInfoFromArrays(gl, quadBufferInfo);
      webglUtils.setBuffersAndAttributes(gl, skyboxProgramInfo, bufferSkybox);
      //definisco uniform
      webglUtils.setUniforms(skyboxProgramInfo, {
        u_viewDirectionProjectionInverse: viewDirectionProjectionInverseMatrix,
        u_skybox: texture, //assegno l'immagine
      });

      webglUtils.drawBufferInfo(gl, bufferSkybox);
      
    }
    
    requestAnimationFrame(render);
  }

  function updateVars(){
    // gestisco l'animazione delle eliche
    degreeX = (degreeX > 360 ? 0 : (degreeX + 3.5 *Math.abs(velocity/maxVelocity)));
    propellers.uniformMatrix = m4.xRotate(propellers.uniformMatrix, degToRad(degreeX), m4.copy(propellers.uniformMatrix));
  
    //gestisco animazione bolla
    degreeY = (degreeY > 360 ? 0 : (degreeY + 0.25));
    faceBubble.uniformMatrix = m4.yRotate(faceBubble.uniformMatrix, degToRad(degreeY),m4.copy(faceBubble.uniformMatrix));
  }

  requestAnimationFrame(render);
}


function drawObjects(program, elements){
  const canvas = document.getElementById("mainCanva");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  //u_world sono le coordinate dell'oggetto nel mondo
  var lastUsedProgramInfo = null;
  var lastUsedBufferInfo = null;

  elements.forEach(function(object) {
    var objBufferInfo = object.bufferInfo;
    var bindBuffers = false;

    if (program !== lastUsedProgramInfo) {
      lastUsedProgramInfo = program;
      gl.useProgram(program.program);
      bindBuffers = true;
    }
    // Setup all the needed attributes.
    if (bindBuffers || objBufferInfo !== lastUsedBufferInfo) {
      lastUsedBufferInfo = objBufferInfo;  
    }

    // definisco la matrice
    let m = object.uniformMatrix;
    
    // renderizzo passando più array //
    for (const {bufferInfo, material} of object.parts) {
      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      webglUtils.setBuffersAndAttributes(gl, program, bufferInfo);
      
      // calls gl.uniform
      webglUtils.setUniforms(program, { u_world: m,  }, material); // come parametro solo cose scritte nel vertex shader

      /* -- Qui avviene l'effettiva renderizzazione -- */
      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }

  });
}

main();

