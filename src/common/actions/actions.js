import * as types from '../constants/ActionTypes';
import { browserHistory } from 'react-router';
import fetch from 'isomorphic-fetch';
import moment from 'moment';
import axios from "axios";

// NOTE:Chat actions

function addMessage(message) {
  return {
    type: types.ADD_MESSAGE,
    message
  };
}

export function receiveRawMessage(message) {

  console.log("-------receive raw message ------- ")
  console.log(message)
  console.log("----------------------------------- ")

  return {
    type: types.RECEIVE_MESSAGE,
    message
  };
}

export function receiveRawChannel(channel) {

    console.log("-------receive raw channel ------- ")
    console.log(message)
    console.log("----------------------------------- ")

  return {
    type: types.RECEIVE_CHANNEL,
    channel
  };
}

function addChannel(channel) {
  return {
    type: types.ADD_CHANNEL,
    channel
  };
}

export function typing(username) {
  return {
    type: types.TYPING,
    username
  };
}

export function stopTyping(username) {
  return {
    type: types.STOP_TYPING,
    username
  };
}

export function changeChannel(channel) {
  return {
    type: types.CHANGE_CHANNEL,
    channel
  };
}

// NOTE:Data Fetching actions

export function welcomePage(username) {
  return {
    type: types.SAVE_USERNAME,
    username
  };
}

export function fetchChannels(user) {
  return dispatch => {
    dispatch(requestChannels())
    return axios(`/api/channels/${user}`, {
      method: 'get',
	    headers: {'Content-Type': 'application/json',
		            'withCredentials': true,
		            'Cache-Control': 'no-cache'
                }
    })
      .then(function(response){
        console.log("----fetch channels -----")
        console.log(JSON.stringify(response.data));
        dispatch(receiveChannels(response.data))
      })
      .catch(error => {throw error});
  }
}

// the purpose of this action - executed on chatcontainer load - is to sync the id of the default channel
// loaded with platform with the action id record in mongodb -- otherwise messages do load properly

export function syncChannel(channel) {
    return dispatch => {
      dispatch(requestSync())

      return axios(`/api/channels/sync_channel/${channel}`, {
        method: 'get',
	       headers: {'Content-Type': 'application/json',
		               'withCredentials': true,
		               'Cache-Control': 'no-cache'
                  }
        })
          .then(function(response){
            console.log("----default channel -----")
            console.log(JSON.stringify(response.data));
            dispatch(changeChannel(response.data))          // updates active channel with required id
            dispatch(requestSyncSuccess())
        })
          .catch(error => {throw error});
  }
}

function requestSync() {
  return {
    type: types.SYNC_CHANNEL
  }
}

function requestSyncSuccess() {
  return {
    type: types.SYNC_CHANNEL_SUCCESS
  }
}

//////////////////////////////////////////////////////////

function requestChannels() {
  return {
    type: types.LOAD_CHANNELS
  }
}

function receiveChannels(json) {
  return {
    type: types.LOAD_CHANNELS_SUCCESS,
    json
  }
}

function requestMessages() {
  return {
    type: types.LOAD_MESSAGES
  }
}

export function fetchMessages(channel) {

  console.log("------fetch messages -----")
  console.log({channel: channel})
  console.log("--------------------------")

  return dispatch => {
    dispatch(requestMessages())
    return axios(`/api/messages/${channel}`)
    .then(function(response){
      console.log("----fetch messages -----")
      console.log(JSON.stringify(response.data));
      dispatch(receiveMessages(response.data, channel))
    })
      .catch(error => {throw error});
  }
}

function receiveMessages(json, channel) {
  const date = moment().format('lll');
  return {
    type: types.LOAD_MESSAGES_SUCCESS,
    json,
    channel,
    date
  }
}

function shouldFetchMessages(state) {
  const messages = state.messages.data;
  if (!messages) {
    return true
  }
}

export function fetchMessagesIfNeeded() {
  return (dispatch, getState) => {
    if (shouldFetchMessages(getState())) {
      return dispatch(fetchMessages())
    }
  }
}

function loadingValidationList() {
  return {
    type: types.LOAD_USERVALIDATION
  }
}

function receiveValidationList(json) {
  return {
    type: types.LOAD_USERVALIDATION_SUCCESS,
    json
  }
}

export function usernameValidationList() {
  return dispatch => {
    dispatch(loadingValidationList())
    return axios('/api/all_usernames', {
      method: 'get',
      headers: {'Content-Type': 'application/json',
                'withCredentials': true}
    })
    .then(function(response){
      return dispatch(receiveValidationList(response.data.map((item) => item.local.username)))
    })
      .catch(error => {throw error});
  }
}

export function createMessage(message) {
  return dispatch => {
    dispatch(addMessage(message))
    return axios('/api/newmessage', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'withCredentials': true
      },
      data: JSON.stringify(message)})
      .catch(error => {throw error});
  }
}

export function createChannel(channel) {
  return dispatch => {
    dispatch(addChannel(channel))
    return axios ('/api/channels/new_channel', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'withCredentials': true
      },
      data: JSON.stringify(channel)})
      .catch(error => {throw error});
  }
}

//the environment code is borrowed from Andrew Ngu, https://github.com/andrewngu/sound-redux

function changeIsMobile(isMobile) {
  return {
    type: types.CHANGE_IS_MOBILE,
    isMobile
  };
}

function changeWidthAndHeight(screenHeight, screenWidth) {
  return {
    type: types.CHANGE_WIDTH_AND_HEIGHT,
    screenHeight,
    screenWidth
  };
}

export function initEnvironment() {
  return dispatch => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      document.body.style.overflow = 'hidden';
    }

    dispatch(changeIsMobile(isMobile));
    dispatch(changeWidthAndHeight(window.innerHeight, window.innerWidth));

    window.onresize = () => {
      dispatch(changeWidthAndHeight(window.innerHeight, window.innerWidth));
    }
  };
}
