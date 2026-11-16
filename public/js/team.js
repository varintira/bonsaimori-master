const team = [
    {
        name: "Akira Mori",
        position: "Founder & CEO",
        image: "../assets/team_7.jpg",
        description: "Founder of Bonsai Mori with many years of experience in bonsai."
    },
    {
        name: "Kenji Tanaka",
        position: "Bonsai Specialist",
        image: "../assets/team_2.jpg",
        description: "Specialist in growing and caring for beautiful bonsai trees."
    },
    {
        name: "Ren Takahashi",
        position: "Bonsai Designer",
        image: "../assets/team_3.jpg",
        description: "Experienced in shaping and designing unique bonsai trees."
    },
    {
        name: "Sakura Sato",
        position: "Plant Specialist",
        image: "../assets/team_4.jpg",
        description: "Focuses on plant health and maintaining bonsai quality."
    },
    {
        name: "Masashi Hirao",
        position: "Bonsai Grower",
        image: "../assets/team_5.jpg",
        description: "Responsible for growing and maintaining our bonsai collection."
    },
    {
        name: "Kaori Yamada",
        position: "Customer Specialist",
        image: "../assets/team_6.jpg",
        description: "Helps customers find the perfect bonsai for their space."
    },
    {
        name: "Haruto Nakamura",
        position: "Customer Specialist",
        image: "../assets/team_1.jpg",
        description: "Experienced in shaping and designing unique bonsai trees."
    }
];


const teamContainer = document.getElementById("team-container");


teamContainer.innerHTML = team.map(person => `
    <div class="team-card">

        <img src="${person.image}"
             class="team-img"
             alt="${person.name}">

        <h5 class="team-name">
            ${person.name}
        </h5>

        <p class="team-position">
            ${person.position}
        </p>

        <p class="team-info">
            ${person.description}
        </p>

    </div>
`).join("");