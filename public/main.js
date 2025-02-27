// Add at the start of the file
function getUsername() {
  const cookies = document.cookie.split(";");
  const usernameCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("username=")
  );
  return usernameCookie ? usernameCookie.split("=")[1] : null;
}

// Check for username on page load
const username = getUsername();
if (!username) {
  window.location.href = "/login.html";
}

// Modify socket connection to include username
const socket = io("ws://192.103.1.54:3001", {
  transports: ["websocket"],
  auth: {
    username: username,
  },
});

// Update state initialization
let state = {
  messages: [],
  username: username,
  usersOnline: [],
  selectedMessage: null,
  typingUsers: new Set(),
  selectedUserProfile: null,
};
state = {
  messages: [
    {
      messageId: "welcome-message",
      text: "Welcome to TKJ CHAT! By using this chat, you agree to our terms of service and community guidelines. Please be respectful to other users and avoid sharing sensitive personal information. Happy chatting! 🎉",
      isWelcomeMessage: true,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ],
  // ... other state properties
};
// DOM Elements
const elements = {
  messageForm: document.getElementById("messageForm"),
  messageInput: document.getElementById("messageInput"),
  messagesContainer: document.getElementById("messagesContainer"),
  usersContainer: document.getElementById("usersContainer"),
  sidebarToggle: document.getElementById("sidebarToggle"),
  sidebar: document.getElementById("sidebar"),
  profileModal: document.getElementById("profileModal"),
  closeProfileModal: document.getElementById("closeProfileModal"),
  typingIndicator: document.getElementById("typingIndicator"),
  typingText: document.getElementById("typingText"),
  userAvatar: document.getElementById("userAvatar"),
  userId: document.getElementById("userId"),
};
// Add maxlength attribute to message input
elements.messageInput.setAttribute("maxlength", "90");

function updateCharacterCount() {
  const messageLength = elements.messageInput.value.length;
  const maxLength = 90;

  // Create or get character count element
  let charCount = document.getElementById("charCount");
  if (!charCount) {
    charCount = document.createElement("div");
    charCount.id = "charCount";
    charCount.className = "text-sm text-gray-400 mb-2 text-right";
    // Insert before the messageForm
    elements.messageForm.parentNode.insertBefore(
      charCount,
      elements.messageForm
    );
  }

  // Update the count display
  charCount.textContent = `${messageLength}/${maxLength} characters`;

  // Show warning when approaching limit
  if (messageLength >= maxLength) {
    charCount.className = "text-sm text-red-400 mb-2 text-right";
    charCount.textContent = "Maximum character limit reached!";
  } else {
    charCount.className = "text-sm text-gray-400 mb-2 text-right";
  }
}
// Add input event listener to show remaining characters
elements.messageInput.addEventListener("input", function () {
  updateCharacterCount();
  handleTyping(this.value);
});
let isServerConnected = false;
// Socket Events
socket.on("connect", () => {
  isServerConnected = true;
  state.userId = getUsername(); // Use username instead of socket.id
  elements.userId.textContent = state.userId;
  elements.userAvatar.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${state.userId}`;
  socket.emit("user connected", state.userId);
});
socket.on("disconnect", () => {
  isServerConnected = false;
});

// Add to your elements object
elements.emojiButton = document.getElementById("emojiButton");
elements.emojiPicker = document.getElementById("emojiPicker");
elements.fileButton = document.getElementById("fileButton");
elements.fileInput = document.getElementById("fileInput");

// Default emojis array
const defaultEmojis = [
  "😀",
  "😂",
  "🤣",
  "😊",
  "😍",
  "🥰",
  "😘",
  "😎",
  "😋",
  "😭",
  "😢",
  "😤",
  "😠",
  "🤔",
  "😴",
  "😷",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🤝",
  "👋",
  "❤️",
  "💔",
  "🎉",
  "✨",
  "⭐",
  "🔥",
  "💯",
  "💪",
  "🤦",
  "🤷",
];

// Initialize emoji picker
function initializeEmojiPicker() {
  elements.emojiPicker.innerHTML = defaultEmojis
    .map(
      (emoji) =>
        `<butto class="p-1 hover:bg-gray-700 rounded" onclick="insertEmoji('${emoji}')">${emoji}</butto>`
    )
    .join("");
}

// Insert emoji into message input
function insertEmoji(emoji) {
  const input = elements.messageInput;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value =
    input.value.substring(0, start) + emoji + input.value.substring(end);
  input.selectionStart = input.selectionEnd = start + emoji.length;
  elements.emojiPicker.classList.add("hidden");
}

// Toggle emoji picker
elements.emojiButton.addEventListener("click", () => {
  elements.emojiPicker.classList.toggle("hidden");
});

// Handle file upload
elements.fileButton.addEventListener("click", () => {
  elements.fileInput.click();
});

elements.fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (file) {
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      showToast("File size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      socket.emit("image message", {
        id: state.userId,
        image: imageData,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        messageId: Date.now().toString(),
      });
    };
    reader.readAsDataURL(file);
  }
});

// Initialize emoji picker on startup
initializeEmojiPicker();

// Add click outside handler for emoji picker
document.addEventListener("click", (e) => {
  if (!e.target.closest("#emojiPicker") && !e.target.closest("#emojiButton")) {
    elements.emojiPicker.classList.add("hidden");
  }
});

// Make insertEmoji available globally

socket.on("update users", (users) => {
  state.usersOnline = users.map((id) => ({
    id,
    avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${id}`,
  }));
  renderUsers();
});

