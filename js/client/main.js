const API_KEY = "lrufIrxkoorq8sriuuo3LdPU1Cnu1fnrIpr0kRm0";
const API_KEY_PARAMETER = `api_key=${API_KEY}`
const ROVER_DATA_ENDPOINT = "https://api.nasa.gov/mars-photos/api/v1/rovers";
//=======================================================================================================================
// UI Module - Responsible for managing the DOM and events
const  UI = (function () {


    async function init() {
        try{
            await searchModule.fetchRoverData();
            // Hide the spinner and show the UI once data is fetched

            DOM.toggleSearchByDateForm(true);

            eventsBinder.bindEvents();
        }
        catch(e) {
            DOM.toggleErrorMSG(true , e.message);
        }
        finally {
            DOM.toggleSpinner(false);
        }
    }


    return {
        init: init,
    };
})();
//=======================================================================================================================
const eventsBinder = (function () {

    // Add event listener for the search button
   function bindEvents(){
       document.querySelector(".search-by-earth-date-btn")
           .addEventListener("click", handleSearch.handleSearchByEarthDate);
       document.querySelector("#resetButton").addEventListener("click", DOM.resetForm);

   }
   return {bindEvents : bindEvents};
})();
//=======================================================================================================================
const handleSearch = (function (){

    async function handleSearchByEarthDate(event){
        DOM.toggleErrorMSG(false);
        try{
            event.preventDefault();
            DOM.toggleSpinner(true);
            DOM.emptySearchResultsAndRemoveRovers();
            const [searchResults , inputDate , foundDate] =  await searchModule.searchByEarthDate();

            DOM.checkDateSimilarity(inputDate , foundDate);


            if (searchResults === null){
                DOM.toggleInvalidEarthDate(true);

            }
            //search went well
            else{
                DOM.toggleInvalidEarthDate(false);

                DOM.setupRoverFilter(searchResults);
                DOM.displayResults(searchResults);
            }
        }
        catch(error){
            DOM.toggleErrorMSG(true , error.message);
        }
        finally {
            DOM.toggleSpinner(false);
        }


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
        const response = await fetch(`${ROVER_DATA_ENDPOINT}?${API_KEY_PARAMETER}`);
        if (!response.ok) {
            throw new Error(`Couldn't connect to NASA's API. Please try again later. ${response.status}`);
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

    function searchResultsEmpty(searchResults) {
        // Check if any result has photos, return false if any result has photos
        if(searchResults){
            return searchResults.every(result => result.photos.length === 0);
        }
        return true;
    }



    async function searchByEarthDate() {
        const dateInputValue = earthDateInput.value.trim();
        console.log(dateInputValue);
        if (!validateEarthDate(dateInputValue)){
            return [null, dateInputValue, null];
        }

        let searchResults = [];
        let counter = 0;
        let direction = 1; // This will help to alternate between future and past days
            // Parse the input date to create a Date object
            let currentDate = new Date(dateInputValue);

            // Continue searching until results are found or attempts run out
            while (searchResultsEmpty(searchResults)) {

                currentDate.setDate(currentDate.getDate() + direction * counter);
                // Fetch data for the current date
                const promises = roverNames.map(async roverName => {
                    const formattedDate = currentDate.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
                    const response = await fetch(`${ROVER_DATA_ENDPOINT}/${roverName}/photos?${API_KEY_PARAMETER}&earth_date=${formattedDate}`);

                    if (!response.ok) {
                        throw new Error(`Couldn't connect to NASA's API. Please try again later. ${response.status}`);
                    }

                    return await response.json();
                });

                searchResults = await Promise.all(promises); // Wait for all fetches to complete
                console.log(searchResults);


                // Alternate between next day and previous da
                direction = direction * -1; // Alternate between adding and subtracting days
                counter++;
            }
            currentDate = currentDate.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
            return [searchResults , dateInputValue , currentDate];
    }



    return {
        fetchRoverData: fetchRoverData,
        searchByEarthDate: searchByEarthDate,

    };
})();
//=======================================================================================================================

const DOM = ( function () {
    const roverFilterContainer = document.querySelector("#roverContainer");
    const cameraFilterContainer = document.querySelector("#cameraContainer");
    const roverSelect = document.querySelector("#roverSelect");
    const spinnerElement =  document.querySelector(".spinner-border");
    const searchByEarthDateForm = document.querySelector(".search-by-date-form");
    const cameraSelect = document.querySelector("#cameraSelect");
    const invalidEarthDateMsg = document.querySelector("#invalid-earth-date");
    const resultsContainer = document.querySelector(".search-results");
    const differentDateMsg = document.querySelector("#different-date-msg");
    const dateInputElement = document.getElementById("earthDateInput");
    const modalImage = document.getElementById('modalImage');
    const ErrorMSG = document.querySelector("#searchFetchError");


    function toggleErrorMSG(show , msg =""){

        if(show){
            ErrorMSG.innerHTML =`${msg}`;
            ErrorMSG.classList.remove("d-none");
        }
        else{
            ErrorMSG.innerHTML = '';
            ErrorMSG.classList.add("d-none");
        }
    }

    function resetForm(){
        emptySearchResultsAndRemoveRovers();
    }

    function checkDateSimilarity(inputDate, foundDate){
        if(foundDate){
            if(inputDate !== foundDate){
                dateInputElement.value = foundDate;
                inputDate = inputDate.split("-").reverse().join("-");
                foundDate = foundDate.split("-").reverse().join("-");

                differentDateMsg.innerHTML =  `No photos were found for <strong>${inputDate}</strong>. Showing results for the closest available date: <strong>${foundDate}</strong>.`
                differentDateMsg.classList.remove("d-none");
            }
            else{
                differentDateMsg.classList.add("d-none");
            }
        }
    }
    function toggleCameraSelect(show){
        if (show){
            cameraFilterContainer.classList.remove("d-none");
        }
        else {
            cameraFilterContainer.classList.add("d-none");
        }
    }
    function emptySearchResultsAndRemoveRovers(){
        resultsContainer.innerHTML = "";
        toggleCameraSelect(false);
        roverFilterContainer.classList.add("d-none");
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
    function displayResults(searchResults, selectedRover = '', selectedCamera = '') {

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
                if (selectedCamera && photo.camera.name !== selectedCamera) {
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
                        <button 
                            class="btn btn-primary w-100 full-resolution-btn" data-img-src="${photo.img_src}" 
                        >
                            View Full Resolution
                        </button>
                    </div>
                </div>
            </div>
        `;
                rowContainer.insertAdjacentHTML('beforeend', photoCardHTML);
            });
        });


        // Remove the existing event listener before adding a new one
        resultsContainer.removeEventListener('click', handleFullResolutionClick);

        // Add the new event listener for the full-resolution buttons
        resultsContainer.addEventListener('click', handleFullResolutionClick);

        // Append the row container to the main results container
        resultsContainer.appendChild(rowContainer);
    }

    function handleFullResolutionClick(e) {
        if (e.target.classList.contains('full-resolution-btn')) {
            const imageSrc = e.target.getAttribute('data-img-src');
            openModal(imageSrc);
        }
    }

    // Function to open the modal and display the image
    function openModal(imageSrc) {
        modalImage.src = imageSrc; // Set the image source
        const photoModal = new bootstrap.Modal(document.getElementById('photoModal'));
        photoModal.show(); // Show the modal
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
                cameraFilterContainer.classList.add("d-none");
                return;
            }
            setUpCameraFilter(searchResults, selectedRover);
        });

        roverFilterContainer.classList.remove("d-none");

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
        cameraFilterContainer.classList.remove("d-none");

    }





    return {toggleSpinner: toggleSpinner,
            toggleSearchByDateForm: toggleSearchByDateForm,
            displayResults: displayResults ,
            setupRoverFilter : setupRoverFilter,
            toggleInvalidEarthDate : toggleInvalidEarthDate,
        emptySearchResultsAndRemoveRovers : emptySearchResultsAndRemoveRovers,
        checkDateSimilarity :checkDateSimilarity,
        resetForm :resetForm,
        toggleErrorMSG : toggleErrorMSG,
    };
})();

// Initialize the app
UI.init();
