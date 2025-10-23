// pushkarsabe/whatsappchatforsingleusers/.../public/whatsappHome.js (COMPLETE FILE)

const URL = 'http://localhost:3000';

// DOM Element references
const newChatBtn = document.getElementById('new-chat-btn');
const newChatModal = document.getElementById('new-chat-modal');
const dynamicContactsList = document.getElementById('dynamic-contacts-list');
const friendsChatsList = document.getElementById('friends-chats-list');
const chatMessagesContainer = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');

const notificationIcon = document.getElementById('notification-icon');
const notificationCount = document.getElementById('notification-count');
const notificationModal = document.getElementById('notification-modal');
const requestsList = document.getElementById('requests-list');
const logoutBtn = document.getElementById('logout-btn');

// Global state variables
let CURRENT_USER_ID = null;
let CURRENT_GROUP_ID = null;
let socket = null; // WebSocket connection instance

let PENDING_REQUESTS = []; // Array to store incoming requests

// Utility: Gets the first letter for avatar
function getAvatarInitial(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}

// LOGOUT LOGIC
function handleLogout() {
    // 1. Clear the JWT token
    localStorage.removeItem('token');
    // 2. Redirect to the login page
    window.location.replace("./login.html");
}
// Event listener for the new Logout button
if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

// =========================================================================
// REAL-TIME (SOCKET.IO) HANDLERS
// =========================================================================

function setupSocketListeners(socket) {
    socket.on('connect', () => {
        console.log("Connected to WebSocket server.");
        if (CURRENT_GROUP_ID) {
            socket.emit('join-group', CURRENT_GROUP_ID);
        }
    });

    socket.on('newMessage', (message) => {
        console.log("Received new message:", message);
        if (message.GroupId === CURRENT_GROUP_ID) {
            renderNewMessage(message);
        }
    });

    socket.on('disconnect', () => {
        console.log("Disconnected from WebSocket server.");
    });

    socket.on('friendRequestReceived', (data) => {
        // Assume data contains { groupId, senderId, senderName }
        PENDING_REQUESTS.push(data);
        updateNotificationCount();
        console.log(`New request from ${data.senderName}`);
    });
}

// =========================================================================
// FEATURE: NOTIFICATION AND ACCEPTANCE LOGIC
// =========================================================================

function updateNotificationCount() {
    const count = PENDING_REQUESTS.length;
    notificationCount.textContent = count;
    notificationCount.classList.toggle('visible', count > 0);
}

function renderPendingRequests() {
    requestsList.innerHTML = ''; // Clear previous list

    if (PENDING_REQUESTS.length === 0) {
        requestsList.innerHTML = '<li>No pending requests.</li>';
        return;
    }

    PENDING_REQUESTS.forEach(req => {
        const li = document.createElement('li');
        li.dataset.groupId = req.groupId;
        li.innerHTML = `
            <div class="contact-name-info">
                <div class="name">${req.senderName} wants to chat.</div>
            </div>
            <button onclick="acceptRequest(${req.groupId})">Accept</button>
            <button onclick="rejectRequest(${req.groupId})">Reject</button>
        `;
        requestsList.appendChild(li);
    });
}

async function acceptRequest(groupId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${URL}/groups/accept-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ groupId: groupId })
        });

        if (!response.ok) {
            let errorData = await response.json();
            throw new Error(errorData.message || 'Failed to accept request.');
        }

        // Remove from pending list and refresh UI
        PENDING_REQUESTS = PENDING_REQUESTS.filter(r => r.groupId !== groupId);
        updateNotificationCount();
        notificationModal.classList.remove('active');
        await refreshSidebarChats(token); // Refresh sidebar to show the now-active chat

    } catch (error) {
        alert("Error accepting request: " + error.message);
    }
}

async function rejectRequest(groupId) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${URL}/groups/reject-request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ groupId: groupId })
        });

        if (!response.ok) throw new Error('Failed to reject request.');

        // Remove from pending list
        PENDING_REQUESTS = PENDING_REQUESTS.filter(r => r.groupId !== groupId);
        updateNotificationCount();
        notificationModal.classList.remove('active');
        renderPendingRequests(); // Rerender the modal content

    } catch (error) {
        alert("Error rejecting request: " + error.message);
    }
}

