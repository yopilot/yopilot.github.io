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
                this.qualityIndicator = document.getElementById('qualityIndicator');
                
                // Production-level elements
                this.recordBtn = document.getElementById('recordBtn');
                this.stopRecordBtn = document.getElementById('stopRecordBtn');
                this.shareFileBtn = document.getElementById('shareFileBtn');
                this.qualitySettingsBtn = document.getElementById('qualitySettingsBtn');
                this.diagnosticsBtn = document.getElementById('diagnosticsBtn');
                this.bandwidthIndicator = document.getElementById('bandwidthIndicator');
                
                // Recording state
                this.mediaRecorder = null;
                this.recordedChunks = [];
                this.isRecording = false;
                
                // File transfer state
                this.fileTransfers = new Map();
                this.chunkSize = 16384; // 16KB chunks for file transfer
                
                // Quality settings
                this.qualitySettings = {
                    videoQuality: '1080p',
                    frameRate: 30,
                    bitrate: 2500
                };
                
                // Diagnostics
                this.diagnosticsInterval = null;
                this.connectionStats = {
                    latency: 0,
                    packetLoss: 0,
                    uploadSpeed: 0,
                    downloadSpeed: 0
                };
                
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
                        this.showNotification('Peer Unavailable', 'Make sure your friend is online and the ID is correct', 'error');
                    } else if (err.type === 'network') {
                        this.showNotification('Network Error', 'Check your internet connection', 'error');
                        this.attemptReconnection();
                    } else if (err.type === 'server-error') {
                        this.showNotification('Server Error', 'PeerJS server is unavailable. Retrying...', 'error');
                        this.attemptReconnection();
                    } else if (err.type === 'disconnected') {
                        this.showNotification('Disconnected', 'Connection lost. Attempting to reconnect...', 'warning');
                        this.attemptReconnection();
                    } else {
                        this.showNotification('Connection Error', err.message || 'Unknown error occurred', 'error');
                    }
                });
                
                this.peer.on('disconnected', () => {
                    this.log('⚠️ Disconnected from PeerJS server. Attempting to reconnect...');
                    this.showNotification('Disconnected', 'Reconnecting to server...', 'warning');
                    this.attemptReconnection();
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
                
                // Volume controls
                const micVolume = document.getElementById('micVolume');
                const systemVolume = document.getElementById('systemVolume');
                
                if (micVolume) {
                    micVolume.addEventListener('input', (e) => {
                        this.setMicVolume(parseFloat(e.target.value));
                    });
                }
                
                if (systemVolume) {
                    systemVolume.addEventListener('input', (e) => {
                        this.setSystemVolume(parseFloat(e.target.value));
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
                
                // Keyboard shortcuts
                document.addEventListener('keydown', (e) => {
                    // Only handle shortcuts when not typing in input fields
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    
                    switch(e.key.toLowerCase()) {
                        case 'f':
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                const activeFullscreen = document.querySelector('.video-wrapper.fullscreen');
                                if (activeFullscreen) {
                                    this.toggleFullscreen(activeFullscreen.id);
                                } else {
                                    // Find first visible video and make it fullscreen
                                    const visibleVideos = document.querySelectorAll('.video-wrapper:not(.hidden)');
                                    if (visibleVideos.length > 0) {
                                        this.toggleFullscreen(visibleVideos[0].id);
                                    }
                                }
                            } else if (e.shiftKey && e.ctrlKey) {
                                e.preventDefault();
                                this.initiateFileShare();
                            }
                            break;
                        case 'm':
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                if (this.standaloneMicStream) {
                                    this.stopMicStream();
                                } else {
                                    this.startMicStream();
                                }
                            }
                            break;
                        case 's':
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                if (this.isScreenSharing) {
                                    this.stopScreenShare();
                                } else {
                                    this.startScreenShare();
                                }
                            }
                            break;
                        case 'v':
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                if (this.videoToggle) {
                                    this.videoToggle.checked = !this.videoToggle.checked;
                                    this.videoToggle.dispatchEvent(new Event('change'));
                                }
                            }
                            break;
                        case 'r':
                            if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                if (this.isRecording) {
                                    this.stopRecording();
                                } else {
                                    this.startRecording();
                                }
                            }
                            break;
                    }
                });
                
                // Production-level event listeners
                if (this.recordBtn) {
                    this.recordBtn.addEventListener('click', () => this.startRecording());
                }
                
                if (this.stopRecordBtn) {
                    this.stopRecordBtn.addEventListener('click', () => this.stopRecording());
                }
                
                if (this.shareFileBtn) {
                    this.shareFileBtn.addEventListener('click', () => this.initiateFileShare());
                }
                
                if (this.qualitySettingsBtn) {
                    this.qualitySettingsBtn.addEventListener('click', () => this.showQualitySettings());
                }
                
                if (this.diagnosticsBtn) {
                    this.diagnosticsBtn.addEventListener('click', () => this.showDiagnostics());
                }
                
                // Quality settings controls
                const videoQuality = document.getElementById('videoQuality');
                const frameRate = document.getElementById('frameRate');
                const bitrate = document.getElementById('bitrate');
                const bitrateValue = document.getElementById('bitrateValue');
                
                if (videoQuality) {
                    videoQuality.addEventListener('change', (e) => {
                        this.qualitySettings.videoQuality = e.target.value;
                        this.showNotification('Quality settings updated', 'Changes will apply to next stream', 'info');
                    });
                }
                
                if (frameRate) {
                    frameRate.addEventListener('change', (e) => {
                        this.qualitySettings.frameRate = parseInt(e.target.value);
                        this.showNotification('Frame rate updated', `Set to ${e.target.value} FPS`, 'info');
                    });
                }
                
                if (bitrate) {
                    bitrate.addEventListener('input', (e) => {
                        this.qualitySettings.bitrate = parseInt(e.target.value);
                        if (bitrateValue) {
                            bitrateValue.textContent = `${e.target.value} kbps`;
                        }
                    });
                }
                
                // Close button listeners
                const closeQualityBtn = document.getElementById('closeQualitySettings');
                const closeDiagnosticsBtn = document.getElementById('closeDiagnostics');
                
                if (closeQualityBtn) {
                    closeQualityBtn.addEventListener('click', () => this.closeQualitySettings());
                }
                
                if (closeDiagnosticsBtn) {
                    closeDiagnosticsBtn.addEventListener('click', () => this.closeDiagnostics());
                }
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
                    } else if (data.type?.startsWith('file-')) {
                        this.receiveFile(data);
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
                
                // Enable recording and file sharing buttons
                if (this.recordBtn) this.recordBtn.disabled = false;
                if (this.shareFileBtn) this.shareFileBtn.disabled = false;
                
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
                
                this.showNotification('Connected', 'You are now connected to your peer', 'success');
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
                            noiseSuppression: true,          // Enable noise suppression
                            autoGainControl: true,           // Auto-adjust volume
                            sampleRate: 48000,               // High quality sample rate
                            sampleSize: 16,                  // Standard bit depth
                            channelCount: 2,                 // Stereo
                            latency: 0.01,                   // Low latency
                            googEchoCancellation: true,      // Chrome-specific echo cancellation
                            googAutoGainControl: true,       // Chrome-specific auto gain
                            googNoiseSuppression: true,      // Enable noise suppression
                            googHighpassFilter: true,        // Remove low-frequency noise
                            googTypingNoiseDetection: true,  // Filter keyboard sounds
                            googAudioMirroring: false,       // Disable audio mirroring
                            googExperimentalNoiseSuppression: true, // Advanced noise suppression
                            googVoiceActivityDetection: true
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
                            noiseSuppression: true,  // Enable noise suppression for system audio
                            autoGainControl: true,
                            sampleRate: 48000,
                            sampleSize: 24,
                            channelCount: 2,
                            // Advanced noise suppression settings
                            googEchoCancellation: true,
                            googAutoGainControl: true,
                            googNoiseSuppression: true,
                            googHighpassFilter: true,
                            googAudioMirroring: false
                        }
                    });
                    
                    // Combine screen audio with microphone if available
                    let combinedStream = screenStream;
                    if (this.standaloneMicStream) {
                        combinedStream = await this.combineAudioStreams(screenStream, this.standaloneMicStream);
                        this.log('🎵 Combined screen audio with microphone');
                    }
                    
                    // Microphone is handled separately via standalone stream
                    this.localStream = combinedStream;
                    
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
                            echoCancellation: true,          // Prevent echo
                            noiseSuppression: true,          // Enable noise suppression
                            autoGainControl: true,           // Auto-adjust volume
                            sampleRate: 48000,               // High quality sample rate
                            sampleSize: 24,                  // High bit depth
                            channelCount: 2,                 // Stereo
                            latency: 0.01,                   // Low latency
                            // Chrome-specific enhancements
                            googEchoCancellation: true,
                            googAutoGainControl: true,
                            googNoiseSuppression: true,
                            googHighpassFilter: true,
                            googTypingNoiseDetection: true,
                            googAudioMirroring: false,
                            googExperimentalNoiseSuppression: true
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
                            echoCancellation: true,          // Prevent echo
                            noiseSuppression: true,          // Enable noise suppression
                            autoGainControl: true,           // Auto-adjust volume
                            sampleRate: 48000,               // High quality sample rate
                            sampleSize: 24,                  // High bit depth
                            channelCount: 2,                 // Stereo
                            latency: 0.01,                   // Low latency
                            // Chrome-specific enhancements
                            googEchoCancellation: true,
                            googAutoGainControl: true,
                            googNoiseSuppression: true,
                            googHighpassFilter: true,
                            googTypingNoiseDetection: true,
                            googAudioMirroring: false,
                            googExperimentalNoiseSuppression: true
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
                
                // Start/stop quality monitoring
                if (isSharing && !this.qualityMonitorInterval) {
                    this.startQualityMonitoring();
                } else if (!isSharing && this.qualityMonitorInterval) {
                    clearInterval(this.qualityMonitorInterval);
                    this.qualityMonitorInterval = null;
                    this.updateQualityIndicator('--');
                }
            }
            
            startQualityMonitoring() {
                this.qualityMonitorInterval = setInterval(() => {
                    this.updateConnectionQuality();
                }, 2000); // Check every 2 seconds
            }
            
            updateConnectionQuality() {
                if (!this.currentConnection || !this.currentConnection.open) {
                    this.updateQualityIndicator('--');
                    return;
                }
                
                // Simple quality estimation based on connection stats
                // In a real implementation, you'd use WebRTC stats
                const peerConnection = this.peer?.connections?.[this.remotePeerId]?.peerConnection;
                if (peerConnection) {
                    peerConnection.getStats().then(stats => {
                        let quality = 'Good';
                        let qualityEmoji = '🟢';
                        
                        // Check for packet loss or high latency indicators
                        stats.forEach(report => {
                            if (report.type === 'inbound-rtp' && report.kind === 'video') {
                                const packetsLost = report.packetsLost || 0;
                                const packetsReceived = report.packetsReceived || 1;
                                const lossRate = packetsLost / (packetsLost + packetsReceived);
                                
                                if (lossRate > 0.1) {
                                    quality = 'Poor';
                                    qualityEmoji = '🔴';
                                } else if (lossRate > 0.05) {
                                    quality = 'Fair';
                                    qualityEmoji = '🟡';
                                }
                            }
                        });
                        
                        this.updateQualityIndicator(`${qualityEmoji} ${quality}`);
                    }).catch(() => {
                        this.updateQualityIndicator('🟢 Good');
                    });
                } else {
                    this.updateQualityIndicator('🟢 Good');
                }
            }
            
            updateQualityIndicator(quality) {
                if (this.qualityIndicator) {
                    this.qualityIndicator.textContent = `📊 Quality: ${quality}`;
                }
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
                    // Enhanced audio constraints for superior noise suppression and voice quality
                    this.standaloneMicStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,          // Prevent echo
                            noiseSuppression: true,          // Enable advanced noise suppression
                            autoGainControl: true,           // Auto-adjust volume
                            sampleRate: 48000,               // High quality sample rate
                            sampleSize: 16,                  // Standard bit depth (more compatible)
                            channelCount: 2,                 // Stereo for better spatial audio
                            latency: 0.01,                   // Low latency for real-time (10ms)
                            // Chrome-specific advanced audio processing
                            googEchoCancellation: true,      // Chrome-specific echo cancellation
                            googAutoGainControl: true,       // Chrome-specific auto gain
                            googNoiseSuppression: true,      // Enable advanced noise suppression
                            googHighpassFilter: true,        // Remove low-frequency noise (fan noise)
                            googTypingNoiseDetection: true,  // Filter keyboard sounds
                            googAudioMirroring: false,       // Disable audio mirroring
                            // Additional noise suppression parameters
                            googExperimentalNoiseSuppression: true, // Experimental advanced noise suppression
                            googEchoCancellation2: true,     // Secondary echo cancellation
                            // Voice activity detection and processing
                            googVoiceActivityDetection: true
                        },
                        video: false
                    });
                    
                    // Apply additional audio processing if Web Audio API is available
                    if (window.AudioContext || window.webkitAudioContext) {
                        await this.enhanceAudioStream(this.standaloneMicStream);
                    }
                    
                    this.log('✅ Enhanced standalone microphone stream started with advanced noise suppression');
                    
                    // If we're connected, send this mic stream to peer
                    if (this.remotePeerId && this.peer) {
                        this.log('📞 Sending enhanced microphone stream to peer');
                        this.standaloneMicCall = this.peer.call(this.remotePeerId, this.standaloneMicStream, {
                            metadata: { type: 'mic-only' }
                        });
                    }
                } catch (err) {
                    this.error('Failed to start enhanced microphone:', err);
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
            
            toggleMinimize(wrapperId) {
                const wrapper = document.getElementById(wrapperId);
                if (!wrapper) return;
                
                const isPip = wrapper.classList.contains('pip');
                if (isPip) {
                    // Exit PIP mode - return to normal grid
                    wrapper.classList.remove('pip');
                    wrapper.style.left = '';
                    wrapper.style.top = '';
                    wrapper.style.width = '';
                    wrapper.style.height = '';
                    wrapper.style.zIndex = '';
                    this.log(`📺 Exited PIP mode for ${wrapperId}`);
                } else {
                    // Enter PIP mode
                    wrapper.classList.add('pip');
                    wrapper.style.zIndex = '10000';
                    this.log(`📺 Entered PIP mode for ${wrapperId}`);
                }
            }
            
            async enhanceAudioStream(stream) {
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // Resume audio context if suspended (required by some browsers)
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                    }
                    
                    const source = audioContext.createMediaStreamSource(stream);
                    const analyser = audioContext.createAnalyser();
                    const gainNode = audioContext.createGain();
                    const destination = audioContext.createMediaStreamDestination();
                    
                    // Configure analyser for noise detection
                    analyser.fftSize = 2048;
                    analyser.smoothingTimeConstant = 0.8;
                    
                    // Create dynamic compressor for better audio control
                    const compressor = audioContext.createDynamicsCompressor();
                    compressor.threshold.value = -24;
                    compressor.knee.value = 30;
                    compressor.ratio.value = 12;
                    compressor.attack.value = 0.003;
                    compressor.release.value = 0.25;
                    
                    // Create biquad filter for additional noise reduction
                    const highpassFilter = audioContext.createBiquadFilter();
                    highpassFilter.type = 'highpass';
                    highpassFilter.frequency.value = 80; // Remove very low frequency noise
                    highpassFilter.Q.value = 0.7;
                    
                    // Connect the audio processing chain
                    source.connect(analyser);
                    source.connect(highpassFilter);
                    highpassFilter.connect(compressor);
                    compressor.connect(gainNode);
                    gainNode.connect(destination);
                    
                    // Implement adaptive noise gate based on audio analysis
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    
                    const analyzeNoise = () => {
                        if (audioContext.state !== 'running') return;
                        
                        analyser.getByteFrequencyData(dataArray);
                        
                        // Calculate average volume
                        let sum = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            sum += dataArray[i];
                        }
                        const average = sum / bufferLength;
                        
                        // Adaptive gain control - reduce gain for low volume (likely noise)
                        const targetGain = average > 10 ? 1.0 : 0.3;
                        gainNode.gain.setTargetAtTime(targetGain, audioContext.currentTime, 0.1);
                        
                        requestAnimationFrame(analyzeNoise);
                    };
                    
                    analyzeNoise();
                    
                    // Replace the original stream tracks with processed ones
                    const processedStream = destination.stream;
                    const originalAudioTrack = stream.getAudioTracks()[0];
                    
                    // Stop original track and replace with processed
                    stream.removeTrack(originalAudioTrack);
                    originalAudioTrack.stop();
                    
                    processedStream.getAudioTracks().forEach(track => {
                        stream.addTrack(track);
                    });
                    
                    this.log('🎵 Advanced audio enhancement applied (noise suppression, compression, filtering)');
                    
                } catch (error) {
                    this.error('Failed to enhance audio stream:', error);
                    // Continue with original stream if enhancement fails
                }
            }
            
            setMicVolume(volume) {
                if (this.micGainNode) {
                    this.micGainNode.gain.setTargetAtTime(volume, this.audioContext?.currentTime || 0, 0.1);
                    this.log(`🎚️ Microphone volume set to ${volume}`);
                }
            }
            
            setSystemVolume(volume) {
                if (this.screenGainNode) {
                    this.screenGainNode.gain.setTargetAtTime(volume, this.audioContext?.currentTime || 0, 0.1);
                    this.log(`🎚️ System audio volume set to ${volume}`);
                }
            }
            
            async combineAudioStreams(screenStream, micStream) {
                // Create audio context for mixing
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create sources from streams
                const screenSource = this.audioContext.createMediaStreamSource(screenStream);
                const micSource = this.audioContext.createMediaStreamSource(micStream);
                
                // Create gain nodes for volume control
                this.screenGainNode = this.audioContext.createGain();
                this.micGainNode = this.audioContext.createGain();
                
                // Set initial volumes (screen slightly lower to prioritize voice)
                this.screenGainNode.gain.value = 0.7;
                this.micGainNode.gain.value = 1.0;
                
                // Create destination stream
                const destination = this.audioContext.createMediaStreamDestination();
                
                // Connect sources to gains, then to destination
                screenSource.connect(this.screenGainNode);
                micSource.connect(this.micGainNode);
                this.screenGainNode.connect(destination);
                this.micGainNode.connect(destination);
                
                // Get video track from screen stream
                const videoTrack = screenStream.getVideoTracks()[0];
                
                // Combine video track with mixed audio
                const combinedStream = new MediaStream([videoTrack, ...destination.stream.getAudioTracks()]);
                
                this.log('🎵 Audio streams combined successfully with volume controls');
                return combinedStream;
            }
            
            managePipMode() {
                const fullscreenWrapper = document.querySelector('.video-wrapper.fullscreen');
                const allWrappers = document.querySelectorAll('.video-wrapper:not(.hidden)');
                
                if (fullscreenWrapper) {
                    // When one is fullscreen, put others in PIP
                    allWrappers.forEach(wrapper => {
                        if (wrapper !== fullscreenWrapper && !wrapper.classList.contains('pip')) {
                            wrapper.classList.add('pip');
                            wrapper.style.zIndex = '10000';
                        }
                    });
                } else {
                    // No fullscreen, exit all PIP modes
                    allWrappers.forEach(wrapper => {
                        wrapper.classList.remove('pip');
                        wrapper.style.left = '';
                        wrapper.style.top = '';
                        wrapper.style.width = '';
                        wrapper.style.height = '';
                        wrapper.style.zIndex = '';
                    });
                }
            }
            
            // ========== PRODUCTION-LEVEL FEATURES ==========
            
            // Recording functionality
            async startRecording() {
                try {
                    if (!this.localStream && !this.videoStream) {
                        this.showNotification('Cannot Record', 'Start screen share or camera first', 'warning');
                        return;
                    }
                    
                    const streamToRecord = this.localStream || this.videoStream;
                    
                    const options = {
                        mimeType: 'video/webm;codecs=vp9,opus',
                        videoBitsPerSecond: this.qualitySettings.bitrate * 1000
                    };
                    
                    // Fallback to vp8 if vp9 not supported
                    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                        options.mimeType = 'video/webm;codecs=vp8,opus';
                    }
                    
                    this.mediaRecorder = new MediaRecorder(streamToRecord, options);
                    this.recordedChunks = [];
                    
                    this.mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            this.recordedChunks.push(event.data);
                        }
                    };
                    
                    this.mediaRecorder.onstop = () => {
                        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                        const url = URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `recording-${Date.now()}.webm`;
                        a.click();
                        
                        URL.revokeObjectURL(url);
                        this.showNotification('Recording Saved', 'Your recording has been downloaded', 'success');
                    };
                    
                    this.mediaRecorder.start(1000); // Collect data every second
                    this.isRecording = true;
                    this.recordBtn.style.display = 'none';
                    this.stopRecordBtn.style.display = 'inline-flex';
                    this.recordBtn.classList.add('recording');
                    
                    this.showNotification('Recording Started', 'Your session is being recorded', 'success');
                    this.log('🎥 Recording started');
                    
                } catch (error) {
                    this.error('Recording failed:', error);
                    this.showNotification('Recording Failed', error.message, 'error');
                }
            }
            
            stopRecording() {
                if (this.mediaRecorder && this.isRecording) {
                    this.mediaRecorder.stop();
                    this.isRecording = false;
                    this.recordBtn.style.display = 'inline-flex';
                    this.stopRecordBtn.style.display = 'none';
                    this.recordBtn.classList.remove('recording');
                    this.log('🎥 Recording stopped');
                }
            }
            
            // File sharing functionality
            async initiateFileShare() {
                if (!this.currentConnection || !this.currentConnection.open) {
                    this.showNotification('Not Connected', 'Connect to a peer first', 'warning');
                    return;
                }
                
                const input = document.createElement('input');
                input.type = 'file';
                input.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        await this.sendFile(file);
                    }
                };
                input.click();
            }
            
            async sendFile(file) {
                try {
                    const fileId = Date.now().toString();
                    const totalChunks = Math.ceil(file.size / this.chunkSize);
                    
                    // Show file transfer panel
                    const panel = document.getElementById('fileTransferPanel');
                    const list = document.getElementById('fileTransferList');
                    panel.style.display = 'block';
                    
                    // Add file transfer item
                    const item = document.createElement('div');
                    item.className = 'file-transfer-item';
                    item.id = `transfer-${fileId}`;
                    item.innerHTML = `
                        <div class="file-transfer-header">
                            <span class="file-name">${file.name}</span>
                            <span class="file-size">${this.formatFileSize(file.size)}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-${fileId}" style="width: 0%"></div>
                        </div>
                        <div class="file-status">
                            <span class="file-status-text">Sending...</span>
                            <span class="file-status-percentage" id="percentage-${fileId}">0%</span>
                        </div>
                    `;
                    list.appendChild(item);
                    
                    // Send file metadata
                    this.currentConnection.send({
                        type: 'file-start',
                        fileId,
                        name: file.name,
                        size: file.size,
                        totalChunks
                    });
                    
                    // Send file in chunks
                    const reader = new FileReader();
                    let offset = 0;
                    let chunkIndex = 0;
                    
                    const readNextChunk = () => {
                        const slice = file.slice(offset, offset + this.chunkSize);
                        reader.readAsArrayBuffer(slice);
                    };
                    
                    reader.onload = (e) => {
                        this.currentConnection.send({
                            type: 'file-chunk',
                            fileId,
                            chunkIndex,
                            data: Array.from(new Uint8Array(e.target.result))
                        });
                        
                        offset += this.chunkSize;
                        chunkIndex++;
                        
                        const progress = Math.min(100, (chunkIndex / totalChunks) * 100);
                        document.getElementById(`progress-${fileId}`).style.width = `${progress}%`;
                        document.getElementById(`percentage-${fileId}`).textContent = `${Math.round(progress)}%`;
                        
                        if (offset < file.size) {
                            readNextChunk();
                        } else {
                            // File transfer complete
                            this.currentConnection.send({
                                type: 'file-end',
                                fileId
                            });
                            
                            document.querySelector(`#transfer-${fileId} .file-status-text`).textContent = 'Sent!';
                            this.showNotification('File Sent', `${file.name} sent successfully`, 'success');
                            
                            setTimeout(() => {
                                item.remove();
                                if (list.children.length === 0) {
                                    panel.style.display = 'none';
                                }
                            }, 3000);
                        }
                    };
                    
                    readNextChunk();
                    
                } catch (error) {
                    this.error('File transfer failed:', error);
                    this.showNotification('Transfer Failed', error.message, 'error');
                }
            }
            
            receiveFile(data) {
                if (data.type === 'file-start') {
                    // Initialize file reception
                    this.fileTransfers.set(data.fileId, {
                        name: data.name,
                        size: data.size,
                        totalChunks: data.totalChunks,
                        chunks: [],
                        receivedChunks: 0
                    });
                    
                    // Show file transfer panel
                    const panel = document.getElementById('fileTransferPanel');
                    const list = document.getElementById('fileTransferList');
                    panel.style.display = 'block';
                    
                    const item = document.createElement('div');
                    item.className = 'file-transfer-item';
                    item.id = `transfer-${data.fileId}`;
                    item.innerHTML = `
                        <div class="file-transfer-header">
                            <span class="file-name">${data.name}</span>
                            <span class="file-size">${this.formatFileSize(data.size)}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-${data.fileId}" style="width: 0%"></div>
                        </div>
                        <div class="file-status">
                            <span class="file-status-text">Receiving...</span>
                            <span class="file-status-percentage" id="percentage-${data.fileId}">0%</span>
                        </div>
                    `;
                    list.appendChild(item);
                    
                } else if (data.type === 'file-chunk') {
                    const transfer = this.fileTransfers.get(data.fileId);
                    if (transfer) {
                        transfer.chunks[data.chunkIndex] = new Uint8Array(data.data);
                        transfer.receivedChunks++;
                        
                        const progress = (transfer.receivedChunks / transfer.totalChunks) * 100;
                        document.getElementById(`progress-${data.fileId}`).style.width = `${progress}%`;
                        document.getElementById(`percentage-${data.fileId}`).textContent = `${Math.round(progress)}%`;
                    }
                    
                } else if (data.type === 'file-end') {
                    const transfer = this.fileTransfers.get(data.fileId);
                    if (transfer) {
                        // Combine all chunks
                        const blob = new Blob(transfer.chunks);
                        const url = URL.createObjectURL(blob);
                        
                        // Download file
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = transfer.name;
                        a.click();
                        
                        URL.revokeObjectURL(url);
                        
                        document.querySelector(`#transfer-${data.fileId} .file-status-text`).textContent = 'Received!';
                        this.showNotification('File Received', `${transfer.name} downloaded`, 'success');
                        
                        setTimeout(() => {
                            document.getElementById(`transfer-${data.fileId}`).remove();
                            const panel = document.getElementById('fileTransferPanel');
                            const list = document.getElementById('fileTransferList');
                            if (list.children.length === 0) {
                                panel.style.display = 'none';
                            }
                        }, 3000);
                        
                        this.fileTransfers.delete(data.fileId);
                    }
                }
            }
            
            formatFileSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
            }
            
            // Notification system
            showNotification(title, message, type = 'info') {
                const container = document.getElementById('notificationContainer');
                if (!container) return;
                
                const icons = {
                    success: '✅',
                    error: '❌',
                    warning: '⚠️',
                    info: 'ℹ️'
                };
                
                const notification = document.createElement('div');
                notification.className = `notification ${type}`;
                notification.innerHTML = `
                    <span class="notification-icon">${icons[type] || icons.info}</span>
                    <div class="notification-content">
                        <div class="notification-title">${title}</div>
                        <div class="notification-message">${message}</div>
                    </div>
                `;
                
                container.appendChild(notification);
                
                // Auto-remove after 5 seconds
                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    setTimeout(() => notification.remove(), 300);
                }, 5000);
            }
            
            // Quality settings panel
            showQualitySettings() {
                const panel = document.getElementById('qualitySettings');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            }
            
            closeQualitySettings() {
                const panel = document.getElementById('qualitySettings');
                if (panel) {
                    panel.style.display = 'none';
                }
            }
            
            // Diagnostics panel
            showDiagnostics() {
                const panel = document.getElementById('diagnosticsPanel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                    if (panel.style.display !== 'none') {
                        this.startDiagnostics();
                    } else {
                        this.stopDiagnostics();
                    }
                }
            }
            
            closeDiagnostics() {
                const panel = document.getElementById('diagnosticsPanel');
                if (panel) {
                    panel.style.display = 'none';
                    this.stopDiagnostics();
                }
            }
            
            async startDiagnostics() {
                if (this.diagnosticsInterval) return;
                
                this.diagnosticsInterval = setInterval(async () => {
                    await this.updateDiagnostics();
                }, 1000);
            }
            
            stopDiagnostics() {
                if (this.diagnosticsInterval) {
                    clearInterval(this.diagnosticsInterval);
                    this.diagnosticsInterval = null;
                }
            }
            
            async updateDiagnostics() {
                try {
                    if (!this.currentCall?.peerConnection) {
                        document.getElementById('diagConnectionType').textContent = 'No active call';
                        return;
                    }
                    
                    const stats = await this.currentCall.peerConnection.getStats();
                    let connectionType = 'unknown';
                    let latency = 0;
                    let packetLoss = 0;
                    let uploadSpeed = 0;
                    let downloadSpeed = 0;
                    
                    stats.forEach(report => {
                        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                            connectionType = report.currentRoundTripTime ? 'Direct (P2P)' : 'Relayed (TURN)';
                            latency = report.currentRoundTripTime ? (report.currentRoundTripTime * 1000).toFixed(0) : 0;
                        }
                        
                        if (report.type === 'inbound-rtp' && report.kind === 'video') {
                            packetLoss = report.packetsLost || 0;
                            downloadSpeed = report.bytesReceived ? ((report.bytesReceived * 8) / 1000000).toFixed(2) : 0;
                        }
                        
                        if (report.type === 'outbound-rtp' && report.kind === 'video') {
                            uploadSpeed = report.bytesSent ? ((report.bytesSent * 8) / 1000000).toFixed(2) : 0;
                        }
                    });
                    
                    document.getElementById('diagConnectionType').textContent = connectionType;
                    document.getElementById('diagLatency').textContent = `${latency} ms`;
                    document.getElementById('diagPacketLoss').textContent = `${packetLoss} packets`;
                    document.getElementById('diagUploadSpeed').textContent = `${uploadSpeed} Mbps`;
                    document.getElementById('diagDownloadSpeed').textContent = `${downloadSpeed} Mbps`;
                    
                    // Update bandwidth indicator
                    const totalSpeed = parseFloat(uploadSpeed) + parseFloat(downloadSpeed);
                    const bandwidthIndicator = this.bandwidthIndicator;
                    
                    if (totalSpeed > 5) {
                        bandwidthIndicator.textContent = '📶 Excellent';
                        bandwidthIndicator.className = 'status good';
                    } else if (totalSpeed > 2) {
                        bandwidthIndicator.textContent = '📶 Good';
                        bandwidthIndicator.className = 'status medium';
                    } else {
                        bandwidthIndicator.textContent = '📶 Poor';
                        bandwidthIndicator.className = 'status poor';
                    }
                    
                } catch (error) {
                    this.error('Diagnostics error:', error);
                }
            }
            
            // Error recovery and reconnection
            attemptReconnection() {
                if (this.reconnectionAttempts >= 5) {
                    this.showNotification('Reconnection Failed', 'Please refresh the page', 'error');
                    return;
                }
                
                if (!this.reconnectionAttempts) {
                    this.reconnectionAttempts = 0;
                }
                
                this.reconnectionAttempts++;
                
                setTimeout(() => {
                    if (this.peer && !this.peer.destroyed) {
                        this.peer.reconnect();
                        this.log(`Reconnection attempt ${this.reconnectionAttempts}/5`);
                    } else {
                        // Reinitialize peer if destroyed
                        this.initPeerJS();
                    }
                }, 2000 * this.reconnectionAttempts);
            }
            
            // Cleanup method enhancement
            cleanup() {
                this.log('🧹 Cleaning up resources...');
                
                // Stop recording if active
                if (this.isRecording) {
                    this.stopRecording();
                }
                
                // Stop diagnostics
                this.stopDiagnostics();
                
                // Clear file transfers
                this.fileTransfers.clear();
                
                // Stop all streams
                if (this.localStream) {
                    this.localStream.getTracks().forEach(track => track.stop());
                    this.localStream = null;
                }
                
                if (this.videoStream) {
                    this.videoStream.getTracks().forEach(track => track.stop());
                    this.videoStream = null;
                }
                
                if (this.standaloneMicStream) {
                    this.standaloneMicStream.getTracks().forEach(track => track.stop());
                    this.standaloneMicStream = null;
                }
                
                // Close connections
                if (this.currentCall) {
                    this.currentCall.close();
                    this.currentCall = null;
                }
                
                if (this.currentConnection) {
                    this.currentConnection.close();
                    this.currentConnection = null;
                }
                
                // Reset UI
                this.updateConnectionStatus('⚪ Disconnected', false);
                this.updateStreamStatus('⚪ Not Sharing', false);
                
                // Hide video elements
                document.querySelectorAll('.video-wrapper').forEach(wrapper => {
                    wrapper.classList.add('hidden');
                });
                
                // Close audio context
                if (this.audioContext) {
                    this.audioContext.close();
                    this.audioContext = null;
                }
                
                this.log('✅ Cleanup complete');
            }
        }

        // Initialize app when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            console.log('[P2P] DOM loaded, initializing app...');
            window.app = new P2PScreenShare();
            
            // Make methods globally available for HTML onclick handlers
            if (window.app.toggleMinimize) {
                window.app.toggleMinimize = window.app.toggleMinimize.bind(window.app);
            }
            if (window.app.toggleFullscreen) {
                window.app.toggleFullscreen = window.app.toggleFullscreen.bind(window.app);
            }
            if (window.app.closeQualitySettings) {
                window.app.closeQualitySettings = window.app.closeQualitySettings.bind(window.app);
            }
            if (window.app.closeDiagnostics) {
                window.app.closeDiagnostics = window.app.closeDiagnostics.bind(window.app);
            }
        });