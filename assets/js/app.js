"use strict";

(() => {

    const getData = url => fetch(url).then(response => response.json())

    const fetchRetry = async (url) => {
        let isSuccess = false
        do {
            try {
                const data = await getData(url)
                isSuccess = true
                return data
            } catch (e) {
                setTimeout(() => {
                    fetchRetry(url)
                }, 5000)
            }
        } while (!isSuccess)
    }

    const getAllCoins = async () => getData('https://api.coingecko.com/api/v3/coins/list')
    // const getAllCoins = async () => getData('assets/json/coins.json')
    const getSingleCoin = async (coin) => fetchRetry(`https://api.coingecko.com/api/v3/coins/${coin}`)
    const getGraphData = async (coins) => getData(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${coins.join()}&tsyms=USD`)

    //set saving database on local storage, if there isn`t
    if (!localStorage.getItem(`coinsCache`)) localStorage.setItem(`coinsCache`, JSON.stringify([]))
    if (!localStorage.getItem(`5coinsInStorage`)) localStorage.setItem(`5coinsInStorage`, JSON.stringify([]))


    //the coins page
    document.getElementById("coins-click-tab").addEventListener(`click`, async () => {
        //creates the basic dom
        const loadingDiv = document.getElementById("loadingDiv")
        loadingDiv.classList.add(`visible`)
        const AllTheData = await getAllCoins()
        loadingDiv.classList.remove(`visible`)

        const first100 = AllTheData.slice(0, 100)
        const HTML = first100.map(coin =>
            `
                <div class="card" style="width: 18rem;">
                   <div class="card-body">
                        <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" role="switch" id="switch${coin.id}" style= "position: absolute; right: 10px; font-size: xxx-large;">
                        </div>
                        <h5 class="card-title">${coin.name}</h5>
                        <p class="card-text" >${coin.id}</p>
                        <button type="button" class="btn btn-lg btn-primary" data-bs-toggle="popover" id="${coin.id}" data-bs-content=""> More Info </button>
                    </div>
                </div>
            `)
            .reduce((cum, cur) => cum + cur, ``)
        document.getElementById("coinsTabPresentation").innerHTML = HTML

        function allTheFunctionsForCoinPage() {
            //make popover for all the buttons
            const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
            [...popoverTriggerList].map(popoverTrigger => new bootstrap.Popover(popoverTrigger))

            //load 5 coins from memory
            const loadMemory = JSON.parse(localStorage.getItem(`5coinsInStorage`))
            loadMemory.forEach(coin => { if (document.getElementById(coin)) document.getElementById(coin).checked = true })

            //the popover button
            const buttons = document.querySelectorAll("div > button")
            buttons.forEach(function (button) {
                button.addEventListener('click', async function () {

                    //save the data to cache key + storage
                    const coinsCache = JSON.parse(localStorage.getItem(`coinsCache`))
                    const loadingDiv = document.getElementById("loadingDiv")
                    const index = coinsCache.findIndex(coin => coin.id === this.id)
                    let coinData = ``
                    if (index !== -1) coinData = coinsCache[index]
                    else {
                        loadingDiv.classList.add(`visible`)
                        coinData = await getSingleCoin(this.id)
                        loadingDiv.classList.remove(`visible`)
                    }

                    if (!coinsCache.some(coin => coin.id === coinData.id)) coinsCache.push(coinData)
                    localStorage.setItem(`coinsCache`, JSON.stringify(coinsCache))

                    //after 2 min, deletes from the cache (so in the next call, get the most updated data)
                    setTimeout(() => {
                        const coinsCache = JSON.parse(localStorage.getItem(`coinsCache`))
                        const index = coinsCache.findIndex(coin => coin.id = this.id)
                        coinsCache.splice(index, 1)
                        localStorage.setItem(`coinsCache`, JSON.stringify(coinsCache))
                    }, 120000)

                    //creates the inner html of the popover
                    button.setAttribute('data-bs-content', `
                    <img src="${coinData.image.thumb}" />
                    <p>${coinData.name}</p>
                    <p>usd: ${coinData.market_data.current_price.usd}$</p>
                    <p>eur: ${coinData.market_data.current_price.eur}€</p>
                    <p>ils: ${coinData.market_data.current_price.ils}₪</p>
                `)
                    // show the popover if there isn`t and hide if there is
                    if (!button._popover) {
                        button._popover = new bootstrap.Popover(button, {
                            trigger: 'manual',
                            html: true
                        })
                        // Show the updated popover
                        button._popover.show()
                    }
                    else button._popover.hide()
                })
            })

            //the saving of the 5 coins
            const save5coins = document.querySelectorAll("div > input")
            save5coins.forEach(function (input) {
                input.addEventListener(`change`, function () { //invoke on every change of checkbox
                    const fiveCoinsInStorage = JSON.parse(localStorage.getItem(`5coinsInStorage`))
                    if (input.checked) { //if the change was to ON
                        if (fiveCoinsInStorage.length === 5) { //if we already have 5 coins saved
                            //take the modal data, replacing with the current id`s of coins (without the start- the word `switch`)
                            const myModal = new bootstrap.Modal(document.getElementById('5coinsModal'))
                            document.getElementById("choice1").innerHTML = fiveCoinsInStorage[0].slice(6)
                            document.getElementById("choice2").innerHTML = fiveCoinsInStorage[1].slice(6)
                            document.getElementById("choice3").innerHTML = fiveCoinsInStorage[2].slice(6)
                            document.getElementById("choice4").innerHTML = fiveCoinsInStorage[3].slice(6)
                            document.getElementById("choice5").innerHTML = fiveCoinsInStorage[4].slice(6)

                            //add an event listener for the erasing options
                            const fiveChoices = document.querySelectorAll("#choice1, #choice2, #choice3, #choice4, #choice5")
                            fiveChoices.forEach(function (choice) {
                                choice.addEventListener(`click`, function () {
                                    const indexToRemove = fiveCoinsInStorage.findIndex(coin => coin === `switch${choice.innerHTML}`)
                                    fiveCoinsInStorage.splice(indexToRemove, 1) //remove to chosen coin to remove
                                    fiveCoinsInStorage.push(input.id) //add the new input to the array
                                    localStorage.setItem(`5coinsInStorage`, JSON.stringify(fiveCoinsInStorage)) //save
                                    document.getElementById(`switch${choice.innerHTML}`).checked = false //update the DOM
                                    myModal.hide() //hide again the modal
                                })

                                const choicesClosed = document.getElementById("choicesClosed") //if the user chose to close the replacing modal
                                choicesClosed.addEventListener(`click`, () => {
                                    input.checked = false //making the input false again
                                })
                            })
                            //finally, show the modal, once all the settings are finished
                            myModal.show()
                        }
                        else fiveCoinsInStorage.push(input.id) //if there isn`t 5 coins in storage
                    } else { //in case the change in the status of the button was to delete coin from selection
                        const indexToRemove = fiveCoinsInStorage.findIndex(coin => coin.id === input.id)
                        fiveCoinsInStorage.splice(indexToRemove, 1)
                    }
                    localStorage.setItem(`5coinsInStorage`, JSON.stringify(fiveCoinsInStorage)) //save
                })
            })
        }
        allTheFunctionsForCoinPage()

        //the search option
        const search = document.getElementById("searchButton")
        search.addEventListener(`click`, async function () {
            const searchInput = document.getElementById("searchInput").value

            const coinsCache = JSON.parse(localStorage.getItem(`coinsCache`))
            const index = coinsCache.findIndex(coin => coin.id === searchInput)
            let data = ``
            if (index !== -1) data = coinsCache[index]
            else {
                const loadingDiv = document.getElementById("loadingDiv")
                loadingDiv.classList.add(`visible`)
                data = await getSingleCoin(searchInput)
                loadingDiv.classList.remove(`visible`)
            }
            if (data.id !== undefined) {
                document.getElementById("coinsTabPresentation").innerHTML =
                    `
                    <div class="card" style="width: 18rem;">
                       <div class="card-body">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" role="switch" id="switch${data.id}" style= "position: absolute; right: 10px; font-size: xxx-large;">
                            </div>
                            <h5 class="card-title">${data.name}</h5>
                            <p class="card-text" >${data.id}</p>
                            <button type="button" class="btn btn-lg btn-primary" data-bs-toggle="popover" id="${data.id}" data-bs-content=""> More Info </button>
                        </div>
                    </div>
            `
                allTheFunctionsForCoinPage()
            }
            else alert(`could not find a coin by id: ${searchInput}`)
        })
        document.getElementById("reports-click-tab").addEventListener(`click`, () => {
            const buttons = document.querySelectorAll("div > button")
            buttons.forEach(function (button) {
                bootstrap.Popover.getInstance(button)?.dispose()  // Dispose of the current popover instance, in case there is such
            })
        })
        document.getElementById("about-click-tab").addEventListener(`click`, () => {
            const buttons = document.querySelectorAll("div > button")
            buttons.forEach(function (button) {
                bootstrap.Popover.getInstance(button)?.dispose()  // Dispose of the current popover instance, in case there is such
            })
        })
    })



    document.getElementById("reports-click-tab").addEventListener(`click`, async () => {
        document.getElementById("reports-tab").style.display = `block`

        const graphDataFromStorage = JSON.parse(localStorage.getItem('5coinsInStorage'))
        const graphDataFromStorageMapped = graphDataFromStorage.map(coin => coin.substring(6))
        const loadingDiv = document.getElementById("loadingDiv")
        loadingDiv.classList.add(`visible`)
        const graphDataFromServer = await getGraphData(graphDataFromStorageMapped)
        loadingDiv.classList.remove(`visible`)

        const graphDataNames = Object.keys(graphDataFromServer)

        let graph = []
        let xValue = ``

        //set a new graph for i coins in cache
        for (let i = 0; i < graphDataNames.length; i++) {
            const data = {
                type: 'scatter',
                x: [],
                y: [],
                mode: 'lines',
                name: graphDataNames[i],
                line: { width: 3 }
            }
            graph.push(data)
        }

        const layout = {
            title: `${graphDataNames} to USD`
        }

        Plotly.newPlot('graphDiv', graph, layout)

        const intervalId = setInterval(async () => {
            const date = new Date()
            let hours = date.getHours();  // Get the hour (0-23)
            let minutes = date.getMinutes();  // Get the minutes (0-59)
            let seconds = date.getSeconds();  // Get the seconds (0-59)
            const xValue = `${hours}:${minutes}:${seconds}`
            const graphDataFromServer = await getGraphData(graphDataFromStorageMapped)
            const graphDataValues = Object.keys(graphDataFromServer).map(key => `${graphDataFromServer[key].USD}`)
            for (let i = 0; i < graphDataNames.length; i++) {
                graph[i].x.push(xValue)
                graph[i].y.push(graphDataValues[i])
            }
            Plotly.newPlot('graphDiv', graph, layout)
        }, 2000)

        // Add event listener to handle exit from reports tab
        document.getElementById("coins-click-tab").addEventListener("click", () => clearInterval(intervalId))  // Stop the interval by go to coin page
        document.getElementById("about-click-tab").addEventListener("click", () => clearInterval(intervalId))  // Stop the interval by go to about page
    })



    document.getElementById("about-click-tab").addEventListener(`click`, () => {
        document.getElementById("reports-tab").style.display = `none`
        document.getElementById("about-tab").style.display = `block`
        document.getElementById("aboutPage").innerHTML = `Hello, my name is Yuval Rayer, and this is my website about currency rates of different coins. <br>
         please note that i took the coins from 2 different origins, according due to the assignment definitions<br>
         one for the names, and one for the real time values <br>
         and that is why sometimes you will select a coin to track, but it will not be shown at the report graph
         
         hope you enjoy my website :)`
    })

})()