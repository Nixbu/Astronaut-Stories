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
        DOM.emptySearchResultsAndRemoveRovers();
        const searchResults =  await searchModule.searchByEarthDate();
        DOM.toggleSpinner(false);
        if (searchResults === false){
            DOM.toggleInvalidEarthDate(true);
            return;
        }
        DOM.toggleInvalidEarthDate(false);

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
    let roverActivityRanges = {};
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

            roverData?.rovers?.forEach(rover => {
                roverActivityRanges[rover.name] = {
                    landing_date: rover.landing_date,
                    max_date: rover.max_date
                };
            });


            return roverData;
        } catch (error) {
            console.error("Error fetching rover data:", error);
        }
    }

    function validateEarthDate(earthDate) {
        const date = new Date(earthDate);  // Convert the input string to a Date object

        // Check if the earthDate is a valid date
        if (isNaN(date)) {
            return false;
        }

        // Iterate over each rover and check if the date is within its activity range
        for (let roverName in roverActivityRanges) {
            const roverRange = roverActivityRanges[roverName];
            const roverLandingDate = new Date(roverRange.landing_date);
            const roverMaxDate = new Date(roverRange.max_date);

            // Check if the earthDate is within the rover's range
            if (date >= roverLandingDate && date <= roverMaxDate) {
                return true;  // The date is valid for this rover
            }
        }
        return false;  // The date is not valid for any rover
    }


    async function searchByEarthDate() {
        const dateInputValue = earthDateInput.value.trim();
        if (!validateEarthDate(dateInputValue)){
            return false;
        }

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
    const cameraSelect = document.querySelector("#cameraSelect");
    const invalidEarthDateMsg = document.querySelector("#invalid-earth-date");
    const resultsContainer = document.querySelector(".search-results");

    function toggleCameraSelect(show){
        if (show){
            cameraSelect.classList.remove("d-none");
        }
        else {
            cameraSelect.classList.add("d-none");
        }
    }
    function emptySearchResultsAndRemoveRovers(){
        resultsContainer.innerHTML = "";
        toggleCameraSelect(false);
        roverSelect.classList.add("d-none");
    }

    function toggleInvalidEarthDate(show){
        if(show){
            invalidEarthDateMsg.classList.remove("d-none");
        }
        else{
            invalidEarthDateMsg.classList.add("d-none");
        }
    }

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
    function displayResults(searchResults, selectedRover = '' , selectedCamera = '') {

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
                if(selectedCamera && photo.camera.name !== selectedCamera) {
                    return;
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
            if(selectedRover === ""){
                cameraSelect.classList.add("d-none");
                return;
            }
            setUpCameraFilter(searchResults, selectedRover);
        });

        roverSelect.classList.remove("d-none");

    }

    function displayCameraDropdown(cameraNames) {
        cameraSelect.innerHTML = `<option value="">All Cameras</option>`;
        cameraNames.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera;
            option.textContent = camera;
            cameraSelect.appendChild(option);
        });
    }

    function setUpCameraFilter(searchResults, selectedRover) {
        // Filter the photos by the selected rover
        const filteredPhotos = searchResults.flatMap(result =>
            result.photos.filter(photo => photo.rover.name === selectedRover)
        );

        // Extract unique camera names from the filtered photos
        const cameraNames = [...new Set(filteredPhotos.map(photo => photo.camera.name))];

        displayCameraDropdown(cameraNames);


        cameraSelect.addEventListener('change', (event) => {
            const selectedCamera = event.target.value;
            displayResults(searchResults, selectedRover , selectedCamera);
        });
        cameraSelect.classList.remove("d-none");

    }





    return {toggleSpinner: toggleSpinner,
            toggleSearchByDateForm: toggleSearchByDateForm,
            displayResults: displayResults ,
            setupRoverFilter : setupRoverFilter,
            toggleInvalidEarthDate : toggleInvalidEarthDate,
        emptySearchResultsAndRemoveRovers : emptySearchResultsAndRemoveRovers,
        toggleCameraSelect :toggleCameraSelect,
    };
})();

// Initialize the app
UI.init();
