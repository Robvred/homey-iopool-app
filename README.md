# homey-iopool-app
# iopool Pool Monitor

## Description
This app allows you to monitor your iopool pool data directly in Homey.
You can view pool temperature, pH, ORP, filtration duration, and pool mode.
Perfect for integrating your pool maintenance into Homey flows.

## Features
- Real-time temperature monitoring
- pH level tracking
- ORP (oxidation-reduction potential) monitoring
- Recommended filtration duration display
- Pool mode information
- Flow card to get filtration duration

## Retreive API Key
Linux:
curl --header 'x-api-key: APIKEY' https://api.iopool.com/v1/pools/

Windows:
$headers=@{}
$headers.Add("x-api-key", "APIKEY")
$response = Invoke-WebRequest -Uri 'https://api.iopool.com/v1/pools/' -Method GET -Headers $headers
$response

Response :
[
  {
    "id": "1aaa22b3-ccc4-4567-d888-e999ff000000",
    "title": "Pool ID",
    "latestMeasure": {
      "temperature": 23.129907809491385,
      "ph": 7.422857142857143,
      "orp": 660,
      "mode": "standard",
      "isValid": true,
      "ecoId": "/Keb7cMf",
      "measuredAt": "2024-05-24T14:04:00.000Z"
    },
    "mode": "STANDARD",
    "hasAnActionRequired": false,
    "advice": {
      "filtrationDuration": 4
    }
  }
]

## Setup
1. Enter your iopool API Key in the app settings.
2. Select your pool from the list.
3. Add the device to Homey.

## Requirements
- iopool account with API access
- Homey firmware 5.0.0 or newer
