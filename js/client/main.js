const API_KEY = "lrufIrxkoorq8sriuuo3LdPU1Cnu1fnrIpr0kRm0";
const url = `https://api.nasa.gov/mars-photos/api/v1/rovers?api_key=${API_KEY}`;

// UI Module - Responsible for managing the DOM and events
const UI = (function () {
    function init() {
        // Fetch data when the app initializes
        searchModule.fetchRoverData().then(() => {
            // Hide the spinner and show the UI once data is fetched
            document.querySelector(".spinner-border").classList.add("d-none");
            document.querySelector(".search-by-date-form").classList.remove("d-none");
        });

        // Add event listener for the search button
        document
            .querySelector(".search-by-earth-date-btn")
            .addEventListener("click", searchModule.searchByEarthDate);
    }

    return {
        init: init,
    };
})();

// Search Module - Handles fetching data and business logic related to search
const searchModule = (function () {
    const earthDateInput = document.querySelector("#earthDateInput");
    let roverData = null;
    let roverNames = null;
    // Fetch rover data from the API
    async function fetchRoverData() {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            roverData = data; // Save the fetched data
            roverNames = roverData.rovers.map(rover => rover.name);
            console.log(roverData); // Log the fetched data to verify
            return roverData;
        } catch (error) {
            console.error("Error fetching rover data:", error);
        }
    }

    // Search by Earth Date
    async function searchByEarthDate() {
        const inputValue = earthDateInput.value.trim();
        if (inputValue) {
            const filteredData = await fetch(url);
            console.log(filteredData); // Show filtered data
        } else {
            console.log("Please enter a valid Earth Date.");
        }
    }

    return {
        fetchRoverData: fetchRoverData,
        searchByEarthDate: searchByEarthDate,
    };
})();

// Initialize the app
UI.init();
