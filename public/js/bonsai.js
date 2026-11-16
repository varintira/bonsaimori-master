document.querySelectorAll("#categoryFilters .nav-link").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll("#categoryFilters .nav-link").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        const category = button.dataset.category;
        document.querySelectorAll(".bonsai-item").forEach(card => {
            if (category === "all" || card.dataset.category === category) {
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }
        });
    });
});