function subscription(){
   
   var emailInput = document.getElementById("input");

   if (emailInput.value === "") {
      errorText.style.display = "block";
    } else {
      var btn = document.getElementById("form__button");
      btn.innerHTML= "Grazie!";
      emailInput.value='';
      errorText.style.display = "none";
    }
}


function expandSection(button) {
   // imposta classi per svg figli di elementsRight o elementsLeft
   var svgElements = document.querySelectorAll('.expanded-right .pause, .expanded-left .pause');
   if(svgElements){
      svgElements.forEach(function(svgElement) {
         svgElement.style.display = "none";
      });
   }

   //elimina effetto precedente
   const elementsLeft = document.getElementsByClassName("expanded-left");
   if (elementsLeft.length > 0) {
      elementsLeft[0].classList.remove("expanded-left");
   }

   const elementsRight = document.getElementsByClassName("expanded-right");
   if (elementsRight.length > 0) {
      elementsRight[0].classList.remove("expanded-right");   
   }

   const sectionsLeft = document.getElementsByClassName("expanded-left-section");
   if (sectionsLeft.length > 0) {
      sectionsLeft[0].classList.remove("expanded-left-section");
   }

   const sectionsRight = document.getElementsByClassName("expanded-right-section");
   if (sectionsRight.length > 0) {
      sectionsRight[0].classList.remove("expanded-right-section");   
   }

      
   //imposta nuova classe per div e section
   var div = button.parentNode.parentNode;
   var section = div.parentNode;
   if (section.classList.contains('left')) {
      div.classList.add('expanded-left');
      section.classList.add("expanded-left-section");
   } else if (section.classList.contains('right')) {
      div.classList.add('expanded-right');
      section.classList.add("expanded-right-section");
   }
   //imposta classi per svg
   var svgContainer = button.closest('.iconbtns');
   var toDisplay = svgContainer.querySelectorAll('.pause');
   if(toDisplay){
      toDisplay.forEach(function(element) {
         element.style.display = "block";
      });
   }

   //audio
   var allAudio = document.querySelectorAll(".audio");
   allAudio.forEach(function(audio){
      if (!audio.paused) {
         audio.pause();
       }
   });

   const myAudio = button.parentNode.querySelector(".audio");
   console.log(myAudio);
   if (myAudio.paused) {
      myAudio.play();
   }

   
 }

 function reduceSection(button){
   //rimuovi classe per div e section
   var div = button.parentNode.parentNode;
   var section = div.parentNode;
   if (section.classList.contains('left')) {
      div.classList.remove('expanded-left');
      section.classList.remove("expanded-left-section");
   } else if (section.classList.contains('right')) {
      div.classList.remove('expanded-right');
      section.classList.remove("expanded-right-section");
   }
   //imposta classi per svg
   var svgContainer = button.closest('.iconbtns');
   var bottoni = svgContainer.querySelectorAll('.pause');
   if(bottoni){
      bottoni.forEach(function(element) {
         element.style.display = "none";
      });
   }
   const myAudio = button.parentNode.querySelector(".audio");
   console.log(myAudio);
   if (myAudio) {
      myAudio.pause();
   }

 }

 function menuOpen(topic){
   var content = topic.nextElementSibling;
   content.classList.toggle('open');

   if(topic.style.backgroundColor != 'rgb(7, 112, 176)'){
      topic.style.backgroundColor = '#0770B0';
      topic.style.color='white';
   } else {
      topic.style.backgroundColor = 'transparent';
      topic.style.color='black';
   }
 }
 
 
