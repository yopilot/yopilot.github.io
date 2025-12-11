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
            ],
            sdpSemantics: 'unified-plan',
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        }
    });

    peer.on('open', (id) => {
        console.log('🆔 My Peer ID is:', id);
        myPeerIdDisplay.innerText = id;
        showNotification('Ready to connect', 'success');
    });

    peer.on('connection', (conn) => {
        // Close existing connection if any
        if (currentCall && currentCall.peer === conn.peer) {
            currentCall.close();
        }

        // Wait a moment for connection to initialize (helps with reliability)
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
        console.log('📞 Incoming call from:', call.peer, 'Metadata:', call.metadata);
        showNotification('Incoming call...', 'info');
        
        // Answer incoming calls
        const callType = call.metadata?.type || 'video';
        
        if (callType === 'video') {
            console.log('📞 Answering video call with local stream:', {
                streamId: myStream?.id,
                tracks: myStream?.getTracks().map(t => `${t.kind}:enabled=${t.enabled}:muted=${t.muted}:state=${t.readyState}`)
            });
            
            call.answer(myStream);
            console.log('✅ Answer sent with local stream');
            
            currentCall = call;
            handleStream(call, remoteVideo, containerRemoteVideo);
            
            // Monitor the answer's ICE state too
            if (call.peerConnection) {
                console.log('🔗 Answer WebRTC states:', {
                    signalingState: call.peerConnection.signalingState,
                    iceConnectionState: call.peerConnection.iceConnectionState,
                    connectionState: call.peerConnection.connectionState
                });
                
                call.peerConnection.onsignalingstatechange = () => {
                    console.log('📡 Answer Signaling State:', call.peerConnection.signalingState);
                };
                
                call.peerConnection.onconnectionstatechange = () => {
                    console.log('🔌 Answer Connection State:', call.peerConnection.connectionState);
                };
                
                call.peerConnection.oniceconnectionstatechange = () => {
                    console.log('Answer ICE State:', call.peerConnection.iceConnectionState);
                };
                
                call.peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        console.log('Answer ICE Candidate:', event.candidate.type, event.candidate.address || '');
                    }
                };
                
                // Check transceivers
                const transceivers = call.peerConnection.getTransceivers();
                console.log('📼 Answer Transceivers:', transceivers.map(t => ({
                    mid: t.mid,
                    direction: t.direction,
                    currentDirection: t.currentDirection,
                    kind: t.sender?.track?.kind
                })));
            }
            
            showNotification('Call connected!', 'success');
        } else if (callType === 'screen') {
            console.log('📺 Answering screen share call from:', call.peer);
            call.answer();
            screenCall = call;
            handleStream(call, remoteScreen, containerRemoteScreen);
        }
    });

    peer.on('error', (err) => {
        console.error('❌ PeerJS Error:', err);
        showNotification(`Error: ${err.type}`, 'error');
    });

    peer.on('disconnected', () => {
        console.log('⚠️ Peer disconnected from server, attempting reconnect...');
        showNotification('Reconnecting...', 'info');
        peer.reconnect();
    });

    peer.on('close', () => {
        console.log('❌ Peer connection closed');
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
        console.log('🎥 Requesting getUserMedia...');
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
        
        console.log('✅ Local stream acquired:', {
            id: myStream.id,
            active: myStream.active,
            tracks: myStream.getTracks().map(t => ({
                kind: t.kind,
                id: t.id,
                label: t.label,
                enabled: t.enabled,
                muted: t.muted,
                readyState: t.readyState
            }))
        });
        
        // Monitor local tracks (Sender side debugging)
        myStream.getTracks().forEach(track => {
            console.log(`📌 Setting up local track monitor for ${track.kind}:`, track.label);
            track.onmute = () => {
                console.warn('⚠️ MY local track muted (Sender side):', track.kind, track.id);
                showNotification(`Your ${track.kind} stopped sending data`, 'error');
            };
            track.onunmute = () => console.log('✅ MY local track unmuted (Sender side):', track.kind, track.id);
            track.onended = () => {
                console.log('❌ MY local track ended:', track.kind, track.id);
                showNotification(`Your ${track.kind} ended`, 'error');
            };
        });

        localVideo.srcObject = myStream;
        console.log('📺 Local video element srcObject set');
        
        // Monitor local video element
        localVideo.onloadedmetadata = () => console.log('✅ Local video metadata loaded');
        localVideo.onplay = () => console.log('▶️ Local video playing');
        localVideo.onpause = () => console.log('⏸️ Local video paused');
        
        return true;
    } catch (err) {
        console.error('❌ Failed to get local stream:', err);
        showNotification('Could not access camera/microphone', 'error');
        return false;
    }
}

