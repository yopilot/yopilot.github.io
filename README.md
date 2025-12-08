# P2P Screen Share Pro - Production-Level Application

A fully-featured, production-ready peer-to-peer screen sharing application with advanced capabilities including recording, file transfer, real-time diagnostics, and more.

## 🚀 Features

### Core Functionality
- **High-Quality Screen Sharing**: Up to 4K resolution at 60 FPS
- **Video Calling**: HD video calls with optimized quality settings
- **Voice Chat**: Crystal-clear audio with noise suppression
- **P2P Chat**: Real-time messaging without servers

### Advanced Features
- **📹 Session Recording**: Record screen shares and video calls in WebM format
- **📁 File Transfer**: Secure P2P file sharing with progress tracking
- **⚙️ Quality Settings**: Customize video quality, frame rate, and bitrate
- **🔍 Connection Diagnostics**: Real-time monitoring of latency, bandwidth, and packet loss
- **🔔 Smart Notifications**: Toast notifications for all events
- **⌨️ Keyboard Shortcuts**: Quick access to all features
- **📱 PWA Support**: Install as a desktop/mobile app
- **🔄 Auto-Reconnection**: Automatic recovery from network issues
- **🎨 Modern UI**: Beautiful, responsive design with dark mode

## 🛠️ Technology Stack

- **WebRTC**: Peer-to-peer real-time communication
- **PeerJS**: Simplified WebRTC implementation
- **MediaRecorder API**: For recording functionality
- **Service Workers**: Offline support and caching
- **Progressive Web App**: Installable on all platforms

## 📋 Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- HTTPS connection (required for screen sharing)
- Microphone and camera permissions (optional)

## 🎯 Quick Start

### Local Development

1. **Clone or download** this repository
2. **Serve with HTTPS** (required for WebRTC):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server -p 8000 -S -C cert.pem -K key.pem
   ```

3. **Access** `https://localhost:8000` in your browser

### Production Deployment

#### Deploy to GitHub Pages

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/p2p-screenshare.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: Deploy from branch → main
   - Your site will be live at `https://yourusername.github.io/p2p-screenshare/`

#### Deploy to Netlify

1. **Via Git**:
   - Connect your repository to Netlify
   - Build command: (leave empty)
   - Publish directory: `/`

2. **Drag & Drop**:
   - Go to [Netlify Drop](https://app.netlify.com/drop)
   - Drag the folder containing all files
   - Instant deployment!

#### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

## 🎮 How to Use

### Basic Connection

1. **Generate ID**: Your Peer ID appears automatically
2. **Share ID**: Copy and send your ID to your friend
3. **Connect**: Click "Connect to Friend" and enter their ID
4. **Start Sharing**: Click "Share Screen" or enable camera

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Toggle fullscreen |
| `Ctrl+M` | Toggle microphone |
| `Ctrl+S` | Toggle screen share |
| `Ctrl+V` | Toggle camera |
| `Ctrl+R` | Start/stop recording |
| `Ctrl+Shift+F` | Share file |

### Recording Sessions

1. Start screen sharing or video call
2. Click "Record" button (🎥)
3. Share your screen/camera as normal
4. Click "Stop Recording" when done
5. Video automatically downloads as `.webm` file

### File Transfer

1. Ensure you're connected to a peer
2. Click "Share File" button (📎)
3. Select file from your computer
4. Wait for transfer to complete
5. Recipient automatically receives the file

### Quality Settings

- Click the ⚙️ icon in the status bar
- Adjust video quality (4K/1080p/720p/480p)
- Set frame rate (60/30/15 FPS)
- Configure bitrate (500-10000 kbps)

### Diagnostics

- Click the 🔍 icon to view connection stats
- Monitor: Connection type, latency, packet loss, speeds
- Real-time bandwidth indicator shows connection quality

## 🏗️ Architecture

### File Structure

```
screenshare/
├── index.html              # Main HTML structure
├── styles.css              # Complete styling
├── script.js               # Application logic (1500+ lines)
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline support
└── README.md              # This file
```

### Key Components

**P2PScreenShare Class**:
- Connection management
- Stream handling
- Recording functionality
- File transfer system
- Diagnostics engine
- Notification system
- Error recovery

**Service Worker**:
- Cache management
- Offline support
- Background sync
- Push notifications (ready)

## 🔒 Security & Privacy

- **End-to-End Encrypted**: All data goes directly peer-to-peer
- **No Server Storage**: Nothing is stored on any server
- **STUN/TURN Only**: Only for NAT traversal, not data relay
- **Local Processing**: Recording and file transfer happen locally
- **Browser Permissions**: Requires explicit user permission for media access

## 🌐 Browser Compatibility

| Browser | Screen Share | Video Call | Recording | File Transfer |
|---------|-------------|------------|-----------|---------------|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 88+ | ✅ | ✅ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |

## 🔧 Customization

### Change STUN/TURN Servers

Edit `script.js`, line ~260:

```javascript
iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:your-turn-server.com', username: 'user', credential: 'pass' }
]
```

### Modify Default Quality

Edit `script.js`, initElements():

```javascript
this.qualitySettings = {
    videoQuality: '4k',    // Change default quality
    frameRate: 60,         // Change default FPS
    bitrate: 5000          // Change default bitrate
};
```

### Theme Customization

Edit `styles.css` variables:

```css
:root {
    --primary: #38bdf8;
    --background: #0f172a;
    --surface: #1e293b;
}
```

## 📊 Performance Optimization

### Recommended Settings by Use Case

**Presentation/Demo**:
- Quality: 1080p
- Frame Rate: 30 FPS
- Bitrate: 2500 kbps

**Gaming/High Motion**:
- Quality: 720p
- Frame Rate: 60 FPS
- Bitrate: 5000 kbps

**Low Bandwidth**:
- Quality: 480p
- Frame Rate: 15 FPS
- Bitrate: 1000 kbps

## 🐛 Troubleshooting

### Connection Issues

1. **Peer not found**: Verify the Peer ID is correct
2. **Network error**: Check firewall/VPN settings
3. **Failed to connect**: Try refreshing both pages

### Media Issues

1. **No screen share**: Grant screen sharing permission
2. **No audio**: Check microphone permissions
3. **Poor quality**: Lower quality settings or check bandwidth

### Recording Issues

1. **Recording fails**: Check browser compatibility
2. **File size large**: Use lower quality settings
3. **Can't play recording**: Use VLC or Chrome to open .webm files

## 📈 Future Enhancements

- [ ] Virtual backgrounds
- [ ] Screen annotation tools
- [ ] Multi-party connections (3+ users)
- [ ] Cloud recording option
- [ ] Mobile app (React Native)
- [ ] End-to-end encryption indicator
- [ ] Connection quality pre-check
- [ ] Session history and analytics

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - Feel free to use this in your own projects!

## 🙏 Credits

- **PeerJS**: Simplified WebRTC implementation
- **WebRTC**: Real-time communication technology
- **Google STUN Servers**: Free STUN services
- **OpenRelay**: Free TURN services

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Built with ❤️ for the P2P revolution**

*No servers, no tracking, no BS - just pure peer-to-peer magic!* ✨
