class SeaObject{
    /*-- Variabili dell'oggetto --*/
    obj;
    parts;
    uniformMatrix;
    animateX;
    animateY;

    
    constructor(fullObj){
        this.obj = fullObj.obj;
        this.parts = fullObj.parts;
        this.uniformMatrix=m4.identity();
        this.animateX = false;
        this.animateY = false;
    }

    
    //metodo per traslare l'oggetto in una posizione predefinita
    translateObj(tx, ty, tz){
        this.uniformMatrix = m4.translation(tx, ty, tz, this.uniformMatrix);
    }

    //prendo le coordinate dell'oggetto nello spazio
    getX(){ return this.uniformMatrix[12];}
    getY(){ return this.uniformMatrix[13];}
    getZ(){ return this.uniformMatrix[14];}

}