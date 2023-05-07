const slides = document.getElementsByClassName('slide');
const next = document.getElementById('nextBtn');
const prev = document.getElementById('prevBtn');
console.log(slides.length);
for(var i=0; i<slides.length; i++){
    let container = document.getElementsByClassName('container').clientWidth;
    console.log(container);
    next.addEventListener('click', function() {
        slides.item(i).scrollLeft += container;
    });
    prev.addEventListener('click', function() {
        slides.item(i).scrollLeft -= container;
    });
}