socket.on("general message", (msg) => {
  msg.isNew = true;
  state.messages.push(msg);
  renderMessages();
  // Remove isNew flag after animation
  setTimeout(() => {
    const message = state.messages.find((m) => m.messageId === msg.messageId);
    if (message) {
      message.isNew = false;
    }
  }, 300);
});
socket.on("user joined", (user) => {
  const joinMessage = {
    id: user.id,
    text: `${user.id} joined to the group`,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    avatar: user.avatar,
    messageId: `join-${Date.now()}`,
    isJoinMessage: true,
  };
  state.messages.push(joinMessage);
  renderMessages();
});

socket.on("message deleted", ({ messageId, deletedMessageText }) => {
  const messageToUpdate = state.messages.find(
    (msg) => msg.messageId === messageId
  );
  if (messageToUpdate) {
    messageToUpdate.text = deletedMessageText;
    messageToUpdate.isDeleted = true;
    renderMessages();
    showToast("Message successfully deleted"); // Add this line
  }
});

socket.on("user typing", (typingUser) => {
  if (!state.typingUsers) {
    state.typingUsers = new Set();
  }
  state.typingUsers.add(typingUser);
  updateTypingIndicator();
  renderUsers();
});

socket.on("user stopped typing", (stoppedUser) => {
  if (!state.typingUsers) {
    state.typingUsers = new Set();
  }
  state.typingUsers.delete(stoppedUser);
  updateTypingIndicator();
  renderUsers();
});

// Event Listeners
elements.messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage();
});

elements.messageInput.addEventListener("input", (e) => {
  handleTyping(e.target.value);
});

elements.closeProfileModal.addEventListener("click", closeProfileModal);
function createMessageOptions(msg, isOwnMessage) {
  if (state.selectedMessage !== msg.messageId) return "";

  return `
    <div class="absolute right-0 bottom-8 bg-gray-800 rounded-md shadow-lg z-10 message-options animate-fade-up">
      ${
        isOwnMessage && !msg.isDeleted
          ? `
        <button class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-2" onclick="handleEditMessage('${msg.messageId}')">
          <i data-lucide="edit" class="w-4 h-4"></i>
          Edit
        </button>
      `
          : ""
      }
      <button class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-2" onclick="handleCopyMessage('${
        msg.text
      }')">
        <i data-lucide="copy" class="w-4 h-4"></i>
        Copy
      </button>
      ${
        !isOwnMessage
          ? `
        <button class="w-full px-4 py-2 text-left hover:bg-gray-700 flex items-center gap-2" onclick="handleReplyMessage('${msg.messageId}')">
          <i data-lucide="reply" class="w-4 h-4"></i>
          Reply
        </button>
      `
          : ""
      }
      ${
        isOwnMessage && !msg.isDeleted
          ? `
        <button class="w-full px-4 py-2 text-left hover:bg-gray-700 text-red-400 flex items-center gap-2" onclick="handleDeleteMessage('${msg.messageId}')">
          <i data-lucide="trash" class="w-4 h-4"></i>
          Delete
        </button>
      `
          : `
        <button class="w-full px-4 py-2 text-left hover:bg-gray-700 text-red-400 flex items-center gap-2" onclick="handleReportMessage('${msg.messageId}')">
          <i data-lucide="flag" class="w-4 h-4"></i>
          Report
        </button>
      `
      }
    </div>
  `;
}

// Functions

// Add this new function
function hideCharacterCount() {
  const charCount = document.getElementById("charCount");
  if (charCount) {
    charCount.style.display = "none";
  }
}

