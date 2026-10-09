import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

interface ConnectionState {
  /** The phone has a network (Wi-Fi or mobile data) at all. */
  deviceOnline: boolean;
  /** Our last request got an answer from the server. False after a request failed with no response. */
  serverReachable: boolean;
}

export const useConnection = create<ConnectionState>(() => ({ deviceOnline: true, serverReachable: true }));

/** True when a request right now would not reach the server. */
export const selectOffline = (s: ConnectionState) => !s.deviceOnline || !s.serverReachable;
export const isOffline = () => selectOffline(useConnection.getState());

const onlineListeners = new Set<() => void>();

export function markServerReachable(reachable: boolean) {
  if (useConnection.getState().serverReachable === reachable) return;
  useConnection.setState({ serverReachable: reachable });
  // The server answered again after a failure: same as coming back online.
  if (reachable) onlineListeners.forEach((fn) => fn());
}

/** Called whenever the connection comes back, e.g. to send records saved offline. */
export function onBackOnline(fn: () => void): () => void {
  onlineListeners.add(fn);
  return () => onlineListeners.delete(fn);
}

let started = false;

/**
 * Starts watching the phone's network. Only "is there a network" comes from
 * the OS (no third-party reachability pings); whether our server can be
 * reached is learned from our own requests.
 */
export function startConnectionMonitor() {
  if (started) return;
  started = true;
  NetInfo.configure({ reachabilityShouldRun: () => false });
  NetInfo.addEventListener((state) => {
    const deviceOnline = state.isConnected !== false;
    const was = useConnection.getState();
    // A new network is a fresh chance to reach the server.
    useConnection.setState(deviceOnline && !was.deviceOnline ? { deviceOnline, serverReachable: true } : { deviceOnline });
    if (deviceOnline && !was.deviceOnline) onlineListeners.forEach((fn) => fn());
  });
}
