(function () {
    'use strict';

    /**
     * API Key and Endpoint for NASA's Mars Rover Photos API
     * @constant {string} API_KEY - NASA's API key for the Mars Rover Photos API.
     * @constant {string} API_KEY_PARAMETER - Encoded API key for use in query parameters.
     * @constant {string} ROVER_DATA_ENDPOINT - Endpoint for fetching data from NASA's Mars Rover Photos API.
     */
    const API_KEY = "lrufIrxkoorq8sriuuo3LdPU1Cnu1fnrIpr0kRm0";
    const API_KEY_PARAMETER = `api_key=${API_KEY}`
    const ROVER_DATA_ENDPOINT = "https://api.nasa.gov/mars-photos/api/v1/rovers";
//=======================================================================================================================
    /**
     * UI Module - Responsible for managing the DOM and events.
     * @namespace UI
     */
    const UI = (function () {
        /**
         * Initialize the UI module.
         * It listens for the DOMContentLoaded event and then fetches the rover data.
         * Upon successful fetch, it shows the UI and binds necessary events.
         * @async
         * @function init
         */
        async function init() {
            document.addEventListener('DOMContentLoaded', async function () {
                // If you're using async code, you can wait here
                try {
                    await searchModule.fetchRoverData();
                    // Hide the spinner and show the UI once data is fetched

                    DOM.toggleSearchByDateForm(true);

                    eventsBinder.bindEvents();
                } catch (e) {
                    DOM.toggleErrorMSG(true, e.message);
                } finally {
                    DOM.toggleSpinner(false);
                }


            });

        }

        return {
            init: init,
        };
    })();
//=======================================================================================================================
    /**
     * Event Binding Module - Responsible for binding events to UI elements.
     * @namespace eventsBinder
     */
    const eventsBinder = (function () {

        const resultsContainer = document.querySelector(".search-results");

        /**
         * Bind all relevant event listeners to UI elements.
         * @function bindEvents
         */
        function bindEvents() {
            document.querySelector(".search-by-earth-date-btn")
                .addEventListener("click", handleSearch.handleSearchByEarthDate);
            document.querySelector("#resetButton").addEventListener("click", DOM.resetForm);

            let navButtons = document.querySelectorAll(".nav-btn");

            navButtons.forEach(btn => {
                btn.addEventListener('click', DOM.toggleScreens);
            });

            document.querySelector("#imagesList").addEventListener("click", handlePhotoList.removeFromList);

            document.querySelector("#storyBtn").addEventListener("click", () => {
                story.createCarousel();
                DOM.toggleScreens({currentTarget: {dataset: {tab: 'storyTab'}}});
            });

            // Add the new event listener for the full-resolution buttons
            resultsContainer.addEventListener('click', DOM.handleFullResolutionClick);
            resultsContainer.addEventListener('click', handlePhotoList.saveToList);


        }

        return {bindEvents: bindEvents};
    })();
//=======================================================================================================================
    /**
     * Search Handling Module - Manages the search functionality and coordinates UI updates.
     * @namespace handleSearch
     */
    const handleSearch = (function () {
        /**
         * Handle search by Earth date, fetch photos, and update the UI.
         * @async
         * @function handleSearchByEarthDate
         * @param {Event} event - The click event from the search button.
         */
        async function handleSearchByEarthDate(event) {
            DOM.toggleErrorMSG(false);
            try {
                event.preventDefault();
                DOM.toggleSpinner(true);
                DOM.emptySearchResultsAndRemoveRovers();
                const [searchResults, inputDate, foundDate] = await searchModule.searchByEarthDate();

                DOM.checkDateSimilarity(inputDate, foundDate);


                if (searchResults === null) {
                    DOM.toggleInvalidEarthDate(true, searchModule.getDateRange());

                }
                //search went well
                else {
                    DOM.toggleInvalidEarthDate(false);

                    DOM.setupRoverFilter(searchResults);
                    DOM.displayResults(searchResults);
                }
            } catch (error) {
                DOM.toggleErrorMSG(true, error.message);
            } finally {
                DOM.toggleSpinner(false);
            }


        }

        return {handleSearchByEarthDate: handleSearchByEarthDate};
    })();
//=======================================================================================================================
    /**
     * Search Module - Handles fetching data and business logic related to search.
     * @namespace searchModule
     */
    const searchModule = (function () {
        const earthDateInput = document.querySelector("#earthDateInput");
        let roverData = null;
        let roverNames = null;
        let roverActivityRanges = {};
        let minDate = null,
            maxDate = null;

        /**
         * Fetch rover data from NASA's API and store it locally.
         * @async
         * @function fetchRoverData
         * @returns {Promise<Object>} The rover data fetched from NASA's API.
         * @throws Will throw an error if the API call fails.
         */
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

            minDate = roverData?.rovers
                ?.reduce((min, rover) => rover.landing_date < min ? rover.landing_date : min, "9999-12-31");
            maxDate = roverData?.rovers
                ?.reduce((max, rover) => rover.max_date > max ? rover.max_date : max, "0000-01-01");


            return roverData;
        }
        /**
         * Validate if the Earth date is within the activity range of any rover.
         * @function validateEarthDate
         * @param {string} earthDate - The Earth date input by the user.
         * @returns {boolean} True if the date is valid for any rover, otherwise false.
         */
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
        /**
         * Check if search results are empty.
         * @function searchResultsEmpty
         * @param {Array} searchResults - The array of search results.
         * @returns {boolean} True if all search results have no photos, otherwise false.
         */
        function searchResultsEmpty(searchResults) {
            // Check if any result has photos, return false if any result has photos
            if (searchResults) {
                return searchResults.every(result => result.photos.length === 0);
            }
            return true;
        }
        /**
         * Get the date range of all rover activity.
         * @function getDateRange
         * @returns {Object} An object with the minimum and maximum dates for rover activity.
         */
        function getDateRange() {
            return {
                "minDate": minDate,
                "maxDate": maxDate
            }
        }
        /**
         * Search photos by Earth date, adjusting date if no photos are found.
         * @async
         * @function searchByEarthDate
         * @returns {Promise<Array>} An array containing search results, input date, and found date.
         * @throws Will throw an error if the API call fails.
         */
        async function searchByEarthDate() {
            const dateInputValue = earthDateInput.value.trim();

            if (!validateEarthDate(dateInputValue)) {
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
            return [searchResults, dateInputValue, currentDate];
        }


        return {
            fetchRoverData,
            searchByEarthDate,
            getDateRange

        };
    })();

//=======================================================================================================================
    /**
     * Photo List Module - Manages the saved photos list.
     * @namespace photoListModule
     */
    const photoListModule = (function () {

        let photoList = [];

        /**
         * Adds a photo to the list if it's not already present.
         * @param {Object} photoDetails - The details of the photo to add.
         * @returns {boolean} - Returns true if the photo was added, false if it already exists.
         */
        function addToList(photoDetails) {
            let exists;

            // Use forEach to check if photoId already exists in the list
            photoList.forEach(photo => {
                if (photo.id === photoDetails.id) {
                    exists = true;
                }
            });

            // If photoId exists, return false
            if (exists) {
                return false;
            }

            // Otherwise, add photoDetails to the list and return true
            photoList.push(photoDetails);
            return true;
        }
        /**
         * Removes a photo from the list by its ID.
         * @param {string} photoId - The ID of the photo to remove.
         */
        function removePhoto(photoId) {
            photoList = photoList.filter(photo => photo.id !== photoId);
        }
        /**
         * Gets the number of photos in the list.
         * @returns {number} - The current number of photos in the list.
         */
        function listSize() {
            return photoList.length;
        }

        return {
            addToList,
            removePhoto,
            listSize,
        }
    })();

//=======================================================================================================================
    /**
     * HandlePhotoList - Handles events related to adding and removing photos from the saved list.
     */
    const handlePhotoList = (function () {
        /**
         * Saves a photo to the list when the save button is clicked.
         * @param {Event} event - The event triggered when the save button is clicked.
         */
        function saveToList(event) {
            if (event.target.classList.contains("save-to-list-btn")) {
                let photoId = event.target.dataset.photoId;
                let rover = event.target.dataset.rover;
                let date = event.target.dataset.date;
                let sol = event.target.dataset.sol;
                let imageSource = event.target.dataset.source;

                let photoDetails = {
                    id: photoId,
                    rover: rover,
                    date: date,
                    sol: sol,
                    imageSource: imageSource
                };

                if (photoListModule.addToList(photoDetails)) {
                    listDOM.showSaveSuccessMSG();
                    listDOM.addImageElement(photoDetails);
                    listDOM.toggleStoryBtn(true);
                } else {
                    listDOM.showSaveErrorMSG();
                }

            }
        }
        /**
         * Removes a photo from the list when the remove button is clicked.
         * @param {Event} event - The event triggered when the remove button is clicked.
         */
        function removeFromList(event) {
            if (event.target.classList.contains('remove-card-btn')) {
                let id = event.target.dataset.id;
                photoListModule.removePhoto(id);


                const card = event.target.closest('.card');  // Finds the nearest parent with class 'card'
                if (card) {
                    card.remove();  // Remove the card from the DOM
                }
                let size = photoListModule.listSize();
                console.log(size);
                if (photoListModule.listSize() === 0) {
                    listDOM.toggleStoryBtn(false);
                }
            }
        }

        return {saveToList, removeFromList};
    })();
//=======================================================================================================================
    /**
     * Module for handling saved photo list DOM operations
     * @namespace listDOM
     */
    const listDOM = (function () {
        const toastMessage = document.getElementById('toastMessage');
        const toastElement = document.getElementById('saveToast');
        const storyBtn = document.getElementById('storyBtn');
        const emptyListMsg = document.getElementById('emptyListMsg');


        /**
         * Toggles visibility of the story button and empty list message
         * @param {boolean} show - Whether to show the story button
         */
        function toggleStoryBtn(show) {
            if (show) {
                storyBtn.classList.remove('d-none');
                emptyListMsg.classList.add('d-none');
            } else {
                emptyListMsg.classList.remove('d-none');
                storyBtn.classList.add('d-none');
            }
        }
        /**
         * Shows success toast message for photo save operation
         */
        function showSaveSuccessMSG() {
            toastMessage.textContent = 'Photo saved successfully!';
            toastElement.classList.add('bg-success');
            toastElement.classList.remove('bg-danger');
            showToast();
        }
        /**
         * Shows error toast message for duplicate photo save attempt
         */
        function showSaveErrorMSG() {
            toastMessage.textContent = 'Error: Photo already saved.';
            toastElement.classList.remove('bg-success');
            toastElement.classList.add('bg-danger');
            showToast();
        }
        /**
         * Displays the toast notification
         * @private
         */
        function showToast() {

            const toast = new bootstrap.Toast(toastElement);
            toast.show();
        }
        /**
         * Adds a photo card element to the saved images list
         * @param {Object} photoDetails - Details of the photo to add
         * @param {string} photoDetails.imageSource - URL of the photo
         * @param {string} photoDetails.id - Unique identifier of the photo
         * @param {string} photoDetails.rover - Name of the rover that took the photo
         * @param {string} photoDetails.date - Earth date when photo was taken
         * @param {number} photoDetails.sol - Mars sol when photo was taken
         */
        function addImageElement(photoDetails) {
            const taskListContainer = document.getElementById('imagesList');

            // Generate HTML for each photo card
            taskListContainer.innerHTML += `
           <div class="card mb-3 mx-auto" style="max-width: 30rem;">
    <img src="${photoDetails.imageSource}" class="card-img-top img-thumbnail" alt="Photo Thumbnail" style="max-height: 300px; object-fit: cover;">
    <div class="card-body text-center">
        <h5 class="card-title fs-6">Photo ID: ${photoDetails.id}</h5>
        <p class="card-text small">
            Rover: ${photoDetails.rover}<br>
            Date: ${photoDetails.date}<br>
            Sol: ${photoDetails.sol}
        </p>
        <input type="text" class="form-control form-control-sm mb-2" placeholder="Add a description">
        <button class="btn btn-danger btn-sm remove-card-btn" data-id="${photoDetails.id}">Remove</button>
    </div>
</div>`;


        }


        return {
            showSaveSuccessMSG,
            showSaveErrorMSG,
            addImageElement,
            toggleStoryBtn
        };

    })();
//=======================================================================================================================
    /**
     * Module for handling main application DOM operations
     * @namespace DOM
     */
    const DOM = (function () {
        const roverFilterContainer = document.querySelector("#roverContainer");
        const cameraFilterContainer = document.querySelector("#cameraContainer");
        const roverSelect = document.querySelector("#roverSelect");
        const spinnerElement = document.querySelector(".spinner-border");
        const searchByEarthDateForm = document.querySelector(".search-by-date-form");
        const cameraSelect = document.querySelector("#cameraSelect");
        const invalidEarthDateMsg = document.querySelector("#invalid-earth-date");
        const resultsContainer = document.querySelector(".search-results");
        const differentDateMsg = document.querySelector("#different-date-msg");
        const dateInputElement = document.getElementById("earthDateInput");
        const modalImage = document.getElementById('modalImage');
        const ErrorMSG = document.querySelector("#searchFetchError");
        const tabs = {
            "searchTab": document.getElementById('searchTab'),
            "photoListTab": document.getElementById('photoListTab'),
            "storyTab": document.getElementById('storyTab')
        }
        /**
         * Tab elements mapping
         * @type {Object.<string, HTMLElement>}
         */
        function toggleScreens(event) {
            // Get the tab to show from the event

            let barToShow = event.currentTarget.dataset.tab;

            console.log()// Assuming you're using data-tab attribute on buttons or links

            // Loop through the tabs object
            for (let tab in tabs) {
                // Get the element for each tab (assuming IDs match the keys in the tabs object)
                let tabElement = tabs[tab];

                if (tab === barToShow) {
                    // Show the tab
                    tabElement.classList.remove('d-none');  // Assuming 'd-none' class is used to hide the tab
                } else {
                    // Hide the other tabs
                    tabElement.classList.add('d-none');
                }
            }
        }

        /**
         * Toggles visibility between different screens/tabs
         * @param {Event} event - Click event object
         */
        function toggleErrorMSG(show, msg = "") {

            if (show) {
                ErrorMSG.innerHTML = `${msg}`;
                ErrorMSG.classList.remove("d-none");
            } else {
                ErrorMSG.innerHTML = '';
                ErrorMSG.classList.add("d-none");
            }
        }
        /**
         * Resets the search form and clears results
         */
        function resetForm() {
            emptySearchResultsAndRemoveRovers();
        }
        /**
         * Checks if input date matches found date and displays message if different
         * @param {string} inputDate - Date entered by user
         * @param {string} foundDate - Date returned from API
         */
        function checkDateSimilarity(inputDate, foundDate) {
            if (foundDate) {
                if (inputDate !== foundDate) {
                    dateInputElement.value = foundDate;
                    inputDate = inputDate.split("-").reverse().join("-");
                    foundDate = foundDate.split("-").reverse().join("-");

                    differentDateMsg.innerHTML = `No photos were found for <strong>${inputDate}</strong>. Showing results for the closest available date: <strong>${foundDate}</strong>.`
                    differentDateMsg.classList.remove("d-none");
                } else {
                    differentDateMsg.classList.add("d-none");
                }
            }
        }
        /**
         * Toggles visibility of camera selection dropdown
         * @param {boolean} show - Whether to show the camera select
         */
        function toggleCameraSelect(show) {
            if (show) {
                cameraFilterContainer.classList.remove("d-none");
            } else {
                cameraFilterContainer.classList.add("d-none");
            }
        }
        /**
         * Clears search results and hides rover filter
         */
        function emptySearchResultsAndRemoveRovers() {
            resultsContainer.innerHTML = "";
            toggleCameraSelect(false);
            roverFilterContainer.classList.add("d-none");
        }
        /**
         * Toggles visibility of invalid date message
         * @param {boolean} show - Whether to show the message
         * @param {Object} [dateRange={}] - Valid date range
         * @param {string} dateRange.minDate - Earliest valid date
         * @param {string} dateRange.maxDate - Latest valid date
         */
        function toggleInvalidEarthDate(show, dateRange = {}) {
            if (show) {
                invalidEarthDateMsg.innerHTML = `No rover activity at this date. Images exists between ${dateRange.minDate} and ${dateRange.maxDate}.`;
                invalidEarthDateMsg.classList.remove("d-none");
            } else {
                invalidEarthDateMsg.classList.add("d-none");
            }
        }
        /**
         * Toggles visibility of loading spinner
         * @param {boolean} show - Whether to show the spinner
         */
        function toggleSpinner(show) {
            if (!show) {
                spinnerElement.classList.add("d-none");
            } else {
                spinnerElement.classList.remove("d-none");
            }
        }
        /**
         * Toggles visibility of earth date search form
         * @param {boolean} show - Whether to show the form
         */
        function toggleSearchByDateForm(show) {
            if (!show) {
                searchByEarthDateForm.classList.add("d-none");
            } else {
                searchByEarthDateForm.classList.remove("d-none");
            }
        }
        /**
         * Displays search results in a grid layout
         * @param {Array} searchResults - Array of photo search results
         * @param {string} [selectedRover=''] - Selected rover filter
         * @param {string} [selectedCamera=''] - Selected camera filter
         */
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
            <button 
                class="btn btn-warning w-100 mt-2 save-to-list-btn" 
                data-photo-id="${photo.id}" data-source="${photo.img_src}" data-rover="${photo.rover.name}" data-date="${photo.earth_date}" data-sol="${photo.sol}"
            >
                Save to List
            </button>
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
        /**
         * Handles click events for full resolution photo viewing
         * @param {Event} e - Click event object
         */
        function handleFullResolutionClick(e) {
            if (e.target.classList.contains('full-resolution-btn')) {
                const imageSrc = e.target.getAttribute('data-img-src');
                openModal(imageSrc);
            }
        }
        /**
         * Opens modal with full resolution photo
         * @param {string} imageSrc - URL of full resolution image
         * @private
         */
        function openModal(imageSrc) {
            modalImage.src = imageSrc; // Set the image source
            const photoModal = new bootstrap.Modal(document.getElementById('photoModal'));
            photoModal.show(); // Show the modal
        }

        /**
         * Populates the rover dropdown menu with the given rover names.
         *
         * @param {string[]} roverNames - An array of rover names to display in the dropdown.
         */
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
                if (selectedRover === "") {
                    cameraFilterContainer.classList.add("d-none");
                    return;
                }
                setUpCameraFilter(searchResults, selectedRover);
            });

            roverFilterContainer.classList.remove("d-none");

        }
        /**
         * Sets up the rover filter dropdown based on search results and filters photos by the selected rover.
         *
         * @param {Object[]} searchResults - An array of search result objects containing photos and rover information.
         */
        function displayCameraDropdown(cameraNames) {
            cameraSelect.innerHTML = `<option value="">All Cameras</option>`;
            cameraNames.forEach(camera => {
                const option = document.createElement("option");
                option.value = camera;
                option.textContent = camera;
                cameraSelect.appendChild(option);
            });
        }
        /**
         * Sets up the camera filter dropdown based on the selected rover and search results.
         *
         * @param {Object[]} searchResults - An array of search result objects containing photos and rover information.
         * @param {string} selectedRover - The name of the selected rover for filtering the photos.
         */
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
                displayResults(searchResults, selectedRover, selectedCamera);
            });
            cameraFilterContainer.classList.remove("d-none");

        }


        return {
            toggleSpinner,
            toggleSearchByDateForm,
            displayResults,
            setupRoverFilter,
            toggleInvalidEarthDate,
            emptySearchResultsAndRemoveRovers,
            checkDateSimilarity,
            resetForm,
            toggleErrorMSG,
            toggleScreens,
            handleFullResolutionClick

        };
    })();

    /**
     * Story module for creating and managing a photo carousel with Mars rover images.
     *
     * @module story
     */
    const story = (function () {
        const storyContainer = document.querySelector("#storyContainer");
        const emptyStoryMsg = document.querySelector("#noStoryMsg");
        /**
         * Creates a carousel of Mars rover photos from the search results.
         * It also adds a progress bar, thumbnail navigation, and event listeners for
         * carousel controls and navigation buttons.
         */
        function createCarousel() {
            emptyStoryMsg.classList.add("d-none");
            const cards = document.querySelectorAll('#imagesList .card');

            let carouselHTML = `
            <div class="container mt-4">
                <div class="row justify-content-center">
                    <div class="col-12 col-lg-10">

                        <div class="progress mb-4">
                            <div class="progress-bar bg-primary" role="progressbar"  aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        

                        <div class="card border-0 shadow-lg">
                            <div id="storyCarousel" class="carousel slide">
                                <div class="carousel-inner">`;

            cards.forEach((card, index) => {
                const imgSrc = card.querySelector('img').src;
                const description = card.querySelector('input[type="text"]').value;
                const roverInfo = card.querySelector('.card-text').innerHTML;

                carouselHTML += `
                <div class="carousel-item ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <div class="ratio ratio-16x9">
                        <img src="${imgSrc}" class="d-block w-100 object-fit-cover" alt="Mars Photo">
                    </div>
                    <div class="card-body bg-dark bg-opacity-75 text-white position-absolute bottom-0 start-0 end-0 m-3 rounded">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="small mb-2">${roverInfo}</div>
                                <p class="card-text fst-italic">"${description}"</p>
                            </div>
                            <div class="col-md-4 text-md-end">
                                <span class="badge bg-primary fs-6">Photo ${index + 1} of ${cards.length}</span>
                            </div>
                        </div>
                    </div>
                </div>`;
            });

            carouselHTML += `
                                </div>
                                <button class="carousel-control-prev" type="button" data-bs-target="#storyCarousel" data-bs-slide="prev">
                                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                    <span class="visually-hidden">Previous</span>
                                </button>
                                <button class="carousel-control-next" type="button" data-bs-target="#storyCarousel" data-bs-slide="next">
                                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                                    <span class="visually-hidden">Next</span>
                                </button>
                            </div>
                        </div>

                        <div class="row g-2 mt-3 mb-4">`;

            cards.forEach((card, index) => {
                const imgSrc = card.querySelector('img').src;
                carouselHTML += `
                <div class="col-2">
                    <img src="${imgSrc}" 
                         class="img-thumbnail cursor-pointer thumbnail-nav" 
                         data-bs-target="#storyCarousel" 
                         data-bs-slide-to="${index}"
                         style="cursor: pointer;"
                         alt="Thumbnail ${index + 1}">
                </div>`;
            });

            carouselHTML += `
                        </div>

                        <!-- Navigation buttons -->
                        <div class="d-flex justify-content-center gap-3 mt-4">
                            <button class="btn btn-primary btn-lg nav-btn mb-3" data-tab="searchTab">
                                <i class="bi bi-search me-2"></i>Back to Search
                            </button>
                            <button class="btn btn-outline-primary btn-lg nav-btn mb-3" data-tab="photoListTab">
                                <i class="bi bi-images me-2"></i>Back to Photo List
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;

            storyContainer.innerHTML = carouselHTML;

            // Initialize the carousel
            const carousel = new bootstrap.Carousel(document.querySelector('#storyCarousel'), {
                interval: false
            });

            // Update progress bar when carousel slides
            const progressBar = document.querySelector('.progress-bar');
            const totalSlides = cards.length;

            document.querySelector('#storyCarousel').addEventListener('slide.bs.carousel', (event) => {
                const nextSlideIndex = event.to;
                const progress = ((nextSlideIndex + 1) / totalSlides) * 100;
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', progress);
            });

            // Add event listeners to thumbnails
            document.querySelectorAll('.thumbnail-nav').forEach(thumbnail => {
                thumbnail.addEventListener('click', () => {
                    const slideIndex = parseInt(thumbnail.getAttribute('data-bs-slide-to'));
                    carousel.to(slideIndex);
                });
            });

            // Add event listeners to the navigation buttons
            const navButtons = storyContainer.querySelectorAll('.nav-btn');
            navButtons.forEach(btn => {
                btn.addEventListener('click', DOM.toggleScreens);
            });
        }

        return {
            createCarousel: createCarousel
        };
    })();


// Initialize the app
    UI.init();

})();