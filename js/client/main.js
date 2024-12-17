const API_KEY = "lrufIrxkoorq8sriuuo3LdPU1Cnu1fnrIpr0kRm0";
const API_KEY_PARAMETER = `api_key=${API_KEY}`
const ROVER_DATA_ENDPOINT = "https://api.nasa.gov/mars-photos/api/v1/rovers";
//=======================================================================================================================
// UI Module - Responsible for managing the DOM and events
const  UI = (function () {

    async function init() {
        // Fetch data when the app initializes
        await searchModule.fetchRoverData();
        // Hide the spinner and show the UI once data is fetched
        DOM.toggleSpinner(false);
        DOM.toggleSearchByDateForm(true);

        eventsBinder.bindEvents();

    }


    return {
        init: init,
    };
})();
//=======================================================================================================================
const eventsBinder = (function () {
    // Add event listener for the search button
   function bindEvents(){
       document
           .querySelector(".search-by-earth-date-btn")
           .addEventListener("click", handleSearch.handleSearchByEarthDate);
   }
   return {bindEvents : bindEvents};
})();
//=======================================================================================================================
const handleSearch = (function (){
    async function handleSearchByEarthDate(event){
        event.preventDefault();
        DOM.toggleSpinner(true);
        const searchResults =  await searchModule.searchByEarthDate();
        DOM.toggleSpinner(false);
        DOM.setupRoverFilter(searchResults);
        DOM.displayResults(searchResults);

    }

    return{handleSearchByEarthDate : handleSearchByEarthDate};
})();
//=======================================================================================================================
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

    async function searchByEarthDate() {
        const dateInputValue = earthDateInput.value.trim();
        console.log(dateInputValue);

        if (dateInputValue) {
            try {
                // Use async/await in the map function to fetch data for each rover
                const promises = roverNames.map(async roverName => {
                    const response = await fetch(`${ROVER_DATA_ENDPOINT}/${roverName}/photos?${API_KEY_PARAMETER}&earth_date=${dateInputValue}`);

                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }

                    return await response.json();
                });

                const searchResults = await Promise.all(promises); // Wait for all fetches to complete
                console.log(searchResults);
                return searchResults;
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
    //=======================================================================================================================
})();

const DOM = ( function () {
    const roverSelect = document.querySelector("#roverSelect");
    const spinnerElement =  document.querySelector(".spinner-border");
    const searchByEarthDateForm = document.querySelector(".search-by-date-form");
    function toggleSpinner(show){
        if (!show) {
            spinnerElement.classList.add("d-none");
        }
        else {
            spinnerElement.classList.remove("d-none");
        }
    }
    function toggleSearchByDateForm(show){
        if (!show) {
            searchByEarthDateForm.classList.add("d-none");
        }
        else {
            searchByEarthDateForm.classList.remove("d-none");
        }
    }
    function displayResults(searchResults, selectedRover = '') {
        const resultsContainer = document.querySelector(".search-results");
        resultsContainer.innerHTML = ''; // Clear previous results

        // Create a wrapper for centering the content
        const rowContainer = document.createElement('div');
        rowContainer.classList.add('row', 'd-flex', 'justify-content-center'); // Bootstrap classes to center cards

        searchResults?.forEach(result => {
            result?.photos?.forEach(photo => {
                // Filter photos by selected rover
                if (selectedRover && photo.rover.name !== selectedRover) {
                    return; // Skip this photo if it doesn't match the selected rover
                }

                const photoCardHTML = `
                <div class="col-sm-12 col-md-6 col-lg-3 mb-4">
                    <div class="card">
                        <div class="position-relative overflow-hidden" style="padding-top: 75%;">
                            <img 
                                src="${photo.img_src}" 
                                class="card-img-top position-absolute top-0 w-100 h-100 object-fit-cover" 
                                alt="Photo taken by ${photo.rover.name} on ${photo.earth_date}" 
                                loading="lazy"
                            />
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">Camera: ${photo.camera.full_name}</h5>
                            <p class="card-text">
                                Rover: ${photo.rover.name}<br/>
                                Earth Date: ${photo.earth_date}<br/>
                                Sol: ${photo.sol}
                            </p>
                        </div>
                    </div>
                </div>
            `;
                rowContainer.insertAdjacentHTML('beforeend', photoCardHTML);
            });
        });

        // Append the row container to the main results container
        resultsContainer.appendChild(rowContainer);
    }

    function displayRoverDropdown(roverNames) {
        roverSelect.innerHTML = `<option value="">All Rovers</option>`;
        roverNames.forEach(rover => {
            const option = document.createElement("option");
            option.value = rover;
            option.textContent = rover;
            roverSelect.appendChild(option);
        });
    }

    function setupRoverFilter(searchResults) {

        // Get unique rover names from the searchResults
        const roverNames = [...new Set(searchResults.flatMap(result => result.photos.map(photo => photo.rover.name)))];

        // Populate dropdown with rover names
        displayRoverDropdown(roverNames);

        // Add event listener for filtering photos by selected rover
        roverSelect.addEventListener('change', (event) => {
            const selectedRover = event.target.value;
            displayResults(searchResults, selectedRover);
        });

        roverSelect.classList.remove("d-none");
    }




    return {toggleSpinner: toggleSpinner,
            toggleSearchByDateForm: toggleSearchByDateForm,
            displayResults: displayResults ,
            setupRoverFilter : setupRoverFilter,};
})();

// Initialize the app
UI.init();