// Modify the existing updateCharacterCount function
function updateCharacterCount() {
  const messageLength = elements.messageInput.value.length;
  const maxLength = 90;

  let charCount = document.getElementById("charCount");
  if (!charCount) {
    charCount = document.createElement("div");
    charCount.id = "charCount";
    charCount.className = "text-sm text-gray-400 mb-2 text-right";
    elements.messageForm.parentNode.insertBefore(
      charCount,
      elements.messageForm
    );
  }

  // Show character count when typing
  charCount.style.display = "block";

  // Update the count display
  charCount.textContent = `${messageLength}/${maxLength} characters`;

  if (messageLength >= maxLength) {
    charCount.className = "text-sm text-red-400 mb-2 text-right";
    charCount.textContent = "Maximum character limit reached!";
  } else {
    charCount.className = "text-sm text-gray-400 mb-2 text-right";
  }
}

// Add socket listener for edited messages
socket.on("message edited", ({ messageId, newText }) => {
  const messageToEdit = state.messages.find(
    (msg) => msg.messageId === messageId
  );
  if (messageToEdit) {
    messageToEdit.text = newText;
    messageToEdit.isEdited = true; // Make sure this is set
    renderMessages();
  }
});

function handleTyping(value) {
  if (value.trim()) {
    socket.emit("typing", state.userId);
  } else {
    socket.emit("stop typing", state.userId);
  }
}

