// DOM Elements
const localVideo = document.getElementById('local-video');
const localScreen = document.getElementById('local-screen');
const remoteVideo = document.getElementById('remote-video');
const remoteScreen = document.getElementById('remote-screen');

const containerLocalVideo = document.getElementById('container-local-video');
const containerLocalScreen = document.getElementById('container-local-screen');
const containerRemoteVideo = document.getElementById('container-remote-video');
const containerRemoteScreen = document.getElementById('container-remote-screen');

const myPeerIdDisplay = document.getElementById('my-peer-id');
const remotePeerIdInput = document.getElementById('remote-peer-id');
const connectBtn = document.getElementById('connect-btn');
const copyIdBtn = document.getElementById('copy-id-btn');

const toggleMicBtn = document.getElementById('toggle-mic-btn');
const toggleCamBtn = document.getElementById('toggle-cam-btn');
const shareScreenBtn = document.getElementById('share-screen-btn');
const endCallBtn = document.getElementById('end-call-btn');
const themeBtn = document.getElementById('theme-btn');

const videoGrid = document.getElementById('video-grid');
const notificationArea = document.getElementById('notification-area');

// Volume Controls
const screenVolumeSlider = document.getElementById('screen-volume');
const partnerVolumeSlider = document.getElementById('partner-volume');

// Volume control event listeners
screenVolumeSlider?.addEventListener('input', (e) => {
    remoteScreen.volume = e.target.value / 100;
});

partnerVolumeSlider?.addEventListener('input', (e) => {
    remoteVideo.volume = e.target.value / 100;
});

// State
let peer;
let myStream;
let myScreenStream;
let currentCall;
let screenCall;
let isScreenSharing = false;
let isFullscreen = false;

// Theme Management
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = themeBtn.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-moon';
    } else {
        icon.className = 'fas fa-sun';
    }
}

// Initialize PeerJS
function initPeer() {
    console.log('🚀 Initializing PeerJS with Metered.ca TURN servers...');
    peer = new Peer({
        debug: 2,
        host: '0.peerjs.com',
        secure: true,
        port: 443,
        path: '/',
        config: {
            iceServers: [
                // 1. Google STUN (Free, Unlimited, Fast for P2P)
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },

                // 2. Your Metered.ca TURN Servers (For bypassing firewalls)
                {
                    urls: "stun:stun.relay.metered.ca:80",
                },
                {
                    urls: "turn:global.relay.metered.ca:80",
                    username: "fa8e6d0cb4a36b03d97bb3eb",
                    credential: "dAEEWN7fC6APUBFh",
                },
                {
                    urls: "turn:global.relay.metered.ca:80?transport=tcp",
                    username: "fa8e6d0cb4a36b03d97bb3eb",
                    credential: "dAEEWN7fC6APUBFh",
                },
                {
                    urls: "turn:global.relay.metered.ca:443",
                    username: "fa8e6d0cb4a36b03d97bb3eb",
                    credential: "dAEEWN7fC6APUBFh",
                },
                {
                    urls: "turns:global.relay.metered.ca:443?transport=tcp",
                    username: "fa8e6d0cb4a36b03d97bb3eb",
                    credential: "dAEEWN7fC6APUBFh",
                }
            ],
            sdpSemantics: 'unified-plan',
            iceTransportPolicy: 'all', // Try P2P first, then TURN
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            encodedInsertableStreams: false
        }
    });

    peer.on('open', (id) => {
        console.log('🆔 My Peer ID is:', id);
        myPeerIdDisplay.innerText = id;
        showNotification('Ready to connect', 'success');
    });

    peer.on('connection', (conn) => {
        if (currentCall && currentCall.peer === conn.peer) {
            currentCall.close();
        }
        setTimeout(() => {
            conn.on('open', () => {
                showNotification('Connected!', 'success');
            });
            conn.on('error', (err) => {
                console.error('❌ Connection error:', err);
            });
        }, 100);
    });

    peer.on('call', (call) => {
        console.log('📞 Incoming call from:', call.peer);
        showNotification('Incoming call...', 'info');
        
        const callType = call.metadata?.type || 'video';
        
        if (callType === 'video') {
            call.answer(myStream);
            currentCall = call;
            handleStream(call, remoteVideo, containerRemoteVideo);
            showNotification('Call connected!', 'success');
        } else if (callType === 'screen') {
            call.answer();
            screenCall = call;
            handleStream(call, remoteScreen, containerRemoteScreen);
        }
    });

    peer.on('error', (err) => {
        console.error('❌ PeerJS Error:', err);
        let message = `Error: ${err.type}`;
        if (err.type === 'peer-unavailable') message = 'Peer not found. Check the ID.';
        else if (err.type === 'disconnected') message = 'Disconnected. Reconnecting...';
        else if (err.type === 'network') message = 'Network error. Check connection.';
        else if (err.type === 'browser-incompatible') message = 'Browser not supported.';
        
        showNotification(message, 'error');
    });

    peer.on('disconnected', () => {
        console.log('⚠️ Peer disconnected, attempting reconnect...');
        peer.reconnect();
    });
}

