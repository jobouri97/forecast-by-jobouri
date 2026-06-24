import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

app.get("/", (req, res) => {
    res.render("index");
});

function getWeatherIcon(code) {
    if (code === 0) return "☀️";
    if ([1, 2, 3].includes(code)) return "⛅";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "❓";
}

function formatDate(dateString) {
    const date = new Date(dateString);

    const weekday = date.toLocaleDateString("en-US", {
        weekday: "short",
    });

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();

    return `${weekday}. ${day}-${month}-${year}`;
}

async function getCountryName(lat, lon) {
    const response = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
            params: {
                lat,
                lon,
                format: "json"
            },
            headers: {
                "User-Agent": "WeatherApp/1.0",
                "Accept-Language": "en"

            }
        }
    );

    const address = response.data.address || {};

    console.log(address);

    return {
        country: address.country || "Unknown Country",
        city:
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.suburb ||
            address.neighbourhood ||
            address.state_district ||
            address.state ||
            "Unknown City",
    };
}

app.post("/weather", async (req, res) => {
    try {
        const lat = req.body.lat;
        const lon = req.body.lon;

        const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
            params: {
                latitude: lat,
                longitude: lon,
                current: "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code",
                daily: "weather_code,temperature_2m_max,temperature_2m_min",
                timezone: "auto",
            },
        });

        const data = response.data;

        const forecast = data.daily.time.slice(1, 5).map((date, index) => {
            return {
                date: formatDate(date),
                max: data.daily.temperature_2m_max[index + 1],
                min: data.daily.temperature_2m_min[index + 1],
                weatherCode: data.daily.weather_code[index + 1],
                icon: getWeatherIcon(data.daily.weather_code[index + 1]),
            };
        });

        const current = {
            ...data.current,
            icon: getWeatherIcon(data.current.weather_code),
        };

        const location = await getCountryName(lat, lon);
        console.log(location);

        res.render("wheather.ejs", {
            current: current,
            forecast: forecast,
            countryName: location.country,
            cityName: location.city
        });
    } catch (error) {
        console.log(error.message);

        res.render("wheather.ejs", {
            error: "Unable to fetch weather data.",
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});