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
    console.log('Initializing PeerJS...');
    peer = new Peer({
        debug: 2,
        host: '0.peerjs.com',
        secure: true,
        port: 443,
        path: '/',
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        }
    });

    peer.on('open', (id) => {
        console.log('My Peer ID is:', id);
        myPeerIdDisplay.innerText = id;
        showNotification('Ready to connect', 'success');
    });

    peer.on('connection', (conn) => {
        console.log('Incoming connection from:', conn.peer);
        
        // Close existing connection if any
        if (currentCall && currentCall.peer === conn.peer) {
            console.log('Closing existing call connection');
            currentCall.close();
        }

        // Wait a moment for connection to initialize (helps with reliability)
        setTimeout(() => {
            conn.on('open', () => {
                console.log('Connection established with:', conn.peer);
                showNotification('Connected!', 'success');
            });
            conn.on('error', (err) => {
                console.error('Connection error:', err);
            });
        }, 100);
    });

    peer.on('call', (call) => {
        console.log('Incoming call from:', call.peer, 'Metadata:', call.metadata);
        showNotification('Incoming call...', 'info');
        
        // Answer incoming calls
        const callType = call.metadata?.type || 'video';
        
        if (callType === 'video') {
            console.log('Answering video call with stream:', myStream?.getTracks().map(t => t.kind));
            call.answer(myStream);
            currentCall = call;
            handleStream(call, remoteVideo, containerRemoteVideo);
            
            // Monitor the answer's ICE state too
            if (call.peerConnection) {
                call.peerConnection.oniceconnectionstatechange = () => {
                    console.log('Answer ICE State:', call.peerConnection.iceConnectionState);
                };
                call.peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('Answer ICE Candidate:', event.candidate.type, event.candidate.address || '');
                    }
                };
            }
            
            showNotification('Call connected!', 'success');
        } else if (callType === 'screen') {
            console.log('Answering screen share call...');
            call.answer(); // Answer screen share calls (usually one-way)
            screenCall = call;
            handleStream(call, remoteScreen, containerRemoteScreen);
        }
    });

    peer.on('error', (err) => {
        console.error('PeerJS Error:', err);
        showNotification(`Error: ${err.type}`, 'error');
    });

    peer.on('disconnected', () => {
        console.log('Peer disconnected from server, attempting reconnect...');
        showNotification('Reconnecting...', 'info');
        peer.reconnect();
    });

    peer.on('close', () => {
        console.log('Peer connection closed');
    });
}