// Media Handling
async function getLocalStream() {
    try {
        console.log('🎥 Requesting getUserMedia...');
        const rawStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 }, // 720p is good balance for mobile/desktop
                height: { ideal: 720 },
                frameRate: { ideal: 24 } // 24fps saves bandwidth
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });

        // Audio Context Hack to keep audio "hot"
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(rawStream);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        const audioTrack = destination.stream.getAudioTracks()[0];
        const videoTrack = rawStream.getVideoTracks()[0];
        myStream = new MediaStream([audioTrack, videoTrack]);
        
        localVideo.srcObject = myStream;
        return true;
    } catch (err) {
        console.error('❌ Failed to get local stream:', err);
        showNotification('Could not access camera/mic', 'error');
        return false;
    }
}

function handleStream(call, videoElement, container) {
    if (call.handled) return;
    call.handled = true;
    
    let streamReceived = false;
    
    const callTimeout = setTimeout(() => {
        if (container.classList.contains('placeholder')) {
            showNotification('Connection taking long...', 'error');
        }
    }, 15000);

    call.on('stream', (remoteStream) => {
        if (streamReceived) return;
        streamReceived = true;
        clearTimeout(callTimeout);
        
        console.log('📥 Stream received');
        videoElement.srcObject = remoteStream;
        container.classList.remove('placeholder');
        
        const safePlay = async () => {
            try {
                videoElement.muted = true; // Start muted for autoplay policy
                await videoElement.play();
                videoElement.muted = false; // Unmute after start
            } catch (err) {
                console.error('Play failed:', err);
                showNotification('Click video to play', 'info');
                container.addEventListener('click', () => {
                    videoElement.play();
                    videoElement.muted = false;
                }, { once: true });
            }
        };

        safePlay();
        
        // Periodic check to ensure video is actually playing
        const stateMonitor = setInterval(() => {
            if (!videoElement.srcObject) {
                clearInterval(stateMonitor);
                return;
            }
            if (videoElement.paused && videoElement.readyState > 2) {
                console.log('🔄 Watchdog: Resuming paused video');
                safePlay();
            }
        }, 5000);
        
        // Log connection type (P2P vs Relay)
        if (call.peerConnection) {
            call.peerConnection.addEventListener('iceconnectionstatechange', () => {
                if (call.peerConnection.iceConnectionState === 'connected') {
                    call.peerConnection.getStats().then(stats => {
                        stats.forEach(report => {
                            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                                const remoteCandidate = stats.get(report.remoteCandidateId);
                                if (remoteCandidate) {
                                    console.log('🔗 Connected via:', remoteCandidate.candidateType);
                                    if (remoteCandidate.candidateType === 'relay') {
                                        showNotification('Connected via TURN (Relay)', 'info');
                                    } else {
                                        showNotification('Connected P2P (Direct)', 'success');
                                    }
                                }
                            }
                        });
                    });
                }
            });
        }
    });

    call.on('close', () => {
        videoElement.srcObject = null;
        container.classList.add('placeholder');
    });
}

