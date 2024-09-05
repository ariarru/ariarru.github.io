
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


//assegno solo determinati valori da una matrice all'altra per definire la traslazione senza incidere sulla rotazione dell'elica
function adaptPropellersTransl(src, dst){
  dst[12]= src[12];
  dst[13]=src[13];
  dst[14]= src[14];
  return dst;
}
function adaptPropellersRotateY(src, dst){
  dst[0]= src[0];
  dst[2]=src[2];
  dst[4]=src[4];
  dst[6]=src[6];
  dst[8]= src[8];
  dst[10]=src[10];
  dst[12]=src[12];
  dst[13]= src[13];
  dst[14]=src[14];
  return dst;
}

/*Funzione per la gestione delle rotazioni applicate rispettando
* gli assi globali, invece che gli assi dell'oggetto.
* In questo modo il sottomarino ruota a destra e sinistra mantendo un'allineamento costante.*/
function yRotateMatrix(m, angleInRadians, dst) {
  dst = dst || new MatType(16);

  var c = Math.cos(angleInRadians);
  var s = Math.sin(angleInRadians);

  var matrixY = [c, 0, s, 0,
                0, 1, 0, 0, 
                -s, 0, c, 0,
                m[12], m[13], m[14], 1];
  
  //necesario per evitare che la rotazione sia rispetto al centro degli assi
  m[12]=0;
  m[13]=0;
  m[14]=0;
  dst = m4.multiply(matrixY, m);

  return dst;
}

function xRotateMatrix(m, angleInRadians, dst) {
  dst = dst || new MatType(16);

  var c = Math.cos(angleInRadians);
  var s = Math.sin(angleInRadians);

  var matrixY = [1, 0, 0, 0,
                0, c, -s, 0, 
                0, s, c, 0,
                m[12], m[13], m[14], 1];
  
  //necesario per evitare che la rotazione sia rispetto al centro degli assi
  m[12]=0;
  m[13]=0;
  m[14]=0;
  dst = m4.multiply(matrixY, m);

  return dst;
}

//linear interpolation
// a - valore inizio / b-valore fine / t - interpolation factor
function lerp(a, b, t) {
  return a + (b - a) * t;
}



//Creazione dello slider
function setupSlider(selector, options) {
  var parent = document.getElementById(selector);
  if (!parent) {
    // like jquery don't fail on a bad selector
    return;
  }
  if (!options.name) {
    options.name = selector.substring(1);
  }
  return createSlider(parent, options);
}

function createSlider(parent, options) {
  var precision = options.precision || 0;
  var min = options.min || 0;
  var step = options.step || 1;
  var value = options.value || 0;
  var max = options.max || 1;
  var fn = options.slide;
  var name = options.name;
  var uiPrecision = options.uiPrecision === undefined ? precision : options.uiPrecision;
  var uiMult = options.uiMult || 1;

  min /= step;
  max /= step;
  value /= step;

  parent.innerHTML = `
    <div class="widget-outer">
      <div class="widget-label">${name}</div>
      <div class="widget-value"></div>
      <input class="widget-slider" type="range" min="${min}" max="${max}" value="${value}" />
    </div>
  `;
  var valueElem = parent.querySelector(".widget-value");
  var sliderElem = parent.querySelector(".widget-slider");

  function updateValue(value) {
    valueElem.textContent = (value * step * uiMult).toFixed(uiPrecision);
  }

  updateValue(value);

  function handleChange(event) {
    var value = parseInt(event.target.value);
    updateValue(value);
    fn(event, { value: value * step });
  }

  sliderElem.addEventListener('input', handleChange);
  sliderElem.addEventListener('change', handleChange);

  return {
    elem: parent,
    updateValue: (v) => {
      v /= step;
      sliderElem.value = v;
      updateValue(v);
    },
  };
}

//Creazione della checkbox
function setupCheckBox(selector, options) {
  var parent = document.getElementById(selector);
  console.log(parent);
  if (!parent) {
    // like jquery don't fail on a bad selector
    return;
  }
  if (!options.name) {
    options.name = selector.substring(1);
  }
  return makeCheckbox(parent, selector, options);
}

function makeCheckbox(parent, id,  options) {
  const div = document.createElement("div");
  div.className = "widget-outer";
  const label = document.createElement("label");
  label.setAttribute('for', id);
  label.textContent = options.name;
  label.className = "gman-checkbox-label";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = options.value;
  input.id = id;
  input.className = "gman-widget-checkbox";
  div.appendChild(label);
  div.appendChild(input);
  input.addEventListener('change', function(e) {
     options.change(e, {
       value: e.target.checked,
     });
  });

  parent.appendChild(div);

  return {
    elem: parent,
    updateValue: function(v) {
      input.checked = !!v;
    },
  };
}






export {degToRad, getRandomNumber, adaptPropellersTransl, adaptPropellersRotateY, lerp, setupSlider,setupCheckBox, yRotateMatrix, xRotateMatrix};