function updateTypingIndicator() {
  if (!state.typingUsers) {
    state.typingUsers = new Set();
  }

  const typingUsers = Array.from(state.typingUsers);
  if (typingUsers.length > 0) {
    elements.typingIndicator.classList.remove("hidden");
    elements.typingText.textContent =
      typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.length} users are typing...`;
  } else {
    elements.typingIndicator.classList.add("hidden");
  }
}

function renderMessages() {
  if (state.messages.length === 0) {
    elements.messagesContainer.innerHTML =
      '<p class="text-gray-500 text-center">No messages yet...</p>';
    return;
  }

  elements.messagesContainer.innerHTML = state.messages
    .map((msg) => createMessageHTML(msg))
    .join("");
  elements.messagesContainer.scrollTop =
    elements.messagesContainer.scrollHeight;

  // Add this line to reinitialize icons after rendering
  lucide.createIcons();
}

function createMessageHTML(msg) {
  if (msg.isWelcomeMessage) {
    return `
      <div class="flex items-end justify-center mb-4">
        <div class="bg-gray-700 self-center text-center max-w-[90%] p-4 rounded-lg text-white break-words">
          <p class="text-sm leading-relaxed">${msg.text}</p>
          <p class="text-xs text-gray-400 mt-2">${msg.time}</p>
        </div>
      </div>
    `;
  }

  if (msg.isJoinMessage) {
    return `
      <div class="flex items-end justify-center ${
        msg.isNew ? "animate-fade-up" : ""
      }">
        <div class="bg-green-600 self-center text-center max-w-[80%] p-2 rounded-lg text-white break-words">
          <p class="text-sm">${msg.text}</p>
        </div>
      </div>
    `;
  }

  const isOwnMessage = msg.id === state.userId;
  const isFriend = state.friends.has(msg.id);
  const replySection = msg.replyTo
    ? `
      <div class="mb-1 ${
        isOwnMessage ? "mr-10" : "ml-10"
      } p-2 bg-gray-800 rounded text-sm text-gray-400 border-l-2 border-blue-500">
        <div class="flex items-center gap-2">
          <i data-lucide="reply" class="w-3 h-3"></i>
          <span>Replying to ${
            msg.replyTo.id === state.userId ? "yourself" : msg.replyTo.id
          }</span>
        </div>
        <p class="ml-5 truncate">${msg.replyTo.text}</p>
      </div>
    `
    : "";

  const avatarUrl = cacheUserAvatar(msg.id);
  const bubbleClass = isOwnMessage
    ? "bg-blue-500 self-end"
    : isFriend
    ? "bg-green-600 self-start"
    : "bg-gray-700 self-start";

  const friendBadge =
    isFriend && !isOwnMessage
      ? `<span class="ml-2 text-xs bg-green-700 px-2 py-0.5 rounded-full">Friend</span>`
      : "";

  return `
    <div class="flex flex-col ${isOwnMessage ? "items-end" : "items-start"} ${
    msg.isNew ? "animate-fade-up" : ""
  }">
      ${replySection}
      <div class="flex items-end gap-2 ${
        isOwnMessage ? "justify-end" : "justify-start"
      } min-w-[200px]">
        ${
          !isOwnMessage
            ? `<img src="${avatarUrl}" alt="avatar" class="w-8 h-8 rounded-full border border-gray-500 cursor-pointer" onclick="openProfileModal('${msg.id}')">`
            : ""
        }
        <div class="relative max-w-[80%] min-w-[180px] p-2 rounded-lg text-white break-words ${bubbleClass}">
          <p class="text-xs font-bold flex items-center">${
            isOwnMessage ? "You" : msg.id
          }${friendBadge}</p>
          <p class="text-sm">${msg.text}</p>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
              <p class="text-xs text-gray-300">${msg.time}</p>
              ${
                msg.isEdited
                  ? '<span class="text-xs text-gray-300">(edited)</span>'
                  : ""
              }
            </div>
            <div class="flex items-center gap-1">
              ${
                isOwnMessage
                  ? `<i data-lucide="${
                      msg.isOffline ? "check" : "check-check"
                    }" 
                    class="w-4 h-4 ${
                      msg.isOffline ? "text-gray-400" : "text-green-400"
                    }"></i>`
                  : ""
              }
              <button class="p-1 hover:bg-gray-600 rounded" onclick="toggleMessageOptions('${
                msg.messageId
              }')">
                <i data-lucide="more-vertical" class="w-4 h-4"></i>
              </button>
              ${createMessageOptions(msg, isOwnMessage)}
            </div>
          </div>
        </div>
        ${
          isOwnMessage
            ? `<img src="${avatarUrl}" alt="avatar" class="w-8 h-8 rounded-full border border-gray-500">`
            : ""
        }
      </div>
    </div>
  `;
}

// Event listener untuk tombol close modal
document
  .getElementById("closeProfileModal")
  .addEventListener("click", closeProfileModal);

// Event listener untuk menutup modal saat mengklik di luar modal
document.addEventListener("click", (e) => {
  const profileModal = document.getElementById("profileModal");
  if (e.target === profileModal) {
    closeProfileModal();
  }
});
// Helper functions
function handleCopyMessage(text) {
  // Fallback for browsers without Clipboard API
  if (!navigator.clipboard) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand("copy");
      showToast("Message copied to clipboard");
    } catch (err) {
      showToast("Failed to copy message");
    }

    document.body.removeChild(textArea);
    return;
  }

  // Modern browsers with Clipboard API
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast("Message copied to clipboard");
    })
    .catch(() => {
      showToast("Failed to copy message");
    });
}

function handleCopyUsername(username) {
  navigator.clipboard.writeText(username).then(() => {
    showToast("Username copied to clipboard");
  });
}

function handleReplyMessage(messageId) {
  const message = state.messages.find((msg) => msg.messageId === messageId);
  if (message) {
    state.replyingTo = {
      id: message.id,
      text: message.text,
      messageId: message.messageId,
    };
    // Remove existing reply indicator if any
    const existingIndicator = document.getElementById("replyIndicator");
    if (existingIndicator) existingIndicator.remove();

    // Create reply indicator above message input
    const replyIndicator = document.createElement("div");
    replyIndicator.id = "replyIndicator";
    replyIndicator.className =
      "bg-gray-800 p-2 rounded-t-lg border-l-2 border-blue-500";
    replyIndicator.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <span class="text-blue-400 text-sm">Replying to ${message.id}</span>
          <p class="text-gray-400 text-sm truncate">${message.text}</p>
        </div>
        <button onclick="cancelReply()" class="text-gray-400 hover:text-white">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    `;
    elements.messageForm.parentElement.insertBefore(
      replyIndicator,
      elements.messageForm
    );
    lucide.createIcons();
  }

  state.selectedMessage = null;
  renderMessages();
}

function cancelReply() {
  state.replyingTo = null;
  const replyIndicator = document.getElementById("replyIndicator");
  if (replyIndicator) {
    replyIndicator.remove();
  }
}
const avatarCache = new Map(); // Add this at the top with other state variables
function cacheUserAvatar(userId) {
  if (!avatarCache.has(userId)) {
    avatarCache.set(
      userId,
      `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userId}`
    );
  }
  return avatarCache.get(userId);
}
function handleReportMessage(messageId) {
  showToast("Message reported");
  state.selectedMessage = null;
  renderMessages();
}

