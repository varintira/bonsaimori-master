const awards = [
    {
        image: "../assets/award1.png",
        title: "Best Bonsai Award"
    },
    {
        image: "../assets/award2.png",
        title: "Excellence Award"
    },
    {
        image: "../assets/award3.png",
        title: "Gold Medal"
    },
    {
        image: "../assets/award4.png",
        title: "Best Tree Award"
    }
];

const awardsContainer = document.getElementById("awards-container");

awardsContainer.innerHTML = awards.map(award => `
    <div class="col-6 col-md-3 text-center">
        <img src="${award.image}" class="award-img" alt="${award.title}">
        <h5 class="mt-3">${award.title}</h5>
    </div>
`).join("");