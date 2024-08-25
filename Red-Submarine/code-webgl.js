"use strict";


async function main() {
  // WebGL context
  const canvas = document.getElementById("mainCanva");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }
  //setup program
  const programInfo = webglUtils.createProgramInfo(gl, ["vertex-shader", "fragment-shader"]);
  const skyboxProgramInfo = webglUtils.createProgramInfo(gl, ["skybox-vertex-shader", "skybox-fragment-shader"]);


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
  //Possibile implementazione: imporre un numero di chiavi in base a livello
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




  /* -- Variabili per la gestione dei movimenti -- */
  var degreeX=0;     //variabile cumulativa di gradi di rotazione delle eliche
  var degreeY=0;     //variabile cumulativa di gradi di rotazione delle chiavi e della bolla
  let then = 0;     //variabile per il calcolo del deltaTime

  let accelleration = 1.25; //accellerazione movimento
  let velocity=0;   //velocità del movimento del sottomairno
  let maxVelocity = 25; //massima velocità del sottomarino
  let bubbleVelocity =0; //velocità della bolla

  var positionAmbientLight =[0, 100, -2]; //posizione della luce
  var lightWorldDirection = [-1, 3, -3]; //direction della luce


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
      lightWorldDirection = [2, 3, 0];
      endTitle.innerHTML = 'Game Over';
      endSubtitle.innerHTML = "Oh no, you've hit a shark!";

    } else if(reason === "seabed"){
      positionAmbientLight = [0, 5, 0];
      lightWorldDirection = [-2, 2, 0];
      endTitle.innerHTML = 'Game Over';
      endSubtitle.innerHTML = "Oh no, you crushed into the seabed, pay more attention!";

    } else if(reason === "treasure"){
      m4.yRotate(submarine.uniformMatrix, degToRad(180), submarine.uniformMatrix);
      m4.yRotate(propellers.uniformMatrix, degToRad(180), propellers.uniformMatrix);
      faceBubble.uniformMatrix = m4.identity();
      faceBubble.translateObj(2, 2, 1);
      elementsToDraw.push(faceBubble);
      positionAmbientLight = [0, 10, 0];
      lightWorldDirection = [4, 3, 0];

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
      //lightWorldDirection = [openTreasure.getX(), -10, openTreasure.getZ()];
      count= true;
      treasureFound =false;
    }
  });


  /*-- Variabili modificabili dall'utente --*/
  setupSlider("#numKeys", {name:"Level:", slide: updateLevel, min: 2, max: 15, value:level, step:1});
  setupSlider("#numSharks", {name:"Difficulty:", slide: updateSharks, min: 5, max: 50, value:sharkNumber, step:1});
  setupSlider("#light", {name:"Light:", slide: updateLight, min: 0, max: 80, value:lightIntensity, step:1});

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



  /*-- Render Time --*/
  function render(time) {
    time *= 0.001;  // convert to seconds
    const deltaTime = time-then;
    then = time;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

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

    //movimenti della bolla
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
   
    /*-- gestione movimento squali --*/
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
      
    })
    


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

    /*-- Informazioni condivise -- */
    let u_world= m4.identity();
    const u_worldInverseTraspose = m4.transpose(m4.inverse(u_world));
    

    var sharedUniforms = {
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: cameraPositionVector,
      opacity:0.4,
      u_lightWorldPosition: positionAmbientLight,
      u_lightWorldIntensity: lightIntensity/100,
      u_lightWorldDirection: lightWorldDirection,
      u_worldInverseTraspose: u_worldInverseTraspose,
      u_fogColor: fogColor,
    };
    gl.useProgram(programInfo.program);
    // calls gl.uniform
    webglUtils.setUniforms(programInfo, sharedUniforms);


    

    // ------ Draw the objects --------
    //u_world sono le coordinate dell'oggetto nel mondo
    var lastUsedProgramInfo = null;
    var lastUsedBufferInfo = null;
 
    elementsToDraw.forEach(function(object) {
      var objBufferInfo = object.bufferInfo;
      var bindBuffers = false;

      if (programInfo !== lastUsedProgramInfo) {
        lastUsedProgramInfo = programInfo;
        gl.useProgram(programInfo.program);
        bindBuffers = true;
      }
      // Setup all the needed attributes.
      if (bindBuffers || objBufferInfo !== lastUsedBufferInfo) {
        lastUsedBufferInfo = objBufferInfo;  
      }


      // definisco la matrice
      let m = object.uniformMatrix;
      // gestisco l'animazione delle eliche
      if(object.animateX){
        degreeX = (degreeX > 360 ? 0 : (degreeX + 4 + 3.5 *Math.abs(velocity/maxVelocity)));
        m = m4.xRotate(m, degToRad(degreeX),m4.copy(m));
      }
      //gestisco animazione bolla
      if(object.animateY){
        degreeY = (degreeY > 360 ? 0 : (degreeY + 0.25));
        m = m4.yRotate(m, degToRad(degreeY),m4.copy(m));
      }
      

      // renderizzo passando più array //
      for (const {bufferInfo, material} of object.parts) {
        // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
        webglUtils.setBuffersAndAttributes(gl, programInfo, bufferInfo);
        
        // calls gl.uniform
        webglUtils.setUniforms(programInfo, { u_world: m,  }, material); // come parametro solo cose scritte nel vertex shader

        /* -- Qui avviene l'effettiva renderizzazione -- */
        // calls gl.drawArrays or gl.drawElements
        webglUtils.drawBufferInfo(gl, bufferInfo);
      }

    });


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

  requestAnimationFrame(render);
}

main();