function showToast(message) {
  const toast = document.createElement("div");
  toast.className =
    "fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg animate-fade-in z-50";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
// Add to your elements object
elements.userSettingsModal = document.getElementById("userSettingsModal");

// Add click handler for own user bubble
function handleOwnUserClick() {
  const modalHTML = `
    <div id="userSettingsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-lg p-6 w-96 max-w-full animate-fade-in">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-bold">User Settings</h2>
          <button onclick="closeUserSettings()" class="text-gray-400 hover:text-white">
            <i data-lucide="x" class="w-6 h-6"></i>
          </button>
        </div>
        
        <div class="space-y-6">
          <!-- Profile Section -->
          <div class="flex items-center gap-4">
            <img src="${elements.userAvatar.src}" 
              alt="Your avatar" 
              class="w-20 h-20 rounded-full border-2 border-blue-500">
            <div>
              <p class="text-lg font-semibold">${state.userId}</p>
              <p class="text-sm text-green-400">Online</p>
            </div>
          </div>

          <!-- Settings Options -->
          <div class="space-y-4">
            <button class="w-full flex items-center gap-3 p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
              <i data-lucide="user" class="w-5 h-5"></i>
              <span>Edit Profile</span>
            </button>
            
            <button class="w-full flex items-center gap-3 p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
              <i data-lucide="bell" class="w-5 h-5"></i>
              <span>Notifications</span>
            </button>

            <button class="w-full flex items-center gap-3 p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
              <i data-lucide="shield" class="w-5 h-5"></i>
              <span>Privacy & Security</span>
            </button>

            <button class="w-full flex items-center gap-3 p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
              <i data-lucide="palette" class="w-5 h-5"></i>
              <span>Appearance</span>
            </button>
          </div>

          <!-- Logout Button -->
          <button class="w-full flex items-center gap-3 p-3 bg-red-600 rounded-md hover:bg-red-700 transition-colors mt-8">
            <i data-lucide="log-out" class="w-5 h-5"></i>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Add modal to body
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  lucide.createIcons();
}

// Close settings modal function
function closeUserSettings() {
  const modal = document.getElementById("userSettingsModal");
  if (modal) {
    modal.remove();
  }
}
// Add this to renderUsers function in the online users section
function renderUsers() {
  const ownUser = {
    id: state.username,
    avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${state.username}`,
  };
  const otherUsers = state.usersOnline.filter(
    (user) => user.id !== state.userId
  );
  const onlineUsers = otherUsers.filter((user) => user.status !== "offline");
  const offlineUsers = otherUsers.filter((user) => user.status === "offline");

  elements.usersContainer.innerHTML = `
    <style>
      @keyframes typingDot {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
      .typing-dots span {
        width: 4px;
        height: 4px;
        margin: 0 1px;
        background-color: #10B981;
        border-radius: 50%;
        display: inline-block;
        animation: typingDot 1s infinite;
      }
      .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
      .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    </style>

    <!-- Own User Bubble -->
    <div class="flex items-center gap-2 p-2 bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 mb-4"
        onclick="handleOwnUserClick()">
        <img src="${
          ownUser.avatar
        }" alt="Your avatar" class="w-8 h-8 rounded-full border border-white">
        <div class="flex flex-col flex-1">
          <p class="text-sm truncate">You</p>
          <span class="text-xs text-green-400 opacity-75">Online</span>
        </div>
    </div>

    ${
      onlineUsers.length > 0
        ? `
      <div class="p-2 text-sm font-semibold text-green-400 border-b border-gray-700">
        Online Users (${onlineUsers.length})
      </div>
      ${onlineUsers
        .map(
          (user) => `
        <div class="flex items-center gap-2 p-2 ${
          state.friends.has(user.id) ? "bg-green-600" : "bg-gray-700"
        } rounded-md cursor-pointer hover:bg-opacity-80 mt-2"
            onclick="openProfileModal('${user.id}')">
            <img src="${
              user.avatar
            }" alt="avatar" class="w-8 h-8 rounded-full border border-gray-500">
            <div class="flex flex-col flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm truncate">${user.id}</p>
                ${
                  state.friends.has(user.id)
                    ? '<span class="text-xs bg-green-700 px-2 py-0.5 rounded-full">Friend</span>'
                    : ""
                }
              </div>
              ${
                state.typingUsers && state.typingUsers.has(user.id)
                  ? `
                <div class="flex items-center gap-1">
                  <span class="text-xs text-green-400">typing</span>
                  <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              `
                  : '<span class="text-xs text-green-400">online</span>'
              }
            </div>
        </div>
      `
        )
        .join("")}
    `
        : ""
    }

    ${
      offlineUsers.length > 0
        ? `
      <div class="p-2 text-sm font-semibold text-gray-400 border-b border-gray-700 mt-4">
        Offline Users (${offlineUsers.length})
      </div>
      ${offlineUsers
        .map(
          (user) => `
        <div class="flex items-center gap-2 p-2 ${
          state.friends.has(user.id)
            ? "bg-green-600 bg-opacity-50"
            : "bg-gray-700"
        } rounded-md cursor-pointer hover:bg-opacity-80 mt-2"
            onclick="openProfileModal('${user.id}')">
            <img src="${
              user.avatar
            }" alt="avatar" class="w-8 h-8 rounded-full border border-gray-500 opacity-50">
            <div class="flex flex-col flex-1">
              <div class="flex items-center gap-2">
                <p class="text-sm truncate text-gray-300">${user.id}</p>
                ${
                  state.friends.has(user.id)
                    ? '<span class="text-xs bg-green-700 bg-opacity-50 px-2 py-0.5 rounded-full">Friend</span>'
                    : ""
                }
              </div>
              <span class="text-xs text-gray-500">offline</span>
            </div>
        </div>
      `
        )
        .join("")}
    `
        : ""
    }

    ${
      otherUsers.length === 0
        ? '<p class="text-gray-400 p-2">No other users</p>'
        : ""
    }
  `;
}

