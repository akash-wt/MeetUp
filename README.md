# MeetUp - Real-Time Video Conferencing Platform

A modern, feature-rich video conferencing application built with React, WebRTC, and MediaSoup.

![MeetUp Screenshot](https://images.pexels.com/photos/7862603/pexels-photo-7862603.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)

## Features

- 🎥 Real-time video and audio streaming
- 👥 Multiple participant support
- 🔐 Secure Google authentication
- 📹 Meeting recording functionality
- 💾 Cloud storage for recordings
- 🎨 Modern, responsive UI
- 🔊 Audio mute/unmute
- 📱 Camera on/off controls
- 🔗 Easy meeting invite system
- 📊 Participant management

## Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS
- Socket.IO Client
- MediaSoup Client
- Google OAuth

### Backend
- Node.js
- Express
- MediaSoup
- Socket.IO
- AWS S3 (for recording storage)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google OAuth credentials
- AWS account (for recording storage)

### Environment Variables

Create `.env` files in both client and server directories:

#### Client (.env)
```
VITE_BACKEND_URL=your_backend_url
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

#### Server (.env)
```
JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
FRONTEND_URL=your_frontend_url
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/meetup.git
cd meetup
```

2. Install dependencies for both client and server:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../sfu-server
npm install
```

3. Start the development servers:

```bash
# Start the client
cd client
npm run dev

# Start the server
cd ../sfu-server
npm start
```

## Usage

1. Visit the application URL in your browser
2. Sign in with your Google account
3. Create a new meeting or join an existing one using a meeting code
4. Share the meeting code with participants
5. Enjoy your video conference!

## Features in Detail

### Video Conferencing
- High-quality real-time video and audio
- Dynamic participant grid layout
- Active speaker detection
- Screen sharing capabilities

### Recording
- Record meetings with a single click
- Automatic cloud storage
- Easy access to past recordings
- Download recordings for offline viewing

### User Interface
- Dark mode design
- Responsive layout
- Intuitive controls
- Real-time participant list
- Meeting chat functionality

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [MediaSoup](https://mediasoup.org/) for the WebRTC SFU
- [Socket.IO](https://socket.io/) for real-time communication
- [React](https://reactjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for styling