console.log("pages.js is loading...");

document.addEventListener('DOMContentLoaded', function() {
    const expandLinks = document.querySelectorAll('.expand-link');
    const sidebar = document.getElementById('sidebar');

    expandLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default link behavior
            sidebar.classList.toggle('expanded'); // Toggle the expanded class on the sidebar
        });
    });

    document.querySelector('.close-btn').addEventListener('click', function() {
        sidebar.classList.remove('expanded');
    });

});

window.toggleDropdown = function(event, id) {
    event.preventDefault();
    var dropdown = document.getElementById(id);
    var toggle = event.target.querySelector('.toggle');
    if (dropdown.style.maxHeight && dropdown.style.maxHeight !== "0px") {
        dropdown.style.maxHeight = "0";
        dropdown.style.opacity = "0";
        toggle.textContent = ' + ';
    } else {
        dropdown.style.maxHeight = dropdown.scrollHeight + "px";
        dropdown.style.opacity = "1";
        toggle.textContent = ' - ';
    }
}