function openProfileModal(userId) {
  const userProfile = {
    id: userId,
    name: `User ${userId}`,
    status: "Online",
    role: "Member",
  };

  const isFriend = state.friends.has(userId);
  const friendButton = isFriend
    ? `<button onclick="handleRemoveFriend('${userId}')" 
        class="w-full flex items-center gap-3 p-4 bg-red-600 rounded-md hover:bg-red-700 transition-colors text-base">
        <i data-lucide="user-minus" class="w-6 h-6"></i>
        <span>Remove Friend</span>
      </button>`
    : `<button onclick="handleAddFriend('${userId}')" 
        class="w-full flex items-center gap-3 p-4 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-base">
        <i data-lucide="user-plus" class="w-6 h-6"></i>
        <span>Add Friend</span>
      </button>`;

  const profileContent = document.getElementById("profileContent");
  const modalContent = `
    <div class="flex items-center gap-6 animate-fade-in w-[400px]">
      <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=${userId}" 
        alt="avatar" 
        class="w-32 h-32 rounded-full border-2 border-blue-500">
      <div class="flex-1">
        <p class="text-2xl font-bold">${userId}</p>
        <p class="text-base text-gray-400 flex items-center gap-2 mt-3">
          <span class="w-3 h-3 rounded-full bg-green-400"></span>
          Online
        </p>
        <p class="text-base text-gray-400 mt-2">Role: Member</p>
        ${
          state.typingUsers && state.typingUsers.has(userId)
            ? `<p class="text-base text-green-400 flex items-center gap-2 mt-2">
              <div class="typing-animation">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
              </div>
              <span>Typing...</span>
            </p>`
            : ""
        }
      </div>
    </div>
    <div class="mt-8 space-y-4 w-full">
      ${friendButton}
      <button onclick="handleReport('${userId}')" 
        class="w-full flex items-center gap-3 p-4 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors text-base">
        <i data-lucide="flag" class="w-6 h-6"></i>
        <span>Report User</span>
      </button>
    </div>
  `;

  profileContent.innerHTML = modalContent;
  document.getElementById("profileModal").classList.remove("hidden");
  lucide.createIcons();
}
socket.on("friend removed", (data) => {
  state.friends.delete(data.from);
  renderUsers();
  renderMessages();
  showToast(`${data.from} removed you from friends`);
});
function handleRemoveFriend(userId) {
  socket.emit("remove friend", {
    from: state.userId,
    to: userId,
  });

  state.friends.delete(userId);
  renderUsers();
  renderMessages();
  closeProfileModal();
  showToast(`Removed ${userId} from friends`);
}
function closeProfileModal() {
  document.getElementById("profileModal").classList.add("hidden");
}
function createProfileModalContent(profile) {
  return `
          <div class="flex items-center gap-4 animate-fade-in">
            <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=${
              profile.id
            }" 
              alt="avatar" 
              class="w-16 h-16 rounded-full border border-gray-500">
            <div>
              <p class="text-lg font-bold">${profile.name}</p>
              <p class="text-sm text-gray-400 flex items-center gap-1">
                <span class="w-2 h-2 rounded-full ${
                  profile.status === "Online" ? "bg-green-400" : "bg-red-500"
                }"></span>
                ${profile.status}
              </p>
              <p class="text-sm text-gray-400">Role: ${profile.role}</p>
         ${
           state.typingUsers && state.typingUsers.includes(userId)
             ? `<p class="text-base text-green-400 flex items-center gap-2 mt-2">
        <div class="typing-animation">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
        <span>Typing...</span>
      </p>`
             : ""
         }
            </div>
          </div>
        `;
}
state.friends = new Set();
function handleAddFriend(userId) {
  socket.emit("friend request", {
    from: state.userId,
    to: userId,
  });
  showToast(`Friend request sent to ${userId}`);
  closeProfileModal();
}