// Event to toggle the notification modal
notificationIcon.addEventListener('click', (event) => {
    notificationModal.classList.toggle('active');
    renderPendingRequests();
    event.stopPropagation(); // Prevents click from propagating to the document listener
});

// Event to close both modals when clicking outside
document.addEventListener('click', (event) => {
    // Check if the click is outside the new chat modal
    if (newChatModal.classList.contains('active') &&
        !newChatModal.contains(event.target) &&
        !newChatBtn.contains(event.target)
    ) {
        newChatModal.classList.remove('active');
    }
    // Check if the click is outside the notification modal
    if (notificationModal.classList.contains('active') &&
        !notificationModal.contains(event.target) &&
        !notificationIcon.contains(event.target)
    ) {
        notificationModal.classList.remove('active');
    }
}, true);


// Renders a message received via API or WebSocket
function renderNewMessage(chat) {
    const isSent = chat.SenderId === CURRENT_USER_ID;
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isSent ? 'sent' : 'received');
    messageDiv.textContent = chat.chat || chat.messageText;

    chatMessagesContainer.appendChild(messageDiv);

    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

// =========================================================================
// NETWORK AND SEND MESSAGE LOGIC
// =========================================================================

async function fetchAllUsers(token) {
    try {
        const response = await fetch(`${URL}/user/user-data`, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) throw new Error('Unauthorized');
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Error fetching user list:", error);

        if (error.message === 'Unauthorized') {
            alert('Session expired. Please log in again.');
            localStorage.removeItem('token');
            window.location.replace("login.html");
        }
        return null;
    }
}

async function fetchChatHistory(groupId, token) {
    try {
        const response = await fetch(`${URL}/chat/get-chat?groupId=${groupId}`, {
            headers: {
                'Authorization': token
            }
        });

        if (!response.ok) throw new Error('Failed to load chat history');

        return response.json();
    } catch (error) {
        console.error("Error loading chat:", error);
        chatMessagesContainer.innerHTML = '<div class="message sent" style="background-color: #f7e0e0; color: #a10000;">Error loading chat history.</div>';
        return null;
    }
}

async function sendMessage() {
    const chat = messageInput.value.trim();
    const token = localStorage.getItem('token');

    if (!chat || !CURRENT_GROUP_ID || !token) {
        return;
    }

    const apiUrl = URL + '/chat/add-chat';
    const obj = {
        chat: chat,
        groupId: CURRENT_GROUP_ID
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(obj)
        });

        if (!response.ok) {
            let errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send message.');
        }

        messageInput.value = ''; // Clear input field

    } catch (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message: ' + error.message);
    }
}

// Event handler for the send button/enter key
sendMessageBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && messageInput.value.trim().length > 0) {
        sendMessage();
    }
});


// =========================================================================
// FEATURE: CREATE NEW CHAT / FRIEND REQUEST
// =========================================================================

// Called when a user is clicked in the Discover Modal
async function sendFriendRequest(receiverId, receiverName) {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch(`${URL}/groups/create-one-on-one`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({ receiverId: receiverId })
        });

        const data = await response.json();

        if (!response.ok && response.status !== 200) {
            throw new Error(data.message || 'Failed to initiate chat.');
        }

        alert(data.message || `Chat started with ${receiverName}! Check your sidebar.`);

        newChatModal.classList.remove('active');

        // Refresh the sidebar to show the new or existing chat
        await refreshSidebarChats(token);

        // Automatically open the new chat (it will be pending and input disabled by handleChatSelection)
        if (data.group && data.group.id) {
            // NOTE: data.group will return { id, status: 'pending' }
            // We pass the pending status for the new chat
            handleChatSelection(data.group.id, receiverName, true);
        }

    } catch (error) {
        console.error('Error initiating chat:', error);
        alert('Could not start chat: ' + error.message);
    }
}


// =========================================================================
// UI RENDERING AND EVENTS
// =========================================================================

