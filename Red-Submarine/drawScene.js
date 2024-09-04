import { degToRad } from "./myutils.js";

export function draw( 
    projectionMatrix,
    cameraMatrix,
    textureMatrix,
    lightWorldMatrix,
    programInfo, 
    gl,
    elementsToDraw,
    otherElements){

    // matrice di vista definita come l'inversa della matrice della camera
    const viewMatrix = m4.inverse(cameraMatrix);
    gl.useProgram(programInfo.program);

    //Informazioni condivise
    let u_world= m4.identity();
    const u_worldInverseTraspose = m4.transpose(m4.inverse(u_world));

    let sharedUniforms = {
        u_view: viewMatrix,
        u_projection: projectionMatrix,
        u_bias: otherElements.bias,
        u_textureMatrix: textureMatrix,
        u_shininess: 20,
        u_projectedTexture: otherElements.depthTexture,
        u_innerLimit: Math.cos(degToRad(180 / 3)),
        u_outerLimit: Math.cos(degToRad(180/ 2)),
        u_lightDirection: lightWorldMatrix.slice(8, 11).map(v => -v),
        u_lightWorldPosition: otherElements.lightPosition,
        u_viewWorldPosition: cameraMatrix.slice(12, 15),
        u_worldInverseTraspose: u_worldInverseTraspose,
        u_lightWorldIntensity: otherElements.lighIntensity,
        u_fogColor: otherElements.fogColor,
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
    
        // definisco la matrice
        let m = object.uniformMatrix;
        
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