// Add socket listener for friend requests
socket.on("friend request received", (request) => {
  showFriendRequestModal(request);
});
function showFriendRequestModal(request) {
  const existingModal = document.getElementById("friendRequestModal");
  if (existingModal) {
    // Show toast to the user who sent the request
    socket.emit("toast notification", {
      to: request.from,
      message: `Failed request, user is already in a request with another user`,
    });
    return;
  }

  const modalHTML = `
    <div id="friendRequestModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-lg p-6 w-96 animate-fade-in">
        <div class="text-center mb-6">
          <img src="https://api.dicebear.com/7.x/pixel-art/svg?seed=${request.from}" 
            alt="avatar" 
            class="w-20 h-20 rounded-full border-2 border-blue-500 mx-auto mb-4">
          <h2 class="text-xl font-bold mb-2">Friend Request</h2>
          <p class="text-gray-300">${request.from} wants to be your friend</p>
        </div>
        
        <div class="flex gap-4">
          <button onclick="acceptFriendRequest('${request.from}')" 
            class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md transition-colors">
            Accept
          </button>
          <button onclick="rejectFriendRequest('${request.from}')" 
            class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md transition-colors">
            Decline
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// Add socket listener for friend requests
socket.on("friend request received", (request) => {
  showFriendRequestModal(request);
});

// Add socket listener for toast notifications
socket.on("toast notification", (data) => {
  if (data.to === state.userId) {
    showToast(data.message);
  }
});

// Add socket listener for friend requests
socket.on("friend request received", (request) => {
  showFriendRequestModal(request);
});

// Add socket listener for toast notifications
socket.on("toast notification", (data) => {
  if (data.to === state.userId) {
    showToast(data.message);
  }
});
// Add socket listener for friend requests
socket.on("friend request received", (request) => {
  showFriendRequestModal(request);
});
socket.on("friendship established", (data) => {
  state.friends.add(data.friend);
  renderUsers();
  renderMessages();
});

// Add friend request response handlers
function acceptFriendRequest(userId) {
  socket.emit("friend request response", {
    from: state.userId,
    to: userId,
    accepted: true,
  });

  state.friends.add(userId);
  renderUsers();
  renderMessages();

  removeFriendRequestModal();
  showToast(`You are now friends with ${userId}`);
}

function rejectFriendRequest(userId) {
  socket.emit("friend request response", {
    from: state.userId,
    to: userId,
    accepted: false,
  });
  removeFriendRequestModal();
  showToast(`Friend request from ${userId} declined`);
}

function removeFriendRequestModal() {
  const modal = document.getElementById("friendRequestModal");
  if (modal) {
    modal.remove();
  }
}
function handleReport(username) {
  alert(`Reported ${username}`);
  closeProfileModal();
}

function toggleMessageOptions(messageId) {
  if (state.selectedMessage === messageId) {
    state.selectedMessage = null;
  } else {
    state.selectedMessage = messageId;
  }
  renderMessages();
}

function handleDeleteMessage(messageId) {
  const message = state.messages.find((msg) => msg.messageId === messageId);
  if (message) {
    socket.emit("delete message", {
      messageId,
      deletedMessageText: "This message was deleted",
    });
  }
  state.selectedMessage = null;
}

function handleEditMessage(messageId) {
  const messageToEdit = state.messages.find(
    (msg) => msg.messageId === messageId
  );
  if (messageToEdit) {
    // Set input value to message text
    elements.messageInput.value = messageToEdit.text;
    elements.messageInput.focus();

    // Store editing state
    state.editingMessageId = messageId;

    // Change submit button text to indicate editing
    const submitButton = elements.messageForm.querySelector(
      'button[type="submit"]'
    );
    submitButton.innerHTML = '<i data-lucide="check"></i>';

    // Add edit indicator above input
    const editIndicator = document.createElement("div");
    editIndicator.id = "editIndicator";
    editIndicator.className = "bg-blue-900 p-2 rounded-t-lg text-sm";
    editIndicator.innerHTML = `
      <div class="flex justify-between items-center">
        <span>Editing message</span>
        <button onclick="cancelEdit()" class="text-gray-400 hover:text-white">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    `;
    elements.messageForm.parentElement.insertBefore(
      editIndicator,
      elements.messageForm
    );
    lucide.createIcons();
  }

  state.selectedMessage = null;
  renderMessages();
}

function cancelEdit() {
  // Reset form
  hideCharacterCount();
  elements.messageInput.value = "";
  state.editingMessageId = null;

  // Reset submit button
  const submitButton = elements.messageForm.querySelector(
    'button[type="submit"]'
  );
  submitButton.innerHTML = '<i data-lucide="send"></i>';

  // Remove edit indicator
  const editIndicator = document.getElementById("editIndicator");
  if (editIndicator) {
    editIndicator.remove();
  }

  lucide.createIcons();
}
// Modify the sendMessage function to handle edits
// Update the socket.on connect event
socket.on("connect", () => {
  isServerConnected = true;
  state.userId = getUsername(); // Use username instead of socket.id
  elements.userId.textContent = state.userId;
  elements.userAvatar.src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${state.userId}`;
  socket.emit("user connected", state.userId);
});