// Media Handling
async function getLocalStream() {
    // Check for insecure origin
    if (location.protocol === 'http:' && location.hostname !== 'localhost' && !location.hostname.startsWith('127.0.0.')) {
        console.warn('⚠️ Application is running on HTTP. Camera access may be blocked.');
        showNotification('Warning: Insecure connection (HTTP). Camera may fail.', 'error');
    }

    try {
        myStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                frameRate: { ideal: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        // Monitor local tracks (Sender side debugging)
        myStream.getTracks().forEach(track => {
            track.onmute = () => {
                console.warn('⚠️ MY local track muted (Sender side):', track.kind);
                showNotification(`Your ${track.kind} stopped sending data`, 'error');
            };
            track.onunmute = () => console.log('✅ MY local track unmuted (Sender side):', track.kind);
            track.onended = () => console.log('MY local track ended:', track.kind);
        });

        localVideo.srcObject = myStream;
        return true;
    } catch (err) {
        console.error('Failed to get local stream', err);
        showNotification('Could not access camera/microphone', 'error');
        return false;
    }
}

function handleStream(call, videoElement, container) {
    console.log('Setting up stream handler for call:', call.peer);
    
    // Prevent duplicate handling for the same call instance
    if (call.handled) {
        console.log('Call already handled:', call.peer);
        return;
    }
    call.handled = true;
    
    let streamReceived = false;  // Prevent duplicate handling
    
    const callTimeout = setTimeout(() => {
        if (container.classList.contains('placeholder')) {
            console.warn('Stream timeout for:', call.peer);
            showNotification('Connection taking longer than expected...', 'error');
        }
    }, 15000);

    call.on('stream', (remoteStream) => {
        // Only handle the first stream event
        if (streamReceived) {
            console.log('Ignoring duplicate stream event');
            return;
        }
        streamReceived = true;
        
        clearTimeout(callTimeout);
        console.log('Stream received from:', call.peer);
        console.log('Stream tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`));
        
        // Set the stream
        videoElement.srcObject = remoteStream;
        container.classList.remove('placeholder');
        
        // Playback logic
        const playVideo = async () => {
            try {
                // Always start muted to satisfy Autoplay policy immediately
                videoElement.muted = true;
                await videoElement.play();
                console.log('Video playing (muted):', videoElement.id);
                
                // Now try to unmute
                try {
                    videoElement.muted = false;
                    console.log('Unmuted successfully');
                } catch (err) {
                    console.warn('Could not unmute automatically:', err);
                    showNotification('Click video to enable audio', 'info');
                    // Add one-time click handler
                    const unmuteHandler = () => {
                        videoElement.muted = false;
                        container.removeEventListener('click', unmuteHandler);
                    };
                    container.addEventListener('click', unmuteHandler);
                }
            } catch (err) {
                console.error('Play failed:', err);
                if (err.name === 'AbortError') {
                    setTimeout(playVideo, 500);
                } else {
                    showNotification('Click to start video', 'error');
                    container.onclick = () => {
                        playVideo();
                        container.onclick = null;
                    };
                }
            }
        };

        // Wait for video to be ready
        if (videoElement.readyState >= 1) {
            console.log('Video metadata already loaded');
            playVideo();
        } else {
            videoElement.onloadedmetadata = () => {
                console.log('Video metadata loaded for:', videoElement.id);
                playVideo();
            };
            
            // Fallback: Force play if metadata doesn't load in 2s (sometimes helps kickstart it)
            setTimeout(() => {
                if (videoElement.paused) {
                    console.log('Force playing after timeout...');
                    playVideo();
                }
            }, 2000);
        }
        
        // Monitor track status
        remoteStream.getTracks().forEach(track => {
            track.onended = () => console.log('Track ended:', track.kind);
            track.onmute = () => console.log('Track muted:', track.kind);
            track.onunmute = () => console.log('Track unmuted:', track.kind);
        });
    });

    call.on('close', () => {
        clearTimeout(callTimeout);
        console.log('Call closed with:', call.peer);
        videoElement.srcObject = null;
        container.classList.add('placeholder');
        // if (videoElement === remoteScreen) {
        //     container.classList.add('hidden');
        // }
    });

    call.on('error', (err) => {
        clearTimeout(callTimeout);
        console.error('Call error with:', call.peer, err);
    });
}

// Connection Logic
remotePeerIdInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        if (remotePeerIdInput.value.trim().length > 0) {
            connectBtn.click();
        }
    }, 100);
});

