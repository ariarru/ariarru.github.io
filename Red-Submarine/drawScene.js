import { degToRad } from "./myutils.js";

export function draw( 
    projectionMatrix,
    cameraMatrix,
    textureMatrix,
    lightWorldMatrix,
    programInfo, 
    gl,
    elementsToDraw,
    otherElements, 
    animate){

    // matrice di vista definita come l'inversa della matrice della camera
    const viewMatrix = m4.inverse(cameraMatrix);
    gl.useProgram(programInfo.program);

    //Informazioni condivise
    let u_world= m4.identity();
    const u_worldInverseTraspose = m4.transpose(m4.inverse(u_world));
    /*--Gestione nebbia--*/
    const fogColor= [0.0039, 0.207, 0.29, 1]; 

    let sharedUniforms = {
        u_view: viewMatrix,
        u_projection: projectionMatrix,
        u_bias: otherElements.bias,
        u_textureMatrix: textureMatrix,
        u_shininess: 400,
        u_projectedTexture: otherElements.depthTexture,
        u_lightDirection: lightWorldMatrix.slice(8, 11).map(v => -v),
        u_lightWorldPosition: otherElements.lightPosition,
        u_viewWorldPosition: cameraMatrix.slice(12, 15),
        u_worldInverseTraspose: u_worldInverseTraspose,
        u_lightWorldIntensity: otherElements.lightIntensity,
        u_fogColor: fogColor,
      };

    webglUtils.setUniforms(programInfo, sharedUniforms);
    
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

        //Definisco la matrice
        let m = object.uniformMatrix;
    
        //Gestisco le animazioni
        if(animate && object.animateX){
          object.degreeX = (object.degreeX > 360 ? 0 : (object.degreeX + otherElements.velocity));
          m = m4.xRotate(m, degToRad(object.degreeX),m4.copy(m));
        }
        if(animate && object.animateY){
          object.degreeY = (object.degreeY > 360 ? 0 : (object.degreeY + 0.25));
          m = m4.yRotate(m, degToRad(object.degreeY),m4.copy(m));
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
}

