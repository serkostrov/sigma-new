/** Cached after the first messages API call in this server process. */
let messengerApiAvailable: boolean | undefined;

export function getAvitoMessengerApiAvailable(): boolean | undefined {
  return messengerApiAvailable;
}

export function setAvitoMessengerApiAvailable(available: boolean): void {
  messengerApiAvailable = available;
}

export function markAvitoMessengerApiUnavailable(): void {
  messengerApiAvailable = false;
}

export function markAvitoMessengerApiAvailable(): void {
  messengerApiAvailable = true;
}
