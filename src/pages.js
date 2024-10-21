console.log("pages.js is loading...");

document.addEventListener('DOMContentLoaded', function() {
    const expandLinks = document.querySelectorAll('.expand-link');
    const sidebar = document.getElementById('sidebar');
    const toggleButton = document.getElementById('toggleSidebar');
    const infoText = document.getElementById('info');

    expandLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent the default link behavior
            sidebar.classList.toggle('expanded'); // Toggle the expanded class on the sidebar
        });
    });

    toggleButton.addEventListener('click', function() {
        if (sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
            infoText.classList.remove('hidden');
            toggleButton.textContent = '[ hide ]';
            toggleButton.classList.remove('hidden');
        } else {
            sidebar.classList.add('hidden');
            infoText.classList.add('hidden');
            toggleButton.textContent = '[ show ]';
            toggleButton.classList.add('hidden');
        }
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
    adjustSidebarWidth();
}

function adjustSidebarWidth() {
    const sidebar = document.getElementById('sidebar');
    const dropdowns = document.querySelectorAll('.dropdown-content');
    let anyExpanded = false;

    dropdowns.forEach(dropdown => {
        if (dropdown.style.maxHeight && dropdown.style.maxHeight !== "0px") {
            anyExpanded = true;
        }
    });

    const newWidth = anyExpanded ? '100%' : '20%';
    gsap.to(sidebar, { duration: 1, width: newWidth });
}

window.toggleSidebarAndToggleDropdown = function(event, dropdownId) {
    const sidebar = document.getElementById('sidebar');
    const newWidth = sidebar.style.width === '100%' ? '20%' : '100%';
    gsap.to(sidebar, { duration: 1, width: newWidth });
    toggleDropdown(event, dropdownId);
}