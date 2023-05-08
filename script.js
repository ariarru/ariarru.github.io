const slides = document.querySelectorAll(".slide");
const next = document.getElementById("nextBtn");
const prev = document.getElementById("prevBtn");

const container = document.querySelector("#slides-container");
const slideWidth = slides.item(0).clientWidth;

next.addEventListener("click", () => {
    container.scrollLeft += slideWidth;
});

prev.addEventListener("click", () => {
    
    container.scrollLeft -= slideWidth;
});
