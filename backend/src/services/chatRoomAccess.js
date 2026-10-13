function getDirectChatParticipants(roomId) {
  if (typeof roomId !== 'string' || roomId.length > 120) return null;
  const parts = roomId.split(':');
  if (parts.length !== 3 || parts[0] !== 'dm' || !parts[1] || !parts[2] || parts[1] === parts[2]) return null;
  return parts.slice(1);
}

function isDirectChatParticipant(userId, roomId) {
  return getDirectChatParticipants(roomId)?.includes(String(userId)) || false;
}

module.exports = { getDirectChatParticipants, isDirectChatParticipant };