connectBtn.addEventListener('click', () => {
    if (connectBtn.disabled) return;

    const remoteId = remotePeerIdInput.value;
    console.log('Attempting to connect to:', remoteId);
    
    if (!remoteId) {
        console.warn('No Peer ID entered');
        showNotification('Please enter a Peer ID', 'error');
        return;
    }

    connectBtn.disabled = true;
    connectBtn.innerText = '...';

    // Call with video
    console.log('Initiating video call...');
    const call = peer.call(remoteId, myStream, { metadata: { type: 'video' } });
    
    if (!call) {
        console.error('Failed to create call object');
        showNotification('Failed to start call', 'error');
        connectBtn.disabled = false;
        connectBtn.innerText = 'Connect';
        return;
    }

    currentCall = call;
    handleStream(call, remoteVideo, containerRemoteVideo);
    
    showNotification('Connecting...', 'info');

    call.on('error', (err) => {
        console.error('Call error:', err);
        showNotification('Connection failed', 'error');
        connectBtn.disabled = false;
        connectBtn.innerText = 'Connect';
    });
    
    // Monitor ICE connection state
    if (call.peerConnection) {
        // Log ICE candidates for debugging
        call.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE Candidate:', event.candidate.type, event.candidate.address);
            }
        };

        call.peerConnection.oniceconnectionstatechange = () => {
            const state = call.peerConnection.iceConnectionState;
            console.log('ICE Connection State Change:', state);
            
            if (state === 'checking') {
                showNotification('Establishing connection...', 'info');
            } else if (state === 'connected' || state === 'completed') {
                showNotification('Connected!', 'success');
                connectBtn.innerText = 'Connected';
                
                // Check connection type (P2P vs Relay)
                call.peerConnection.getStats().then(stats => {
                    stats.forEach(report => {
                        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                            const localCandidateId = report.localCandidateId;
                            const remoteCandidateId = report.remoteCandidateId;
                            const localCandidate = stats.get(localCandidateId);
                            const remoteCandidate = stats.get(remoteCandidateId);
                            
                            if (remoteCandidate) {
                                const type = remoteCandidate.candidateType;
                                console.log('Connected via:', type);
                                if (type === 'relay') {
                                    showNotification('Connected via Relay (TURN)', 'info');
                                } else {
                                    showNotification(`Connected P2P (${type})`, 'success');
                                }
                            }
                        }
                    });
                });
            } else if (state === 'failed') {
                console.error('ICE connection failed');
                showNotification('Connection failed. Try again.', 'error');
                connectBtn.disabled = false;
                connectBtn.innerText = 'Retry';
                
            } else if (state === 'disconnected') {
                console.log('ICE state is disconnected. Waiting for recovery...');
                // Don't show error immediately - this state can recover
                
                // Set a longer timeout - networks can be flaky
                setTimeout(() => {
                    if (call.peerConnection && call.peerConnection.iceConnectionState === 'disconnected') {
                        console.log('Still disconnected after 15s, but keeping connection...');
                        showNotification('Connection unstable. Video may freeze.', 'error');
                        // Don't close - let it try to recover
                    }
                }, 15000);
                
            } else if (state === 'closed') {
                connectBtn.disabled = false;
                connectBtn.innerText = 'Connect';
            }
        };

        call.peerConnection.onicegatheringstatechange = () => {
            console.log('ICE Gathering State:', call.peerConnection.iceGatheringState);
        };
    }
});

// Screen Sharing
shareScreenBtn.addEventListener('click', async () => {
    if (isScreenSharing) {
        // Stop sharing
        stopScreenShare();
    } else {
        // Start sharing
        try {
            // Show tip about audio before screen picker opens
            showNotification('💡 Check "Share audio" in the popup for movie sound!', 'info');
            
            myScreenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always",
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30, max: 60 }
                },
                audio: true  // Request audio - browser will show checkbox
            });

            // Check if audio track was shared
            const audioTracks = myScreenStream.getAudioTracks();
            if (audioTracks.length > 0) {
                showNotification('🔊 Screen audio enabled!', 'success');
            } else {
                showNotification('⚠️ No audio shared - partner won\'t hear movie sound', 'error');
            }

            localScreen.srcObject = myScreenStream;
            containerLocalScreen.classList.remove('placeholder');
            isScreenSharing = true;
            shareScreenBtn.classList.add('active');

            // If connected, call peer with screen stream
            if (currentCall && currentCall.peer) {
                const call = peer.call(currentCall.peer, myScreenStream, { metadata: { type: 'screen' } });
                screenCall = call;
                showNotification('Screen shared with partner!', 'success');
            }

            // Handle user stopping via browser UI
            myScreenStream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

        } catch (err) {
            console.error('Error sharing screen:', err);
            if (err.name !== 'NotAllowedError') {
                showNotification('Failed to share screen', 'error');
            }
        }
    }
});

function stopScreenShare() {
    if (myScreenStream) {
        myScreenStream.getTracks().forEach(track => track.stop());
        myScreenStream = null;
    }
    
    if (screenCall) {
        screenCall.close();
        screenCall = null;
    }

    localScreen.srcObject = null;
    containerLocalScreen.classList.add('placeholder');
    // containerLocalScreen.classList.add('hidden');
    isScreenSharing = false;
    shareScreenBtn.classList.remove('active');
}