// UPDATED: FUNCTION TO REFRESH THE SIDEBAR
// Now separates active chats from incoming pending requests.
async function refreshSidebarChats(token) {
    friendsChatsList.innerHTML = '<div class="empty-chat-placeholder" style="padding: 15px; color: var(--text-secondary);">Loading chats...</div>';

    try {
        const response = await fetch(`${URL}/groups/get-data`, {
            headers: { 'Authorization': token }
        });

        if (!response.ok) throw new Error('Failed to fetch user chats.');

        const data = await response.json();

        if (data && data.chats) {

            const activeChatsAndOutgoingRequests = [];
            PENDING_REQUESTS = []; // Clear and rebuild incoming requests on load

            data.chats.forEach(chat => {

                if (chat.isPending) {
                    // All pending chats sent from the backend are either outgoing requests (initiator)
                    // or incoming requests (recipient). Given the UX goal, we assume any pending chat
                    // that should be accepted/rejected belongs in the PENDING_REQUESTS array. 
                    // This moves ALL pending chats (both incoming/outgoing) to the modal UI 
                    // until the backend is updated to return an initiatorId for better filtering.

                    PENDING_REQUESTS.push({
                        groupId: chat.id,
                        senderId: chat.friendId, // The other person
                        senderName: chat.name
                    });

                } else {
                    // Only render active chats in the sidebar
                    activeChatsAndOutgoingRequests.push(chat);
                }
            });

            // Render only active chats (and outgoing requests, if any were incorrectly filtered above)
            renderFriendsList(activeChatsAndOutgoingRequests);
            updateNotificationCount(); // Update the red badge

        }

    } catch (error) {
        console.error("Error refreshing sidebar:", error);
        friendsChatsList.innerHTML = '<div class="empty-chat-placeholder" style="padding: 15px; color: red;">Failed to load chats.</div>';
    }
}


// Renders non-friends in the modal (Discover list)
function renderDiscoverUsers(users) {
    // FIX: Clear all previous dynamic list items to prevent duplication
    dynamicContactsList.innerHTML = '';

    // 1. Get the IDs of users already in active chats
    const activeFriendIds = getCurrentFriendIds();

    const filteredUsers = users.filter(user => {
        // 2. Filter out the logged-in user AND any user already in the sidebar
        return user.id !== CURRENT_USER_ID && !activeFriendIds.has(user.id);
    });

    filteredUsers.forEach(user => {
        const listItem = document.createElement('li');
        listItem.dataset.userId = user.id;

        const initial = getAvatarInitial(user.name);

        listItem.innerHTML = `
            <div class="contact-avatar">${initial}</div>
            <div class="contact-name-info">
                <div class="name">${user.name}</div>
                <div class="status">${user.phoneNumber}</div>
            </div>
        `;

        // Attach listener to call the friend request endpoint
        listItem.addEventListener('click', () => {
            sendFriendRequest(user.id, user.name);
        });

        dynamicContactsList.appendChild(listItem);
    });
}


// Renders the user's friends/chats on the left sidebar
function renderFriendsList(chats) {
    friendsChatsList.innerHTML = ''; // Clear existing content/placeholder

    if (chats.length === 0) {
        friendsChatsList.innerHTML = '<div class="empty-chat-placeholder" style="padding: 15px; color: var(--text-secondary);">No active chats. Start one from "New Chat"</div>';
        return;
    }

    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.classList.add('chat-item');
        // Add active style to initiator-pending requests if they are still in the list
        if (chat.isPending) {
            chatItem.classList.add('pending-request-item');
        }

        chatItem.dataset.groupId = chat.id;
        chatItem.dataset.friendId = chat.friendId || null;
        chatItem.dataset.isPending = chat.isPending || false; // Store status

        const initial = getAvatarInitial(chat.name);

        chatItem.innerHTML = `
            <div class="chat-avatar-placeholder">${initial}</div>
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="last-message">${chat.lastMessage}</div>
            </div>
        `;

        // Event handler to load chat history
        chatItem.addEventListener('click', () => {
            // Pass the isPending status from the chat object
            handleChatSelection(chat.id, chat.name, chat.isPending || false);
            document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
            chatItem.classList.add('active');
        });

        friendsChatsList.appendChild(chatItem);
    });
}


