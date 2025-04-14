import React from 'react';
import { CONNECTION_STATE } from '../../hooks/useConnection';

export const ConnectionStatus = ({ status }) => {
  let statusClass = '';
  let statusText = '';
  
  switch (status) {
    case CONNECTION_STATE.DISCONNECTED:
      statusClass = 'disconnected';
      statusText = 'Disconnected';
      break;
    case CONNECTION_STATE.CONNECTING:
      statusClass = 'connecting';
      statusText = 'Connecting...';
      break;
    case CONNECTION_STATE.CONNECTED:
      statusClass = 'connected';
      statusText = 'Connected';
      break;
    case CONNECTION_STATE.ERROR:
      statusClass = 'error';
      statusText = 'Connection Error';
      break;
    default:
      statusClass = 'disconnected';
      statusText = 'Unknown';
  }
  
  return (
    <div className={`connection-status ${statusClass}`}>
      {statusText}
    </div>
  );
};
