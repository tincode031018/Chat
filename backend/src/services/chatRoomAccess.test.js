const { getDirectChatParticipants, isDirectChatParticipant } = require('./chatRoomAccess');

describe('direct chat room access', () => {
  const roomId = 'dm:alice-id:bob-id';

  it('accepts either participant and rejects everyone else', () => {
    expect(isDirectChatParticipant('alice-id', roomId)).toBe(true);
    expect(isDirectChatParticipant('bob-id', roomId)).toBe(true);
    expect(isDirectChatParticipant('mallory-id', roomId)).toBe(false);
  });

  it('rejects malformed rooms and duplicate participant IDs', () => {
    expect(getDirectChatParticipants('alice-id:bob-id')).toBeNull();
    expect(getDirectChatParticipants('dm:alice-id:alice-id')).toBeNull();
    expect(getDirectChatParticipants(`dm:${'a'.repeat(120)}:bob-id`)).toBeNull();
  });
});
