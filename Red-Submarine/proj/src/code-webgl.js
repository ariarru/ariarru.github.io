"use strict";

import { generateBuffer } from './handleOBJ.js';
import { isPowerOf2 } from './handleMT.js';
import { SeaObject } from './SeaObjects.js';
import { Move } from './handleMovements.js';
import {degToRad, getRandomNumber, adaptPropellersTransl, adaptPropellersRotateY, lerp, setupSlider, yRotateMatrix,xRotateMatrix} from './myutils.js';
import { draw } from './drawScene.js';


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
  const depthTextureSize = 4096;
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
    const width = 256;
    const height = 256;
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
  const subBody = await generateBuffer('./res/sub-body.obj', "mainCanva");
  const submarine = new SeaObject(subBody);
  elementsToDraw.push(submarine);  

  /* -- Dichiaro le eliche -- */
  const subPropellers = await generateBuffer('./res/sub-eliche.obj', "mainCanva");
  const propellers = new SeaObject(subPropellers);
  propellers.animateX=true;
  //variabile cumulativa di gradi di rotazione delle eliche
  propellers.degreeX =0;
  elementsToDraw.push(propellers);  

  /*--Dichiaro il fondale--*/
  const seabed = await generateBuffer('./res/seabed.obj', "mainCanva");
  const bed = new SeaObject(seabed);
  bed.translateObj(0, -10.5, 0);
  elementsToDraw.push(bed);
    

  /* -- Dichiaro la chiave -- */
  const singleKey = await generateBuffer('./res/key.obj', "mainCanva");
  var level = 3;
  const totalKeys = [];
  for(let i=0; i<level; i++){
    const key = new SeaObject(singleKey);
    var x = getRandomNumber(-120, 120);
    var y = getRandomNumber(-4, 50);
    var z = getRandomNumber(-120, 120);
    key.translateObj(x=0 ? x+getRandomNumber(-100, 100) : x, y ,z);
    key.animateY=true;
    key.degreeY =0;
    elementsToDraw.push(key);
    totalKeys.push(key);
  }


  /* -- Dichiaro gli squali-- */
  const sharkBuff = await generateBuffer('res/SHARK.obj', "mainCanva");
  var sharks =[];
  var sharkNumber = 15;
  for(let nShark=0; nShark<sharkNumber; nShark++){
    const shark = new SeaObject(sharkBuff);
    shark.translateObj(getRandomNumber(-80, 80), getRandomNumber(-6, 50), getRandomNumber(-80, 80));
    shark.degree = 0;
    if(nShark%2!=0){
      m4.yRotate(shark.uniformMatrix, degToRad(90*nShark), shark.uniformMatrix);
    }
    shark.radius = getRandomNumber(2., 5.)+ getRandomNumber(0., 2.);
    sharks.push(shark);
    elementsToDraw.push(shark);
  }
  


  /*-- Definisco il tesoro --*/
  const treasure = await generateBuffer('./res/treasure/treasure-closed.obj', "mainCanva");
  const closedTrasure = new SeaObject(treasure);
  closedTrasure.translateObj(getRandomNumber(-100, 100), -7, getRandomNumber(-100, 100));

  const finishTreasure = await generateBuffer('./res/treasure/treasure-open.obj', "mainCanva");
  const openTreasure = new SeaObject(finishTreasure);

  /*--Dichiaro la bolla dentro il tesoro-- */
  const bubble = await generateBuffer('./res/bubble.obj', "mainCanva");
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
  const cameraPosition= [0, 2, 8];

  /*-- Gestione della luce --*/
  var positionAmbientLight =[-5, 150, -10]; //posizione della luce - z: -2
  var target = [-1, 0, 8];
  const bias = -0.0093;
  var projWidth = 245;
  var projHeight = 245;
  const near = 0.1;
  const far = 200;


  /*-- Variabili di gioco --*/
  var treasureFound = false;
  const counter = document.getElementById("counter");
  totalKeys.forEach(element => {
    counter.innerHTML +=" &#128477;";
  });
  var sign = true; //flag per gestire verso degli squali

  /*-- Gestione evento fine gioco --*/
  var showSkybox = true;
  var endGame = false;
  function gameOver(reason){
    moves.stopTarget();
    velocity = 0;
    const endTitle = document.getElementById("endGame");
    const endSubtitle = document.getElementById("endSubtitle");
    
    elementsToDraw = [];
    sharks = [];
    showSkybox = false;
    endGame = true;
    submarine.uniformMatrix = m4.identity();
    propellers.animateX= false;
    propellers.uniformMatrix = m4.copy(submarine.uniformMatrix);
    elementsToDraw.push(submarine);
    elementsToDraw.push(propellers);
    elementsToDraw.push(bed);

    if(reason === "shark"){
      const shark = new SeaObject(sharkBuff);
      shark.translateObj(-2.5, 0, 0);
      m4.yRotate(shark.uniformMatrix, degToRad(90), shark.uniformMatrix);
      elementsToDraw.push(shark);
      positionAmbientLight = [-3, 20, 2];
      target = [0, 0, 0];
      lightIntensity= 100;
      endTitle.innerHTML = 'Game Over';
      endSubtitle.innerHTML = "Oh no, you've hit a shark!";

    } else if(reason === "seabed"){
      positionAmbientLight = [-1, 15, -2];
      target = [-1, 0, -3];
      lightIntensity= 100;
      endTitle.innerHTML = 'Game Over';
      endSubtitle.innerHTML = "Oh no, you crushed into the seabed, pay more attention!";

    } else if(reason === "treasure"){
      m4.yRotate(submarine.uniformMatrix, degToRad(180), submarine.uniformMatrix);
      m4.yRotate(propellers.uniformMatrix, degToRad(180), propellers.uniformMatrix);
      faceBubble.uniformMatrix = m4.identity();
      faceBubble.translateObj(2, 2, 1);
      elementsToDraw.push(faceBubble);
      positionAmbientLight = [0, 150, 1];
      target = [0, 3, 0];

      console.log(openTreasure.getPos());

      endTitle.innerHTML = 'Congrats!';
      endSubtitle.innerHTML = "You've found the treasure!";
   
    }
  }

  /*-- Gestione ritrovamento del tesoro --*/
  var timer=0;
  var treasureTimerCounter = false;
  canvas.addEventListener("click", function(event){
    if(treasureFound){
      console.log("Apriti sesamo!");
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
      faceBubble.degreeY = 0;
      if(!elementsToDraw.includes(faceBubble)){
        elementsToDraw.push(faceBubble);
      }
      //inizia counter per arrivare alla shcermata di fine gioco
      treasureTimerCounter= true;
      treasureFound =false;
      lightIntensity=100;
    }
  });


  /*-- Variabili modificabili dall'utente --*/
  let lightIntensity = 0.45;

  //definisco gli slider
  setupSlider("numKeys", {name:"Level:", slide: updateLevel, min: 2, max: 15, value:level, step:1});
  setupSlider("numSharks", {name:"Difficulty:", slide: updateSharks, min: 5, max: 50, value:sharkNumber, step:1});
  setupSlider("light", {name:"Light:", slide: updateLight, min: 0.0, max: 1.1, value:lightIntensity, step:0.01, precision: 2});


  //aggiornamento numero delle chiavi da trovate
  function updateLevel(event, ui) {
    if(endGame){
      return;
    }
    let newLevel = ui.value;
    if(newLevel > level){
      while(totalKeys.length != newLevel){
        const key = new SeaObject(singleKey);
        var x = getRandomNumber(-120, 120);
        var y = getRandomNumber(-4, 50);
        var z = getRandomNumber(-120, 120);
        key.translateObj(x=0 ? x+getRandomNumber(-100, 100) : x, y ,z);
        key.animateY=true;
        key.degreeY = 0;
        elementsToDraw.push(key);
        totalKeys.push(key);
        console.log(totalKeys.length);
        console.log(newLevel);
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
  //aggiornamento numero squali
  function updateSharks(event, ui){
    if(endGame){
      return;
    }
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
        shark.radius = getRandomNumber(2., 5.) + getRandomNumber(0., 2.);
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
  //aggiornamento valore dell'intensità della luce
  function updateLight(event, ui){
    if(endGame){
      return;
    }
    lightIntensity = ui.value;
  }

  /* -- Variabili per la gestione dei movimenti -- */    
  let then = 0;     //variabile per il calcolo del deltaTime
  let accelleration = 0.5; //accellerazione movimento
  let velocity=0;   //velocità del movimento del sottomairno
  let maxVelocity = 15; //massima velocità del sottomarino
  let bubbleVelocity =0; //velocità della bolla

  
/*--------- Render Time ----------*/
  function render(time) {
    time *= 0.001;  // convert to seconds
    const deltaTime = time-then;
    then = time;


    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    /*-- Gestione trasparenze --*/
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    /*-- Gestione camera --*/
    var camera = null;
    if(!endGame){
      camera = m4.yRotate(submarine.uniformMatrix, degToRad(90));
      m4.translate(camera, cameraPosition[0], cameraPosition[1], cameraPosition[2], camera);  
    } else {
      camera = m4.lookAt(cameraPosition, [submarine.getX(), submarine.getY(), submarine.getZ()], [0, 1, 0]);
    }
    
    //timer per schermata di fine gioco
    if(treasureTimerCounter){
      timer++;
      //avvicino la camera al tesoro
      camera = m4.yRotate(faceBubble.uniformMatrix, degToRad(90));
      m4.translate(camera, cameraPosition[0], 0, cameraPosition[2], camera);  
    } 
    if(timer > 4000){
      gameOver("treasure");
    }
   
  /*== Gestione delle dinamiche di gioco ==*/
    /*-- Gestione dei movimenti --*/
    moves.stopTarget();
    if(!endGame){
      if(moves.foward && moves.ableFoward){
        moves.setTarget(-1);
      }
      if(moves.back && moves.ableBack){
        moves.setTarget(1);
        treasureFound=false;
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
          
        }else if(m4.distance(submarine.getPos(), s.getPos()) >= 150){
          m4.yRotate(s.uniformMatrix, degToRad(180), s.uniformMatrix);
        }
      });
    
      //controllo rispetto al fondale
      if(valY <= bed.getY()+2.0 && !treasureFound){ //controllo posizione rispetto al fondale
        gameOver("seabed");
      } else if(velocity != 0 && posFromTreasure < 4.0){ //controllo posizione rispetto al tesoro
        treasureFound=true;
      }
           
      if(moves.rotateLeft){
        elementsToDraw[0].uniformMatrix= yRotateMatrix(elementsToDraw[0].uniformMatrix, degToRad(-2), elementsToDraw[0].uniformMatrix);
        elementsToDraw[1].uniformMatrix = adaptPropellersRotateY(elementsToDraw[0].uniformMatrix, elementsToDraw[1].uniformMatrix);
        treasureFound=false;
      }
      if(moves.rotateRight){
        elementsToDraw[0].uniformMatrix= yRotateMatrix(elementsToDraw[0].uniformMatrix, degToRad(2), elementsToDraw[0].uniformMatrix);
        elementsToDraw[1].uniformMatrix = adaptPropellersRotateY(elementsToDraw[0].uniformMatrix, elementsToDraw[1].uniformMatrix);
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

      //se non ha gestito cose precedentemente allora calcolo la traslazione 
      m4.translate(elementsToDraw[0].uniformMatrix, trasl, 0, 0, elementsToDraw[0].uniformMatrix);
      elementsToDraw[1].uniformMatrix = adaptPropellersTransl(elementsToDraw[0].uniformMatrix, elementsToDraw[1].uniformMatrix);
      
    }

    
    /*-- Gestione movimenti della bolla --*/
    if(treasureFound && faceBubble.animateY && faceBubble.getY() < (openTreasure.getY() + 2.5)){
        bubbleVelocity = lerp(bubbleVelocity, 10, deltaTime);
        let bubbleTrasl = bubbleVelocity * deltaTime;
        m4.translate(faceBubble.uniformMatrix, 0, bubbleTrasl, 0, faceBubble.uniformMatrix);
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
      m4.translate(squalo.uniformMatrix, traslX * 0.015, 0, traslZ * 0.015, squalo.uniformMatrix);
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

    

    /*-- Gestione delle ombre - Z-Buffer--*/
    //disegno dal POV della luce
    const lightWorldMatrix =m4.lookAt(positionAmbientLight, target,  [0, 1, 0],);
    const lightProjectionMatrix = m4.orthographic(-projWidth, projWidth, -projHeight, projHeight, near, far);          

    // draw to the depth texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.viewport(0, 0, depthTextureSize, depthTextureSize);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    draw(lightProjectionMatrix, lightWorldMatrix, m4.identity, lightWorldMatrix, colorProgramInfo, gl, elementsToDraw, 
      {
        bias: bias,
        depthTexture : depthTexture,
        lightPosition: positionAmbientLight,
        lightIntensity: lightIntensity,
      });
  
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
        
  

    draw(projection, camera, textureMatrix, lightWorldMatrix, programInfo, gl, elementsToDraw, 
      {
        bias: bias,
        depthTexture : depthTexture,
        lightPosition: positionAmbientLight,
        lightIntensity: lightIntensity,
        velocity: velocity,
    }, true);


    // ----- Skybox ----------
    //Controllo il valore
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

      var viewDirectionProjectionMatrix = m4.multiply(projection, viewDirectionMatrix);
      var viewDirectionProjectionInverseMatrix = m4.inverse(viewDirectionProjectionMatrix);
  

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

  requestAnimationFrame(render);
}



main();
