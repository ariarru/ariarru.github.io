class Move{
    /* -- Gestione della navigazione -- */
    rotateLeft;           //tasto A 
    rotateRight;          //tasto D
    foward;               //tasto W
    back;                 //tasto S
    dive;                 //tasto Q
    emerge;               //tasto E
    target;               //target di direzione di movimento  
    ableFoward;           //abilitazione movimento in avanti
    ableBack;             //abilitazione movimento indietro
    

   constructor(){
    this.rotateLeft= false;           //tasto A 
    this.rotateRight = false;         //tasto D
    this.foward = false;              //tasto W
    this.back = false;                //tasto S
    this.dive =false;                 //tasto Q
    this.emerge= false;               //tasto E
    this.target =0;
    this.ableFoward=true;
    this.ableBack=true;
   }
   
   stopTarget(){
    this.target=0;
   }

   setTarget(val){
    this.target = val;
   }
  
  pressKey(keyCode){
    switch(keyCode){
        //avanti W
        case 87: 
            this.foward = true;
            break;
        //indietro S
        case 83:
            this.back=true;
            break;
        //su E
        case 69: 
            this.emerge=true;
            break;
        //giù X
        case 81: 
            this.dive=true;
            break;
        //ruota dx D
        case 68:
            this.rotateRight = true;
            break;
        //ruota sx A
        case 65:
            this.rotateLeft= true;
            break;
    }
  }
   
  releaseKey(keyCode){
    switch(keyCode){
        //avanti
        case 87: 
            this.foward = false;
            break;
        //indietro
        case 83:
            this.back=false;
            break;
        //su 
        case 69: 
            this.emerge=false;
            break;
        //giù
        case 81: 
            this.dive=false;
            break;
        // ruota dx
        case 68:
            this.rotateRight = false;
            break;
        //ruota sx
        case 65:
            this.rotateLeft= false;
            break;
      }
  }

  
  
  
}