// Controls
toggleMicBtn.addEventListener('click', () => {
    const audioTrack = myStream.getAudioTracks()[0];
    if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        toggleMicBtn.classList.toggle('active');
        toggleMicBtn.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
    }
});

toggleCamBtn.addEventListener('click', () => {
    const videoTrack = myStream.getVideoTracks()[0];
    if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        toggleCamBtn.classList.toggle('active');
        toggleCamBtn.innerHTML = videoTrack.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
    }
});

endCallBtn.addEventListener('click', () => {
    if (currentCall) currentCall.close();
    if (screenCall) screenCall.close();
    stopScreenShare();
    
    // Reset remote views
    remoteVideo.srcObject = null;
    containerRemoteVideo.classList.add('placeholder');
    remoteScreen.srcObject = null;
    containerRemoteScreen.classList.add('placeholder');
    // containerRemoteScreen.classList.add('hidden');
    
    showNotification('Call ended', 'info');
});

copyIdBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(myPeerIdDisplay.innerText);
    showNotification('ID copied to clipboard', 'success');
});

// Fullscreen & PIP Logic
const expandBtns = document.querySelectorAll('.expand-btn');
const videoContainers = document.querySelectorAll('.video-container');

expandBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const container = e.target.closest('.video-container');
        toggleFullscreen(container);
    });
});

function toggleFullscreen(targetContainer) {
    if (isFullscreen) {
        // Exit fullscreen
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.error(err));
        }
        
        videoGrid.classList.remove('has-fullscreen');
        videoContainers.forEach(c => {
            c.classList.remove('fullscreen', 'pip');
            c.style.transform = ''; // Reset drag position
            c.style.top = '';
            c.style.left = '';
            c.style.right = '';
            c.style.bottom = '';
        });
        isFullscreen = false;
    } else {
        // Enter fullscreen
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });

        videoGrid.classList.add('has-fullscreen');
        
        let pipCount = 0;
        videoContainers.forEach(c => {
            if (c === targetContainer) {
                c.classList.add('fullscreen');
                c.classList.remove('pip');
            } else {
                // if (!c.classList.contains('hidden')) {
                    c.classList.add('pip');
                    c.classList.remove('fullscreen');
                    
                    // Stack PIPs vertically on the right
                    c.style.right = '20px';
                    c.style.bottom = `${20 + (pipCount * 150)}px`;
                    c.style.top = 'auto';
                    c.style.left = 'auto';
                    pipCount++;
                // }
            }
        });
        isFullscreen = true;
    }
}

// Handle Esc key or browser UI exit
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && isFullscreen) {
        // User exited via Esc or browser UI
        videoGrid.classList.remove('has-fullscreen');
        videoContainers.forEach(c => {
            c.classList.remove('fullscreen', 'pip');
            c.style.transform = ''; 
            c.style.top = '';
            c.style.left = '';
            c.style.right = '';
            c.style.bottom = '';
        });
        isFullscreen = false;
    }
});

// Draggable PIP
let draggedElement = null;
let initialX, initialY;
let currentX, currentY;
let xOffset = 0, yOffset = 0;

document.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

function dragStart(e) {
    const pipContainer = e.target.closest('.video-container.pip');
    if (pipContainer) {
        draggedElement = pipContainer;
        
        // Get current transform values if any
        const style = window.getComputedStyle(draggedElement);
        const matrix = new WebKitCSSMatrix(style.transform);
        xOffset = matrix.m41;
        yOffset = matrix.m42;

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
    }
}

function drag(e) {
    if (draggedElement) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        setTranslate(currentX, currentY, draggedElement);
    }
}

function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    draggedElement = null;
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
}

// Notifications
function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = 'notification';
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    notif.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    
    // Color coding
    if (type === 'error') notif.style.borderLeft = '4px solid var(--danger-color)';
    if (type === 'success') notif.style.borderLeft = '4px solid var(--success-color)';
    
    notificationArea.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(20px)';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// Start
getLocalStream().then((success) => {
    if (success) {
        initPeer();
    } else {
        console.error('Local stream failed, not initializing peer');
        showNotification('Please allow camera access and refresh', 'error');
    }
});