// Connection UI Logic
remotePeerIdInput.addEventListener('paste', () => {
    setTimeout(() => { if (remotePeerIdInput.value.trim()) connectBtn.click(); }, 100);
});

connectBtn.addEventListener('click', () => {
    if (connectBtn.disabled) return;
    const remoteId = remotePeerIdInput.value;
    if (!remoteId) return showNotification('Enter Peer ID', 'error');

    connectBtn.disabled = true;
    connectBtn.innerText = 'Connecting...';

    const call = peer.call(remoteId, myStream, { metadata: { type: 'video' } });
    currentCall = call;
    handleStream(call, remoteVideo, containerRemoteVideo);
    
    call.on('error', () => {
        connectBtn.disabled = false;
        connectBtn.innerText = 'Connect';
    });
    
    // Reset button after 5s or on connection
    setTimeout(() => {
        connectBtn.disabled = false;
        connectBtn.innerText = 'Connect';
    }, 5000);
});

// Screen Sharing
shareScreenBtn.addEventListener('click', async () => {
    if (isScreenSharing) {
        stopScreenShare();
    } else {
        try {
            myScreenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" },
                audio: true
            });
            
            localScreen.srcObject = myScreenStream;
            containerLocalScreen.classList.remove('placeholder');
            isScreenSharing = true;
            shareScreenBtn.classList.add('active');

            if (currentCall && currentCall.peer) {
                screenCall = peer.call(currentCall.peer, myScreenStream, { metadata: { type: 'screen' } });
                showNotification('Sharing screen...', 'success');
            }

            myScreenStream.getVideoTracks()[0].onended = stopScreenShare;
        } catch (err) {
            console.error('Screen share error:', err);
        }
    }
});

function stopScreenShare() {
    if (myScreenStream) {
        myScreenStream.getTracks().forEach(t => t.stop());
        myScreenStream = null;
    }
    if (screenCall) screenCall.close();
    
    localScreen.srcObject = null;
    containerLocalScreen.classList.add('placeholder');
    isScreenSharing = false;
    shareScreenBtn.classList.remove('active');
}

// Media Controls
toggleMicBtn.addEventListener('click', () => {
    const track = myStream.getAudioTracks()[0];
    if (track) {
        track.enabled = !track.enabled;
        toggleMicBtn.classList.toggle('active');
        toggleMicBtn.innerHTML = track.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    }
});

toggleCamBtn.addEventListener('click', () => {
    const track = myStream.getVideoTracks()[0];
    if (track) {
        track.enabled = !track.enabled;
        toggleCamBtn.classList.toggle('active');
        toggleCamBtn.innerHTML = track.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    }
});

endCallBtn.addEventListener('click', () => {
    if (currentCall) currentCall.close();
    if (screenCall) screenCall.close();
    stopScreenShare();
    remoteVideo.srcObject = null;
    containerRemoteVideo.classList.add('placeholder');
    remoteScreen.srcObject = null;
    containerRemoteScreen.classList.add('placeholder');
    showNotification('Call ended', 'info');
});

copyIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(myPeerIdDisplay.innerText);
    showNotification('ID copied!', 'success');
});

// Expand/Fullscreen Logic
document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const container = e.target.closest('.video-container');
        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => console.error(err));
        } else {
            document.exitFullscreen();
        }
    });
});

// Notifications
function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = 'notification';
    notif.innerHTML = `<i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info'}-circle"></i> ${message}`;
    if (type === 'error') notif.style.borderLeft = '4px solid #ef4444';
    if (type === 'success') notif.style.borderLeft = '4px solid #10b981';
    
    notificationArea.appendChild(notif);
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Start App
getLocalStream().then(success => {
    if (success) initPeer();
});