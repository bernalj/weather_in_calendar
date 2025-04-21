Click [here](https://weather-in-calendar.web.app/) to go to the App

# Weather in Calendar

Based on the amazing (and now defunct 🪦) https://weather-in-calendar.com/ by [Andreas Vejnø Andersen](https://www.vejnoe.dk/?utm_source=weather.vejnoe.dk), which I found out wasn't working anymore on April 19th 2025, so I took it upon myself to create my own version, and learn how to use Firebase in the process.

This project allows users to subscribe to a weather calendar feed that displays a 14-day forecast with weather conditions and temperature information as calendar events.

## Features

- 14-day weather forecast displayed directly in your calendar
- Weather conditions represented with emojis (☀️ ⛅ ☁️ 🌧️)
- Temperature display in either Celsius or Fahrenheit
- Option to show daily average temperature or min/max temperature range
- Multi-language support (English, Spanish, Catalan, French, German, Italian, Portuguese)
- Works with all calendar applications that support .ics feeds (Google Calendar, Apple Calendar, Outlook, etc.)
- Responsive design for desktop and mobile devices

## How It Works

1. Users enter their city and select their preferences (temperature unit and display format)
2. The application generates a webcal:// URL that can be subscribed to in calendar applications
3. Firebase Cloud Functions fetch weather data from the Visual Crossing Weather API
4. Weather data is converted to iCalendar format with emojis representing weather conditions
5. Calendar applications display the weather forecast as all-day events

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Firebase Cloud Functions (Node.js)
- **Weather Data**: Visual Crossing Weather API
- **Calendar Format**: iCalendar (using ical-generator library)
- **Hosting**: Firebase Hosting

## Setup

### Prerequisites

- Node.js (version 22 or later)
- Firebase CLI
- Visual Crossing API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/weather-in-calendar.git
   cd weather-in-calendar
   ```

2. Install dependencies:
   ```
   cd functions
   npm install
   ```

3. Create a `.env` file in the `functions` directory with your Visual Crossing API key:
   ```
   VISUALCROSSING_KEY=YOUR_API_KEY
   ```
   
   > **Important**: You must obtain an API key from [Visual Crossing](https://www.visualcrossing.com/) and add it to the `.env` file for the application to work properly.

4. Deploy to Firebase:
   ```
   firebase deploy
   ```

## Local Development

1. Start the Firebase emulators:
   ```
   cd functions
   npm run serve
   ```

2. The application will be available at `http://localhost:5000`

## API Endpoints

### GET /weatherCal

Returns an iCalendar (.ics) file with weather forecast events.

Query parameters:
- `city`: The city to get weather for (default: Barcelona)
- `units`: Temperature units, either 'C' for Celsius or 'F' for Fahrenheit (default: C)
- `temperature`: Temperature display format, either 'daily' for average or 'low-high' for min/max range (default: daily)

### GET /getCurrentWeather

Returns current weather conditions for a specified city in JSON format.

Query parameters:
- `city`: The city to get weather for (default: Barcelona)
- `units`: Temperature units, either 'C' for Celsius or 'F' for Fahrenheit (default: C)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgements

- Based on the amazing (and now defunct 🪦) https://weather-in-calendar.com/ by [Andreas Vejnø Andersen](https://www.vejnoe.dk/?utm_source=weather.vejnoe.dk)
- Created by [Javiotic](https://github.com/bernalj)
- Weather data provided by [Visual Crossing](https://www.visualcrossing.com/)
- If you like this project, you can [buy me a coffee](https://paypal.me/javiotic) ☕
