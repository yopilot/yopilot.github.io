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
    peer = new Peer(null, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        },
        debug: 2
    });

    peer.on('open', (id) => {
        myPeerIdDisplay.innerText = id;
        showNotification('Ready to connect', 'success');
    });

    peer.on('call', (call) => {
        // Answer incoming calls
        const callType = call.metadata?.type || 'video';
        
        if (callType === 'video') {
            call.answer(myStream);
            currentCall = call;
            handleStream(call, remoteVideo, containerRemoteVideo);
        } else if (callType === 'screen') {
            call.answer(); // Answer screen share calls (usually one-way)
            screenCall = call;
            handleStream(call, remoteScreen, containerRemoteScreen);
        }
    });

    peer.on('error', (err) => {
        console.error(err);
        showNotification(`Error: ${err.type}`, 'error');
    });
}

// Media Handling
async function getLocalStream() {
    try {
        myStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = myStream;
    } catch (err) {
        console.error('Failed to get local stream', err);
        showNotification('Could not access camera/microphone', 'error');
    }
}

function handleStream(call, videoElement, container) {
    call.on('stream', (remoteStream) => {
        videoElement.srcObject = remoteStream;
        container.classList.remove('placeholder');
        if (container.classList.contains('hidden')) {
            container.classList.remove('hidden');
        }
    });

    call.on('close', () => {
        videoElement.srcObject = null;
        container.classList.add('placeholder');
        if (videoElement === remoteScreen) {
            container.classList.add('hidden');
        }
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
    const remoteId = remotePeerIdInput.value;
    if (!remoteId) {
        showNotification('Please enter a Peer ID', 'error');
        return;
    }

    // Call with video
    const call = peer.call(remoteId, myStream, { metadata: { type: 'video' } });
    
    if (!call) {
        showNotification('Failed to start call', 'error');
        return;
    }

    currentCall = call;
    handleStream(call, remoteVideo, containerRemoteVideo);
    
    showNotification('Calling...', 'info');

    call.on('error', (err) => {
        console.error('Call error:', err);
        showNotification('Connection failed', 'error');
    });
});

// Screen Sharing
shareScreenBtn.addEventListener('click', async () => {
    if (isScreenSharing) {
        // Stop sharing
        stopScreenShare();
    } else {
        // Start sharing
        try {
            myScreenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true // Capture system audio
            });

            localScreen.srcObject = myScreenStream;
            containerLocalScreen.classList.remove('hidden');
            isScreenSharing = true;
            shareScreenBtn.classList.add('active');

            // If connected, call peer with screen stream
            if (currentCall && currentCall.peer) {
                const call = peer.call(currentCall.peer, myScreenStream, { metadata: { type: 'screen' } });
                screenCall = call;
            }

            // Handle user stopping via browser UI
            myScreenStream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

        } catch (err) {
            console.error('Error sharing screen:', err);
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
    containerLocalScreen.classList.add('hidden');
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
    containerRemoteScreen.classList.add('hidden');
    
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
        videoGrid.classList.remove('has-fullscreen');
        videoContainers.forEach(c => {
            c.classList.remove('fullscreen', 'pip');
            c.style.transform = ''; // Reset drag position
            c.style.top = '';
            c.style.left = '';
        });
        isFullscreen = false;
    } else {
        // Enter fullscreen
        videoGrid.classList.add('has-fullscreen');
        
        videoContainers.forEach(c => {
            if (c === targetContainer) {
                c.classList.add('fullscreen');
                c.classList.remove('pip');
            } else {
                if (!c.classList.contains('hidden')) {
                    c.classList.add('pip');
                    c.classList.remove('fullscreen');
                    // Initial PIP positions could be set here if needed
                }
            }
        });
        isFullscreen = true;
    }
}

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
getLocalStream().then(() => {
    initPeer();
});
