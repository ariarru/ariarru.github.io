class SeaObject{
    /*-- Variabili dell'oggetto --*/
    obj;
    parts;
    uniformMatrix;
    animateX;
    animateY;
    offset;
    degree;
    
    //metodo per traslare l'oggetto in una posizione predefinita
    translateObj(tx, ty, tz){
        this.uniformMatrix = m4.translation(tx, ty, tz, this.uniformMatrix);
    }

    //prendo le coordinate dell'oggetto nello spazio
    getX(){ return this.uniformMatrix[12];}
    getY(){ return this.uniformMatrix[13];}
    getZ(){ return this.uniformMatrix[14];}

    getPos(){return [this.uniformMatrix[12], this.uniformMatrix[13], this.uniformMatrix[14]];}
        
    constructor(fullObj){
        this.obj = fullObj.obj;
        this.parts = fullObj.parts;
        this.uniformMatrix=m4.identity();
        this.animateX = false;
        this.animateY = false;
        const extents = getGeometriesExtents(this.obj.geometries);
        const range = m4.subtractVectors(extents.max, extents.min);
        // amount to move the object so its center is at the origin
        this.offset = m4.scaleVector( m4.addVectors(
                extents.min, m4.scaleVector(range, 0.5)), -1);
        this.degree = null;
    }
}
