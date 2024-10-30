let cachedUsdRate = null;
        let cachedWeeklyData = null;
        let cacheUsdRateTimestamp = null;
        let cacheWeeklyTimestamp = null;

        async function fetchBitcoinPrices() {
            try {
                // Fetch current Bitcoin price
                const currentPriceResponse = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
                const currentPriceData = await currentPriceResponse.json();
                const currentPrice = Math.round(parseFloat(currentPriceData.price));

                // Get weekly open price from cached data
                const weeklyData = await fetchWeeklyCandlestickData();
                const weeklyOpenPrice = weeklyData ? weeklyData.openPrice : null;

                const formattedUsdPrice = formatPrice(currentPrice);
                document.getElementById('usd-price-container').innerHTML = `<h1>$${formattedUsdPrice}</h1>`;

                // Fetching VND price using an alternative API
                const exchangeRates = await fetchUsdExchangeRates();
                const vndRate = exchangeRates.VND; // Assuming this returns the rate for VND
                const vndPrice = Math.round(currentPrice * vndRate); // Calculate VND price

                // Format the price with comma as thousand separator and comma as decimal separator
                const formattedVndPrice = formatPrice(vndPrice);

                document.getElementById('vnd-price-container').innerHTML = `<h1>₫${formattedVndPrice}</h1>`;

                // Check if 'currency' parameter exists in the URL
                const urlParams = new URLSearchParams(window.location.search);
                const currencyParam = urlParams.get('currency');

                if (currencyParam === 'CHF') {
                    const chfRate = exchangeRates.CHF; // Assuming this returns the rate for CHF
                    const chfPrice = Math.round(currentPrice * chfRate); // Calculate CHF price

                    // Format the price with comma as thousand separator and comma as decimal separator
                    const formattedChfPrice = formatPrice(chfPrice);

                    document.getElementById('another-price-container').style.display = 'block'; // Show CHF container
                    document.getElementById('another-price-container').innerHTML = `<h1>CHF${formattedChfPrice}</h1>`;
                }
                
                if (weeklyData != null)
                {
                    if (currentPrice >= weeklyOpenPrice) {
                        document.getElementById('usd-price-container').classList.add('green');
                        document.getElementById('vnd-price-container').classList.add('green');
                        document.getElementById('another-price-container').classList.add('green');
                    } else {
                        document.getElementById('usd-price-container').classList.add('red');
                        document.getElementById('vnd-price-container').classList.add('red');
                        document.getElementById('another-price-container').classList.add('red');

                        document.getElementById('usd-price-container').classList.remove('green');
                        document.getElementById('vnd-price-container').classList.remove('green');
                        document.getElementById('another-price-container').classList.remove('green');
                    }
                }
            } catch (error) {
                console.error('Error fetching the Bitcoin prices:', error);
                document.getElementById('usd-price-container').innerHTML = `<h1>Error loading price</h1>`;
                document.getElementById('vnd-price-container').innerHTML = `<h1>Error loading price</h1>`;
                document.getElementById('another-price-container').innerHTML = `<h1>Error loading price</h1>`;
            }
        }

        function formatPrice(amount) {
            // Convert to string and split into whole and decimal parts
            let [whole, decimal] = amount.toString().split('.');
            
            // Format whole part with comma as thousand separator
            whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

            // Return formatted string with dot as decimal separator if there's a decimal part
            return decimal ? `${whole}.${decimal}` : whole;
        }

        async function fetchUsdExchangeRates() {
            const cacheDuration = 86400000; // 24 hours in milliseconds

            // Check if we have a cached value and if it's still valid
            if (cachedUsdRate && cacheUsdRateTimestamp && (Date.now() - cacheUsdRateTimestamp < cacheDuration)) {
                //console.log(`Using cached USD rate: ${cachedUsdRate}`);
                return cachedUsdRate;
            }

            try {
                // Fetch the current USD exchange rate from Binance
                const response = await fetch('https://open.er-api.com/v6/latest/USD');
                const exchangeData = await response.json();
                cachedUsdRates = { VND: exchangeData.rates.VND, CHF: exchangeData.rates.CHF}; // Store the fetched rates
                cacheUsdRateTimestamp = Date.now(); // Update the timestamp

                //console.log('Fetched exchange rates');
                return cachedUsdRates;
            } catch (error) {
                console.error('Error fetching USD exchange rate:', error);
                return null; // Return null or handle error as needed
            }
        }

        async function fetchWeeklyCandlestickData() {
            const cacheDuration = 86400000; // 24 hours in milliseconds

            // Check if we have cached data and if it's still valid
            if (cachedWeeklyData && cacheWeeklyTimestamp && (Date.now() - cacheWeeklyTimestamp < cacheDuration)) {
                const now = new Date();
                const lastCachedDate = new Date(cacheWeeklyTimestamp);
                
                // Check if the cached data is from the current week
                if (now.getUTCFullYear() === lastCachedDate.getUTCFullYear() && 
                    now.getUTCWeek() === lastCachedDate.getUTCWeek()) {
                    //console.log('Using cached weekly candlestick data:', cachedWeeklyData);
                    return cachedWeeklyData;
                }
            }

            try {
                // Fetch weekly candlestick data from Binance
                const response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1w&limit=1');
                const data = await response.json();
                const weeklyOpenPrice = parseFloat(data[0][1]); // Open price is at index 1

                // Cache the fetched data and timestamp
                cachedWeeklyData = { openPrice: weeklyOpenPrice };
                cacheWeeklyTimestamp = Date.now(); // Update the timestamp

                //console.log('Fetched new weekly candlestick data:', cachedWeeklyData);
                return cachedWeeklyData;
            } catch (error) {
                console.error('Error fetching weekly candlestick data:', error);
                return null; // Return null or handle error as needed
            }
        }

        Date.prototype.getUTCWeek = function() {
            const date = new Date(Date.UTC(this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate()));
            date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); // Thursday of this week
            return Math.ceil((((date - new Date(Date.UTC(date.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
        };

        setInterval(fetchBitcoinPrices, 10000);
        fetchBitcoinPrices(); // Initial fetch