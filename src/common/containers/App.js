
///////////////////////////////////////////////////////////////////////
///////////////////////////// Top Level  /////////////////////////////
//////////////////////////////////////////////////////////////////////



import React, { Component, PropTypes }  from 'react';
import { Link }                         from 'react-router';
import {initEnvironment, syncChannel}   from '../actions/actions';
import { connect }                      from 'react-redux';
import channelDefault                   from '../../../config/channelDefault.js';

const initialChannel = channelDefault.INITIALCHANNEL.name;

class App extends React.Component {

  componentDidMount() {
    const {dispatch} = this.props;
    dispatch(initEnvironment());
    dispatch(syncChannel(initialChannel));   // this is to resync id of initialized Channel
    
  }

  render() {
    const {screenHeight, isMobile, screenWidth} = this.props.environment;
    if (isMobile) {
      return (
        <div style={{height: `${screenHeight}px`, width: `${screenWidth}px`}}>
          {this.props.children}
        </div>
      );
    }
    return (
      <div style={{height: '100%'}} >
        {this.props.children}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    environment: state.environment
  }
}

export default connect(mapStateToProps)(App)
