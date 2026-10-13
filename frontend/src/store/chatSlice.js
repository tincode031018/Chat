import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: { activeRoom: null, messages: [], conversations: [] },
  reducers: {
    setActiveRoom(state, action) { state.activeRoom = action.payload; },
    setMessages(state, action) { state.messages = action.payload; },
    addMessage(state, action) {
      if (!state.messages.some(message => message._id && message._id === action.payload._id)) {
        state.messages.push(action.payload);
      }
    }
  }
});

export const { setActiveRoom, setMessages, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