// Renders messages in the chat window
function renderChatHistory(chatData) {
    chatMessagesContainer.innerHTML = '';

    if (chatData.length === 0) {
        chatMessagesContainer.innerHTML = '<div class="message sent">Start the conversation!</div>';
        return;
    }

    chatData.forEach(chat => {
        const isSent = chat.SenderId === CURRENT_USER_ID;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', isSent ? 'sent' : 'received');
        messageDiv.textContent = chat.chat;
        chatMessagesContainer.appendChild(messageDiv);
    });

    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}


// UPDATED: Handle chat selection and history loading (Chat Restriction Logic)
async function handleChatSelection(groupId, friendName, isPending) {
    // If the user clicks the currently active chat, do nothing.
    if (CURRENT_GROUP_ID === groupId) return;

    // Get the message input area container for control
    const messageInputArea = document.getElementById('message-input-area');

    // 1. Update UI header
    const headerElement = document.getElementById('chat-header-default').querySelector('.contact-name');
    headerElement.textContent = friendName;
    chatMessagesContainer.innerHTML = '<div class="message sent">Loading chat history...</div>';

    // 2. PENDING STATUS CHECK - Disable chat functionality for pending groups
    if (isPending) {
        chatMessagesContainer.innerHTML = '<div class="message sent" style="background-color: #f7e0e0; color: #a10000;">Chat is pending acceptance. You cannot send messages yet.</div>';
        messageInputArea.style.pointerEvents = 'none'; // Disable input area
        messageInputArea.style.opacity = 0.5;
        CURRENT_GROUP_ID = null; // IMPORTANT: Prevent sendMessage from working
        return;
    } else {
        messageInputArea.style.pointerEvents = 'auto'; // Enable input area
        messageInputArea.style.opacity = 1;
    }


    // 3. Update state
    CURRENT_GROUP_ID = groupId;

    const token = localStorage.getItem('token');
    if (!token) return;

    // 4. Join the correct WebSocket room/group
    if (socket) {
        socket.emit('join-group', groupId);
    }

    // 5. Fetch the chat history
    const data = await fetchChatHistory(groupId, token);

    if (data && data.allChatData) {
        renderChatHistory(data.allChatData);
    }
}

// Toggle the New Chat modal visibility
async function toggleNewChatModal() {
    newChatModal.classList.toggle('active');

    if (newChatModal.classList.contains('active')) {
        const token = localStorage.getItem('token');
        if (!token || !CURRENT_USER_ID) return;

        // Fetch all users to display as potential new contacts
        const data = await fetchAllUsers(token);

        if (data && data.allUserData) {
            renderDiscoverUsers(data.allUserData);
        }
    }
}
newChatBtn.addEventListener('click', toggleNewChatModal);
document.addEventListener('click', (event) => {
    if (newChatModal.classList.contains('active') &&
        !newChatModal.contains(event.target) &&
        !newChatBtn.contains(event.target)
    ) {
        newChatModal.classList.remove('active');
    }
}, true);


// =========================================================================
// INITIALIZATION
// =========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.replace("login.html");
        return;
    }

    // --- TEMPORARY MOCKING ---
    // IMPORTANT: Replace this with logic to decode the JWT token 
    CURRENT_USER_ID = 1; // Replace with actual JWT decode logic
    // -------------------------

    // 1. Setup WebSocket connection
    // Ensure that Socket.io client library is loaded in HTML
    if (typeof io === 'function') {
        socket = io(URL);
        setupSocketListeners(socket);
    } else {
        console.error("Socket.io client library ('/socket.io/socket.io.js') failed to load.");
    }

    // 2. Load the user's active chats and populate PENDING_REQUESTS
    refreshSidebarChats(token);
});


// Utility: Gets IDs of users currently displayed in the active chats sidebar
function getCurrentFriendIds() {
    // Get all chat items (groups/friends) from the sidebar
    const chatItems = document.querySelectorAll('#friends-chats-list .chat-item');
    const friendIds = new Set();

    chatItems.forEach(item => {
        // The friendId is stored in a dataset attribute for 1-on-1 chats
        const friendId = item.dataset.friendId;
        // The ID comes in as a string, convert to integer for consistency
        if (friendId && friendId !== 'null' && !isNaN(parseInt(friendId))) {
            friendIds.add(parseInt(friendId));
        }
    });
    return friendIds;
}