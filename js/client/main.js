const API_KEY = "lrufIrxkoorq8sriuuo3LdPU1Cnu1fnrIpr0kRm0";
const API_KEY_PARAMETER = `api_key=${API_KEY}`
const ROVER_DATA_ENDPOINT = "https://api.nasa.gov/mars-photos/api/v1/rovers";

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
            const response = await fetch(`${ROVER_DATA_ENDPOINT}?${API_KEY_PARAMETER}`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            roverData = data; // Save the fetched data
            roverNames = roverData?.rovers?.map(rover => rover.name);
            console.log(roverNames);
            console.log(roverData); // Log the fetched data to verify
            return roverData;
        } catch (error) {
            console.error("Error fetching rover data:", error);
        }
    }

    async function searchByEarthDate(event) {
        event.preventDefault();
        const dateInputValue = earthDateInput.value.trim();
        console.log(dateInputValue);
        if (dateInputValue) {
            try {
                const promises = roverNames.map(roverName =>
                    fetch(`${ROVER_DATA_ENDPOINT}/${roverName}/photos?${API_KEY_PARAMETER}&earth_date=${dateInputValue}`)
                        .then(response => {
                            if(!response.ok) {
                                throw new Error(`HTTP error! Status: ${response.status}`);
                            }
                            return response.json()
                        })
                );
                const searchResults = await Promise.all(promises); // Wait for all fetches to complete

                console.log(searchResults); // Show the results
            } catch (error) {
                console.error("Error fetching rover data:", error);
            }
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
