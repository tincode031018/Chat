import { createSlice } from '@reduxjs/toolkit';

const savedUser = localStorage.getItem('connectf-user');
const initialState = {
  token: localStorage.getItem('connectf-token'),
  user: savedUser ? JSON.parse(savedUser) : null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('connectf-token', state.token);
      localStorage.setItem('connectf-user', JSON.stringify(state.user));
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('connectf-user', JSON.stringify(state.user));
    },
    signOut(state) {
      state.token = null;
      state.user = null;
      localStorage.removeItem('connectf-token');
      localStorage.removeItem('connectf-user');
    }
  }
});

export const { setSession, updateUser, signOut } = authSlice.actions;
export default authSlice.reducer;
