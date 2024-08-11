
//conversione gradi in radianti
function degToRad(deg) {
  return deg * Math.PI / 180;
}

// definizione di un numero randomico float tra min e max
// minimo incluso massimo esclusivo
function getRandomNumber(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.random() * (maxFloored - minCeiled) + minCeiled; 
}

//generazione coordinate randomiche
function generateCoordinatesRocks(){ 
  const coord = [];
  coord[0]= getRandomNumber(-20, 20); //definisco la x
  coord[1]= getRandomNumber(-20, 0);  //definisco la y
  coord[2]= getRandomNumber(-20, 20);  //definisco la z
}


//calcolo delle matrici
function computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation, zRotation) {
  var matrix = m4.translate(viewProjectionMatrix,
      translation[0],
      translation[1],
      translation[2]);
  matrix =m4.yRotate(matrix, yRotation);
  matrix = m4.xRotate(matrix, xRotation);
  matrix = m4.zRotate(matrix, zRotation);
  return matrix;
}

//assegno solo determinati valori da una matrice all'altra per definire la traslazione senza incidere sulla rotazione dell'elica
function adaptPropellersTransl(src, dst){
  dst[12]= src[12];
  dst[13]=src[13];
  dst[14]= src[14];
  dst[15]=src[15];
  return dst;
}
function adaptPropellersRotateY(src, dst){
  dst[0]= src[0];
  dst[1]= src[1];
  dst[2]=src[2];
  dst[3]=src[3];
  dst[8]= src[8];
  dst[9] = src[9];
  dst[10]=src[10];
  dst[11]=src[11];
  return dst;
}

//linear interpolation
// a - valore inizio / b-valore fine / t - interpolation factor
function lerp(a, b, t) {
  return a + (b - a) * t;
}

//formula per distribuzione rocce 
//y=60 * sin(0.05 *  (x-30))
function getXRock(){
  let x = getRandomNumber(-60, 60);
  let y = Math.sin(0.5 * (x-30)) * 60;
  return y;
}

//generazione dei buffer da obj
async function generateBuffer(url){
  // Get A WebGL context
  const canvas = document.getElementById("mainCanva");
  const gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  //setup program
  // compiles and links the shaders, looks up attribute and uniform locations
  const obj = await importOBJ(url);
  const materials = await importMT(url, obj);

  //capisci come inserire transizioni

  const textures = {
    defaultWhite: create1PixelTexture(gl, [255, 255, 255, 255]),
    defaultNormal: create1PixelTexture(gl, [127, 127, 255, 0]),
  };
  
  const defaultMaterial = {
    diffuse: [1, 1, 1],
    diffuseMap: textures.defaultWhite,
    normalMap: textures.defaultNormal,
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    specularMap: textures.defaultWhite,
    shininess: 400,
    opacity: 1,
  };
  

  // load texture for materials
  for (const material of Object.values(materials)) {
    Object.entries(material)
      .filter(([key]) => key.endsWith('Map'))
      .forEach(([key, filename]) => {
        let texture = textures[filename];
        if (!texture) {
          const baseHref = new URL(url, window.location.href);
          const textureHref = new URL(filename, baseHref).href;
          texture = createTexture(gl, textureHref);
          textures[filename] = texture;
        }
        material[key] = texture;
      });
  }

  // hack the materials so we can see the specular map
  Object.values(materials).forEach(m => {
    m.shininess = 25;
    m.specular = [3, 2, 1];
  });

  const parts = obj.geometries.map(({material, data}) => {

    if (data.color) {
      if (data.position.length === data.color.length) {
        // it's 3. The our helper library assumes 4 so we need
        // to tell it there are only 3.
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      // there are no vertex colors so just use constant white
      data.color = { value: [1, 1, 1, 1] };
    }

    // generate tangents if we have the data to do so.
    if (data.texcoord && data.normal) {
      data.tangent = generateTangents(data.position, data.texcoord);
    } else {
      // There are no tangents
      data.tangent = { value: [1, 0, 0] };
    }

    if (!data.texcoord) {
      data.texcoord = { value: [0, 0] };
    }

    if (!data.normal) {
      // we probably want to generate normals if there are none
      data.normal = { value: [0, 0, 1] };
    }

    // create a buffer for each array by calling
    // gl.createBuffer, gl.bindBuffer, gl.bufferData
    const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
    return {
      material: {
        ...defaultMaterial,
        ...materials[material],
      },
      bufferInfo,
    };
  });

  var all = {
    parts,
    obj,
  }
  return all;

}