// Update the sendMessage function
function sendMessage() {
  const message = elements.messageInput.value.trim();
  if (!message) return;

  hideCharacterCount();
  if (state.editingMessageId) {
    socket.emit("edit message", {
      messageId: state.editingMessageId,
      newText: message,
    });
    cancelEdit();
  } else {
    const newMessage = {
      id: state.userId, // This will now use the username
      text: message,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      avatar: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${state.userId}`,
      messageId: Date.now().toString(),
      replyTo: state.replyingTo,
    };

    if (!isServerConnected) {
      const offlineMessage = {
        ...newMessage,
        isOffline: true,
      };
      state.messages.push(offlineMessage);
      renderMessages();
    } else {
      socket.emit("general message", newMessage);
    }
  }

  elements.messageInput.value = "";
  cancelReply();
  socket.emit("stop typing", state.userId);
}

// Add this new function
function hideCharacterCount() {
  const charCount = document.getElementById("charCount");
  if (charCount) {
    charCount.style.display = "none";
  }
}

// Modify the existing updateCharacterCount function
function updateCharacterCount() {
  const messageLength = elements.messageInput.value.length;
  const maxLength = 90;

  let charCount = document.getElementById("charCount");
  if (!charCount) {
    charCount = document.createElement("div");
    charCount.id = "charCount";
    charCount.className = "text-sm text-gray-400 mb-2 text-right";
    elements.messageForm.parentNode.insertBefore(
      charCount,
      elements.messageForm
    );
  }

  // Show character count when typing
  charCount.style.display = "block";

  // Update the count display
  charCount.textContent = `${messageLength}/${maxLength} characters`;

  if (messageLength >= maxLength) {
    charCount.className = "text-sm text-red-400 mb-2 text-right";
    charCount.textContent = "Maximum character limit reached!";
  } else {
    charCount.className = "text-sm text-gray-400 mb-2 text-right";
  }
}

// Initialize
function init() {
  lucide.createIcons();

  elements.sidebarToggle.addEventListener("click", () => {
    elements.sidebar.classList.toggle("-translate-x-full");
  });

  // Enhanced click outside handler
  document.addEventListener("click", (e) => {
    const isClickedOutside =
      !e.target.closest(".message-options") &&
      !e.target.closest("[onclick^='toggleMessageOptions']");

    if (isClickedOutside && state.selectedMessage) {
      state.selectedMessage = null;
      renderMessages();
    }
  });
}

// Start the app
init();

// Make functions available globally for onclick handlers
window.openProfileModal = openProfileModal;
window.handleAddFriend = handleAddFriend;
window.handleReport = handleReport;
window.toggleMessageOptions = toggleMessageOptions;
window.handleDeleteMessage = handleDeleteMessage;
window.handleEditMessage = handleEditMessage;
// Make functions globally available
window.handleCopyMessage = handleCopyMessage;
window.handleCopyUsername = handleCopyUsername;
window.handleReplyMessage = handleReplyMessage;
window.handleReportMessage = handleReportMessage;
window.insertEmoji = insertEmoji;
window.cancelReply = cancelReply;