function handleStream(call, videoElement, container) {
    // Prevent duplicate handling for the same call instance
    if (call.handled) {
        console.log('⚠️ Call already handled:', call.peer);
        return;
    }
    call.handled = true;
    
    let streamReceived = false;  // Prevent duplicate handling
    
    const callTimeout = setTimeout(() => {
        if (container.classList.contains('placeholder')) {
            console.warn('⏰ Stream timeout for:', call.peer);
            showNotification('Connection taking longer than expected...', 'error');
        }
    }, 15000);

    call.on('stream', (remoteStream) => {
        // Only handle the first stream event
        if (streamReceived) {
            console.log('⚠️ Ignoring duplicate stream event for:', call.peer);
            return;
        }
        streamReceived = true;
        
        clearTimeout(callTimeout);
        console.log('📥 Stream received from:', call.peer);
        console.log('Stream details:', {
            id: remoteStream.id,
            active: remoteStream.active,
            tracks: remoteStream.getTracks().map(t => `${t.kind}:enabled=${t.enabled}:muted=${t.muted}:readyState=${t.readyState}:id=${t.id.substring(0,8)}`)
        });
        
        // Detailed track inspection
        remoteStream.getTracks().forEach(track => {
            console.log(`🔍 Remote ${track.kind} track details:`, {
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                muted: track.muted,
                readyState: track.readyState,
                constraints: track.getConstraints(),
                settings: track.getSettings()
            });
        });
        
        // CRITICAL: Check if we can get sender info from the peer connection
        if (call.peerConnection) {
            const senders = call.peerConnection.getSenders();
            console.log('📤 Checking SENDER tracks (what remote peer is sending):');
            senders.forEach(sender => {
                if (sender.track) {
                    console.log(`  ${sender.track.kind} sender:`, {
                        enabled: sender.track.enabled,
                        muted: sender.track.muted,
                        readyState: sender.track.readyState,
                        id: sender.track.id.substring(0, 8)
                    });
                }
            });
            
            const receivers = call.peerConnection.getReceivers();
            console.log('📥 Checking RECEIVER tracks (what we are receiving):');
            receivers.forEach(receiver => {
                if (receiver.track) {
                    console.log(`  ${receiver.track.kind} receiver:`, {
                        enabled: receiver.track.enabled,
                        muted: receiver.track.muted,
                        readyState: receiver.track.readyState,
                        id: receiver.track.id.substring(0, 8)
                    });
                }
            });
        }
        
        // IMMEDIATE stats check to see initial state
        if (call.peerConnection) {
            console.log('📊 Getting IMMEDIATE WebRTC stats...');
            setTimeout(async () => {
                try {
                    const stats = await call.peerConnection.getStats();
                    console.log('📊 Initial WebRTC Stats (500ms after stream received):');
                    
                    // Log ALL stat types to see what we have
                    const statTypes = {};
                    stats.forEach(report => {
                        statTypes[report.type] = (statTypes[report.type] || 0) + 1;
                        
                        if (report.type === 'inbound-rtp') {
                            console.log(`  ${report.kind} inbound:`, {
                                bytesReceived: report.bytesReceived,
                                packetsReceived: report.packetsReceived,
                                packetsLost: report.packetsLost,
                                framesReceived: report.framesReceived,
                                framesDecoded: report.framesDecoded,
                                jitter: report.jitter
                            });
                        }
                        if (report.type === 'remote-inbound-rtp') {
                            console.log(`  ${report.kind} remote-inbound (what they see from us):`, {
                                packetsLost: report.packetsLost,
                                jitter: report.jitter,
                                roundTripTime: report.roundTripTime
                            });
                        }
                        if (report.type === 'track') {
                            console.log(`  track ${report.kind}:`, {
                                trackIdentifier: report.trackIdentifier,
                                remoteSource: report.remoteSource,
                                ended: report.ended,
                                framesReceived: report.framesReceived,
                                framesDecoded: report.framesDecoded
                            });
                        }
                    });
                    
                    console.log('📊 Stat types found:', statTypes);
                    
                    // Check transceivers
                    const transceivers = call.peerConnection.getTransceivers();
                    console.log('📼 Transceivers:', transceivers.map(t => ({
                        mid: t.mid,
                        direction: t.direction,
                        currentDirection: t.currentDirection,
                        sender: {
                            track: t.sender.track ? {
                                kind: t.sender.track.kind,
                                enabled: t.sender.track.enabled,
                                muted: t.sender.track.muted,
                                readyState: t.sender.track.readyState
                            } : null
                        },
                        receiver: {
                            track: t.receiver.track ? {
                                kind: t.receiver.track.kind,
                                enabled: t.receiver.track.enabled,
                                muted: t.receiver.track.muted,
                                readyState: t.receiver.track.readyState
                            } : null
                        }
                    })));
                    
                    // Log the SDP to see what was negotiated
                    const localDesc = call.peerConnection.localDescription;
                    const remoteDesc = call.peerConnection.remoteDescription;
                    console.log('📤 SDP Info:', {
                        localType: localDesc?.type,
                        remoteType: remoteDesc?.type,
                        localHasVideo: localDesc?.sdp?.includes('m=video'),
                        localHasAudio: localDesc?.sdp?.includes('m=audio'),
                        remoteHasVideo: remoteDesc?.sdp?.includes('m=video'),
                        remoteHasAudio: remoteDesc?.sdp?.includes('m=audio')
                    });
                    
                } catch (err) {
                    console.error('❌ Failed to get initial stats:', err);
                }
            }, 500);
        }
        
        // Set the stream
        console.log(`📺 Setting srcObject on ${videoElement.id}`);
        videoElement.srcObject = remoteStream;
        console.log(`✅ srcObject set. Video element state:`, {
            paused: videoElement.paused,
            ended: videoElement.ended,
            readyState: videoElement.readyState,
            networkState: videoElement.networkState,
            muted: videoElement.muted,
            volume: videoElement.volume
        });
        container.classList.remove('placeholder');
        
        // Playback logic
        const playVideo = async () => {
            console.log(`🎬 playVideo() called for ${videoElement.id}`);
            console.log('Video element state before play:', {
                paused: videoElement.paused,
                ended: videoElement.ended,
                readyState: videoElement.readyState,
                networkState: videoElement.networkState,
                srcObject: videoElement.srcObject ? 'present' : 'null',
                tracks: videoElement.srcObject ? videoElement.srcObject.getTracks().map(t => `${t.kind}:${t.readyState}:${t.enabled}:muted=${t.muted}`) : 'none'
            });
            
            try {
                // Always start muted to satisfy Autoplay policy immediately
                console.log(`🔇 Muting ${videoElement.id} for autoplay`);
                videoElement.muted = true;
                
                console.log(`▶️ Calling play() on ${videoElement.id}...`);
                await videoElement.play();
                
                console.log(`✅ Video playing (muted): ${videoElement.id}`, {
                    paused: videoElement.paused,
                    currentTime: videoElement.currentTime,
                    duration: videoElement.duration
                });
                
                // Now try to unmute
                try {
                    console.log(`🔊 Attempting to unmute ${videoElement.id}`);
                    videoElement.muted = false;
                    console.log('✅ Unmuted successfully');
                } catch (err) {
                    console.warn('⚠️ Could not unmute automatically:', err);
                    showNotification('Click video to enable audio', 'info');
                    // Add one-time click handler
                    const unmuteHandler = () => {
                        console.log('🖱️ User clicked to unmute');
                        videoElement.muted = false;
                        container.removeEventListener('click', unmuteHandler);
                    };
                    container.addEventListener('click', unmuteHandler);
                }
            } catch (err) {
                console.error(`❌ Play failed for ${videoElement.id}:`, {
                    name: err.name,
                    message: err.message,
                    videoState: {
                        paused: videoElement.paused,
                        readyState: videoElement.readyState,
                        networkState: videoElement.networkState
                    }
                });
                
                if (err.name === 'AbortError') {
                    console.log('⏳ Retrying play in 500ms due to AbortError...');
                    setTimeout(playVideo, 500);
                } else {
                    showNotification('Click to start video', 'error');
                    container.onclick = () => {
                        console.log('🖱️ User clicked to retry play');
                        playVideo();
                        container.onclick = null;
                    };
                }
            }
        };

        // Wait for video to be ready
        console.log(`📊 Video ${videoElement.id} readyState: ${videoElement.readyState} (${['HAVE_NOTHING', 'HAVE_METADATA', 'HAVE_CURRENT_DATA', 'HAVE_FUTURE_DATA', 'HAVE_ENOUGH_DATA'][videoElement.readyState]})`);
        
        // CRITICAL FIX: Try playing IMMEDIATELY to prevent track from muting
        // The track mutes if the video element doesn't start consuming the stream fast enough
        console.log('🚀 Attempting IMMEDIATE play to prevent track timeout...');
        playVideo();
        
        // Still set up the metadata handler as backup
        if (videoElement.readyState < 1) {
            console.log('⏳ Also waiting for metadata as backup...');
            videoElement.onloadedmetadata = () => {
                console.log(`✅ Video metadata loaded for: ${videoElement.id}`, {
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight,
                    duration: videoElement.duration
                });
                // Don't call playVideo again if already playing
                if (videoElement.paused) {
                    console.log('📺 Video still paused after metadata load, retrying play...');
                    playVideo();
                }
            };
        }
        
        // Add comprehensive video element event listeners
        videoElement.onplay = () => console.log(`▶️ ${videoElement.id} PLAY event`);
        videoElement.onplaying = () => console.log(`▶️ ${videoElement.id} PLAYING event`);
        videoElement.onpause = () => console.log(`⏸️ ${videoElement.id} PAUSE event`);
        videoElement.onstalled = () => console.warn(`⚠️ ${videoElement.id} STALLED event`);
        videoElement.onsuspend = () => console.log(`⏸️ ${videoElement.id} SUSPEND event`);
        videoElement.onwaiting = () => console.log(`⏳ ${videoElement.id} WAITING event`);
        videoElement.onerror = (e) => console.error(`❌ ${videoElement.id} ERROR event:`, videoElement.error);
        videoElement.onloadstart = () => console.log(`📥 ${videoElement.id} LOADSTART event`);
        videoElement.oncanplay = () => console.log(`✅ ${videoElement.id} CANPLAY event`);
        videoElement.oncanplaythrough = () => console.log(`✅ ${videoElement.id} CANPLAYTHROUGH event`);
        
        // Monitor track status with detailed logging
        remoteStream.getTracks().forEach(track => {
            console.log(`📌 Setting up remote track monitors for ${track.kind}:`, track.id.substring(0,8));
            
            track.onended = () => {
                console.log(`❌ Remote track ENDED: ${track.kind}`, track.id.substring(0,8));
                showNotification(`Remote ${track.kind} ended`, 'error');
            };
            
            track.onmute = async () => {
                console.warn(`🔇 Remote track MUTED: ${track.kind}`, {
                    id: track.id.substring(0,8),
                    enabled: track.enabled,
                    readyState: track.readyState,
                    muted: track.muted
                });
                showNotification(`Remote ${track.kind} muted`, 'error');
                
                // Check video element state when track mutes
                console.log('Video element state when track muted:', {
                    id: videoElement.id,
                    paused: videoElement.paused,
                    readyState: videoElement.readyState,
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight,
                    currentTime: videoElement.currentTime
                });
                
                // Check WebRTC stats immediately when mute happens
                if (call.peerConnection) {
                    try {
                        const stats = await call.peerConnection.getStats();
                        let inboundStats = null;
                        
                        stats.forEach(report => {
                            if (report.type === 'inbound-rtp' && report.kind === track.kind) {
                                inboundStats = report;
                            }
                        });
                        
                        console.log(`📊 WebRTC stats when ${track.kind} muted:`, inboundStats ? {
                            bytesReceived: inboundStats.bytesReceived,
                            packetsReceived: inboundStats.packetsReceived,
                            packetsLost: inboundStats.packetsLost,
                            framesReceived: inboundStats.framesReceived,
                            framesDecoded: inboundStats.framesDecoded
                        } : 'No stats available');
                        
                        // Check if we're receiving ANY data
                        if (inboundStats && inboundStats.bytesReceived === 0) {
                            console.error('❌ ZERO bytes received for', track.kind, '- connection issue!');
                        }
                    } catch (err) {
                        console.error('Failed to get stats on mute:', err);
                    }
                }
            };
            
            track.onunmute = () => {
                console.log(`🔊 Remote track UNMUTED: ${track.kind}`, {
                    id: track.id.substring(0,8),
                    enabled: track.enabled,
                    readyState: track.readyState,
                    muted: track.muted
                });
                
                // Set a timer to check if it stays unmuted
                setTimeout(() => {
                    console.log(`⏰ Track state 2s after unmute (${track.kind}):`, {
                        muted: track.muted,
                        enabled: track.enabled,
                        readyState: track.readyState
                    });
                    if (track.muted) {
                        console.error('❌ Track muted again within 2 seconds!');
                    }
                }, 2000);
            };
        });
        
        // WebRTC Stats Monitoring - Check actual data flow MORE FREQUENTLY
        let lastVideoBytes = 0;
        let lastAudioBytes = 0;
        let statsCheckCount = 0;
        
        const statsMonitor = setInterval(async () => {
            if (!call.peerConnection) {
                clearInterval(statsMonitor);
                return;
            }
            
            statsCheckCount++;
            
            try {
                const stats = await call.peerConnection.getStats();
                let videoInbound = null;
                let audioInbound = null;
                let candidatePair = null;
                
                // Count stat types
                const statTypes = {};
                stats.forEach(report => {
                    statTypes[report.type] = (statTypes[report.type] || 0) + 1;
                    
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                        videoInbound = report;
                    }
                    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                        audioInbound = report;
                    }
                    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                        candidatePair = report;
                    }
                });
                
                // Log available stat types on first few checks
                if (statsCheckCount <= 3) {
                    console.log('📊 Available stat types:', statTypes);
                }
                
                const videoBytesDelta = videoInbound ? videoInbound.bytesReceived - lastVideoBytes : 0;
                const audioBytesDelta = audioInbound ? audioInbound.bytesReceived - lastAudioBytes : 0;
                
                console.log(`📡 WebRTC Stats Check #${statsCheckCount}:`, {
                    video: videoInbound ? {
                        bytesReceived: videoInbound.bytesReceived,
                        bytesDelta: videoBytesDelta,
                        packetsReceived: videoInbound.packetsReceived,
                        packetsLost: videoInbound.packetsLost,
                        framesReceived: videoInbound.framesReceived,
                        framesDecoded: videoInbound.framesDecoded,
                        framesDropped: videoInbound.framesDropped,
                        jitter: videoInbound.jitter?.toFixed(4)
                    } : '❌ No video stats',
                    audio: audioInbound ? {
                        bytesReceived: audioInbound.bytesReceived,
                        bytesDelta: audioBytesDelta,
                        packetsReceived: audioInbound.packetsReceived
                    } : '❌ No audio stats',
                    connection: candidatePair ? {
                        currentRoundTripTime: candidatePair.currentRoundTripTime?.toFixed(3),
                        availableOutgoingBitrate: candidatePair.availableOutgoingBitrate,
                        state: candidatePair.state
                    } : 'No connection stats'
                });
                
                // Alert if NO data is flowing
                if (videoInbound && videoBytesDelta === 0 && statsCheckCount > 3) {
                    console.error('❌❌❌ NO VIDEO DATA FLOWING! Bytes received is not increasing!');
                    showNotification('⚠️ No video data received - check remote camera', 'error');
                }
                
                // Alert if no inbound-rtp stats exist at all
                if (!videoInbound && !audioInbound && statsCheckCount === 3) {
                    console.error('❌❌❌ NO INBOUND-RTP STATS! Media channels not established!');
                    showNotification('⚠️ WebRTC media not flowing - connection issue', 'error');
                }
                
                lastVideoBytes = videoInbound ? videoInbound.bytesReceived : 0;
                lastAudioBytes = audioInbound ? audioInbound.bytesReceived : 0;
                
                // Get codec info
                if (videoInbound && videoInbound.codecId) {
                    const codec = stats.get(videoInbound.codecId);
                    if (codec) {
                        console.log('🎬 Video Codec:', {
                            mimeType: codec.mimeType,
                            clockRate: codec.clockRate,
                            payloadType: codec.payloadType
                        });
                    }
                }
                
            } catch (err) {
                console.error('❌ Failed to get periodic stats:', err);
            }
        }, 1000); // Check every 1 second for more responsive debugging
        
        // Periodic state monitoring
        const stateMonitor = setInterval(() => {
            if (!videoElement.srcObject) {
                console.log('🛑 Stopping state monitor - srcObject removed');
                clearInterval(stateMonitor);
                clearInterval(statsMonitor);
                return;
            }
            
            const tracks = remoteStream.getTracks();
            console.log(`📊 Periodic state check for ${videoElement.id}:`, {
                videoElement: {
                    paused: videoElement.paused,
                    ended: videoElement.ended,
                    readyState: videoElement.readyState,
                    networkState: videoElement.networkState,
                    currentTime: videoElement.currentTime.toFixed(2),
                    videoWidth: videoElement.videoWidth,
                    videoHeight: videoElement.videoHeight
                },
                stream: {
                    active: remoteStream.active,
                    tracks: tracks.map(t => `${t.kind}:enabled=${t.enabled}:muted=${t.muted}:state=${t.readyState}`)
                }
            });
        }, 5000);
    });

    call.on('close', () => {
        clearTimeout(callTimeout);
        videoElement.srcObject = null;
        container.classList.add('placeholder');
    });

    call.on('error', (err) => {
        clearTimeout(callTimeout);
        console.error('❌ Call error with:', call.peer, err);
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
    
    if (!remoteId) {
        showNotification('Please enter a Peer ID', 'error');
        return;
    }

    connectBtn.disabled = true;
    connectBtn.innerText = '...';

    // Call with video
    console.log('📞 Initiating video call to:', remoteId);
    console.log('Local stream for call:', {
        streamId: myStream?.id,
        active: myStream?.active,
        tracks: myStream?.getTracks().map(t => `${t.kind}:enabled=${t.enabled}:muted=${t.muted}:state=${t.readyState}:id=${t.id.substring(0,8)}`)
    });
    
    // CRITICAL: Verify local stream is actually working before sending
    const videoTrack = myStream?.getVideoTracks()[0];
    if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('📹 Local video track settings before call:', {
            width: settings.width,
            height: settings.height,
            frameRate: settings.frameRate,
            facingMode: settings.facingMode,
            deviceId: settings.deviceId
        });
        
        if (settings.width === 0 || settings.height === 0) {
            console.error('❌ WARNING: Local video has 0x0 dimensions - camera may not be working!');
            showNotification('⚠️ Camera issue detected - check permissions', 'error');
        }
    }
    
    const call = peer.call(remoteId, myStream, { metadata: { type: 'video' } });
    
    if (!call) {
        console.error('❌ Failed to create call object');
        showNotification('Failed to start call', 'error');
        connectBtn.disabled = false;
        connectBtn.innerText = 'Connect';
        return;
    }
    
    console.log('✅ Call object created:', call.peer);

    currentCall = call;
    handleStream(call, remoteVideo, containerRemoteVideo);
    
    showNotification('Connecting...', 'info');

    call.on('error', (err) => {
        console.error('❌ Call error:', err);
        showNotification('Connection failed', 'error');
        connectBtn.disabled = false;
        connectBtn.innerText = 'Connect';
    });
    
    // Monitor ICE connection state
    if (call.peerConnection) {
        // Monitor signaling and connection states
        console.log('🔗 Initial WebRTC states:', {
            signalingState: call.peerConnection.signalingState,
            iceConnectionState: call.peerConnection.iceConnectionState,
            iceGatheringState: call.peerConnection.iceGatheringState,
            connectionState: call.peerConnection.connectionState
        });
        
        call.peerConnection.onsignalingstatechange = () => {
            console.log('📡 Signaling State Change:', call.peerConnection.signalingState);
        };
        
        call.peerConnection.onconnectionstatechange = () => {
            console.log('🔌 Connection State Change:', call.peerConnection.connectionState);
            if (call.peerConnection.connectionState === 'failed') {
                console.error('❌ WebRTC connection failed!');
                showNotification('Connection failed - check network/firewall', 'error');
            }
        };
        
        // Monitor transceivers for codec info
        const transceivers = call.peerConnection.getTransceivers();
        console.log('📼 Transceivers:', transceivers.map(t => ({
            mid: t.mid,
            direction: t.direction,
            currentDirection: t.currentDirection,
            kind: t.sender?.track?.kind,
            stopped: t.stopped
        })));
        
        // Log ICE candidates for debugging
        call.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('ICE Candidate:', event.candidate.type, event.candidate.address);
            }
        };

        call.peerConnection.oniceconnectionstatechange = () => {
            const state = call.peerConnection.iceConnectionState;
            console.log('🧊 ICE Connection State:', state);
            
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
                                console.log('🔗 Connected via:', type);
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
                console.error('❌ ICE connection failed');
                showNotification('Connection failed. Try again.', 'error');
                connectBtn.disabled = false;
                connectBtn.innerText = 'Retry';
                
            } else if (state === 'disconnected') {
                console.log('⚠️ ICE disconnected. Waiting for recovery...');
                setTimeout(() => {
                    if (call.peerConnection && call.peerConnection.iceConnectionState === 'disconnected') {
                        console.log('⚠️ Still disconnected after 15s, keeping connection...');
                        showNotification('Connection unstable. Video may freeze.', 'error');
                    }
                }, 15000);
                
            } else if (state === 'closed') {
                connectBtn.disabled = false;
                connectBtn.innerText = 'Connect';
            }
        };

        call.peerConnection.onicegatheringstatechange = () => {
            console.log('🧊 ICE Gathering State:', call.peerConnection.iceGatheringState);
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
                console.log('🔊 Screen audio enabled');
                showNotification('🔊 Screen audio enabled!', 'success');
            } else {
                console.log('⚠️ No screen audio shared');
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
                console.log('📺 Screen shared with:', currentCall.peer);
                showNotification('Screen shared with partner!', 'success');
            }

            // Handle user stopping via browser UI
            myScreenStream.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };

        } catch (err) {
            console.error('❌ Error sharing screen:', err);
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
        console.error('❌ Local stream failed, not initializing peer');
        showNotification('Please allow camera access and refresh', 'error');
    }
});
