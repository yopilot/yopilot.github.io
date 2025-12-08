        // P2P Screen Sharing App using PeerJS
        class P2PScreenShare {
            constructor() {
                console.log('[P2P] Initializing P2PScreenShare with PeerJS...');
                this.localStream = null;
                this.videoCallStream = null;
                this.audioCallStream = null;
                this.standaloneMicStream = null;
                this.standaloneMicCall = null;
                this.micAnswerStream = null;
                this.videoStream = null;
                this.videoCall = null;
                this.peer = null;
                this.currentConnection = null;
                this.currentCall = null;
                this.videoCall = null;
                this.audioCall = null;
                this.remotePeerId = null;
                this.isScreenSharing = false;
                this.isVideoCallActive = false;
                this.isAudioCallActive = false;
                
                this.initElements();
                this.initPeerJS();
                this.initEventListeners();
                
                console.log('[P2P] Initialization complete.');
            }
            
            log(msg, ...args) {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}] [P2P] ${msg}`, ...args);
            }
            
            error(msg, err) {
                const timestamp = new Date().toLocaleTimeString();
                console.error(`[${timestamp}] [P2P] ERROR: ${msg}`, err);
            }
            
            initElements() {
                this.myIdInput = document.getElementById('myId');
                this.copyIdBtn = document.getElementById('copyId');
                this.startConnectionBtn = document.getElementById('startConnectionBtn');
                this.receiveConnectionBtn = document.getElementById('receiveConnectionBtn');
                this.shareScreenBtn = document.getElementById('shareScreen');
                this.stopShareBtn = document.getElementById('stopShare');
                this.videoToggle = document.getElementById('videoToggle');
                this.localScreen = document.getElementById('localScreen');
                this.remoteScreen = document.getElementById('remoteScreen');
                this.localVideo = document.getElementById('localVideo');
                this.remoteVideo = document.getElementById('remoteVideo');
                this.connectionStatus = document.getElementById('connectionStatus');
                this.streamStatus = document.getElementById('streamStatus');
                
                // Track which streams are active
                this.activeStreams = {
                    screenLocal: false,
                    screenRemote: false,
                    videoLocal: false,
                    videoRemote: false
                };
                
                // Setup draggable functionality
                this.setupDraggable();
            }
            
            setupDraggable() {
                const wrappers = ['localScreenWrapper', 'remoteScreenWrapper', 'localVideoWrapper', 'remoteVideoWrapper'];
                
                wrappers.forEach(id => {
                    const wrapper = document.getElementById(id);
                    let isDragging = false;
                    let isResizing = false;
                    let resizeDirection = null;
                    let startX, startY, startWidth, startHeight, startLeft, startTop;
                    
                    const minWidth = 200;
                    const minHeight = 112;
                    const maxWidth = 800;
                    const maxHeight = 450;
                    
                    let initialPinchDistance = 0;
                    let initialPinchWidth = 0;
                    let initialPinchHeight = 0;
                    
                    // Calculate distance between two touch points
                    const getPinchDistance = (touches) => {
                        const dx = touches[0].clientX - touches[1].clientX;
                        const dy = touches[0].clientY - touches[1].clientY;
                        return Math.sqrt(dx * dx + dy * dy);
                    };
                    
                    // Unified function to get coordinates from mouse or touch event
                    const getCoordinates = (e) => {
                        if (e.touches && e.touches.length > 0) {
                            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                        }
                        return { x: e.clientX, y: e.clientY };
                    };
                    
                    // Start drag or resize (works for both mouse and touch)
                    const handleStart = (e) => {
                        if (!wrapper.classList.contains('pip')) return;
                        
                        // Handle pinch gesture (2 fingers)
                        if (e.touches && e.touches.length === 2) {
                            isResizing = true;
                            resizeDirection = 'pinch';
                            initialPinchDistance = getPinchDistance(e.touches);
                            initialPinchWidth = wrapper.offsetWidth;
                            initialPinchHeight = wrapper.offsetHeight;
                            e.preventDefault();
                            return;
                        }
                        
                        const coords = getCoordinates(e);
                        
                        // Check if clicking/touching on a resize handle
                        if (e.target.classList.contains('resize-handle')) {
                            isResizing = true;
                            resizeDirection = e.target.className.split(' ').find(c => c.startsWith('resize-'));
                            startX = coords.x;
                            startY = coords.y;
                            startWidth = wrapper.offsetWidth;
                            startHeight = wrapper.offsetHeight;
                            startLeft = wrapper.offsetLeft;
                            startTop = wrapper.offsetTop;
                            e.preventDefault();
                            e.stopPropagation();
                        } else if (e.target === wrapper || e.target.tagName === 'VIDEO') {
                            // Only drag when clicking on wrapper or video, not on buttons
                            isDragging = true;
                            startX = coords.x - wrapper.offsetLeft;
                            startY = coords.y - wrapper.offsetTop;
                            e.preventDefault();
                        }
                    };
                    
                    // Handle move (works for both mouse and touch)
                    const handleMove = (e) => {
                        if (!isDragging && !isResizing) return;
                        
                        e.preventDefault();
                        const coords = getCoordinates(e);
                        
                        if (isDragging) {
                            let newLeft = coords.x - startX;
                            let newTop = coords.y - startY;
                            
                            // Keep within viewport bounds
                            const maxLeft = window.innerWidth - wrapper.offsetWidth;
                            const maxTop = window.innerHeight - wrapper.offsetHeight;
                            
                            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
                            newTop = Math.max(0, Math.min(newTop, maxTop));
                            
                            wrapper.style.left = newLeft + 'px';
                            wrapper.style.top = newTop + 'px';
                            wrapper.style.right = 'auto';
                            wrapper.style.bottom = 'auto';
                        } else if (isResizing) {
                            // Handle pinch gesture
                            if (resizeDirection === 'pinch' && e.touches && e.touches.length === 2) {
                                const currentDistance = getPinchDistance(e.touches);
                                const scale = currentDistance / initialPinchDistance;
                                
                                let newWidth = initialPinchWidth * scale;
                                let newHeight = initialPinchHeight * scale;
                                
                                // Apply constraints
                                newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
                                newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
                                
                                wrapper.style.width = newWidth + 'px';
                                wrapper.style.height = newHeight + 'px';
                                return;
                            }
                            
                            const deltaX = coords.x - startX;
                            const deltaY = coords.y - startY;
                            
                            let newWidth = startWidth;
                            let newHeight = startHeight;
                            let newLeft = startLeft;
                            let newTop = startTop;
                            
                            // Handle different resize directions
                            if (resizeDirection.includes('e')) {
                                newWidth = startWidth + deltaX;
                            }
                            if (resizeDirection.includes('w')) {
                                newWidth = startWidth - deltaX;
                                newLeft = startLeft + deltaX;
                            }
                            if (resizeDirection.includes('s')) {
                                newHeight = startHeight + deltaY;
                            }
                            if (resizeDirection.includes('n')) {
                                newHeight = startHeight - deltaY;
                                newTop = startTop + deltaY;
                            }
                            
                            // Apply constraints
                            newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
                            newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
                            
                            // Apply new dimensions
                            wrapper.style.width = newWidth + 'px';
                            wrapper.style.height = newHeight + 'px';
                            
                            // Update position if resizing from left or top
                            if (resizeDirection.includes('w')) {
                                const widthDiff = newWidth - startWidth;
                                wrapper.style.left = (startLeft - widthDiff) + 'px';
                            }
                            if (resizeDirection.includes('n')) {
                                const heightDiff = newHeight - startHeight;
                                wrapper.style.top = (startTop - heightDiff) + 'px';
                            }
                            
                            wrapper.style.right = 'auto';
                            wrapper.style.bottom = 'auto';
                        }
                    };
                    
                    // Handle end (works for both mouse and touch)
                    const handleEnd = () => {
                        isDragging = false;
                        isResizing = false;
                        resizeDirection = null;
                    };
                    
                    // Mouse events
                    wrapper.addEventListener('mousedown', handleStart);
                    document.addEventListener('mousemove', handleMove);
                    document.addEventListener('mouseup', handleEnd);
                    
                    // Touch events for mobile
                    wrapper.addEventListener('touchstart', handleStart, { passive: false });
                    document.addEventListener('touchmove', handleMove, { passive: false });
                    document.addEventListener('touchend', handleEnd);
                    document.addEventListener('touchcancel', handleEnd);
                });
            }
            
            initPeerJS() {
                this.log('Connecting to PeerJS cloud server...');
                
                // Use same config as finalchat.html for reliable worldwide connections
                this.peer = new Peer({
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
                        bundlePolicy: 'max-bundle',
                        rtcpMuxPolicy: 'require',
                        encodedInsertableStreams: false,
                        // Optimize for high-quality audio
                        sdpTransform: function(sdp) {
                            // Set Opus codec as preferred with optimal settings for voice
                            sdp = sdp.replace(/a=fmtp:(\d+).*\r\n/g, function(match, codecId) {
                                // Check if this is Opus codec (typically 111)
                                if (sdp.includes('a=rtpmap:' + codecId + ' opus/48000/2')) {
                                    return 'a=fmtp:' + codecId + ' minptime=10;useinbandfec=1;maxaveragebitrate=510000;stereo=1;sprop-stereo=1;cbr=1\r\n';
                                }
                                return match;
                            });
                            // Set audio bitrate to maximum for crisp quality
                            sdp = sdp.replace(/(m=audio \d+ [\w\/]+)(.*)/g, '$1$2\r\nb=AS:510\r\nb=TIAS:510000');
                            return sdp;
                        }
                    }
                });
                
                this.peer.on('open', (id) => {
                    this.myIdInput.value = id;
                    this.log('✅ Connected to PeerJS! Your ID:', id);
                });
                
                this.peer.on('connection', (conn) => {
                    this.log('📥 Incoming connection from:', conn.peer);
                    this.handleIncomingConnection(conn);
                });
                
                this.peer.on('call', (call) => {
                    this.log('📞 Incoming call from:', call.peer);
                    this.handleIncomingCall(call);
                });
                
                this.peer.on('error', (err) => {
                    this.error('PeerJS error:', err);
                    if (err.type === 'peer-unavailable') {
                        alert('Peer not found! Make sure your friend is online and the ID is correct.');
                    } else if (err.type === 'network') {
                        alert('Network error. Check your internet connection.');
                    } else {
                        alert('Connection error: ' + err.message);
                    }
                });
                
                this.peer.on('disconnected', () => {
                    this.log('⚠️ Disconnected from PeerJS server. Attempting to reconnect...');
                    this.peer.reconnect();
                });
            }
            
            initEventListeners() {
                this.copyIdBtn.addEventListener('click', () => this.copyId());
                this.startConnectionBtn.addEventListener('click', () => this.showConnectDialog());
                this.receiveConnectionBtn.addEventListener('click', () => this.showConnectDialog());
                this.shareScreenBtn.addEventListener('click', () => this.startScreenShare());
                this.stopShareBtn.addEventListener('click', () => this.stopScreenShare());
                
                // Video toggle
                if (this.videoToggle) {
                    this.videoToggle.addEventListener('change', (e) => {
                        if (e.target.checked) {
                            this.startVideoStream();
                        } else {
                            this.stopVideoStream();
                        }
                    });
                }
                
                const chatInput = document.getElementById('chatInput');
                const sendBtn = document.getElementById('sendMessage');
                const toggleBtn = document.getElementById('toggleChat');
                
                if (sendBtn) {
                    sendBtn.addEventListener('click', () => this.sendChatMessage());
                }
                
                if (chatInput) {
                    chatInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') this.sendChatMessage();
                    });
                }
                
                if (toggleBtn) {
                    toggleBtn.addEventListener('click', () => this.toggleChatPanel());
                }
                
                // Chat panel click when minimized
                const chatPanel = document.getElementById('chatPanel');
                if (chatPanel) {
                    chatPanel.addEventListener('click', (e) => {
                        if (chatPanel.classList.contains('minimized') && e.target === chatPanel) {
                            this.toggleChatPanel();
                        }
                    });
                }
                
                window.addEventListener('beforeunload', () => {
                    this.cleanup();
                });
            }
            
            copyId() {
                const id = this.myIdInput.value;
                
                // Fallback for browsers/contexts without clipboard API
                if (!navigator.clipboard) {
                    // Use old-school method
                    this.myIdInput.select();
                    this.myIdInput.setSelectionRange(0, 99999); // For mobile
                    try {
                        document.execCommand('copy');
                        this.log('Peer ID copied to clipboard (fallback method)');
                        this.copyIdBtn.textContent = '✅';
                        setTimeout(() => {
                            this.copyIdBtn.textContent = '📋';
                        }, 2000);
                    } catch (err) {
                        this.error('Failed to copy:', err);
                        alert('Failed to copy. Please copy manually: ' + id);
                    }
                    return;
                }
                
                // Modern clipboard API
                navigator.clipboard.writeText(id).then(() => {
                    this.log('Peer ID copied to clipboard');
                    this.copyIdBtn.textContent = '✅';
                    setTimeout(() => {
                        this.copyIdBtn.textContent = '📋';
                    }, 2000);
                }).catch((err) => {
                    this.error('Failed to copy:', err);
                    alert('Failed to copy. Please copy manually: ' + id);
                });
            }
            
            showConnectDialog() {
                const peerId = prompt('Enter your friend\'s Peer ID:');
                if (peerId && peerId.trim()) {
                    this.connectToPeer(peerId.trim());
                }
            }
            
            connectToPeer(peerId) {
                if (!peerId || peerId === this.myIdInput.value) {
                    alert('Invalid peer ID or cannot connect to yourself!');
                    return;
                }
                
                this.log('🔌 Connecting to peer:', peerId);
                this.updateConnectionStatus('🔄 Connecting...', false);
                
                try {
                    // Close existing connection if any
                    if (this.currentConnection && this.currentConnection.open) {
                        this.log('Closing existing connection');
                        this.currentConnection.close();
                    }
                    
                    this.remotePeerId = peerId;
                    this.currentConnection = this.peer.connect(peerId, {
                        reliable: true
                    });
                    
                    this.setupConnection(this.currentConnection);
                } catch (error) {
                    this.error('Connection error:', error);
                    this.updateConnectionStatus('⚪ Connection Failed', false);
                    alert('Failed to connect. Check the ID and try again.');
                }
            }
            
            setupConnection(conn) {
                // Monitor connection state for debugging
                let checkCount = 0;
                const checkInterval = setInterval(() => {
                    checkCount++;
                    this.log(`Connection check #${checkCount}: open=${conn.open}, peerConnection=${conn.peerConnection?.connectionState}`);
                    if (conn.open) {
                        clearInterval(checkInterval);
                    }
                    if (checkCount >= 60) {
                        clearInterval(checkInterval);
                    }
                }, 1000);
                
                // If already open (can happen with incoming connections)
                if (conn.open) {
                    this.log('✅ Connection already open!');
                    this.activateConnection();
                }
                
                conn.on('open', () => {
                    this.log('✅ Data connection established!');
                    this.activateConnection();
                });
                
                conn.on('data', (data) => {
                    this.log('📨 Received data:', data);
                    
                    if (data.type === 'chat') {
                        this.addChatMessage(data.message, 'received', data.timestamp);
                    }
                });
                
                conn.on('close', () => {
                    this.log('❌ Connection closed');
                    this.updateConnectionStatus('⚪ Disconnected', false);
                    this.cleanup();
                });
                
                conn.on('error', (err) => {
                    this.error('Connection error:', err);
                });
            }
            
            async activateConnection() {
                this.log('🎉 Activating connection features...');
                this.updateConnectionStatus('🟢 Connected', true);
                
                // Auto-start microphone for voice chat (non-blocking)
                this.startMicStream().catch(err => {
                    this.error('Microphone auto-start failed:', err);
                    // Continue without microphone if it fails
                });
                
                const chatPanel = document.getElementById('chatPanel');
                if (chatPanel) {
                    chatPanel.style.display = 'flex';
                    this.addSystemMessage('💬 Connected! Voice chat active. Share your screen or turn on camera.');
                }
            }
            
            handleIncomingConnection(conn) {
                this.log('📥 Incoming connection from:', conn.peer);
                this.log('Connection metadata:', conn.metadata);
                this.log('Connection type:', conn.type);
                
                // If we already have a connection, close the old one and replace
                if (this.currentConnection && this.currentConnection.open) {
                    this.log('⚠️ Already connected, replacing old connection');
                    this.currentConnection.close();
                }
                
                this.currentConnection = conn;
                this.remotePeerId = conn.peer;
                this.log('✅ Accepted connection from:', conn.peer);
                
                // Wait a moment for connection to initialize (helps with reliability)
                setTimeout(() => {
                    this.setupConnection(conn);
                }, 100);
            }
            
            async handleIncomingCall(call) {
                this.currentCall = call;
                
                // Always answer with microphone for voice chat
                let answerStream = null;
                
                try {
                    // Create optimized microphone stream to send back
                    answerStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,          // Prevent echo
                            noiseSuppression: false,         // Keep voice natural, not robotic
                            autoGainControl: true,           // Auto-adjust volume
                            sampleRate: 48000,               // High quality sample rate
                            sampleSize: 16,                  // Standard bit depth (more compatible)
                            channelCount: 2,                 // Stereo for better spatial audio
                            latency: 0.01,                   // Low latency for real-time (10ms)
                            googEchoCancellation: true,      // Chrome-specific echo cancellation
                            googAutoGainControl: true,       // Chrome-specific auto gain
                            googNoiseSuppression: false,     // Disable to avoid robotic voice
                            googHighpassFilter: true,        // Remove low-frequency noise
                            googTypingNoiseDetection: true,  // Filter keyboard sounds
                            googAudioMirroring: false        // Disable audio mirroring
                        },
                        video: false
                    });
                    this.log('✅ Answering call with microphone enabled');
                } catch (err) {
                    this.log('⚠️ Could not access microphone for answer:', err.message);
                }
                
                // Answer the call with or without mic stream
                if (answerStream) {
                    call.answer(answerStream);
                    if (!this.micAnswerStream) {
                        this.micAnswerStream = answerStream;
                    }
                } else {
                    call.answer();
                }
                
                call.on('stream', (remoteStream) => {
                    this.log('📺 Receiving remote stream, metadata:', call.metadata);
                    
                    // Log quality info
                    const videoTrack = remoteStream.getVideoTracks()[0];
                    if (videoTrack) {
                        const settings = videoTrack.getSettings();
                        this.log(`📊 Video quality: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
                    }
                    
                    // Route based on metadata type
                    if (call.metadata && call.metadata.type === 'screen') {
                        this.log('Routing to remote screen share');
                        this.remoteScreen.srcObject = remoteStream;
                        this.remoteScreen.play().catch(e => this.error('Error playing remote screen:', e));
                        document.getElementById('remoteScreenWrapper').classList.remove('hidden');
                        this.activeStreams.screenRemote = true;
                    } else if (call.metadata && call.metadata.type === 'camera') {
                        this.log('Routing to remote video call');
                        this.remoteVideo.srcObject = remoteStream;
                        this.remoteVideo.play().catch(e => this.error('Error playing remote video:', e));
                        document.getElementById('remoteVideoWrapper').classList.remove('hidden');
                        this.activeStreams.videoRemote = true;
                    } else if (call.metadata && call.metadata.type === 'audio') {
                        this.log('Routing to remote audio call');
                        if (!this.remoteAudioElement) {
                            this.remoteAudioElement = document.createElement('audio');
                            this.remoteAudioElement.autoplay = true;
                            document.body.appendChild(this.remoteAudioElement);
                        }
                        this.remoteAudioElement.srcObject = remoteStream;
                    } else if (call.metadata && call.metadata.type === 'mic-only') {
                        this.log('Routing to microphone-only stream (background audio)');
                        if (!this.remoteMicElement) {
                            this.remoteMicElement = document.createElement('audio');
                            this.remoteMicElement.autoplay = true;
                            this.remoteMicElement.volume = 1.0;
                            // Optimize for real-time playback with no buffering
                            this.remoteMicElement.playsInline = true;
                            this.remoteMicElement.muted = false;
                            this.remoteMicElement.preload = 'none';
                            // Disable buffering for real-time audio
                            this.remoteMicElement.setAttribute('playsinline', 'true');
                            this.remoteMicElement.setAttribute('webkit-playsinline', 'true');
                            document.body.appendChild(this.remoteMicElement);
                        }
                        this.remoteMicElement.srcObject = remoteStream;
                        // Explicitly play to ensure audio starts immediately
                        this.remoteMicElement.play().then(() => {
                            this.log('✅ Friend\'s microphone audio playing in background (real-time)');
                        }).catch(err => {
                            this.error('Failed to play remote audio:', err);
                        });
                    } else {
                        // Fallback: guess based on track label
                        if (videoTrack && (videoTrack.label.toLowerCase().includes('screen') || videoTrack.label.toLowerCase().includes('monitor'))) {
                            this.remoteScreen.srcObject = remoteStream;
                            this.remoteScreen.play().catch(e => this.error('Error playing remote screen:', e));
                            document.getElementById('remoteScreenWrapper').classList.remove('hidden');
                            this.activeStreams.screenRemote = true;
                        } else {
                            this.remoteVideo.srcObject = remoteStream;
                            this.remoteVideo.play().catch(e => this.error('Error playing remote video:', e));
                            document.getElementById('remoteVideoWrapper').classList.remove('hidden');
                            this.activeStreams.videoRemote = true;
                        }
                    }
                });
                
                call.on('close', () => {
                    this.log('📞 Call ended');
                    this.remoteVideo.srcObject = null;
                });
                
                call.on('error', (err) => {
                    this.error('Call error:', err);
                });
            }
            
            async startScreenShare() {
                try {
                    this.log('🖥️ Requesting screen share...');
                    
                    // Stop video stream if active
                    if (this.videoStream) {
                        this.stopVideoStream();
                    }
                    
                    // Get screen with system audio (always on for movie sound)
                    const screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: {
                            width: { ideal: 3840, max: 3840 },
                            height: { ideal: 2160, max: 2160 },
                            frameRate: { ideal: 60, max: 60 },
                            cursor: 'always',
                            displaySurface: 'monitor'
                        },
                        audio: {
                            echoCancellation: false,
                            noiseSuppression: false,
                            autoGainControl: false,
                            sampleRate: 48000,
                            sampleSize: 24,
                            channelCount: 2
                        }
                    });
                    
                    // Microphone is handled separately via standalone stream
                    this.localStream = screenStream;
                    
                    this.localScreen.srcObject = this.localStream;
                    this.localScreen.muted = true; // Always mute local preview to prevent echo
                    this.localScreen.play().catch(e => this.error('Error playing local screen:', e));
                    document.getElementById('localScreenWrapper').classList.remove('hidden');
                    this.activeStreams.screenLocal = true;
                    
                    this.updateStreamStatus('🟢 Sharing', true);
                    this.log('✅ Screen sharing started');
                    this.isScreenSharing = true;
                    
                    if (this.remotePeerId) {
                        this.log('📞 Calling peer with screen share...');
                        this.currentCall = this.peer.call(this.remotePeerId, this.localStream, {
                            metadata: { type: 'screen' },
                            constraints: {
                                mandatory: {
                                    OfferToReceiveAudio: true,
                                    OfferToReceiveVideo: true
                                }
                            },
                            sdpTransform: (sdp) => {
                                // Increase bitrate for 4K quality
                                return sdp.replace(/a=fmtp:.*\r\n/g, (match) => {
                                    return match + 'a=max-message-size:262144\r\n';
                                }).replace(/(m=video.*\r\n)/g, '$1b=AS:10000\r\n')
                                  .replace(/(m=audio.*\r\n)/g, '$1b=AS:510\r\n');
                            }
                        });
                        
                        this.currentCall.on('stream', (remoteStream) => {
                            this.log('📺 Receiving remote stream');
                            this.remoteVideo.srcObject = remoteStream;
                            this.remoteVideo.play().catch(e => this.error('Error playing remote video:', e));
                        });
                    }
                    
                    screenStream.getVideoTracks()[0].onended = () => {
                        this.log('🛑 Screen sharing stopped by user');
                        this.stopScreenShare();
                    };
                    
                } catch (error) {
                    this.error('Failed to start screen sharing:', error);
                    if (error.name === 'NotAllowedError') {
                        alert('Screen sharing permission denied. Please allow screen sharing and try again.');
                    } else {
                        alert('Failed to start screen sharing: ' + error.message);
                    }
                }
            }
            
            stopScreenShare() {
                this.log('🛑 Stopping screen share...');
                
                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => {
                        track.stop();
                        this.log('Stopped track:', track.kind);
                    });
                    this.localStream = null;
                }
                
                this.localScreen.srcObject = null;
                document.getElementById('localScreenWrapper').classList.add('hidden');
                this.activeStreams.screenLocal = false;
                this.isScreenSharing = false;
                
                // Update status only if video call is not active
                if (!this.isVideoCallActive) {
                    this.updateStreamStatus('⚪ Not Sharing', false);
                }
                this.log('✅ Screen sharing stopped');
            }
            
            async startVideoCall() {
                try {
                    this.log('📹 Starting video call...');
                    
                    // CRITICAL: Stop screen sharing to prevent echo
                    if (this.isScreenSharing) {
                        this.log('⚠️ Stopping screen share to prevent echo');
                        this.stopScreenShare();
                    }
                    
                    const shareAudio = document.getElementById('shareAudio').checked;
                    const shareMic = document.getElementById('shareMic').checked;
                    
                    // Get camera and microphone
                    const constraints = {
                        video: {
                            width: { ideal: 1920, max: 3840 },
                            height: { ideal: 1080, max: 2160 },
                            frameRate: { ideal: 60, max: 60 },
                            facingMode: 'user',
                            aspectRatio: { ideal: 1.777778 }
                        },
                        audio: shareMic ? {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            sampleRate: 48000,
                            sampleSize: 24,
                            channelCount: 2
                        } : false
                    };
                    
                    this.videoCallStream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    // Show local video preview
                    this.localVideo.srcObject = this.videoCallStream;
                    this.localVideo.muted = true;
                    this.localVideo.play().catch(e => this.error('Error playing local video:', e));
                    document.getElementById('localVideoWrapper').classList.remove('hidden');
                    this.activeStreams.videoLocal = true;
                    
                    this.updateStreamStatus('🟢 Video Call Active', true);
                    this.log('✅ Video call started');
                    this.isVideoCallActive = true;
                    
                    // Enable stop button, disable start button
                    this.startVideoCallBtn.disabled = true;
                    this.stopVideoCallBtn.disabled = false;
                    
                    // If connected to peer, call them with the video stream
                    if (this.remotePeerId) {
                        this.log('📞 Calling peer with video call...');
                        this.videoCall = this.peer.call(this.remotePeerId, this.videoCallStream, {
                            metadata: { type: 'camera' },
                            constraints: {
                                mandatory: {
                                    OfferToReceiveAudio: true,
                                    OfferToReceiveVideo: true
                                }
                            },
                            sdpTransform: (sdp) => {
                                // Increase bitrate for HD video
                                return sdp.replace(/a=fmtp:.*\r\n/g, (match) => {
                                    return match + 'a=max-message-size:262144\r\n';
                                }).replace(/(m=video.*\r\n)/g, '$1b=AS:8000\r\n')
                                  .replace(/(m=audio.*\r\n)/g, '$1b=AS:510\r\n');
                            }
                        });
                        
                        this.videoCall.on('stream', (remoteStream) => {
                            this.log('📺 Receiving remote video call stream');
                            this.remoteVideo.srcObject = remoteStream;
                            this.remoteVideo.play().catch(e => this.error('Error playing remote video:', e));
                            document.getElementById('remoteVideoWrapper').classList.remove('hidden');
                            this.activeStreams.videoRemote = true;
                        });
                        
                        this.videoCall.on('close', () => {
                            this.log('📞 Video call ended by remote peer');
                        });
                    }
                    
                } catch (error) {
                    this.error('Failed to start video call:', error);
                    if (error.name === 'NotAllowedError') {
                        alert('Camera/microphone permission denied. Please allow access and try again.');
                    } else if (error.name === 'NotFoundError') {
                        alert('No camera or microphone found. Please connect a camera and try again.');
                    } else {
                        alert('Failed to start video call: ' + error.message);
                    }
                    
                    // Reset buttons on error
                    this.startVideoCallBtn.disabled = false;
                    this.stopVideoCallBtn.disabled = true;
                }
            }
            
            stopVideoCall() {
                this.log('🛑 Stopping video call...');
                
                // Stop all tracks from the stream
                if (this.videoCallStream) {
                    this.videoCallStream.getTracks().forEach(track => {
                        track.stop();
                        this.log('Stopped video call track:', track.kind, track.label);
                    });
                    this.videoCallStream = null;
                }
                
                // Clear video element and remove srcObject reference
                if (this.localVideo.srcObject) {
                    this.localVideo.srcObject.getTracks().forEach(track => track.stop());
                    this.localVideo.srcObject = null;
                }
                
                document.getElementById('localVideoWrapper').classList.add('hidden');
                this.activeStreams.videoLocal = false;
                this.isVideoCallActive = false;
                
                // Close peer call connection
                if (this.videoCall) {
                    this.videoCall.close();
                    this.videoCall = null;
                }
                
                // Update status only if screen sharing is not active
                if (!this.isScreenSharing) {
                    this.updateStreamStatus('⚪ Not Sharing', false);
                }
                
                this.startVideoCallBtn.disabled = false;
                this.stopVideoCallBtn.disabled = true;
                this.log('✅ Video call stopped and camera released');
            }
            
            async startAudioCall() {
                this.log('🎤 Starting audio call...');
                
                try {
                    // CRITICAL: Stop screen sharing to prevent echo
                    if (this.isScreenSharing) {
                        this.log('⚠️ Stopping screen share to prevent echo');
                        this.stopScreenShare();
                    }
                    
                    const shareMic = document.getElementById('shareMic').checked;
                    
                    if (!shareMic) {
                        alert('Please enable microphone to start audio call!');
                        return;
                    }
                    
                    // Get only microphone
                    const constraints = {
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            sampleRate: 48000,
                            sampleSize: 24,
                            channelCount: 2
                        }
                    };
                    
                    this.audioCallStream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    this.updateStreamStatus('🟢 Audio Call Active', true);
                    this.log('✅ Audio call started');
                    this.isAudioCallActive = true;
                    
                    // Enable stop button, disable start button
                    this.startAudioCallBtn.disabled = true;
                    this.stopAudioCallBtn.disabled = false;
                    
                    // If connected to peer, call them with the audio stream
                    if (this.remotePeerId) {
                        this.log('📞 Calling peer with audio call...');
                        this.audioCall = this.peer.call(this.remotePeerId, this.audioCallStream, {
                            metadata: { type: 'audio' },
                            constraints: {
                                mandatory: {
                                    OfferToReceiveAudio: true,
                                    OfferToReceiveVideo: false
                                }
                            },
                            sdpTransform: (sdp) => {
                                return sdp.replace(/(m=audio.*\r\n)/g, '$1b=AS:510\r\n');
                            }
                        });
                        
                        this.audioCall.on('stream', (remoteStream) => {
                            this.log('📺 Receiving remote audio call stream');
                            // Create invisible audio element to play remote audio
                            if (!this.remoteAudioElement) {
                                this.remoteAudioElement = document.createElement('audio');
                                this.remoteAudioElement.autoplay = true;
                                document.body.appendChild(this.remoteAudioElement);
                            }
                            this.remoteAudioElement.srcObject = remoteStream;
                        });
                        
                        this.audioCall.on('close', () => {
                            this.log('📞 Audio call ended by remote peer');
                        });
                    }
                    
                } catch (error) {
                    this.error('Failed to start audio call:', error);
                    if (error.name === 'NotAllowedError') {
                        alert('Microphone permission denied. Please allow access and try again.');
                    } else if (error.name === 'NotFoundError') {
                        alert('No microphone found. Please connect a microphone and try again.');
                    } else {
                        alert('Failed to start audio call: ' + error.message);
                    }
                }
            }
            
            stopAudioCall() {
                this.log('🛑 Stopping audio call...');
                
                if (this.audioCallStream) {
                    this.audioCallStream.getTracks().forEach(track => {
                        track.stop();
                        this.log('Stopped audio track:', track.kind);
                    });
                    this.audioCallStream = null;
                }
                
                if (this.remoteAudioElement) {
                    this.remoteAudioElement.srcObject = null;
                    this.remoteAudioElement.remove();
                    this.remoteAudioElement = null;
                }
                
                this.isAudioCallActive = false;
                
                if (this.audioCall) {
                    this.audioCall.close();
                    this.audioCall = null;
                }
                
                if (!this.isScreenSharing && !this.isVideoCallActive) {
                    this.updateStreamStatus('⚪ Not Sharing', false);
                }
                
                this.startAudioCallBtn.disabled = false;
                this.stopAudioCallBtn.disabled = true;
                this.log('✅ Audio call stopped');
            }
            
            updateConnectionStatus(status, isConnected) {
                this.log(`Connection status: ${status} (Connected: ${isConnected})`);
                this.connectionStatus.textContent = status;
                this.connectionStatus.className = 'status ' + (isConnected ? 'connected' : 'disconnected');
                this.shareScreenBtn.disabled = !isConnected;
                // videoToggle is always available once connected
                if (this.videoToggle) {
                    this.videoToggle.disabled = !isConnected;
                }
            }
            
            updateStreamStatus(status, isSharing) {
                this.log(`Stream status: ${status} (Sharing: ${isSharing})`);
                this.streamStatus.textContent = status;
                this.streamStatus.className = 'status ' + (isSharing ? 'sharing' : '');
                this.stopShareBtn.disabled = !isSharing;
            }
            
            sendChatMessage() {
                const input = document.getElementById('chatInput');
                const message = input.value.trim();
                
                if (!message) return;
                
                if (!this.currentConnection || this.currentConnection.open !== true) {
                    alert('Not connected! Connect to a peer first.');
                    return;
                }
                
                const timestamp = Date.now();
                
                this.currentConnection.send({
                    type: 'chat',
                    message: message,
                    timestamp: timestamp
                });
                
                this.addChatMessage(message, 'sent', timestamp);
                input.value = '';
                
                this.log(`💬 Sent P2P message: ${message}`);
            }
            
            addChatMessage(message, type, timestamp) {
                const chatMessages = document.getElementById('chatMessages');
                const chatPanel = document.getElementById('chatPanel');
                
                if (chatPanel.style.display === 'none') {
                    chatPanel.style.display = 'flex';
                }
                
                const messageDiv = document.createElement('div');
                messageDiv.className = `chat-message ${type}`;
                
                const bubbleDiv = document.createElement('div');
                bubbleDiv.className = 'message-bubble';
                bubbleDiv.textContent = message;
                
                const timeDiv = document.createElement('div');
                timeDiv.className = 'message-time';
                const time = new Date(timestamp);
                timeDiv.textContent = time.toLocaleTimeString();
                
                messageDiv.appendChild(bubbleDiv);
                messageDiv.appendChild(timeDiv);
                chatMessages.appendChild(messageDiv);
                
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            toggleChatPanel() {
                const chatPanel = document.getElementById('chatPanel');
                if (chatPanel) {
                    chatPanel.classList.toggle('minimized');
                    this.log('Chat panel', chatPanel.classList.contains('minimized') ? 'minimized' : 'expanded');
                }
            }
            
            addSystemMessage(message) {
                const chatMessages = document.getElementById('chatMessages');
                const systemDiv = document.createElement('div');
                systemDiv.className = 'system-message';
                systemDiv.textContent = message;
                chatMessages.appendChild(systemDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
            
            async startVideoStream() {
                if (this.videoStream) {
                    this.log('⚠️ Video stream already active');
                    return;
                }
                
                try {
                    this.videoStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1920 },
                            height: { ideal: 1080 },
                            frameRate: { ideal: 30 },
                            facingMode: 'user'
                        },
                        audio: false // Audio is handled separately via mic stream
                    });
                    
                    this.localVideo.srcObject = this.videoStream;
                    this.localVideo.muted = true;
                    this.localVideo.play();
                    document.getElementById('localVideoWrapper').classList.remove('hidden');
                    
                    this.log('✅ Camera started');
                    
                    // Send video to peer if connected
                    if (this.remotePeerId && this.peer) {
                        this.videoCall = this.peer.call(this.remotePeerId, this.videoStream, {
                            metadata: { type: 'camera' }
                        });
                    }
                } catch (err) {
                    this.error('Failed to start camera:', err);
                    alert('Could not access camera: ' + err.message);
                    if (this.videoToggle) this.videoToggle.checked = false;
                }
            }
            
            stopVideoStream() {
                if (this.videoStream) {
                    this.videoStream.getTracks().forEach(track => track.stop());
                    this.videoStream = null;
                }
                
                if (this.videoCall) {
                    this.videoCall.close();
                    this.videoCall = null;
                }
                
                this.localVideo.srcObject = null;
                document.getElementById('localVideoWrapper').classList.add('hidden');
                
                this.log('📹 Camera stopped');
            }
            
            async startMicStream() {
                if (this.standaloneMicStream) {
                    this.log('⚠️ Microphone stream already active');
                    return;
                }
                
                try {
                    // Optimized audio constraints for crisp, natural voice on mobile and desktop
                    this.standaloneMicStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,          // Prevent echo
                            noiseSuppression: false,         // Keep voice natural, not robotic
                            autoGainControl: true,           // Auto-adjust volume
                            sampleRate: 48000,               // High quality sample rate
                            sampleSize: 16,                  // Standard bit depth (more compatible)
                            channelCount: 2,                 // Stereo for better spatial audio
                            latency: 0.01,                   // Low latency for real-time (10ms)
                            googEchoCancellation: true,      // Chrome-specific echo cancellation
                            googAutoGainControl: true,       // Chrome-specific auto gain
                            googNoiseSuppression: false,     // Disable to avoid robotic voice
                            googHighpassFilter: true,        // Remove low-frequency noise
                            googTypingNoiseDetection: true,  // Filter keyboard sounds
                            googAudioMirroring: false        // Disable audio mirroring
                        },
                        video: false
                    });
                    
                    this.log('✅ Standalone microphone stream started');
                    
                    // If we're connected, send this mic stream to peer
                    if (this.remotePeerId && this.peer) {
                        this.log('📞 Sending microphone stream to peer');
                        this.standaloneMicCall = this.peer.call(this.remotePeerId, this.standaloneMicStream, {
                            metadata: { type: 'mic-only' }
                        });
                    }
                } catch (err) {
                    this.error('Failed to start microphone:', err);
                    alert('Could not access microphone: ' + err.message);
                }
            }
            
            stopMicStream() {
                if (this.standaloneMicStream) {
                    this.standaloneMicStream.getTracks().forEach(track => {
                        track.stop();
                        this.log('Stopped mic track:', track.kind);
                    });
                    this.standaloneMicStream = null;
                }
                
                if (this.standaloneMicCall) {
                    this.standaloneMicCall.close();
                    this.standaloneMicCall = null;
                }
                
                if (this.micAnswerStream) {
                    this.micAnswerStream.getTracks().forEach(track => track.stop());
                    this.micAnswerStream = null;
                }
                
                this.log('🔇 Microphone stream stopped');
            }
            
            cleanup() {
                this.log('🧹 Cleaning up...');
                
                this.stopScreenShare();
                this.stopVideoStream();
                this.stopMicStream();
                
                if (this.currentConnection) {
                    this.currentConnection.close();
                    this.currentConnection = null;
                }
                
                if (this.currentCall) {
                    this.currentCall.close();
                    this.currentCall = null;
                }
                
                if (this.videoCall) {
                    this.videoCall.close();
                    this.videoCall = null;
                }
                
                this.remotePeerId = null;
                this.updateConnectionStatus('⚪ Not Connected', false);
            }
        }

        // Initialize app when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[P2P] DOM loaded, initializing app...');
            window.app = new P2PScreenShare();
        });