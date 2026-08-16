import { axiosInstance } from "./axios";

// ============ AUTH (with OTP) ============

// Signup: sends OTP to email
export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

// Verify signup OTP → creates account + logs in
export const verifySignupOtp = async ({ email, otp }) => {
  const response = await axiosInstance.post("/auth/verify-signup", { email, otp });
  return response.data;
};

// Password login
export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};

// Request login OTP
export const requestLoginOtp = async ({ email }) => {
  const response = await axiosInstance.post("/auth/login-otp", { email });
  return response.data;
};

// Verify login OTP
export const verifyLoginOtp = async ({ email, otp }) => {
  const response = await axiosInstance.post("/auth/verify-login-otp", { email, otp });
  return response.data;
};

// Forgot password (send OTP)
export const forgotPassword = async ({ email }) => {
  const response = await axiosInstance.post("/auth/forgot-password", { email });
  return response.data;
};

// Reset password (verify OTP + new password)
export const resetPassword = async ({ email, otp, newPassword }) => {
  const response = await axiosInstance.post("/auth/reset-password", {
    email, otp, newPassword,
  });
  return response.data;
};

export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    if (error.response?.status === 401) {
      localStorage.removeItem("talkhub-session");
    } else {
      console.log("Error in getAuthUser:", error);
    }
    return null;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.post("/auth/onboarding", userData);
  return response.data;
};

// ============ USERS ============

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers() {
  const response = await axiosInstance.get("/users");
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function cancelFriendRequest(requestId) {
  const response = await axiosInstance.delete(`/users/friend-request/${requestId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function getUserById(userId) {
  const response = await axiosInstance.get(`/users/${userId}`);
  return response.data;
}

export async function updateProfile(userData) {
  const response = await axiosInstance.put("/auth/update-profile", userData);
  return response.data;
}

export async function updateOnlineStatus(isOnline) {
  const response = await axiosInstance.put("/auth/update-status", { isOnline });
  return response.data;
}

export async function removeFriend(userId) {
  const response = await axiosInstance.delete(`/users/friends/${userId}`);
  return response.data;
}

// ============ FILE UPLOAD ============

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosInstance.post("/chat/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

// ============ STATUS / STORIES ============

export async function getStatuses() {
  const response = await axiosInstance.get("/status");
  return response.data;
}

export async function createStatus({ mediaUrl, mediaType, caption }) {
  const response = await axiosInstance.post("/status", {
    mediaUrl,
    mediaType,
    caption,
  });
  return response.data;
}

export async function markStatusViewed(statusId) {
  const response = await axiosInstance.put(`/status/${statusId}/view`);
  return response.data;
}

export async function deleteStatus(statusId) {
  const response = await axiosInstance.delete(`/status/${statusId}`);
  return response.data;
}

// ============ HIDDEN MESSAGES ("Delete for me") ============

export async function hideMessage({ messageId, channelId }) {
  const response = await axiosInstance.post("/chat/hide-message", {
    messageId,
    channelId,
  });
  return response.data;
}

export async function getHiddenMessages(channelId) {
  const response = await axiosInstance.get(`/chat/hidden-messages/${channelId}`);
  return response.data;
}

// ============ GROUPS ============

export async function getMyGroups() {
  const response = await axiosInstance.get("/groups");
  return response.data;
}

export async function getGroupById(id) {
  const response = await axiosInstance.get(`/groups/${id}`);
  return response.data;
}

export async function createGroup({ name, description, avatar, memberIds }) {
  const response = await axiosInstance.post("/groups", {
    name,
    description,
    avatar,
    memberIds,
  });
  return response.data;
}

export async function updateGroup(id, { name, description, avatar }) {
  const response = await axiosInstance.put(`/groups/${id}`, {
    name,
    description,
    avatar,
  });
  return response.data;
}

export async function deleteGroup(id) {
  const response = await axiosInstance.delete(`/groups/${id}`);
  return response.data;
}

export async function addGroupMembers(id, userIds) {
  const response = await axiosInstance.post(`/groups/${id}/members`, { userIds });
  return response.data;
}

export async function removeGroupMember(id, userId) {
  const response = await axiosInstance.delete(`/groups/${id}/members/${userId}`);
  return response.data;
}

export async function leaveGroup(id) {
  const response = await axiosInstance.post(`/groups/${id}/leave`);
  return response.data;
}

export async function promoteToAdmin(id, userId) {
  const response = await axiosInstance.put(`/groups/${id}/promote/${userId}`);
  return response.data;
}

export async function demoteAdmin(id, userId) {
  const response = await axiosInstance.put(`/groups/${id}/demote/${userId}`);
  return response.data;
}

// ============ CALLS ============

export async function initiateCall({ recipientId, type = "video" }) {
  const response = await axiosInstance.post("/calls/initiate", {
    recipientId,
    type,
  });
  return response.data;
}

export async function getCall(callId) {
  const response = await axiosInstance.get(`/calls/${callId}`);
  return response.data;
}

export async function acceptCall(callId) {
  const response = await axiosInstance.put(`/calls/${callId}/accept`);
  return response.data;
}

export async function rejectCall(callId) {
  const response = await axiosInstance.put(`/calls/${callId}/reject`);
  return response.data;
}

export async function cancelCall(callId) {
  const response = await axiosInstance.put(`/calls/${callId}/cancel`);
  return response.data;
}

export async function endCall(callId) {
  const response = await axiosInstance.put(`/calls/${callId}/end`);
  return response.data;
}

export async function leaveCall(callId) {
  const response = await axiosInstance.put(`/calls/${callId}/leave`);
  return response.data;
}

export async function markCallMissed(callId) {
  const response = await axiosInstance.put(`/calls/${callId}/missed`);
  return response.data;
}

export async function initiateGroupCall({ groupId, type = "video" }) {
  const response = await axiosInstance.post("/calls/initiate-group", {
    groupId,
    type,
  });
  return response.data;
}
