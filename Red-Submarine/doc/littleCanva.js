import { generateBuffer } from "../proj/src/handleOBJ.js";
import { SeaObject } from "../proj/src/SeaObjects.js";
import { degToRad } from "../proj/src/myutils.js";
async function main() {
    //Definisco WebGL context
    const canvas = document.getElementById("littleCanva");
    const gl = canvas.getContext("webgl");
    if (!gl) {
      return;
    }
    //Setup program
    const vs = `
        attribute vec4 a_position;
        attribute vec3 a_normal;
        attribute vec3 a_tangent;
        attribute vec2 a_texcoord;
        attribute vec4 a_color;

        uniform mat4 u_projection;
        uniform mat4 u_view;
        uniform mat4 u_world;
        uniform vec3 u_viewWorldPosition;

        varying vec3 v_normal;
        varying vec3 v_tangent;
        varying vec3 v_surfaceToView;
        varying vec2 v_texcoord;
        varying vec4 v_color;

        void main() {
            vec4 worldPosition = u_world * a_position;
            gl_Position = u_projection * u_view * worldPosition;
            v_surfaceToView = u_viewWorldPosition - worldPosition.xyz;
            mat3 normalMat = mat3(u_world);
            v_normal = normalize(normalMat * a_normal);
            v_tangent = normalize(normalMat * a_tangent);

            v_texcoord = a_texcoord;
            v_color = a_color;
        }
        `;

    const fs = `
        precision highp float;

        varying vec3 v_normal;
        varying vec3 v_tangent;
        varying vec3 v_surfaceToView;
        varying vec2 v_texcoord;
        varying vec4 v_color;

        uniform vec3 diffuse;
        uniform sampler2D diffuseMap;
        uniform vec3 ambient;
        uniform vec3 emissive;
        uniform vec3 specular;
        uniform sampler2D specularMap;
        uniform float shininess;
        uniform sampler2D normalMap;
        uniform float opacity;
        uniform vec3 u_lightDirection;
        uniform vec3 u_ambientLight;

        void main () {
            vec3 normal = normalize(v_normal) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
            vec3 tangent = normalize(v_tangent) * ( float( gl_FrontFacing ) * 2.0 - 1.0 );
            vec3 bitangent = normalize(cross(normal, tangent));

            mat3 tbn = mat3(tangent, bitangent, normal);
            normal = texture2D(normalMap, v_texcoord).rgb * 2. - 1.;
            normal = normalize(tbn * normal);

            vec3 surfaceToViewDirection = normalize(v_surfaceToView);
            vec3 halfVector = normalize(u_lightDirection + surfaceToViewDirection);

            float fakeLight = dot(u_lightDirection, normal) * .5 + .5;
            float specularLight = clamp(dot(normal, halfVector), 0.0, 1.0);
            vec4 specularMapColor = texture2D(specularMap, v_texcoord);
            vec3 effectiveSpecular = specular * specularMapColor.rgb;

            vec4 diffuseMapColor = texture2D(diffuseMap, v_texcoord);
            vec3 effectiveDiffuse = diffuse * diffuseMapColor.rgb * v_color.rgb;
            float effectiveOpacity = opacity * diffuseMapColor.a * v_color.a;

            gl_FragColor = vec4(
                emissive +
                ambient * u_ambientLight +
                effectiveDiffuse * fakeLight +
                effectiveSpecular * pow(specularLight, shininess),
                effectiveOpacity);
        }
        `;

    const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);


    // Buffer delle posizioni
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
   
    // Buffer delle normali
    var normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  
      
    /* - array di tutti gli elementi da disegnare - */
    var elementsToDraw =[];
  
    /* -- Dichiaro il sottomarino -- */
    const subBody = await generateBuffer('./proj/res/sub-body.obj', "littleCanva");
    const submarine = new SeaObject(subBody);
    elementsToDraw.push(submarine);  
  
    /* -- Dichiaro le eliche -- */
    const subPropellers = await generateBuffer('./proj/res/sub-eliche.obj', "littleCanva");
    const propellers = new SeaObject(subPropellers);
    elementsToDraw.push(propellers);  
  

    /* -- Gestione della camera -- */
    const cameraPosition= [0, 0, 20];


    
  /*--------- Render Time ----------*/
    function render(time) {
      time *= 0.001;  // convert to seconds
      
      webglUtils.resizeCanvasToDisplaySize(gl.canvas);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  
      gl.enable(gl.CULL_FACE);
      gl.enable(gl.DEPTH_TEST);
  
  
      /*-- Gestione camera --*/
      var camera = m4.yRotate(submarine.uniformMatrix, degToRad(90));
      m4.translate(camera, cameraPosition[0], cameraPosition[1], cameraPosition[2], camera);  

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
  
  

    const sharedUniforms = {
        u_lightDirection: m4.normalize([-1, 3, 5]),
        u_view: view,
        u_projection: projection,
        u_viewWorldPosition: cameraPosition,
    };

    gl.useProgram(meshProgramInfo.program);

    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);


    elementsToDraw.forEach(function(object) {
        
        //Definisco la matrice
        let m = object.uniformMatrix;
    
        //Gestisco le animazioni
        //m = m4.xRotate(m, degToRad(object.degreeX),m4.copy(m));
        
        
        // renderizzo passando più array //
        for (const {bufferInfo, material} of object.parts) {
          // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
          webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
          
          // calls gl.uniform
          webglUtils.setUniforms(meshProgramInfo, { u_world: m,  }, material); // come parametro solo cose scritte nel vertex shader
    
          /* -- Qui avviene l'effettiva renderizzazione -- */
          // calls gl.drawArrays or gl.drawElements
          webglUtils.drawBufferInfo(gl, bufferInfo);
        }
    });

      
      requestAnimationFrame(render);
    }
  
    requestAnimationFrame(render);
  }
  
  
  
  main();