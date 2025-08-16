# Football Square Game

This is a web application built with React, Vite, TypeScript, and Tailwind CSS for playing the Football Square game. The game allows users to participate in a betting pool where they can purchase squares on a grid, and the winners are determined based on the scores of each quarter in the football game.

## Features

- 🔐 **Authentication System**: Host and player login with Firebase
- 👨‍💼 **Host Dashboard**: Create games, generate user codes, manage scores
- 🎮 **Interactive Grid**: Real-time square selection and updates
- 📱 **Responsive Design**: Works on mobile and desktop
- 🔄 **Real-time Updates**: Live score and square updates via Firestore

## Quick Start
-football-squares.nelify.app
### Prerequisites
- Node.js and npm installed
- Firebase project with Authentication and Firestore enabled

### Installation

1. Clone this repository:
```bash
git clone https://github.com/corey-nadeau/football-squares.git
cd football-squares
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your Firebase configuration.

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to http://localhost:5173

## Firebase Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable **Authentication** → **Anonymous** sign-in method
3. Create a **Firestore Database** in test mode
4. Copy your Firebase config to `.env.local`

## How to Play

### For Hosts:
1. Click "Host Login"
2. Create a new game with team names
3. Generate user codes for players who paid
4. Update scores during the game
5. Monitor winners in real-time

### For Players:
1. Get a user code from the host
2. Click "Player Login" and enter your code
3. Select your squares on the grid
4. Watch the game and see if you win!

## Deployment

The app is configured for Netlify deployment. Set environment variables in Netlify dashboard under Site settings → Environment variables.

Live demo: https://football-squares.netlify.app/

## Security

- Firebase credentials are stored as environment variables
- `.env.local` is ignored by git to prevent credential exposure
- Firestore security rules should be configured for production use

## Configuration

## Contributing

Contributions to this project are welcome. If you would like to contribute, please follow these steps:

1. Fork the repository and create a new branch for your feature or bug fix.
2. Make your changes and test them thoroughly.
3. Commit your changes with descriptive commit messages.
4. Push your changes to your forked repository.
5. Open a pull request, explaining the changes you have made.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Acknowledgements

This project was inspired by the excitement and popularity of the Football Super Bowl Square game. Special thanks to the React, Vite, TypeScript, and Tailwind CSS communities for their valuable tools and resources.
