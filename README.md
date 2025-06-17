# MeetUp - Real-Time Video Conferencing Platform

A modern, feature-rich video conferencing application built with React, WebRTC, and MediaSoup.
### Demo 
https://github.com/user-attachments/assets/a66faf33-93e3-49fc-9076-99ed7c4ee71d


## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google OAuth credentials
- AWS account (for recording storage)

### Environment Variables

Create `.env` files in server directory and in client directory create config.ts:

#### Client (config.ts)
```
export const BACKEND_URL=your_backend_url
export const GOOGLE_CLIENT_ID=your_google_client_id
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
