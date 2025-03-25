/*
game.js

    Author      :   Sheer Karny, Mark Steyvers
    University  :   University of California, Irvine
    Lab         :   Modeling and Decision-Making Lab (MADLAB)


Game Page JS file (metadata and functionality).

This file should contain all variables and functions needed for
the game.
*/

$("#waitingRoomPage").attr("hidden", false);
$("#waitingRoomScroller").attr("hidden", true);
$("#full-game-container").attr("hidden", true);
$("#survey-workload-container").attr("hidden", true);
$("#survey-full-container").attr("hidden", true);
$("#complete-page-content-container").attr("hidden", true);
$("#ai-comparison-container").attr("hidden", true);

// //****************************************** FIREBASE FUNCTIONALITY **********************************************//

// Importing functions and variables from the FirebasePsych library
import { writeRealtimeDatabase,writeURLParameters,readRealtimeDatabase,
    blockRandomization,finalizeBlockRandomization,
    initializeRealtimeDatabase,initializeSecondRealtimeDatabase 
} from "./firebasepsych1.1.js";


import {
    initializeMPLIB,
    joinSession,
    leaveSession,
    updateStateDirect,
    updateStateTransaction,  
    hasControl,
    readState,
    getCurrentPlayerId,
    getCurrentPlayerIds,
    getAllPlayerIds,
    getPlayerInfo,
    getNumberCurrentPlayers,
    getNumberAllPlayers,
    getCurrentPlayerArrivalIndex,
    getCurrentPlayerArrivalIndexStable,
    getSessionId,
    getSessionError,
    getWaitRoomInfo
  } from "../src/mplib.js";
// Define the configuration file for first database

const firebaseConfig_Conditions= {
    apiKey: "AIzaSyA8L9tuRB3TMpwisVTVbxXVwAMM03MGFuM",
    authDomain: "multiplayer-competence-check.firebaseapp.com",
    projectId: "multiplayer-competence-check",
    storageBucket: "multiplayer-competence-check.firebasestorage.app",
    messagingSenderId: "962742682387",
    appId: "1:962742682387:web:3ccb105c11dddea6bb90e6"
};

const [ db1 , firebaseUserId1 ] = await initializeRealtimeDatabase(firebaseConfig_Conditions );

// Get the reference to the two databases using the configuration files
// const [ db1 , firebaseUserId1 ] = await initializeRealtimeDatabase( firebaseConfig );
// const [ db2 , firebaseUserId2 ] = await initializeSecondRealtimeDatabase( firebaseConfig_db2 );

// console.log("Firebase UserId=" + firebaseUserId);

function getDebugParams(){
    const urlParams = new URLSearchParams(window.location.search);
    let debugBoolean = Boolean(urlParams.get('debug'));
    // console.log(debugBoolean);
    return debugBoolean;
}

function getOrderParams(){
    const urlParams = new URLSearchParams(window.location.search);
    let order = parseInt(urlParams.get('order'), 2);

    // console.log("collabType: ", collabType);

    if (order == 0){
        order = 0
    } else if (isNaN(order)){
        order = 1
    }
    
    return order
}

function getIdentityParams(){
    const urlParams = new URLSearchParams(window.location.search);
    let id = parseInt(urlParams.get('order'), 2);

    // console.log("collabType: ", collabType);

    if (id == 0){
        id = 0
    } else if (isNaN(id)){
        id = 1
    }
    
    return id
}

var DEBUG  = getDebugParams();      // Always start coding in DEBUG mode
var ORDER = getOrderParams(); // 0=human first; 1=human second
var IDENTITY = getIdentityParams();

// console.log("collab: ", COLLAB);

let studyId = 'placeHolder';

if (DEBUG){
   studyId    = "multiplayer-test-debug-0325";
} else {
    studyId   = "multiplayer-test-0325";
}


// WRITE PROLIFIC PARTICIPANT DATA TO DB1
// let pathnow = studyId + '/participantData/' + firebaseUserId1 + '/participantInfo';
// writeURLParameters(db1, pathnow);

// *********************************************** Session Configuration ***********************************************//
let sessionConfig = {
    minPlayersNeeded: 2, // Minimum number of players needed; if set to 1, there is no waiting room (unless a countdown has been setup)
    maxPlayersNeeded: 2, // Maximum number of players allowed in a session
    maxParallelSessions: 0, // Maximum number of sessions in parallel (if zero, there are no limit)
    allowReplacements: true, // Allow replacing any players who leave an ongoing session?
    exitDelayWaitingRoom: 0, // Number of countdown seconds before leaving waiting room (if zero, player leaves waiting room immediately)
    maxHoursSession: 0, // Maximum hours where additional players are still allowed to be added to session (if zero, there is no time limit)
    recordData: true // Record all data?  
};
const verbosity = 2;

// updateConfigFromUrl( sessionConfig );

// List names of the callback functions that are used in this code (so MPLIB knows which functions to trigger)
let funList = { 
  sessionChangeFunction: {
      joinedWaitingRoom: joinWaitingRoom,
      updateWaitingRoom: updateWaitingRoom,
      startSession: startSession,
      updateOngoingSession: updateOngoingSession,
      endSession: endSession
  },
  receiveStateChangeFunction: receiveStateChange,
  removePlayerStateFunction: removePlayerState
};

// List the node names where we place listeners for any changes to the children of these nodes; set to '' if listening to changes for children of the root
// let listenerPaths = [ 'coins' , 'players' ];
let listenerPaths = [ 'players' ];

// Set the session configuration for MPLIB
initializeMPLIB( sessionConfig , studyId , funList, listenerPaths, verbosity );

const sessionId = getSessionId();

// *********************************************** Session Management ***********************************************//

let sessionStarted = false;
let gameInitialized = false;
let tempNoAssingnment = true;
// Session management functions
function joinWaitingRoom() {
    const numPlayers = getNumberCurrentPlayers();
    const numNeeded = sessionConfig.minPlayersNeeded - numPlayers;

    if (numPlayers === 1 && tempNoAssingnment){
        // console.trace("Call Stack Trace");
        initExperimentSettings();
        tempNoAssingnment = false;
        // updateStateDirect()
    }
    
    // Update waiting room message
    $("#messageWaitingRoom").text(`Waiting for ${numNeeded} more player(s)...`);
}

function updateWaitingRoom() {
    /*
        Functionality to invoke when updating the waiting room.
        This function properly shows/hides the countdown container based on 
        the waiting room status from getWaitRoomInfo().
    */
   
    // Get waiting room elements
    const waitingRoomScreen = document.getElementById('waitingRoomPage');
    const welcomeContainer = document.querySelector('.welcome-container');
    // const countdownContainer = document.getElementById('countdownContainer');
    // const messageWaitingRoom = document.getElementById('messageWaitingRoom');
    // const joinBtn = document.getElementById('joinBtn');
    // const countdownValue = document.getElementById('countdownValue');
    
    // Make sure waiting room is visible
    waitingRoomScreen.style.display = 'block';

    // Remove overlay if it exists
    const overlayCountdown = document.getElementById('overlay-countdown');
    if (overlayCountdown) {
        document.body.removeChild(overlayCountdown);
    }
    
    // Show regular waiting room content
    welcomeContainer.style.display = 'block';
    
    // Update waiting message with player count
    const numPlayers = getNumberCurrentPlayers();
    const numNeeded = sessionConfig.minPlayersNeeded - numPlayers;
    
    // Create a brand new countdown display that overlays everything
    let overlayWaiting = document.getElementById('overlay-countdown');
    if (!overlayWaiting) {
        overlayWaiting = document.createElement('div');
        overlayWaiting.id = 'overlay-countdown';
        overlayWaiting.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #f8f9fa;
            border-radius: 10px;
            padding: 30px;
            z-index: 10000;
            box-shadow: 0 0 20px rgba(0,0,0,0.3);
            text-align: center;
            min-width: 400px;
        `;
        
        document.body.appendChild(overlayWaiting);
    }
    
    // Update the overlay content with waiting message
    overlayWaiting.innerHTML = `
        <h2 style="color: #2c3e50; margin-bottom: 1em;">Waiting for Players</h2>
        <div style="font-size: 1.5em; color: #34495e;">
            <p>Waiting for ${numNeeded} more ${numNeeded === 1 ? 'player' : 'players'} to join...</p>
        </div>
    `;
}

// function updateWaitingRoom() {
//     /*
//         Functionality to invoke when updating the waiting room.
//         This function displays an animated waiting screen while 
//         waiting for other players to join, but only when there's
//         exactly one player in the waiting room.
//     */
   
//     // Get waiting room elements
//     const waitingRoomScreen = document.getElementById('waitingRoomPage');
//     const welcomeContainer = document.querySelector('.welcome-container');
//     const messageWaitingRoom = document.getElementById('messageWaitingRoom');
    
//     // Make sure waiting room is visible
//     waitingRoomScreen.style.display = 'block';
    
//     // Show regular waiting room content
//     welcomeContainer.style.display = 'block';
    
//     // Update waiting message with player count using mplib functions
//     const numPlayers = getNumberCurrentPlayers();
//     const numNeeded = sessionConfig.minPlayersNeeded - numPlayers;
    
//     // Only show the waiting animation when there's exactly one player in the room
//     if (numPlayers === 1) {
//         // Create a brand new waiting display that overlays everything
//         let overlayWaiting = document.getElementById('overlay-waiting');
//         if (!overlayWaiting) {
//             overlayWaiting = document.createElement('div');
//             overlayWaiting.id = 'overlay-waiting';
//             overlayWaiting.style.cssText = `
//                 position: fixed;
//                 top: 50%;
//                 left: 50%;
//                 transform: translate(-50%, -50%);
//                 background-color: #f8f9fa;
//                 border-radius: 10px;
//                 padding: 30px;
//                 z-index: 10000;
//                 box-shadow: 0 0 20px rgba(0,0,0,0.3);
//                 text-align: center;
//                 min-width: 400px;
//             `;
            
//             document.body.appendChild(overlayWaiting);
//         }
        
//         // Get current player info for personalization
//         const currentPlayerId = getCurrentPlayerId();
//         const playerRank = getCurrentPlayerArrivalIndex();
        
//         // Update the overlay content with waiting message and animation
//         overlayWaiting.innerHTML = `
//             <h2 style="color: #2c3e50; margin-bottom: 1em;">Waiting Room</h2>
//             <div style="font-size: 1.5em; color: #34495e; margin-bottom: 20px;">
//                 <p>Welcome, Player ${playerRank}!</p>
//                 <p>Waiting for ${numNeeded} more ${numNeeded === 1 ? 'player' : 'players'} to join...</p>
//             </div>
//             <div class="loading-animation" style="margin: 30px auto;">
//                 <div class="spinner" style="
//                     border: 5px solid #f3f3f3;
//                     border-top: 5px solid #3498db;
//                     border-radius: 50%;
//                     width: 50px;
//                     height: 50px;
//                     animation: spin 2s linear infinite;
//                     margin: 0 auto;
//                 "></div>
//             </div>
//             <div style="margin-top: 20px; font-style: italic; color: #7f8c8d;">
//                 The game will start automatically when enough players have joined
//             </div>
//             <style>
//                 @keyframes spin {
//                     0% { transform: rotate(0deg); }
//                     100% { transform: rotate(360deg); }
//                 }
                
//                 @keyframes pulse {
//                     0% { transform: scale(1); }
//                     50% { transform: scale(1.1); }
//                     100% { transform: scale(1); }
//                 }
                
//                 .player-avatar {
//                     animation: pulse 2s infinite;
//                 }
                
//                 .empty-player-slot {
//                     animation: pulse 2s infinite;
//                     animation-delay: 1s;
//                 }
//             </style>
//         `;
        
//         // Add player avatars/indicators based on current players
//         const playerCountDisplay = document.createElement('div');
//         playerCountDisplay.style.cssText = `
//             margin-top: 20px;
//             display: flex;
//             justify-content: center;
//             gap: 15px;
//         `;
        
//         // Get all current player IDs
//         const playerIds = getCurrentPlayerIds();
        
//         // Create visual representation of players
//         playerIds.forEach((id, index) => {
//             const playerAvatar = document.createElement('div');
//             playerAvatar.className = 'player-avatar';
//             playerAvatar.style.cssText = `
//                 width: 40px;
//                 height: 40px;
//                 border-radius: 50%;
//                 background-color: ${id === currentPlayerId ? '#e74c3c' : '#3498db'};
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 color: white;
//                 font-weight: bold;
//                 box-shadow: 0 2px 5px rgba(0,0,0,0.2);
//             `;
//             playerAvatar.innerHTML = `P${index + 1}`;
            
//             if (id === currentPlayerId) {
//                 playerAvatar.title = "You";
//                 playerAvatar.style.border = "2px solid #2ecc71";
//             }
            
//             playerCountDisplay.appendChild(playerAvatar);
//         });
        
//         // Add empty slots for missing players
//         for (let i = 0; i < numNeeded; i++) {
//             const emptySlot = document.createElement('div');
//             emptySlot.className = 'empty-player-slot';
//             emptySlot.style.cssText = `
//                 width: 40px;
//                 height: 40px;
//                 border-radius: 50%;
//                 border: 2px dashed #bdc3c7;
//                 display: flex;
//                 align-items: center;
//                 justify-content: center;
//                 color: #95a5a6;
//             `;
//             emptySlot.innerHTML = `?`;
//             playerCountDisplay.appendChild(emptySlot);
//         }
        
//         // Add player display to overlay
//         overlayWaiting.appendChild(playerCountDisplay);
        
//         // Update message waiting room as fallback
//         messageWaitingRoom.innerText = `Waiting for ${numNeeded} more ${numNeeded === 1 ? 'player' : 'players'} to join...`;
//     } else {
//         // Remove the waiting overlay if there's not exactly one player
//         let overlayWaiting = document.getElementById('overlay-waiting');
//         if (overlayWaiting) {
//             document.body.removeChild(overlayWaiting);
//         }
        
//         // Update message for other cases
//         if (numPlayers === 0) {
//             // This would be an unusual case - no players
//             messageWaitingRoom.innerText = "No players detected. Please refresh the page.";
//         } else if (numPlayers >= sessionConfig.minPlayersNeeded) {
//             // We have enough players, game should be starting soon
//             messageWaitingRoom.innerText = "All players have joined! Game starting...";
//         } else {
//             // More than one player but still waiting for more
//             messageWaitingRoom.innerText = `Waiting for ${numNeeded} more ${numNeeded === 1 ? 'player' : 'players'} to join...`;
//         }
//     }
    
//     // If all players have joined, remove the waiting room display
//     if (numNeeded <= 0) {
//         let overlayWaiting = document.getElementById('overlay-waiting');
//         if (overlayWaiting) {
//             document.body.removeChild(overlayWaiting);
//         }
        
//         if (waitingRoomScreen) {
//             waitingRoomScreen.style.display = 'none';
//         }
//     }
// }

async function startSession() {
    console.log("Session starting");
    sessionStarted = true;
    $("#waitingRoomPage").attr("hidden", true);
    $("#waitingRoomScroller").attr("hidden", false);

    const sid = getSessionId();
    if (DEBUG) console.log("Current Session ID:", sid);
    
    player.fbID  = getCurrentPlayerId();
    playerId = player.fbID;
    if (DEBUG) console.log("Current Player ID:", playerId);

    // log all players in session
    let allPlayers = getCurrentPlayerIds();
    if (DEBUG) console.log("All Players in Session:", allPlayers);

    for (let idx in allPlayers) {
        let id = allPlayers[idx];
        // console.log("ids:", id);
        if (id !== playerId) {
            remoteId = id;
            console.log("Remote Player ID:", remoteId);
        }
    }

    // If no session ID, we need to join first
    if (!sid) {
        if (DEBUG) console.log("No session ID found, joining session...");
        joinSession();
        return; // Let MPLIB call startSession again after join
    }

    player.arrivalIdx = getCurrentPlayerArrivalIndex();

    // After joining the session can now get the callBack function to trigger
     /* 
    $("interimInstructionPage").attr("hidden", false);
    while (countDown){
        $("interimInstructionPage").attr("hidden", true);

        initializeGame();
    }
    */

    
    if (DEBUG) console.log("Player Arrival Index:", player.arrivalIdx);
    // Check for session errors
    const err = getSessionError();
    if (err.errorCode) {
        console.error("Session error:", err);
        return;
    }

    // Initialize game when we have a valid session
    // NOTE / TODO: Scaffold this init game call with the countdown
    // NOTE: Only when game initialized does this trigeger the condition assignments for player 2
    console.log('teaming settings', currentTeamingCondition);
    while (!gameInitialized) {
        await initializeGame();
    }
    // $("wawitinRoomStep2").attr("hidden", false);

}

function endSession() {
    console.log("Ending session");
    let err = getSessionError();
    console.log("Session error:", err);

    $("#waitingRoomPage").attr("hidden", true);
    $("#full-game-container").attr("hidden", true);
    $("#finishScreen").attr("hidden", false);

    if (err.errorCode) {
        $("#messageFinish").html(`<p>Session ended: ${err.errorMsg}</p>`);
    }
}
// Add event listener for join button
$("#joinBtn").on("click", function() {
    startSession();
});

function updateOngoingSession() {
    /*
        Functionality to invoke when updating an ongoing session.
  
        This function is currently empty.
    */
}

/**
 * Handles state changes for a specific player identified by the remoteId.
 * It processes location, intentions, and object changes based on the provided data.
 *
 * @param {string} path - The database path where the change occurred.
 * @param {string} childKey - The key of the child node that changed.
 * @param {object} childValue - The new value of the child node.
 * @param {string} childEvent - The type of event that triggered the change (e.g., 'child_added', 'child_changed').
 */
function receiveStateChange(path, childKey, childValue, childEvent) {
    // console.trace("Trace at frame: " + frameCountGame);
    // console.trace("Full trace");
// Or to get a manipulable version

    if (noAssignment) parseConditions(childValue)

    if (currentRound == 2 && childKey == remoteId) parseStatus(childValue)

    if (childKey === remoteId && settings.visualizeHumanPartner==1) {
        parseLocationDictionary(childValue);
        parseIntentions(childValue);
        parseObjectChanges(childValue);
        // parseScreenFocus(childValue)
    }
}
/**
 * Removes the current player's state from the database by setting it to null.
 * This effectively deletes the player's entry in the database.
 */
function removePlayerState() {
    // Send a null state to this player in the database, which removes the database entry
    let path = `players/${getCurrentPlayerId()}`;
    let newState = null;
    updateStateDirect(path, newState, 'removePlayer');
}

// *********************************************** Parse Session Changes *************************************************//
// This is the read operation for the game setting for both players when they enter a session
// In general listener, ensure that thsi 
async function parseConditions(childValue){
    // we found a matching partner!
    $("#waitingRoomScroller").attr("hidden", true);
    
    // Easy parse for global data.
    currentCondition = childValue.condition.curCondition;

    let fbCondition = getConditionData(childValue);
    currentTeamingCondition = fbCondition;

    // This flag triggers the beginning of the game!
    noAssignment = false;
    
    await startCountdown(settings.countDownSeconds); // Start a 10-second countdown
    
    $("#full-game-container").attr("hidden", false); // reveal the game container

    startGame(currentRound, currentCondition, currentBlock, curSeeds);
}

/**
 * Searches the node condition and sets both player's games based off of this.
 *
 * @param {object} childValue - An object with frameKey -> frameData.
 * @returns {object} An object with { earliestFrame, condition }.
 */

function getConditionData(childValue) {
    let order = null;
    let identity = null;

    order = childValue.condition.team.order;
    identity = childValue.condition.team.identity; 

    // give the global assignment, curSeeds, the random seeds.
    curSeeds = childValue.condition.seeds;

    return {'order': order, 'identity': identity};
}

let remoteComplete = false;
function parseStatus(childValue){
    remoteComplete = childValue.AIcomplete;

    if (remoteComplete) handleCompleteness();
}

let otherPlayersLocations = {};
let otherPlayersTargets = {};
let otherPlayersVelocities = {};

/**
 * Scans childValue to find the highest frame number
 * with valid location, target, and velocity data.
 *
 * @param {object} childValue - The object containing frameKey -> frameData structure.
 * @returns {object} An object with { highestFrame, location, target, velocity }.
 */
function getMostRecentPlayerData(childValue) {
    let highestFrame = -1;
    let mostRecentLocation = null;
    let mostRecentTarget = null;
    let mostRecentVelocity = null;

    // Loop through all frames in reverse order
    const frameKeys = Object.keys(childValue).sort((a,b) => parseInt(b) - parseInt(a));
    for (const frameKey of frameKeys) {
        if (!childValue.hasOwnProperty(frameKey)) continue;

        const frameNum = parseInt(frameKey);
        const frameData = childValue[frameKey];

        // Since we're going in reverse order, the first valid data we find will be the most recent
        // Check location
        if (!mostRecentLocation && 
            frameData.location &&
            typeof frameData.location.x === 'number' &&
            typeof frameData.location.y === 'number') {
            mostRecentLocation = {
                x: frameData.location.x,
                y: frameData.location.y
            };
        }

        // Check target location
        if (!mostRecentTarget &&
            frameData.targetLocation &&
            typeof frameData.targetLocation.x === 'number' &&
            typeof frameData.targetLocation.y === 'number') {
            mostRecentTarget = {
                targetX: frameData.targetLocation.x,
                targetY: frameData.targetLocation.y
            };
        }

        // Check velocity
        if (!mostRecentVelocity &&
            frameData.velocity &&
            typeof frameData.velocity.dx === 'number' &&
            typeof frameData.velocity.dy === 'number' &&
            typeof frameData.velocity.moving === 'boolean') {
            highestFrame = frameNum;
            mostRecentVelocity = {
                dx: frameData.velocity.dx,
                dy: frameData.velocity.dy,
                moving: frameData.velocity.moving
            };
        }

        // If we've found all data types, we can break early
        if (mostRecentLocation && mostRecentTarget && mostRecentVelocity) {
            break;
        }
    }

    return {
        highestFrame,
        location: mostRecentLocation,
        target: mostRecentTarget,
        velocity: mostRecentVelocity
    };
}

/**
 * Updates the otherPlayersLocations, otherPlayersTargets, and otherPlayersVelocities
 * with the newest values based on the provided highestFrame.
 *
 * @param {number} frame - The highest frame number found
 * @param {object|null} location - The most recent location (or null if none)
 * @param {object|null} target - The most recent target location (or null if none)
 * @param {object|null} velocity - The most recent velocity (or null if none)
 */
function storeMostRecentData(frame, location, target, velocity) {
    if (location) {
        otherPlayersLocations[frame] = location;
    }
    if (target) {
        otherPlayersTargets[frame] = target;
    }
    if (velocity) {
        otherPlayersVelocities[frame] = velocity;
    }
}

/**
 * Updates the state of player2 with the most recent data
 * found in otherPlayersLocations, otherPlayersTargets, and otherPlayersVelocities.
 */
function updatePlayer2Movement() {
    const frameNumbers = Object.keys(otherPlayersLocations).map(Number);
    if (frameNumbers.length === 0) return; // No recorded frames

    const mostRecentFrame = Math.max(...frameNumbers);
    const position = otherPlayersLocations[mostRecentFrame];
    const target = otherPlayersTargets[mostRecentFrame];
    const velocity = otherPlayersVelocities[mostRecentFrame];

    // Update the player's target location
    if (target) {
        player2.targetX = target.targetX;
        player2.targetY = target.targetY;
    }

    // Update velocity if a newer frame is found.
    if (velocity && (mostRecentFrame > player2.lastProcessedFrame)) {
        const EPSILON = 0.0001;
        const velocityChanged = (
            Math.abs(player2.dx - velocity.dx) > EPSILON ||
            Math.abs(player2.dy - velocity.dy) > EPSILON
        );

        player2.dx = velocity.dx;
        player2.dy = velocity.dy;
        player2.moving = velocity.moving;
        player2.lastProcessedFrame = mostRecentFrame;
    }
}

/**
 * Main function that orchestrates scanning for the latest data,
 * storing it in "otherPlayers..." objects, and finally updating player2.
 *
 * @param {object} childValue - The firebase data structure for a particular player
 */
function parseLocationDictionary(childValue) {
    // 1) Find the most recent data from all frames
    const {
        highestFrame,
        location,
        target,
        velocity
    } = getMostRecentPlayerData(childValue);

    // If there are no frames or it never got updated, just return
    if (highestFrame === -1) return;

    // 2) Store the retrieved data in global objects
    storeMostRecentData(highestFrame, location, target, velocity);

    // 3) Update player2 with the newest location, target, velocity
    updatePlayer2Movement();
}

const otherPlayersIntentions = {};
function parseIntentions(childValue) {
    // Parse the intentions of the other player
    for (const frameKey in childValue) {
        if (!childValue.hasOwnProperty(frameKey)) continue;
        
        const frameNum = parseInt(frameKey);
        const frameData = childValue[frameKey];

        if (frameData.playerIntention && 
            typeof frameData.playerIntention.ID === 'number') {

            otherPlayersIntentions[frameNum] = {
                ID: frameData.playerIntention.ID
            };
        }
    }

    // Get most recent intention
    const frameNumbers = Object.keys(otherPlayersIntentions).map(Number);
    if (frameNumbers.length > 0) {
        const mostRecentFrame = Math.max(...frameNumbers);
        const intention = otherPlayersIntentions[mostRecentFrame];
        
        // Update player2's intended target
        player2.targetObjID = intention.ID;
    }

    // Mark the object as marked
    objects.forEach((obj) => {
        if (obj.active && obj.ID === player2.targetObjID) {
            obj.marked2= true;
        } else if (obj.active){
            obj.marked2 = false;
        }
    });

    if (player2.targetObjID === -1){
        player2.toCenter = true;
        console.log("player2.toCenter:", player2.toCenter);
    } else{
        player2.toCenter = false;
    }

    console.log("player2.targetObjID:", player2.targetObjID);
}

const otherPlayersObjects = {};
function parseObjectChanges(childValue) {
    let highestFrame = -1;
    let mostRecentObject = null;

    // First pass: find the highest frame number with valid data
    for (const frameKey in childValue) {
        if (!childValue.hasOwnProperty(frameKey)) continue;
        
        const frameNum = parseInt(frameKey);
        const frameData = childValue[frameKey];

        if (frameData.objectStatus &&
            typeof frameData.objectStatus.ID === 'number' && 
            typeof frameData.objectStatus.intercepted === 'boolean'
        ) {
            // If this frame is newer than our current highest frame with valid object info
            if (frameNum > highestFrame) {
                highestFrame = frameNum;
                mostRecentObject = {
                    ID: frameData.objectStatus.ID,
                    intercepted: frameData.objectStatus.intercepted
                };
            }
        }
    }

    // Only do something if we actually found a mostRecentObject
    if (mostRecentObject) {
        otherPlayersObjects[highestFrame] = mostRecentObject;
        // console.log("Most recently collected object:", mostRecentObject);

        // Mark the object as intercepted
        objects.forEach((obj) => {
            if (obj.active && obj.ID === mostRecentObject.ID) {
                obj.intercepted = true;
            }
        });
    }
}

function parseScreenFocus(childValue){
    
}

// *********************************************** Write to Database *****************************************************//

// database write function
function writeGameDatabase(){

    if (DEBUG) console.log("Writing to database from block", currentBlock, "round", currentRound);

    let path12  = studyId + '/participantData/' + firebaseUserId1 + '/condition' + '/blockCondition';
    let path13  = studyId + '/participantData/' + firebaseUserId1 + '/condition' + '/seedCondition';
    let path24  = studyId + '/participantData/' + firebaseUserId1 + '/condition' + '/teamingCondition';
    let path25 = studyId + '/participantData/' + firebaseUserId1 + '/condition' + '/teamingOrder';

    // console.log("Writing to database");
    let path1   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/spawnData';
    let path2   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/caughtTargets';
    let path3   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/eventStream'; 
    let path4   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/playerClicks';
    let path5   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/playerLocation';
    let path6   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/settings';
    let path7   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/roundTime';
    let path11  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/playerScore';
 
    // let path14  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIClicks_Adjusted';
    let path8   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIcaughtTargets';
    let path9   = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIClicks';
    let path10  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/aiScore';
    let path17  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIeventStream';

    let path18  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIcaughtTargets_offline';
    let path19  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIClicks_offline';
    let path20 = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/aiScore_offline';
    // let path20  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIClicks_Adjusted_offline';
    // let path21  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIplayerLocation_offline';
    // let path22  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIplayerLocation';
    let path23  = studyId + '/participantData/' + firebaseUserId1 + '/block' + currentBlock + '/round' + currentRound + '/AIeventStream_offline';


    writeRealtimeDatabase(db1, path1, spawnData);
    writeRealtimeDatabase(db1, path2, caughtTargets);
    writeRealtimeDatabase(db1, path3, eventStream); 
    writeRealtimeDatabase(db1, path4, playerClicks);
    writeRealtimeDatabase(db1, path5, playerLocation);
    // writeRealtimeDatabase(db1, path6, roundSettings);
    writeRealtimeDatabase(db1, path7, roundTime);
    writeRealtimeDatabase(db1, path8, AIcaughtTargets);
    writeRealtimeDatabase(db1, path9, aiClicks);
    writeRealtimeDatabase(db1, path10, aiScore);
    writeRealtimeDatabase(db1, path11, score);
    writeRealtimeDatabase(db1, path12, currentCondition);
    writeRealtimeDatabase(db1, path13, curSeeds);
    // writeRealtimeDatabase(db1, path14, aiClicks_adjusted);
    // writeRealtimeDatabase(db1, path15, drtResponses);
    // writeRealtimeDatabase(db1, path16, drtFalseAlarm);
    writeRealtimeDatabase(db1, path17, AIeventStream);
    writeRealtimeDatabase(db1, path18, AIcaughtTargets_offline);
    writeRealtimeDatabase(db1, path19, aiClicks_offline);
    writeRealtimeDatabase(db1, path20, aiScore_offline);
    // writeRealtimeDatabase(db1, path21, AIplayerLocation_offline);
    // writeRealtimeDatabase(db1, path22, AIplayerLocation);
    writeRealtimeDatabase(db1, path23, AIeventStream_offline);
    writeRealtimeDatabase(db1, path24, currentTeamingCondition);
    writeRealtimeDatabase(db1, path25, agentOrder);
}

//************************************************ ENVIRONMENT INITIALIZATION ********************************************//
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreCanvas = document.getElementById('scoreCanvas');
const scoreCtx = scoreCanvas.getContext('2d');
const world = { width: 800, height: 800 };
const center = { x: canvas.width / 2, y: canvas.height / 2 };
let observableRadius = 390; // Radius for positioning objects

let roundSettings = {};

// *********************************************** EXPERIMENTAL PARAMETERS ***********************************************// 

// NOTE: AI MODE FOR EXPERIMENT 1 SHOULD BE === 0 (NO ASSISTANCE)
// NOTE: Start with default parameters --> make changes that are critical between rounds (to remove duplication)

let settings = {
    maxSeconds: 360,                    // maximum number of seconds per round --> 3 minutes (consider doing 2.5 minutes)
    countDownSeconds: 10,               // SK: time waiting for countdown to complete before beginning round
    AIMode:0,                           // MS4: 0=no assistance; 1=always on; 2=adaptive
    AICollab: 0,                        // MS4: 0=ignorant; 1=intentional; 2=cognitive model
    alpha: 0.9,                         // MS8: discounting parameter for AI planner
    AIDisplayMode: 1,                   // MS4: 0=show movement path; 1=show where to click; 2=show which targets to intercept
    AIMaxDisplayLength: 3,              // MS4: can be used to truncate the AI path length shown
    visualizeHumanPartner: 1,           // MS5: 0:default; 1=visualize human partner running in background
    visualizeAIPlayer: 0,               // MS5: 0:default; 1=visualize AI player running in background
    visualizeAIPlayerOffline: 1,        // MS5: 0:default; 1=visualize AI player running in background
    AIStabilityThreshold: 1.2,          // MS7: minimum proportional improvement before recommendation changes
    AIadviceThresholdHigh: 0.7,         // MS6: threshold on value to give AI advice in adaptive AI setting
    AIadviceAngleThreshold: 30,         // MS6: angle tolerance for accepting move in adaptive AI setting
    AIframeDelay: 30,                   // Delaying advice so that it doesn't overwhelm the player
    spawnProbability:  1.0,
    spawnInterval: 10,
    valueSkew: 2,
    valueLow: 0,
    valueHigh:  1,
    playerSpeed: 3,
    maxTargets: 2,
    speedLow:  1.5,             // lowest end of object speed distribution
    speedHigh: 2.99,               // highest end of object speed distribution
};

let AICollab1;
let AICollab2;
// let collab1, collab2;   
let collabPlayer1 = 0;
let collabPlayer2 = 1;

let agent1Name;
let agent2Name;

let agentOrder = [];

let agentNames = {
    0: "Human-Transparent",
    1: "Human-Opaque",
    2: "Robot-Transparent",
    3: "Robot-Opaque"
}

let newDifficultySettings = {
    // Human first
    0: {order:    0, identity:   0},
    1: {order:    0, identity:   1},
    2: {order:    1, identity:   0},
    3: {order:    1, identity:   1}
}

function getAgentNames(){
    if (currentTeamingCondition.order == 0){
        if (currentTeamingCondition.identity == 0){
            // give transparent names
            agent1Name = agentNames[0];
            agent2Name = agentNames[2];
        } else {
            // give opaque 
            agent1Name = agentNames[1];
            agent2Name = agentNames[3];
        }
    } else if (currentTeamingCondition.order == 1) {
        if (currentTeamingCondition.identity == 0){
            // give transparent names
            agent1Name = agentNames[2];
            agent2Name = agentNames[0];

        } else {
            // give opaque 
            agent1Name = agentNames[3];
            agent2Name = agentNames[1];
        }
    }
}
/**
 * Sets visualization settings based on teaming condition and current round
 * to show either the AI player or human partner with appropriate identity handling
 * 
 * @returns {void}
 */
async function setAgent() {
    // Destructure the order and identity properties
    const { order, identity } = currentTeamingCondition;
    
    // Human first then AI
    if (order == 0) {
        if (currentRound == 1) {
            settings.visualizeAIPlayer = 0;
            settings.visualizeHumanPartner = 1;
        } else if (currentRound == 2) {
            // To pause before both humans begin rounds together
            humanRoundComplete = true;
            let pathBase = `players/${player.fbID}/humanComplete/`;
            updateStateDirect(pathBase, humanRoundComplete, 'status')

            settings.visualizeAIPlayer = 1;
            settings.visualizeHumanPartner = 0;
        }
        player2.color = "rgba(0, 255, 0, 0.5)" // semi-transparent green
        AIplayer.color = "rgba(0, 0, 255, 0.5)" // semi-transparent blue

    } else if (order == 1) { // AI first then human  
        if (currentRound == 1) {
            settings.visualizeAIPlayer = 1;
            settings.visualizeHumanPartner = 0;
        
        } else if (currentRound == 2) {
            AIroundComplete = true;
            let pathBase = `players/${player.fbID}/AIcomplete/`;
            updateStateDirect(pathBase, AIroundComplete, 'status')

            settings.visualizeAIPlayer = 0;
            settings.visualizeHumanPartner = 1;
        }
        player2.color = "rgba(0, 0, 255, 0.5)" // semi-transparent blue
        AIplayer.color = "rgba(0, 255, 0, 0.5)" // semi-transparent green
    }
    
    // Handle identity ambiguity
    if (identity == 1) { // Ambiguous identity - both use the same icon
        // humanImg.src = "./images/human-head-small.png";
        // robotHeadImg.src = "./images/human-head-small.png";
        // anonImg.src = "./images/human-head-small.png"
        humanImg.src = "./images/human-head-small.png";
        robotHeadImg.src = "./images/triangle-black.png";
        anonImg.src = "./images/triangle-black.png";

    } else { // Transparent identity - use distinct icons
        humanImg.src = "./images/human-head-small.png";
        robotHeadImg.src = "./images/simple-robot-250px.png";
        anonImg.src = "./images/human-head-small.png"
    }

    getAgentNames();
    
    // Log which agent is being shown with identity information
    const visibleAgent = settings.visualizeHumanPartner ? "Human" : "AI";
    const identityMode = identity == 1 ? "Ambiguous (shared icons)" : "Transparent (distinct icons)";

    if (DEBUG) console.log(`Round ${currentRound}: ${visibleAgent} partner visible, Identity: ${identityMode}`);
}

// *********************************************** GAME INITIALIZATION ***********************************************//
// Block randomization variables -- placed here for ordering dependency
let currentRound = 1;
let currentBlock = 0;
let currentCondition = null;
let currentTeamingCondition = null;
let curSeeds;   
let noAssignment = true;

let maxRounds = 2;
let roundID = "round + " + currentRound;

// Timing variables
let gameStartTime, elapsedTime;
let isPaused            = false; // flag for pausing the game
let isGameRunning       = false;
let frameCountGame      = 0; // MS: number of updates of the scene
let deltaFrameCount     = 0; // To limit the size of the Event Stream object; 
const fps               = 30; // Desired logic updates per second
let drtCount            = 0; // frame count for the DRT task for displaying the light
let drtLightChoice      = 0; // random choice of light to display

let maxFrames = null;
if (DEBUG){
    maxFrames         = 5 * fps;// settings.maxSeconds * fps;
} else{ // set it to whatever you want
    maxFrames         = settings.maxSeconds * fps; //120 * 60; // Two minutes in frames
}

// let halfwayGame = Math.floor(maxFrames/2);

const updateInterval    = 1000 / fps; // How many milliseconds per logic update
let firstRender         = 0;
let roundTime           = 0;

// Data collection variables
let objects         = [];
let spawnData       = [];
let caughtTargets   = [];
let missedTargets   = [];
let playerClicks    = [];
let playerLocation  = [];
let aiClicks        = [];
let aiClicks_adjusted       = [];

let aiClicks_offline = [];
let aiClicks_adjusted_offline = [];


// ****** PLAN DELAY VARIABLES ****** //

// Delay for the collaborative agent between plans
let planDelayCounter = 0;
let planDelay = false; 
let planDelayFrames = Math.floor(0.7 * 30); // 700 ms in frames (based on pilot data)

let avgResponseTime;
let clickTimes = [];

// ********************************* //

// const eventStreamSize = 720; // 2 minutes of 60 fps updates
// let eventStream = Array.from({ length: eventStreamSize }, () => ({}));// preallocate the array
let eventStream = [];
let AIeventStream = [];
let AIeventStream_offline = [];

// Variables for cursor
let cursorSize = 40;
let mouseX = 0, mouseY = 0;

// Varaiables for HTML elements
let totalScore = 0;
let score = 0;
let aiScore = 0;
let aiScore_offline = 0;
let numAIChanges = 0; // MS7 count of number of different targets pursued (measure of "neuroticism" or inverse "inertia")

// Player and View Initialization (related to one another)
let playerId;
let remoteId; 
const playerSize = 50;
const player = {
    // color:"red", 
    color: 'rgba(255, 0, 0, 0.5)',//'rgba(0, 0, 255, 0.5)',
    x: canvas.width/2 , //center the x,y in the center of the player.
    y: canvas.height/2 ,
    dx: 0,
    dy: 0,
    moving:false,
    toCenter:false,
    shownAdvice:false, //MS6: flag to show advice
    targetX:canvas.width/2,
    targetY:canvas.height/2,
    targetObjID:0,
    velocity: 1.5,
    angle:0,
    speed: 1.5, 
    width:50, 
    height:50,
    score:0,
};

const player2 = {
    // color:"red", 
    color: 'rgba(0, 255, 0, 0.5)',//'rgba(0, 0, 255, 0.5)',
    x: canvas.width/2 , //center the x,y in the center of the player.
    y: canvas.height/2 ,
    dx: 0,
    dy: 0,
    moving:false,
    toCenter:false,
    shownAdvice:false, //MS6: flag to show advice
    targetX:canvas.width/2,
    targetY:canvas.height/2,
    targetObjID:0,
    velocity: 1.5,
    angle:0,
    speed: 1.5, 
    width:50, 
    height:50,
    score:0,
    lastProcessedFrame: -1,
};

let humanImg = new Image();
let anonImg = new Image();

const camera = {
    x: world.width / 2,
    y: world.height / 2,
    width: canvas.width,
    height: canvas.height
};

// MS: adding a random number generator
function lcg(seed) {
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    let current = seed;
  
    return function() {
      current = (a * current + c) % m;
      return current / m;
    };
}

function generateRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
let randomGenerator;

// intial varaiables for moving average to delay clicks
let ema;
let period = 10;
let smoothingFactor = 2 / (1 + period);

// MS4: ********************************************** AI PLANNER ****************************************************//

//let sol; // MS7
let firstStep, bestSol, allSol; // MS7  Global variable that holds the solutions of the planner 
let firstStepOffline, bestSolOffline, allSolOffline; // MS7  Global variable that holds the solutions of the planner 
let firstStepCollab, bestSolCollab, allSolCollab; // MS7  Global variable that holds the solutions of the planner for the online collaborative AI

// let sol; // MS4: global variable that contains planned path for current frame

const AIplayerSize = 50;
const AIplayer = {
    color: 'rgba(0, 128, 0, 0.5)',//'rgba(255, 0, 0, 0.5)', 
    x: canvas.width/2 + 150, //center the x,y in the center of the player.
    y: canvas.height/2 + 150,
    moving:false,
    targetX:0,
    targetY:0,
    velocity: 1.5,
    angle:0,
    speed: 1.5, 
    width:50, 
    height:50,
    score:0,
    collabOrder: 0,
    collabType: 0,
};
let AIcaughtTargets = [];
let AIplayerLocation = [];

let robotHeadImg = new Image();
robotHeadImg.src = './images/simple-robot-250px.png'; // Path to your robot head image
// robotHeadImg.src = "./images/cropped-amb.png";

let AIcaughtTargets_offline = [];
let AIplayerLocation_offline = [];

let numFramesPlayernotMoving = 0; // MS6
let numFramesAfterCaughtTarget = 0; // MS6

const AIplayer_offline = {
    color: 'rgba(128, 128, 128, 0.5)',//'rgba(255, 0, 0, 0.5)', // grey color for the offline player
    x: canvas.width/2 + 150, //center the x,y in the center of the player.
    y: canvas.height/2 + 150,
    moving:false,
    targetX:0,
    targetY:0,
    velocity: 1.5,
    angle:0,
    speed: 1.5, 
    width:50, 
    height:50,
    score:0
};

let visitedBlocks = 0;
let numSurveyCompleted = 0;
let AIComparisonComplete = false;
let prevSetting;
//**************************************************** BLOCK RANDOMIZATION ******************************************************//

async function initExperimentSettings() {
    console.log("Initializing experiment settings...");

    const maxCompletionTimeMinutes = 60;

    const blockOrderCondition = 'blockOrderCondition'; // a string we use to represent the condition name
    const numConditions = 8; // number of conditions
    const numDraws = 1; // number of draws
    let assignedCondition;

    if (!DEBUG){
        assignedCondition = {condition: 5};
        // assignedCondition = await blockRandomization(db1, studyId, blockOrderCondition, numConditions, maxCompletionTimeMinutes, numDraws);
    } else {
        assignedCondition = {condition: 5};
    }
    let pathBase = `players/${player.fbID}/condition/curCondition`;
    updateStateDirect(pathBase, assignedCondition, 'conditions');
     // currentCondition = assignedCondition[0]+1;

    const teamingBlockCondition = 'teamingCondition'; // a string we use to represent the condition name
    const numTeamingConditions = 4; // number of conditions
    let assignedTeamingCondition;
    let teamingDraw = null;

    if (!DEBUG){
        teamingDraw = 0; // options: 0-1, [0,1] - human first (transaprent, ambiguous), [2,3] human second (trans, amb)
        // teamingDraw = await blockRandomization(db1, studyId, teamingBlockCondition, numTeamingConditions, maxCompletionTimeMinutes, numDraws);
        // console.log("teaming condition " + teamingDraw + ":" , assignedTeamingCondition);
        assignedTeamingCondition = newDifficultySettings[teamingDraw]
        // assignedTeamingCondition = await blockRandomization(db1, studyId, teamingBlockCondition, numTeamingConditions, maxCompletionTimeMinutes, numDraws);
    } else {
        // assignedTeamingCondition = await blockRandomization(db1, studyId, teamingBlockCondition, numTeamingConditions, maxCompletionTimeMinutes, numDraws);
        /*
        Order: 0,1     --> 0: Human goes first, 1: AI goes first
        Identity: 0,1  --> 0: transparent, 1: ambiguous
        */
        teamingDraw = 0; // options: 0-1, [0,1] - human first (transaprent, ambiguous), [2,3] human second (trans, amb)
        // teamingDraw = await blockRandomization(db1, studyId, teamingBlockCondition, numTeamingConditions, maxCompletionTimeMinutes, numDraws);
        // console.log("teaming condition " + teamingDraw + ":" , assignedTeamingCondition);
        assignedTeamingCondition = newDifficultySettings[teamingDraw]
    }
    pathBase = `players/${player.fbID}/condition/team`;
    updateStateDirect(pathBase, assignedTeamingCondition, 'conditions');

    // Give random set of 2 seeds
    var seedValuesObject = {};
    for (var i = 0; i < 2; i++) {
        seedValuesObject[`${i}`] = generateRandomInt(1, 1000000);
    }

    pathBase = `players/${player.fbID}/condition/seeds`;
    updateStateDirect(pathBase, seedValuesObject, 'conditions');

    return [blockOrderCondition, teamingBlockCondition];
}

let blockOrderCondition, teamingBlockCondition;
let conditionsArray = [];

async function initializeGame() {
    if (!sessionStarted) {
        console.log("Waiting for session to start...");

        return;
    }
    // will be used to sync up players if they start with AI first
    let pathBase = `players/${player.fbID}/AIcomplete/`;
    if (AIroundComplete == false) updateStateDirect(pathBase, AIroundComplete, 'status');
    
    pathBase = `players/${player.fbID}/humanComplete/`;
    if (humanRoundComplete == false) updateStateDirect(pathBase, humanRoundComplete, 'status')

    // place div container that does the instruction countdown
    // make sure the game is only intizlied as true after this... 

    // place the interim waiting/instructions screen here
    
    console.log("Initializing game...");
    gameInitialized = true;
    console.log('teaming settings', currentTeamingCondition);

    // Initialize your game parameters

    playerId = getCurrentPlayerId();
}

function setLocations(){
    if (player.arrivalIdx == 1 && settings.visualizeHumanPartner == 1) {
        // Place right for the first player
        player.x = canvas.width/2 + 50;
        player.y = canvas.height/2;
        player.targetX = player.x;
        player.targetY =  player.y;

        // assume player2 is now on the left
        player2.x = canvas.width/2 - 50;
        player2.y = canvas.height/2;
        player2.targetX = player2.x;
        player2.targetY = player2.y;

    } else if (player.arrivalIdx == 2 && settings.visualizeHumanPartner == 1){
        // Place right for the first player
        player.x = canvas.width/2 - 50;
        player.y = canvas.height/2;
        player.targetX = player.x;
        player.targetY =  player.y;


        // assume player2 is now on the left
        player2.x = canvas.width/2 + 50;
        player2.y = canvas.height/2;
        player2.targetX = player2.x;
        player2.targetY = player2.y;
    }

    if (settings.visualizeAIPlayer == 1) {
        // Place right for the first player
        player.x = canvas.width/2 + 50;
        player.y = canvas.height/2;

        // assume player2 is now on the left
        AIplayer.x = canvas.width/2 - 50;
        AIplayer.y = canvas.height/2;
    }
   
}
// Make sure that a session needs to have begun in order for the players to play with an AI

// ****************************************************** UPDATE FUNCTIONS ********************************************************//
let AIroundComplete     = false;
let humanRoundComplete  = false;

// Start Game function
async function startGame(round, condition, block, seeds) {

    currentRound = round; // Start at the specified round, or the current round

    setAgent();
    setLocations();

    settings.AICollab   = 1;
    settings.maxTargets = 15;
   
    // Change to the next seed
    if (block == 0) {
        settings.randSeed = seeds[currentRound - 1];
        // settings.randSeed = 123
        // await updateAgentOrdering();
    } 

    // Initialize with a seed
    randomGenerator = lcg(settings.randSeed);
    // Start the exponential moving average with a fixed response time of 1/3 of a second -- 10 frames
    clickTimes.push(10);

    // Reset game canvas visibility
    const gameCanvas = document.getElementById('gameCanvas');
    gameCanvas.style.display = 'block';
    const scoreCanvas = document.getElementById('scoreCanvas');
    scoreCanvas.style.display = 'block';

    if (!isGameRunning) {
        setupCanvas();
        gameStartTime   = Date.now();
        frameCountGame  = 0;
        isGameRunning   = true;
        gameLoop();
    }
}

async function endGame() {
    isGameRunning = false;

    // updateStateDirect('test/path', { testData: 'value' });
    // writeGameDatabase();

    // TODO: Push db feature that allows tracking of the other player's completion of the ai round
    // currentRound++;
    if (currentRound <= maxRounds) {//&& numSurveyCompleted < 3) {
        currentRound ++;
        await runGameSequence("You've Completed a Round and earned " + totalScore + " points. Click OK to continue.");

        if (currentRound < 3){
            // if (currentRound > 1) await runGameSequence("Click OK to continue to the next round of play.");
            $("#full-game-container").attr("hidden", true);
            await startCountdown(settings.countDownSeconds);
            await resetGame(); 
            // set the correct partner (human or ai) given the current round
            setAgent();
            $("#full-game-container").attr("hidden", false);

            // Pause the game and wait for the other player to complete their ai round
            if (currentTeamingCondition.order == 1) handleCompleteness();

            startGame(currentRound, currentCondition, currentBlock, curSeeds); // Start the next round
        }

    }   

    if (currentRound > maxRounds) visitedBlocks ++;
    // currentRound ++

    if (visitedBlocks >= 1){
        // visitedBlocks++
        // prevSetting = settings
        await loadFullSurvey();
        $("#survey-full-container").attr("hidden", false);
        // await loadAIComparison();
        // $("#ai-comparison-container").attr("hidden", false);
        $("#full-game-container").attr("hidden", true);
    }
}

function handleCompleteness(){
    // function to determine if the remote player has finished their ai round
    if (!remoteComplete){
        isPaused = true;  
        // Display waiting popup with loading spinner
        // waitingForPlayerAlert("Waiting for the other player to complete their round... Please stand by.");
    } else{
        isPaused = false;
    }
}

async function resetGame(){
    objects                 = null;
    spawnData               = null;
    caughtTargets           = null;
    playerClicks            = null;
    playerLocation          = null;
    score                   = null;
    player.score            = null;

    aiScore                 = null;
    AIplayer.score          = null
    AIcaughtTargets         = null;
    AIplayerLocation        = null;
    // aiClicks_adjusted       = null;
    aiClicks                = null;
    aiClicks_offline        = null;

    aiScore_offline                 = null;
    AIplayer_offline.score          = null
    AIcaughtTargets_offline         = null;
    // AIplayerLocation_offline       = null;
    // aiClicks_adjusted_offline      = null;

    // then reassign the variables
    eventStream             = [];//Array.from({ length: eventStreamSize }, () => ({}));// preallocate the array
    objects                 = []; // Reset the objects array
    spawnData               = [];
    caughtTargets           = [];
    playerClicks            = [];
    playerLocation          = [];
    score                   = 0;   

    AIeventStream           = [];
    aiScore                 = 0;
    player.score            = 0;
    AIplayer.score          = 0
    totalScore              = 0;
    aiClicks                = [];
    aiClicks_offline        = [];
    AIcaughtTargets         = [];
    AIplayerLocation        = [];

    // AIeventStream_offline           = [];
    aiScore_offline                 = 0;
    AIplayer_offline.score          = 0
    // aiClicks_adjusted_offline       = [];
    AIcaughtTargets_offline         = [];
    // AIplayerLocation_offline        = [];

    setLocations();

    // player.x        = canvas.width/2;
    // player.y        = canvas.height/2;
    // player.targetX  = canvas.width/2;
    // player.targetY  = canvas.height/2;

    // player2.x        = canvas.width/2;
    // player2.y        = canvas.height/2;
    // player2.targetX  = canvas.width/2;
    // player2.targetY  = canvas.height/2;


    AIplayer.x, AIplayer.y = canvas.width/2  + 50; // MS5: Reset the player position
    AIplayer.targetX = canvas.width/2;
    AIplayer.targetY = canvas.height/2;
    AIplayer_offline.x, AIplayer_offline.y = canvas.width/2  + 50; // MS5: Reset the player position

    // frameCountGame=0;
}

function gameLoop(timestamp) {
    if (!isGameRunning) return;

    if (frameCountGame==0){
        firstRender = Date.now();
    }

    if (frameCountGame >= maxFrames) {
        endGame();
        // console.log("Game Over!", frameCountGame);
        return;
    }

    elapsedTime = Date.now() - gameStartTime;
    roundTime = Date.now() - firstRender;

    // console.log('Running game loop at frame count', frameCount);
    // console.log('Time since running:', now - gameStartTime);
    
    // Calculate time since last update
    var deltaTime = timestamp - lastUpdateTime;

    // Check if it's time for the next update
    if (deltaTime >= updateInterval) {
        lastUpdateTime = timestamp - (deltaTime % updateInterval);
        //console.log("Current Obj")
        updateObjects(settings);
    }
    render(); 

    // Schedule the next frame
    requestAnimationFrame(gameLoop); 
}

var lastUpdateTime = 0;
var isLightOn    = false;

// Render function
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    // drawDRTMask(ctx);   
    drawMask(ctx, player);
    drawCenterMarker();                               // Draw the center marker
    ctx.save();
    drawWorldBoundary();                         
    drawPlayer();          
    if (settings.visualizeHumanPartner==1) drawPlayer2();        
    // drawOtherPlayers();             
    if (settings.visualizeAIPlayer==1) drawAIPlayer();
    // if (settings.visualizeAIPlayerOffline==1) drawAIPlayerOffline();
    displayAIStatus();                                // Display which ai
    drawAISolution();                                  // Draw AI solution of type specified in settings
    drawObjects();         
    drawLight(drtLightChoice);
    ctx.restore();
    drawScore();                      
}

// Update game objects
function updateObjects(settings) {
    if (isPaused){
        // console.log("Game is paused");
        return;
    } 
    if (frameCountGame == 0) {
        // console.log("Starting Game");
        // runGameSequence("This is Round " + currentRound + " of " + maxRounds + " of this Section. Click to Begin.");

        isPaused = false;
    }

    if (deltaFrameCount == 10){
        deltaFrameCount = 0;
        // if (settings.visualizeHumanPartner == 1) writeMovement();   
        if (settings.visualizeHumanPartner == 1){
            let pathBase = `players/${player.fbID}/${frameCountGame}/location`;
            updateStateDirect(`${pathBase}/x`, player.x, 'xloc_'+roundID);
            updateStateDirect(`${pathBase}/y`, player.y, 'yloc_'+roundID);

            // const frameNumbers = Object.keys(otherPlayersLocations).map(Number);
            // if (frameNumbers.length > 0) {
            //     const mostRecentFrame = Math.max(...frameNumbers);
            //     const position = otherPlayersLocations[mostRecentFrame];
            //     player2.x = position.x;
            //     player2.y = position.y;
            // }

            pathBase = `players/${player.fbID}/${frameCountGame}/targetLocation`
            updateStateDirect(`${pathBase}/x`, player.targetX, 'targetLocation_'+roundID);
            updateStateDirect(`${pathBase}/y`, player.targetY, 'targetLocation_'+roundID);

            pathBase = `players/${player.fbID}/${frameCountGame}/velocity`
            updateStateDirect(`${pathBase}/dx`, player.dx, 'velocity_'+roundID);
            updateStateDirect(`${pathBase}/dy`, player.dy, 'velocity_'+roundID);
            updateStateDirect(`${pathBase}/moving`, player.moving, 'moving_'+roundID);
        }
    }
    
    frameCountGame++;                           // MS: increment scene update count
    deltaFrameCount++;                          // Limit the amount of data pushes
    
    player.velocity = settings.playerSpeed;

    
    // Update player position if it is moving
    if (player.moving) {
        const deltaX = player.targetX - player.x;
        const deltaY = player.targetY - player.y;
        const distanceToTarget = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // const deltaX_HumanPartner =  player2.targetX - player2

        if (distanceToTarget < player.velocity) {
            // Player has arrived at the target location
            player.x = player.targetX;
            player.y = player.targetY;
            player.moving = false;
        } else {

            numFramesPlayernotMoving = 0; // MS6
            player.angle = Math.atan2(deltaY, deltaX);

            // make global, consider consolidating into one variable
            let playerDeltaX = player.velocity * Math.cos(player.angle)
            let playerDeltaY = player.velocity * Math.sin(player.angle)

            player.dx = playerDeltaX;
            player.dy = playerDeltaY;

            player.x +=  player.dx;
            player.y +=  player.dy;

            playerLocation.push({frame: frameCountGame, x: player.x, y: player.y});
        }
    } else {
        numFramesPlayernotMoving++; // MS6
        player.dx = 0;
        player.dy = 0;

        // if (settings.visualizeHumanPartner == 1) writeMovement();   

        if (settings.visualizeHumanPartner){
            let pathBase = `players/${player.fbID}/${frameCountGame}/location`;
            updateStateDirect(`${pathBase}/x`, player.x, 'location_'+roundID);
            updateStateDirect(`${pathBase}/y`, player.y, 'location_'+roundID);
        }
    }


    // TODO: review this code on the remote player's movement!

    if (settings.visualizeHumanPartner==1 && player2.moving) {
        // Consider ways to scale the human partner's movement speed to account for that last delta caused by the firebase delay
        // player2.x += (player2.dx * 1);
        // player2.y += (player2.dy * 1);
        const scaledSpeed = scaleSpeed(player2);
  
        player2.x += scaledSpeed.dx;
        player2.y += scaledSpeed.dy;
        // console.log("Player 2 Location", player2.x, player2.y);
    } else if (settings.visualizeHumanPartner==1 && !player2.moving) {
        // console.log("Player 2 is not moving");
        // console.log("Other player's location:", otherPlayersLocations);
        // Get the most recent frame number from otherPlayersLocations

        // hacky solution to get the actual stopping location of the other player
        const frameNumbers = Object.keys(otherPlayersLocations).map(Number);
        if (frameNumbers.length > 0) {
            const mostRecentFrame = Math.max(...frameNumbers);
            const position = otherPlayersLocations[mostRecentFrame];
            player2.x = position.x;
            player2.y = position.y;
        }
    }

    // Prevent player from moving off-screen
    player.x                = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));
    player.y                = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y));

    if (settings.visualizeHumanPartner==1) {    
        player2.x                = Math.max(player2.width / 2, Math.min(canvas.width - player2.width / 2, player2.x));
        player2.y                = Math.max(player2.height / 2, Math.min(canvas.height - player2.height / 2, player2.y));
    }

    // MS5: Update AI player position if it is moving
    AIplayer.velocity       = settings.playerSpeed;
    AIplayer_offline.velocity = settings.playerSpeed;

    const deltaX            = AIplayer.targetX - AIplayer.x;
    const deltaY            = AIplayer.targetY - AIplayer.y;
    const distanceToTarget  = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distanceToTarget < AIplayer.velocity) {
        // AI Player has arrived at the target location
        AIplayer.x         = AIplayer.targetX;
        AIplayer.y         = AIplayer.targetY;
        AIplayer.moving    = false;
    } else if (!planDelay) {
        // Move player towards the target
        AIplayer.angle      = Math.atan2(deltaY, deltaX);
        AIplayer.x         += AIplayer.velocity * Math.cos(AIplayer.angle);
        AIplayer.y         += AIplayer.velocity * Math.sin(AIplayer.angle);
        AIplayer.moving     = true;
        AIplayerLocation.push({time: frameCountGame, x: AIplayer.x, y: AIplayer.y});
    }

    if (planDelay) planDelayCounter++;

    if (planDelayCounter >= planDelayFrames){
        planDelay = false;
        planDelayCounter = 0;
    }

    const deltaX_offline              = AIplayer_offline.targetX - AIplayer_offline.x;
    const deltaY_offline              = AIplayer_offline.targetY - AIplayer_offline.y;
    const distanceToTarget_offline    = Math.sqrt(deltaX_offline * deltaX_offline + deltaY_offline * deltaY_offline);

    if (distanceToTarget_offline < AIplayer_offline.velocity) {
        // AI Player has arrived at the target location
        AIplayer_offline.x         = AIplayer_offline.targetX;
        AIplayer_offline.y         = AIplayer_offline.targetY;
        AIplayer_offline.moving    = false;
    } else {
        // Move player towards the target
        AIplayer_offline.angle      = Math.atan2(deltaY_offline, deltaX_offline);
        AIplayer_offline.x         += AIplayer_offline.velocity * Math.cos(AIplayer_offline.angle);
        AIplayer_offline.y         += AIplayer_offline.velocity * Math.sin(AIplayer_offline.angle);
        AIplayer_offline.moving     = true;
        // AIplayerLocation.push({time: frameCountGame, x: AIplayer.x, y: AIplayer.y});
    }

    // MS: and inserted the following code
    if (frameCountGame % settings.spawnInterval === 0) {
        spawnObject(settings);    
    }

    let toRemove = [];
    let caughtAnything = false; // MS6
    objects.forEach((obj, index) => {
        if (obj.active) {
            // obj.x += obj.vx * obj.speed; // Update x position
            // obj.y += obj.vy * obj.speed; // Update y position

            obj.x += obj.dx; // Update x position with the magnitude vector
            obj.y += obj.dy; // Update y position
            // console.log("Object Location", obj.x, obj.y);

            // Check if the object is outside the observable area
            let dx                 = obj.x - center.x;
            let dy                 = obj.y - center.y;
            let distanceFromCenter = Math.sqrt(dx * dx + dy * dy) - 10;

            let willOverlap = willSquareAndCircleOverlap(player.x, player.y, player.dx, player.dy, player.width,
                obj.x, obj.y, obj.dx, obj.dy, obj.size, player.timeToIntercept, obj.marked);
            
            if (willOverlap){
                obj.willOverlap = willOverlap;
            } else {
                obj.willOverlap = false;
            }
    

            let inRegion = splitGameHalf(obj);
            obj.inPlayerRegion = inRegion;


            // console.log("Will overlap", willOverlap);

            if (obj.willOverlap) drawDebugOverlap(obj, willOverlap);

            if (distanceFromCenter > observableRadius) { // Object leaves observable area (EXIT EVENT)
                // console.log("Object is outside observable area");
                obj.active = false; // Set the object to inactive
                toRemove.push( index );


                // use otherplayersobjects to get the most recent object caught by the remote partner
                const frameNumbers = Object.keys(otherPlayersObjects).map(Number);
                const mostRecentObject = frameNumbers.length > 0 ? otherPlayersObjects[Math.max(...frameNumbers)] : null;
                console.log("mostRecentObject:", mostRecentObject);

                // create an event object here
                let gameState = extractGameState(objects);

                // add an event object for catching the target as a human player
                // Values for writing to dataframe
                let objectData      = {ID: obj.ID, value: obj.value,
                                    x: obj.x, y: obj.y,
                                    dx: obj.dx, dy: obj.dy,
                                    vx: obj.vx, vy: obj.vy, speed: obj.speed,
                                    clicked: obj.clicked, AIclicked: obj.AIclicked, 
                                    marked: obj.marked, AImarked: obj.AImarked};

                let playerData      = {x: player.x, y: player.y, speed: player.velocity, 
                                    dx: player.dx, dy: player.dy,
                                    targetX: player.targetX, targetY: player.targetY,
                                    angle: player.angle, moving: player.moving,
                                    score:player.score, AIscore: AIplayer.score};

                let interceptData   = {x: player.targetX, y: player.targetY, time: 0, distance: 0, 
                                        intendedTarget: player.targetObjID, AIintendedTarget: AIplayer.ID};
                // let drtStatus       = {isOn: isLightOn, duration: drtCount, initFrame:drtInitFrame, location: drtLightChoice}; // consider adding more to this
                let eventType       = 'exit';

                // collapse the 4 object events (spawning, collision, clicking, exiting) into one 1 dataframe
                let eventObject     = {time: frameCountGame, eventType: eventType, 
                                    objectData: objectData, playerData: playerData, 
                                    interceptData: interceptData, gameState: gameState};

                // if (DEBUG) console.log("Exit Event Object", eventObject);
                eventStream.push(eventObject);
            }
            
            // ********************************** Human CAUGHT TARGET ************************************//
            if (!obj.intercepted && checkCollision(player, obj)) {
                // Collision detected
                obj.intercepted   = true; // MS2: added this flag
                caughtAnything    = true;    //MS6
                score             += obj.value;
                player.score      += obj.value;

                let pathBase = `players/${player.fbID}/${frameCountGame}/objectStatus`;
                updateStateDirect(`${pathBase}/ID`, obj.ID, 'interceptID_'+roundID);
                updateStateDirect(`${pathBase}/intercepted`, obj.intercepted, 'interceptionBool_'+roundID);

                if (obj.ID == player.targetObjID){
                    player.moving = false; // stop player after catching intended target
                } 

                // *************************** Data Writing *********************************//
                let gameState = extractGameState(objects);
                let objectData      = {ID: obj.ID, value: obj.value,
                                    x: obj.x, y: obj.y,
                                    dx: obj.dx, dy: obj.dy,
                                    vx: obj.vx, vy: obj.vy, speed: obj.speed,
                                    clicked: obj.clicked, AIclicked: obj.AIclicked, 
                                    marked: obj.marked, AImarked: obj.AImarked};

                let playerData      = {x: player.x, y: player.y, speed: player.velocity, 
                                    dx: player.dx, dy: player.dy,
                                    targetX: player.targetX, targetY: player.targetY,
                                    angle: player.angle, moving: player.moving,
                                    score:player.score, AIscore: AIplayer.score};

                let interceptData   = {x: player.targetX, y: player.targetY, time: 0, distance: 0, 
                                        intendedTarget: player.targetObjID, AIintendedTarget: AIplayer.ID};
                let eventType       = 'catch';
                let eventObject     = {time: frameCountGame, eventType: eventType, 
                                    objectData: objectData, playerData: playerData, 
                                    interceptData: interceptData, gameState: gameState};

                // if (DEBUG) console.log("Caught Target Event Object", eventObject);
                eventStream.push(eventObject)
               
            }

             // MS6 Checking times between catching objects for human player
            if (caughtAnything) numFramesAfterCaughtTarget=0; else numFramesAfterCaughtTarget++;

            // ********************************** AI ONLINE CAUGHT TARGET ************************************//

            // if AI player catches a new object
            if (!obj.intercepted && checkCollision(AIplayer, obj)) { // MS5: added a condition
                // Collision detected
                obj.intercepted   = true; // Added this flage to make sure the object despawns after being caught  
                // obj.AIintercepted = true; // MS2: added this flag             
                //console.log("AI Collision detected!");
                let caughtObj     = {frame: frameCountGame, target: obj}   
                AIcaughtTargets.push(caughtObj);

                aiScore           += obj.value;
                AIplayer.score    += obj.value;

                // *************************** Data Writing *********************************//
                let gameState = extractGameState(objects);
                let objectData    = {ID: obj.ID, value: obj.value,
                                    x: obj.x, y: obj.y,
                                    dx: obj.dx, dy: obj.dy,
                                    vx: obj.vx, vy: obj.vy, speed: obj.speed,
                                    clicked: obj.clicked, AIclicked: obj.AIclicked,
                                    marked: obj.marked, AImarked: obj.AImarked};


                let AIplayerData      = {x: AIplayer.x, y: AIplayer.y, speed: AIplayer.velocity, 
                                    targetX: AIplayer.targetX, targetY: AIplayer.targetY,
                                    angle: AIplayer.angle, moving: AIplayer.moving,
                                    score:AIplayer.score};

                let interceptData   = {x: AIplayer.targetX, y: AIplayer.targetY, time: 0, distance: 0, intendedTarget: AIplayer.ID};
                // let drtStatus       = {isOn: isLightOn, duration: drtCount, initFrame:drtInitFrame, location:drtLightChoice}; // consider adding more to this
                let eventType       = 'catch';
                let eventObject     = {time: frameCountGame, eventType: eventType, 
                                    objectData: objectData, playerData: AIplayerData, 
                                    interceptData: interceptData,gameState: gameState};

                // if (DEBUG) console.log("Caught Target Event Object", eventObject);

                AIeventStream.push(eventObject)
            }

            // ********************************** AI OFFLINE CAUGHT TARGET ************************************//

            if (!obj.AIintercepted && checkCollision(AIplayer_offline, obj)) { // MS5: added a condition
                // Collision detected
                obj.AIintercepted = true; // MS2: added this flag             
                let caughtObj     = {frame: frameCountGame, target: obj}   
                AIcaughtTargets_offline.push(caughtObj);

                aiScore_offline           += obj.value;
                AIplayer_offline.score    += obj.value;
                if (DEBUG) console.log("AI Offline Score: ", AIplayer_offline.score);

                // *************************** Data Writing *********************************//

                let gameState = extractGameState(objects);
                let objectData      = {ID: obj.ID, value: obj.value,
                                    x: obj.x, y: obj.y,
                                    dx: obj.dx, dy: obj.dy,
                                    vx: obj.vx, vy: obj.vy, speed: obj.speed,
                                    clicked: obj.clicked, AIclicked: obj.AIclicked,
                                    marked: obj.marked, AImarked: obj.AImarked};

                let AIplayerData      = {x: AIplayer_offline.x, y: AIplayer_offline.y, speed: AIplayer_offline.velocity, 
                                    targetX: AIplayer_offline.targetX, targetY: AIplayer_offline.targetY,
                                    angle: AIplayer_offline.angle, moving: AIplayer_offline.moving,
                                    score: AIplayer_offline.score};

                let interceptData   = {x: AIplayer_offline.targetX, y: AIplayer_offline.targetY, time: 0, distance: 0, intendedTarget: AIplayer_offline.ID};
                // let drtStatus       = {isOn: isLightOn, duration: drtCount, initFrame:drtInitFrame, location:drtLightChoice}; // consider adding more to this
                let eventType       = 'catch';
                let eventObject     = {time: frameCountGame, eventType: eventType, 
                                    objectData: objectData, playerData: AIplayerData, 
                                    interceptData: interceptData, gameState: gameState};

                // if (DEBUG) console.log("Caught Target Event Object", eventObject);

                AIeventStream_offline.push(eventObject)
            }
        }
    });

    // ********************************** ONLY Remove Objects that have EXITED ************************************//

    // MS4: Remove items starting from the end
    for (let i = toRemove.length - 1; i >= 0; i--) {
        objects.splice(toRemove[i], 1);
    }

    // **************************************** Run the Collab AI Planner ****************************************//
    
    // Collab player
    let prevBestSolCollab = bestSolCollab;
    let prevFirstStepCollab = firstStepCollab;

    let objectsRemoved;

    // Apply the AI Collab type to remove certain objects (this is only for some rule-based agents)
    if ((settings.AICollab > 0) && !(settings.AICollab == 2)) {
        objectsRemoved = objects.filter(obj => !obj.willOverlap); // all agents remove overlapping objects
    } else if (settings.AICollab == 2) {
        objectsRemoved = objects.filter(obj => obj.inPlayerRegion);
        objectsRemoved = objectsRemoved.filter(obj => !obj.willOverlap);
    } else {
        objectsRemoved = objects; // ignorant agent
    } 

    let isBottomFeeder = false;
    if (settings.AICollab == 4) isBottomFeeder = true;
    
    // SK1 Online AI player
    // [ firstStepCollab, bestSolCollab, allSolCollab ] = runAIPlanner(objectsRemoved, AIplayer , observableRadius , center, 'collab', 
    //     settings.AIStabilityThreshold, prevBestSolCollab, allSolCollab, frameCountGame, settings.alpha, isBottomFeeder);

    if (settings.visualizeAIPlayer==1){ // bound the collab AI player to conditions where it is visible
        [ firstStepCollab, bestSolCollab ] = runAIPlanner(objectsRemoved, AIplayer , observableRadius , center, 'collab', 
                settings.AIStabilityThreshold, prevBestSolCollab, frameCountGame, settings.alpha, isBottomFeeder );
        
        // AI intention for click,target pair
        AIplayer.targetX = firstStepCollab.x; // MS7 -- just save the firstStepOffline object to firebase
        AIplayer.targetY = firstStepCollab.y; 
        AIplayer.ID      = firstStepCollab.ID; // MS8 // ID of the object to intercept

        if (AIplayer.ID == -1){
            AIplayer.toCenter = true; 
        } else{
            AIplayer.toCenter = false;
        }

        // Mark the object as currently being targetted
        if ((prevFirstStepCollab!= null) && (prevFirstStepCollab.ID != AIplayer.ID)){
            objects.forEach((obj, index) => {
                if (obj.ID == AIplayer.ID){
                    obj.AImarked = true;
                    obj.AIclicked = true

                    // pause before a new object is clicked
                    if (settings.AICollab == 3) planDelay = true;
                } 
                if (obj.ID == prevFirstStepCollab.ID){
                    obj.AImarked = false;
                }
            });
        } 
        
        // Keep track of collab agent decisions
        if ((prevFirstStepCollab != null) && (bestSolCollab.ID != prevBestSolCollab.ID)) {
            // push AI intention array
            // aiIntention.push();
            let aiIntention = {frame: frameCountGame, x: AIplayer.targetX, y: AIplayer.targetY, id: bestSolCollab.ID, planDelay: planDelay};
            aiClicks.push(aiIntention);
            // aiClicks_adjusted.push(aiIntention);
            numAIChanges++;
        } else if (prevBestSolCollab == null) {
            // aiIntention.push
            let aiIntention = {frame: frameCountGame, x: AIplayer.targetX, y: AIplayer.targetY, id: bestSolCollab.ID};
            aiClicks.push(aiIntention);
                // aiClicks_adjusted.push(aiIntention);
        }
    }

    // **************************************** Run the Offline AI Planner ****************************************//

    let prevBestSolOffline = bestSolOffline;
    let prevFirstStepOffline = firstStepOffline;

    // [ firstStepOffline, bestSolOffline, allSolOffline ] = runAIPlanner(objects, AIplayer_offline , observableRadius , center, 'AI', 
    //     settings.AIStabilityThreshold, prevBestSolOffline, allSolOffline, frameCountGame, settings.alpha );

    [ firstStepOffline, bestSolOffline ] = runAIPlanner(objects, AIplayer_offline , observableRadius , center, 'AI', 
        settings.AIStabilityThreshold, prevBestSolOffline, frameCountGame, settings.alpha, false );
    
    AIplayer_offline.targetX = firstStepOffline.x; // MS7 -- just save the firstStepOffline object to firebase
    AIplayer_offline.targetY = firstStepOffline.y; 
    AIplayer_offline.ID      = firstStepOffline.ID; // MS8 // ID of the object to intercept

    // we need to save the decisions from the offline agent
    if ((prevFirstStepOffline != null) && (bestSolOffline.ID != prevBestSolOffline.ID)) { // all other decisions
        // push AI intention array
        // aiIntention.push();
        let aiIntention_offline = {frame: frameCountGame, x: AIplayer_offline.targetX, y: AIplayer_offline.targetY, id: bestSolOffline.ID};
        aiClicks_offline.push(aiIntention_offline);
        numAIChanges++;
    } else if (prevBestSolCollab == null) { // first decision
        // aiIntention.push
        let aiIntention_offline = {frame: frameCountGame, x: AIplayer_offline.targetX, y: AIplayer_offline.targetY, id: bestSolOffline.ID};
        aiClicks_offline.push(aiIntention_offline);
        numAIChanges++;
    }

     // ************************************* Run the Human Assistive AI Planner ***********************************//
    // Run the planner conditional on the human player
    // MS8
    // [ firstStep, bestSol, allSol ] = runAIPlanner( objects, player , observableRadius , center, 'human', settings.AIStabilityThreshold, bestSol, allSol, frameCountGame, settings.alpha );
    [ firstStep, bestSol ] = runAIPlanner( objects, player , observableRadius , center, 'human', frameCountGame, settings.alpha, false );
    
    // if (settings.AIMode>0) {    
    //     // MS6
    //     // Calculate the value of the human's current target
    //     player.shownAdvice = true;

    //     if (settings.AIMode >= 2) {
    //         //if ((frameCountGame > 100) & (player.moving)) {
    //         //    console.log( 'test case');
    //         //}
    //         // MS7
    //         let [ valueHumanPlan , valuesSuggestions ] = calcValueHumanPlan( bestSol , allSol, player , settings.AIadviceAngleThreshold, ctx, objects  ); 
    //         player.shownAdvice = false;

    //         const deltaX = player.x - center.x;
    //         const deltaY = player.y - center.y;
    //         const distanceToCenter = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    //         if ((numFramesAfterCaughtTarget > settings.AIframeDelay) && (distanceToCenter > 50)) {
    //             if (!player.moving) {
    //                 player.shownAdvice = true;
    //             } else if (player.moving && (valueHumanPlan <= settings.AIadviceThresholdHigh)) {
    //                 player.shownAdvice = true;
    //             }
    //         }
    //         //console.log( 'Numframesplayernotmoving=' + numFramesPlayernotMoving + ' NumFramesAfterCaughtTarget=' + numFramesAfterCaughtTarget + ' ValuePlan=' + valueHumanPlan);
    //     }
         
    // }
}

function spawnObject(settings){

    let numObjectsTotal = objects.length; // MS2: count total number of objects (intercepted objects also count)
    
    let randomThreshold = randomGenerator();
    if (randomThreshold < settings.spawnProbability && numObjectsTotal < settings.maxTargets) { // Spawn a new object
        let newObject = createComposite(settings);
        
        // MS: Generate a random angle between 0 and 2π (0 and 360 degrees)
        //let angle = Math.random() * 2 * Math.PI;
        let angle = randomGenerator() * 2 * Math.PI;

        // get x,y coordinates
        let curXLoc = center.x + observableRadius * Math.cos(angle); // - obj.width / 2;
        let curYLoc = center.y + observableRadius * Math.sin(angle); // - obj.height / 2;

        let location = {x:curXLoc, y:curYLoc, angle:angle, lastSpawnTime:0};

        // works good enough for now
        newObject.x = location.x ;
        newObject.y = location.y ;
        newObject.spawnX = location.x;
        newObject.spawnY = location.y;

        setVelocityTowardsObservableArea(newObject);

        // push to objects array in order to render and update
        objects.push(newObject);
        spawnData.push(newObject);
        // place event object here

        // ************************* Event Object for Spawning ******************** //   
        let gameState = extractGameState(objects);
        let objectData      = {ID: newObject.ID, value: newObject.value,
                            x: newObject.x, y: newObject.y,
                            dx: newObject.dx, dy: newObject.dy,
                            vx: newObject.vx, vy: newObject.vy, speed: newObject.speed,
                            clicked: newObject.clicked, AIclicked: newObject.AIclicked,
                            marked: newObject.marked, AImarked: newObject.AImarked};

        let playerData      = {x: player.x, y: player.y, speed: player.velocity, 
                            dx: player.dx, dy: player.dy,
                            targetX: player.targetX, targetY: player.targetY,
                            angle: player.angle, moving: player.moving,
                            score:player.score, AIscore: AIplayer.score};

        let interceptData   = {x: player.targetX, y: player.targetY, time: 0, distance: 0, 
                                intendedTarget: player.targetObjID, AIintendedTarget: AIplayer.ID};
        // let drtStatus       = {isOn: isLightOn, duration: drtCount, initFrame:drtInitFrame, location:drtLightChoice}; // consider adding more to this
        let eventType       = 'spawn';

        let eventObject     = {time: frameCountGame, eventType: eventType, 
                            objectData: objectData, playerData: playerData, 
                            interceptData: interceptData, gameState: gameState};

        // if (DEBUG) console.log("Spawn Event Object", eventObject);

        eventStream.push(eventObject)

    }
    location.lastSpawnTime = elapsedTime;
}

function createComposite(settings) {
    if (!settings) {
        console.error("Settings not provided to createComposite");
        return; // Or set default values for settings
    }
    let shapeType = 'circle';

    const shapeSize = 15;
    // minSize + Math.random() * (maxSize - minSize); // Random size within range

    // Sample u ~ Uniform(0,1)
    // adjust u by the skewFloor and skewCeiling
    var valueLow = settings.valueLow;
    var valueHigh = settings.valueHigh;
    var range = valueHigh - valueLow;

    // use the a-b distribution to get a fillRadius
    let probabilities   = binProbabilities(a, b, bins);
    let cumulative      = cumulativeProbabilities(probabilities);
    let fillRadius      = parseInt(sampleFromDistribution(cumulative, 1));

    // sample from a distribution of speeds
    let speedRange  = settings.speedHigh - settings.speedLow
    let speedSample = randomGenerator() * speedRange + settings.speedLow;

    let newObj = {
        ID: frameCountGame ,
        type: 'composite',
        speed: speedSample, //(),
        x: 0,
        y: 0,
        vx: 0, // unit vector not yet scaled by speed
        vy: 0,
        dx: 0, // vector scaled by speed
        dy: 0,
        velAngle: 0, // initial velocity angle is zero --> reset in the setVelocityTowardsObservableArea
        size: shapeSize,
        outerColor: 'rgba(65, 54, 54, 0.5)',//'rgba(0, 0, 255, 0.4)', // blue// 'rgba(47, 30, 30, 0.5)',//'rgba(65, 54, 54, 0.5)', // good color //'rgba(143, 136, 136, 0.5)',// offwhite greyish , //'rgb(170,0,255)',
        innerColor:  'orange', //'rgb(255,170,0)',
        shape: shapeType, // Add shape type here
        type: 'target',
        //angle: shapeRotation,
        fill: fillRadius,
        value: Math.floor(fillRadius),
        active: true,
        intercepted: false, // MS2: Added this flag
        AIintercepted: false, // MS5: Added this flag
        spawnX: 0,
        spawnY: 0,
        clicked: false,
        AIclicked: false,
        marked: false,
        AImarked: false,
        willOverlap: false,
    };
    // console.log(newObj.speed);
 
    return newObj;
}

function writeMovement(){
    let pathBase = `players/${player.fbID}/${frameCountGame}/location`;
    updateStateDirect(`${pathBase}/x`, player.x, 'xloc'+roundID);
    updateStateDirect(`${pathBase}/y`, player.y, 'yloc'+roundID);

    // const frameNumbers = Object.keys(otherPlayersLocations).map(Number);
    // if (frameNumbers.length > 0) {
    //     const mostRecentFrame = Math.max(...frameNumbers);
    //     const position = otherPlayersLocations[mostRecentFrame];
    //     player2.x = position.x;
    //     player2.y = position.y;
    // }

    pathBase = `players/${player.fbID}/${frameCountGame}/targetLocation`
    updateStateDirect(`${pathBase}/x`, player.targetX, 'targetLocation_'+roundID);
    updateStateDirect(`${pathBase}/y`, player.targetY, 'targetLocation_'+roundID);

    pathBase = `players/${player.fbID}/${frameCountGame}/velocity`
    updateStateDirect(`${pathBase}/dx`, player.dx, 'velocity_'+roundID);
    updateStateDirect(`${pathBase}/dy`, player.dy, 'velocity_'+roundID);
    updateStateDirect(`${pathBase}/moving`, player.moving, 'moving_'+roundID);
}

function setVelocityTowardsObservableArea(obj) {
    // Calculate angle towards the center
    let angleToCenter = Math.atan2(center.y - obj.y, center.x - obj.x);

    // Define the cone's range (22.5 degrees in radians)
    let coneAngle = 90 * (Math.PI / 180); // Convert degrees to radians

    // Randomly choose an angle within the cone
    //let randomAngleWithinCone = angleToCenter - coneAngle / 2 + Math.random() * coneAngle;
    let randomAngleWithinCone = angleToCenter - coneAngle / 2 + randomGenerator()  * coneAngle;

    // Set velocity based on the angle within the cone
    obj.vx = Math.cos(randomAngleWithinCone);
    obj.vy = Math.sin(randomAngleWithinCone);

    obj.dx = obj.vx * obj.speed;
    obj.dy = obj.vy * obj.speed;
    // console.log(`Initial Velocity for object: vx = ${obj.vx}, vy = ${obj.vy}`);
}

function checkCollision(player, obj) {
    // Calculate the player's bounding box edges from its center
    let playerLeft = player.x - player.width / 2;
    let playerRight = player.x + player.width / 2;
    let playerTop = player.y - player.height / 2;
    let playerBottom = player.y + player.height / 2;

    // Calculate the distance from the center of the player to the center of the object
    let circleDistanceX = Math.abs(obj.x - player.x);
    let circleDistanceY = Math.abs(obj.y - player.y);

    // Check for collision
    if (circleDistanceX > (player.width / 2 + obj.size / 2)) { return false; }
    if (circleDistanceY > (player.height / 2 + obj.size / 2)) { return false; }

    if (circleDistanceX <= (player.width / 2)) { return true; } 
    if (circleDistanceY <= (player.height / 2)) { return true; }

    // Check corner collision
    let cornerDistance_sq = (circleDistanceX - player.width / 2) ** 2 + (circleDistanceY - player.height / 2) ** 2;

    return (cornerDistance_sq <= ((obj.size / 2) ** 2));
}

// Grabs all relevant current game state modeling data
function extractGameState(objects){
    return objects.map(obj => ({
        id: obj.ID,
        x: obj.x,
        y: obj.y,
        vx: obj.vx,
        vy: obj.vy,
        dx: obj.dx,
        dy: obj.dy,
        // magnitude of hte vecto
        speed: obj.speed,
        clicked: obj.clicked,
        marked:obj.marked,
        AImarked:obj.AImarked,
        value: obj.value,
        active: obj,
        intercepted: obj.intercepted,
    }));
}

function getExponentialMovingAverage(n) {
    let lastNClicks = clickTimes.slice(Math.max(clickTimes.length - n, 0)); // Get the last n clicks
    lastNClicks.forEach(currentDataPoint => {
        if (ema === undefined) {
            ema = currentDataPoint; // For the first data point, EMA equals the current data point
        } else {
            ema = (currentDataPoint - ema) * smoothingFactor + ema;
        }
    });
    return ema;
}

function scaleSpeed(player){
    /* 
    Adjust the player's speed scaling based on the total distance to the target.
    Longer trajectories will have a higher scaling factor, up to 10%,
    while shorter trajectories will have a lower scaling factor, down to 1%.
    */

    const targetX = player.targetX;
    const targetY = player.targetY;
    const currentX = player.x;
    const currentY = player.y;

    // Calculate the total distance to the target
    const totalDistance = Math.sqrt(Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2));

    // Calculate the current distance traveled
    const distanceTraveled = Math.sqrt(Math.pow(player.dx, 2) + Math.pow(player.dy, 2));

    // Determine the scaling factor based on total distance
    const minScale = 1.01; // Minimum scaling factor for short distances
    const maxScale = 1.10; // Maximum scaling factor for long distances
    const maxDistance = 1000; // Define a maximum distance for scaling

    // Calculate scaling factor proportionally between minScale and maxScale
    let scalingFactor = minScale + (maxScale - minScale) * (totalDistance / maxDistance);
    scalingFactor = Math.min(scalingFactor, maxScale); // Ensure it doesn't exceed maxScale

    // Apply scaling only for the first third of the path
    if (distanceTraveled >= totalDistance / 3) {
        scalingFactor = 1; // No scaling after the first third
    }

    // Return the scaled dx and dy
    return {
        dx: player.dx * scalingFactor,
        dy: player.dy * scalingFactor
    };
}

//***************************************************** BETA SAMPLING ****************************************************//
let a = 1;
let b = 2;
let bins = 16;

function gamma(z) {
    const g = 7;
    const C = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
               771.32342877765313, -176.61502916214059, 12.507343278686905,
               -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
    z -= 1;
    let x = C[0];
    for (let i = 1; i < g + 2; i++)
        x += C[i] / (z + i);
    let t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}
// Beta function using the Gamma function
function beta(alpha, beta) {
    return gamma(alpha) * gamma(beta) / gamma(alpha + beta);
}
// Beta distribution PDF
function betaPDF(x, a, background) {
    if (x < 0 || x > 1) return 0;
    return (Math.pow(x, a - 1) * Math.pow(1 - x, b - 1)) / beta(a, b);
}
// Function to calculate the probability of each bin
function binProbabilities(alpha, beta, bins) {
    let step = 1 / bins;
    let probabilities = [];
    for (let i = 0; i < bins; i++) {
        let lower = i * step;
        let upper = (i + 1) * step;
        probabilities.push(integrate(betaPDF, lower, upper, alpha, beta, 1000));
    }
    return probabilities;
}
// Numerical integration using the trapezoidal rule
function integrate(func, start, end, alpha, beta, numSteps) {
    let total = 0;
    let step = (end - start) / numSteps;
    for (let i = 0; i < numSteps; i++) {
        let x0 = start + i * step;
        let x1 = start + (i + 1) * step;
        total += 0.5 * (func(x0, alpha, beta) + func(x1, alpha, beta)) * step;
    }
    return total;
}

// Function to calculate cumulative probabilities
function cumulativeProbabilities(probabilities) {
    let cumulative = [];
    let sum = 0;
    for (let prob of probabilities) {
        sum += prob;
        cumulative.push(sum);
    }
    return cumulative;
}

// Function to sample from the distribution
function sampleFromDistribution(cumulative, totalSamples = 1) {
    let samples = [];
    for (let i = 0; i < totalSamples; i++) {
        let random = randomGenerator();  // generate a random number between 0 and 1
        let index = cumulative.findIndex(cum => cum >= random);
        samples.push(index);
    }
    return samples;
}
//*************************************************** DRAWING FUNCTIONS **************************************************//

function setupCanvas() {
    // Fill the background of the entire canvas with grey
    ctx.fillStyle = 'grey';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    // Define the game world area with a white rectangle (or any other color your game uses)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, world.width, world.height);

    ctx.font = '20px Arial'; // MS4: Font size and style for the text
}

function drawWorldBoundary() {
    ctx.strokeStyle = 'grey';
    ctx.strokeRect(0, 0, world.width, world.height);
}

function drawPlayer() {
    let topLeftX = player.x - player.width / 2;
    let topLeftY = player.y - player.height / 2;

    // Draw coordinates text above player
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    // if (DEBUG) ctx.fillText(`(${Math.round(player.x)}, ${Math.round(player.y)})`, topLeftX, topLeftY - 5);

    ctx.fillStyle = player.color;
    ctx.fillRect(topLeftX, topLeftY, player.width, player.height);

    ctx.drawImage(humanImg, topLeftX, topLeftY, 50, 50);
}

function drawPlayer2() {
    let topLeftX = player2.x - player2.width / 2;
    let topLeftY = player2.y - player2.height / 2;

    // Draw coordinates text above player
    ctx.fillStyle = 'black';
    ctx.font = '12px Arial';
    // if (DEBUG) ctx.fillText(`(${Math.round(player2.x)}, ${Math.round(player2.y)})`, topLeftX, topLeftY - 5);

    ctx.fillStyle = player2.color;
    ctx.fillRect(topLeftX, topLeftY, player2.width, player2.height);

    ctx.drawImage(anonImg, topLeftX, topLeftY, 50, 50);
}

// MS5
function drawAIPlayer() {
    let topLeftX = AIplayer.x - AIplayer.width / 2;
    let topLeftY = AIplayer.y - AIplayer.height / 2;

    ctx.fillStyle = AIplayer.color;
    //ctx.strokeStyle = player.color;
    ctx.fillRect(topLeftX, topLeftY, player.width, player.height);

    ctx.drawImage(robotHeadImg, topLeftX, topLeftY, 50, 50);
}

function drawAIPlayerOffline() {
    let topLeftX = AIplayer_offline.x - AIplayer_offline.width / 2;
    let topLeftY = AIplayer_offline.y - AIplayer_offline.height / 2;

    ctx.fillStyle = AIplayer_offline.color;
    //ctx.strokeStyle = player.color;
    ctx.fillRect(topLeftX, topLeftY, player.width, player.height);

    // write the current intended target id ot hte top left of hte palyer

    // ctx.fillStyle = 'black';
    // ctx.fillText(AIplayer.ID, topLeftX, topLeftY - 5);  
}

// Function to draw objects
function drawObjects() {
    objects.forEach(obj => {
        if (obj.active) {
            if (!obj.intercepted) drawCompositeShape(obj); // MS2: added this condition
            // if (!obj.AIintercepted) drawCompositeShape(obj); // MS5: added this condition
            // MS5: added this; can be removed once code is tested
            // if ((obj.AIintercepted) && (settings.visualizeAIPlayer==1)) drawCompositeShapeAI(obj);//drawCompositeShapeAI(obj); 
            // if (obj.intercepted) drawCompositeShapeDEBUG(obj); // MS2: added this; can be removed once code is tested
            // //drawDebugBounds(obj);
        }
    });
}

function drawCompositeShape(obj) {
    let type;
    // If the object is clicked, draw a green highlight around it.
    if (obj.marked && obj.AImarked){
        let offset = true;
        if (!player.toCenter){
            type = 'player';
            drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type);
        } else{
            offset = false;
        }
        if (!player2.toCenter){
            type = 'player2';
            drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type);
        } else{
            offset = false;
        }

        type = 'AI';
        if (offset && !planDelay){
            drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type, Math.PI/4);
        } else if (!planDelay) {
            drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type);
        }
    }

    if (obj.marked && obj.marked2){
        let offset = true;
        if (!player.toCenter){
            type = 'player';
            drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type);
        } else{
            offset = false;
        }

        type = 'player2';
        if (offset){
            drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type, Math.PI/4);
        } else {
            drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type);
        }
    }

    if (obj.marked2 && !obj.marked){
        type = 'player2';
        drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type, Math.PI/4);
    } 
    
    if (obj.AImarked && !obj.marked && !planDelay){
        type = 'AI';
        drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type, Math.PI/4);
    } 

    if (obj.marked && !obj.AImarked && !player.toCenter){
        type = 'player';
        drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type);
    } else if (obj.marked && !obj.marked2 && !player.toCenter){
        type = 'player';
        drawTargetMarker(obj.x, obj.y, obj.size + 2, obj.size + 12, 10, type);
    }

    // if (obj.willOverlap && DEBUG) drawDebugOverlap(obj, obj.willOverlap);

    // if (DEBUG) drawDebugID(obj);   

    // Draw the outer circle first
    drawCircle(obj.x, obj.y, obj.size, obj.outerColor); // Outer circle

    // Then draw the inner circle on top
    drawCircle(obj.x, obj.y, obj.fill, obj.innerColor); // Inner circle, smaller radius

    // if (DEBUG && obj.willOverlap) drawDebugOverlap(obj, obj.willOverlap);
    
}

function drawCircle(centerX, centerY, radius, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function drawCenterMarker(centerX=400, centerY=400, radius=10, color = "rgba(128, 128, 128, 0.5)"){
    if (player.toCenter) drawCircle(centerX, centerY, 
                                    radius + 5,'red');
    if (player2.toCenter) drawCircle(centerX, centerY, 
                                    radius + 5,'green');
    if (AIplayer.toCenter && !planDelay) drawCircle(centerX, centerY,
                                    radius + 5, AIplayer.color);
    drawCircle(centerX, centerY, radius, color);
}

function drawTargetMarker(centerX, centerY, radius1, radius2, triangleBase = 5, type, offset =0) {
    const context = document.querySelector('canvas').getContext('2d'); // Assuming there's a canvas element in your HTML
    const angles = [0 + offset, Math.PI / 2 + offset, Math.PI + offset, (3 * Math.PI) / 2 + offset]; // angles for the 4 triangles
    const triangleHeight = radius2 - radius1; // Calculate the height of the triangles

    context.save();
    // ctx.fillStyle = color;
    if (type == 'player') ctx.fillStyle = 'red';
    if (type == 'player2') ctx.fillStyle = 'green';

    // AI Players have their own marker colors by collab type and the game condition
    if ((type == 'AI') && AIplayer.collabOrder == 1 && settings.maxTargets == 5) ctx.fillStyle = 'green';
    if ((type == 'AI') && AIplayer.collabOrder == 2 && settings.maxTargets == 5) ctx.fillStyle = 'purple';
    if ((type == 'AI') && AIplayer.collabOrder == 1 && settings.maxTargets == 15) ctx.fillStyle = 'blue';
    if ((type == 'AI') && AIplayer.collabOrder == 2 && settings.maxTargets == 15) ctx.fillStyle = 'rgba(176, 97, 23)';// 'rgba(184, 115, 51)';

    angles.forEach((angle) => {
        const tipX = centerX + radius1 * Math.cos(angle);
        const tipY = centerY + radius1 * Math.sin(angle);
        const baseX1 = centerX + radius2 * Math.cos(angle) - triangleBase / 2 * Math.sin(angle);
        const baseY1 = centerY + radius2 * Math.sin(angle) + triangleBase / 2 * Math.cos(angle);
        const baseX2 = centerX + radius2 * Math.cos(angle) + triangleBase / 2 * Math.sin(angle);
        const baseY2 = centerY + radius2 * Math.sin(angle) - triangleBase / 2 * Math.cos(angle);

        // Draw a triangle
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(baseX1, baseY1);
        ctx.lineTo(baseX2, baseY2);
        ctx.closePath();
        ctx.fill();
    });

    ctx.restore();
}

function drawDebugID(obj) {
    // set the text color
    ctx.fillStyle = 'black';
    // set the font
    ctx.font = '16px Arial';
    // draw the ID above the object
    ctx.fillText(obj.ID, obj.x, obj.y - 20);
}

// MS2: added this function just for debugging; it continues to draw the targets even when intercepted
function drawCompositeShapeDEBUG(obj) {
    // Draw the outer circle first
    drawCircle(obj.x, obj.y, obj.size, 'LightGrey' ); // Outer circle

    // Then draw the inner circle on top
    drawCircle(obj.x, obj.y, obj.fill, 'gray' ); // Inner circle, smaller radius
}

// MS5: added this function just for debugging; it shows when AI player has intercepted target
function drawCompositeShapeAI(obj) {
    // Draw the outer circle first
    drawCircle(obj.x, obj.y, obj.size, 'LightGrey' ); // Outer circle

    // Then draw the inner circle on top
    drawCircle(obj.x, obj.y, obj.fill, 'gray' ); // Inner circle, smaller radius
}

function drawDebugOverlap(obj, willOverlap) {
    ctx.save();
    // console.log("will overlap", willOverlap);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'; // Set the color of the box
    ctx.lineWidth = 2; // Set the width of the box border
    let size = 2*obj.size + 15;
    ctx.strokeRect(obj.x - size/2, obj.y - size/2, size, size);
    ctx.restore();
}

function isWithinCanvas(obj) {
    return obj.x >= 0 && obj.x <= canvas.width && obj.y >= 0 && obj.y <= canvas.height;
}

function drawDebugBounds(obj) {
    ctx.strokeStyle = 'red'; // Set the boundary color to red for visibility
    ctx.strokeRect(obj.x, obj.y, obj.size, obj.size); // Draw the boundary of the object
}

function drawScore() {
    scoreCtx.clearRect(0, 0, scoreCanvas.width, scoreCanvas.height); // Clear the score canvas
    scoreCtx.font = '18px Roboto';
    scoreCtx.fillStyle = 'black'; // Choose a color that will show on your canvas
    totalScore = player.score + AIplayer.score;``
    scoreCtx.fillText('Team Score: ' + totalScore, 10, 20); // Adjust the positioning as needed
    // add a new line space between this right and the next
    scoreCtx.font = '14px Roboto';
    scoreCtx.fillText('Player: ' + score, 10, 40); // Adjust the positioning as needed
    scoreCtx.fillText('Bot: ' + AIplayer.score, 10, 60); // Adjust the positioning as needed
}

// drawing outer mask
function drawMask(ctx) {
    if (!ctx) {
        console.error('drawMask: No drawing context provided');
        return;
    }

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maskRadius = 400; // Adjust as necessary
    const innerMaskRadius = maskRadius - 10; // Adjust as necessary

    ctx.save();

    // Draw a black rectangle covering the entire canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Then cut out a circular area from the rectangle
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(centerX, centerY, maskRadius, 0, Math.PI * 2, false);
    ctx.fill();

    // Draw a slightly smaller circle inside the cut-out area
    // ctx.globalCompositeOperation = 'source-over';
    // ctx.fillStyle = isLightOn ? 'rgb(255,128,237)' : 'rgba(0, 0, 0, 0)'; // This is transparent black
    // ctx.beginPath();
    // ctx.arc(centerX, centerY, innerMaskRadius, 0, Math.PI * 2, false);
    // ctx.fill();

    // // Then cut out a smaller circular area from the inner circle
    // ctx.globalCompositeOperation = 'destination-out';
    // ctx.beginPath();
    // ctx.arc(centerX, centerY, innerMaskRadius - 15, 0, Math.PI * 2, false);
    // ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

// Function to where the player is heading
function drawArrowDirection() {
    // Define the radial distance from the player
    let radialDistance = 60; // Adjust this value as needed

    // Player dimensions (assuming square for simplicity)
    let playerWidth = 50; // Replace with actual player width
    let playerHeight = 50; // Replace with actual player height

  
    // Calculate the arrow's position around the player center
    let arrowCenterX = player.x + radialDistance * Math.cos(player.angle);
    let arrowCenterY = player.y + radialDistance * Math.sin(player.angle);

    // Define the size of the arrow
    let arrowLength = 20;
    let arrowWidth = 10;

    // Calculate the end point of the arrow
    let endX = arrowCenterX + arrowLength * Math.cos(player.angle);
    let endY = arrowCenterY + arrowLength * Math.sin(player.angle);

    // Calculate the points for the base of the arrow
    let baseX1 = arrowCenterX + arrowWidth * Math.cos(player.angle - Math.PI / 2);
    let baseY1 = arrowCenterY + arrowWidth * Math.sin(player.angle - Math.PI / 2);
    let baseX2 = arrowCenterX + arrowWidth * Math.cos(player.angle + Math.PI / 2);
    let baseY2 = arrowCenterY + arrowWidth * Math.sin(player.angle + Math.PI / 2);

    // Draw the arrow
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.moveTo(baseX1, baseY1);
    ctx.lineTo(endX, endY);
    ctx.lineTo(baseX2, baseY2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawTargetLocation() {
    // draw an x where the player is aiming
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.targetX - 10, player.targetY - 10);
    ctx.lineTo(player.targetX + 10, player.targetY + 10);
    ctx.moveTo(player.targetX + 10, player.targetY - 10);
    ctx.lineTo(player.targetX - 10, player.targetY + 10);
    ctx.stroke();
    ctx.restore();
}

function drawAISolution() {
    if ((settings.AIMode>0) && (bestSol != null) && (player.shownAdvice)) {  // MS7
        // get the length of the suggested path
        let pathLength = Math.min( bestSol.interceptLocations.length, settings.AIMaxDisplayLength ); // MS7
        if (pathLength > 0) {
            // MS7
            if (settings.AIDisplayMode==0) {
                // Show where to move with lines
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // Adjust the last number for transparency 
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(player.x, player.y );
                for (let i=0; i<pathLength; i++) {
                    let transp = (i+1)/3;
                    ctx.strokeStyle = 'rgba(255, 255, 0, ' + transp + ')'; // Adjust the last number for transparency
                    let toX = bestSol.interceptLocations[i][0];
                    let toY = bestSol.interceptLocations[i][1];
                    ctx.lineTo( toX, toY );
                }
                ctx.stroke();
                ctx.restore();
            }

            // MS7: updating code with new variable
             if (settings.AIDisplayMode==1) {
                // Show a cross on where to click next 
                ctx.save();
                ctx.fillStyle = 'yellow'; // Color of the text
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // Adjust the last number for transparency
                ctx.lineWidth = 5;
                ctx.beginPath();

                ctx.moveTo(player.x, player.y );

                let i = 0;
                //for (let i=0; i<pathLength; i++) {
                    let toX = bestSol.interceptLocations[i][0];
                    let toY = bestSol.interceptLocations[i][1];
                    
                    ctx.lineTo( toX, toY ); 
                    ctx.moveTo(toX - 10, toY - 10);
                    ctx.lineTo(toX + 10, toY + 10);
                    ctx.moveTo(toX + 10, toY - 10);
                    ctx.lineTo(toX - 10, toY + 10); 

                    // Draw text
                    // Adjust the text position as needed. Here it's slightly offset from the cross.
                    //ctx.fillText(i+1, toX + 15, toY + 15); 
                //}
                ctx.stroke();
                ctx.restore();
            }
 
            // MS7
            // if (settings.AIDisplayMode==1 && settings.AIMode==2) {
                /*
            if (settings.AIDisplayMode==1) {
                // Show a cross on where to click next 
                ctx.save();
                ctx.fillStyle = 'yellow'; // Color of the text
                ctx.lineWidth = 5;
                ctx.beginPath();
            
                ctx.moveTo(player.x, player.y );

                let maxError = 600; // Adjust this value as needed
            
                let i = 0;
                let toX = bestSol.interceptLocations[i][0];
                let toY = bestSol.interceptLocations[i][1];
                
                // Calculate the error
                let error = Math.sqrt(Math.pow(player.x - toX, 2) + Math.pow(player.y - toY, 2));
                // Adjust the color based on the error
                let opacity = Math.min(1, error / maxError);
                ctx.strokeStyle = `rgba(255, 255, 0, ${opacity})`;
            
                ctx.lineTo( toX, toY ); 
                ctx.moveTo(toX - 10, toY - 10);
                ctx.lineTo(toX + 10, toY + 10);
                ctx.moveTo(toX + 10, toY - 10);
                ctx.lineTo(toX - 10, toY + 10); 
            
                ctx.stroke();
                ctx.restore();
            }
            */

            if (settings.AIDisplayMode==2) {
                // Highlight the target interception sequence 
                ctx.save();
                ctx.fillStyle = 'black'; // Color of the text
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // Adjust the last number for transparency
                ctx.lineWidth = 5;
                ctx.beginPath();

                let i = 0;
                for (let i=0; i<pathLength; i++) {
                    let indexNow = bestSol.originalIndex[i];
                    if (indexNow != -1) {
                        let toX = objects[indexNow].x;
                        let toY = objects[indexNow].y;                      
                        // Draw text
                        //ctx.fillText(i+1, toX + 25, toY + 25); 

                        // Draw an arrow to the first one
                        if (i==0) {
                            drawFilledArrow(ctx, toX - 25 , toY, 10); 
                        }
                    }
                    
                }
                ctx.stroke();
                ctx.restore();
            }
        }
    }

    // MS7
    // Some visualization debugging tools
    let showIDs = false;
    if (showIDs) {
        let numObjects = objects.length;
        for (let i=0; i<numObjects; i++) {
            // only draw the objects that are not intercepted
            if (objects[i].intercepted == false) {
                let index = objects[i].ID;
                let targetX = objects[i].x;
                let targetY = objects[i].y;
                ctx.fillStyle = 'black'; // Color of the text
                ctx.fillText(index , targetX + 15, targetY + 15);
            }          
        }
    }
}

// MS6: test function
function drawFullAISolutionDEBUG() {
    if ((settings.AIMode>0) && (sol != null)) {
        // Draw all indices
        let numObjects = objects.length;
        for (let i=0; i<numObjects; i++) {
            let index = i;
            let targetX = objects[index].x;
            let targetY = objects[index].y;
            ctx.fillStyle = 'black'; // Color of the text
            ctx.fillText(index , targetX - 25, targetY + 15);
        }

        let numSuggestions = sol.valueGoingTowardsObject.length;
        for (let i=0; i<numSuggestions; i++) {
            // Show value and index for each target
            let index = sol.originalIndexSuggestions[i];
            let value = sol.valueGoingTowardsObject[i];

            let targetX = center.x;
            let targetY = center.y;
            let valueTarget = 0;
            if (index != -1) { // Not going towards origin
                // if (objects[index] == null) {
                //     // console.log( 'test');
                // }
                targetX = objects[index].x;
                targetY = objects[index].y;
                valueTarget = objects[index].fill / objects[index].size;
            }
            ctx.fillStyle = 'black'; // Color of the text
            ctx.fillText(index , targetX + 25, targetY + 15); 
  
            ctx.fillStyle = 'green'; // Color of the text
            let str = value.toFixed(2) + ' (' + valueTarget.toFixed(2) + ')';
            ctx.fillText(str , targetX + 25, targetY - 15); 

            //if (objects.length != numSuggestions) {
            //    console.log( 'test');
            //}


            if (sol.interceptLocationTowardsObject[i] != null) {
               let toX = sol.interceptLocationTowardsObject[i][0];
               let toY = sol.interceptLocationTowardsObject[i][1];
               
               // Draw interception path for player
               ctx.save();
               ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // Adjust the last number for transparency 
               ctx.lineWidth = 5;
               // Set the dash pattern: [dashLength, gapLength]
               ctx.setLineDash([10, 15]); // Example: 10 pixels dash, 15 pixels gap
               ctx.beginPath();
               ctx.moveTo(player.x, player.y );
               ctx.lineTo( toX, toY );

               let str = value.toFixed( 2 );
               ctx.fillText(str , toX + 15, toY - 15); 

               // Draw trajectory from target to this interception point
               //let index = sol.originalIndex[i];
               //if (index != -1) {
                  //if (objects[index] == null) {
                  //    console.log( 'test');
                  //} else {                
                    ctx.lineTo( targetX, targetY );           
                  //}
                  
               //}


               ctx.stroke();
               ctx.restore();
            }
            
        }
    }
} 

// MS4: draw arrow
function drawFilledArrow(ctx, toX, toY, arrowWidth) {
    const arrowLength = arrowWidth * 4; // Adjust the length of the arrow as needed
    const headLength = arrowWidth * 0.6; // Length of the head of the arrow
    const headWidth = arrowWidth * 1.4; // Width of the head of the arrow

    // Starting points for the arrow (adjust as necessary)
    const fromX = toX - arrowLength;
    const fromY = toY;

    // Set the fill color
    //ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
    //ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // Adjust the last number for transparency
    ctx.fillStyle = 'yellow';
    //ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)'; // Adjust the last number for transparency


    // Begin a new path for the arrow
    ctx.beginPath();

    // Draw the arrow body as a rectangle
    ctx.rect(fromX, fromY - arrowWidth / 2, arrowLength - headLength, arrowWidth);

    // Draw the arrow head as a triangle
    ctx.moveTo(toX - headLength, toY - headWidth / 2);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headLength, toY + headWidth / 2);

    // Close the path and fill the arrow with the set color
    ctx.closePath();
    ctx.fill();
}

// Messaging board status + AI image type

function displayAIStatus() {
    const aiAssistRobot = document.getElementById("aiAssistRobot");
    const aiAssistRobotCaption = document.getElementById("aiAssistRobotCaption");
    if (settings.visualizeAIPlayer == 1 && currentTeamingCondition.identity == 1) {
        // aiAssistRobot.src = "./images/simple-robot-line-removebg-preview.png";
        // aiAssistRobot.src = "./images/anon-icon-250px.png";
        aiAssistRobot.src = "./images/triangle-black-250px.png"
        aiAssistRobot.style.backgroundColor = AIplayer.color;
        aiAssistRobotCaption.textContent = "Hi there, I'm your partner and will be controlling the green square! I may be a robot or a human.";
        aiAssistRobotCaption.style.opacity = "1";
        aiAssistRobotCaption.style.backgroundColor = AIplayer.color;; // Semi-transparent green
        aiAssistRobotCaption.style.fontWeight = "bold";
    } else if (settings.visualizeAIPlayer == 1 && currentTeamingCondition.identity == 0){
        aiAssistRobot.src = "./images/simple-robot-250px.png";
        aiAssistRobot.style.backgroundColor = AIplayer.color;
        aiAssistRobotCaption.textContent = "Howdy! I'm your robot partner. I'll be controlling the green square.";
        aiAssistRobotCaption.style.opacity = "1";
        aiAssistRobotCaption.style.backgroundColor = AIplayer.color;;
        // aiAssistRobotCaption.style.backgroundColor = `rgba(${AIplayer.color.match(/\d+/g).slice(0,3).join(', ')}, 0.5)`; // Semi-transparent version of AIplayer color
        aiAssistRobotCaption.style.fontWeight = "bold";
    } else if (settings.visualizeHumanPartner == 1 && currentTeamingCondition.identity == 0){
        aiAssistRobot.src =  "./images/human-head-small.png";
        aiAssistRobot.style.backgroundColor = player2.color;
        aiAssistRobotCaption.textContent = "Howdy! I'm your human partner. I'll be controlling the green square.";
        aiAssistRobotCaption.style.opacity = "1";
        aiAssistRobotCaption.style.backgroundColor = player2.color;;
        // aiAssistRobotCaption.style.backgroundColor = `rgba(${AIplayer.color.match(/\d+/g).slice(0,3).join(', ')}, 0.5)`; // Semi-transparent version of AIplayer color
        aiAssistRobotCaption.style.fontWeight = "bold";
    } else if (settings.visualizeHumanPartner == 1 && currentTeamingCondition.identity == 1){
        // aiAssistRobot.src = "./images/anon-icon-250px.png";
        aiAssistRobot.src = "./images/triangle-black-250px.png"
        aiAssistRobot.style.backgroundColor = player2.color;
        aiAssistRobotCaption.textContent = "Hi there, I'm your partner and will be controlling the green square! I may be a real human or a robot.";
        aiAssistRobotCaption.style.opacity = "1";
        aiAssistRobotCaption.style.backgroundColor = player2.color;;
        // aiAssistRobotCaption.style.backgroundColor = `rgba(${AIplayer.color.match(/\d+/g).slice(0,3).join(', ')}, 0.5)`; // Semi-transparent version of AIplayer color
        aiAssistRobotCaption.style.fontWeight = "bold";
    }
}

function drawLight(randChoice) {
    const size = 25;
    const numberOfSides = 5; // For a pentagon
    let Xcenter;
    let Ycenter;

    if (randChoice == 0) {
        Xcenter = 40;
        Ycenter = 40;
    } else if (randChoice == 1) {
        Xcenter = 40;
        Ycenter = 760;
    } else if (randChoice == 2) {
        Xcenter = 760;
        Ycenter = 40;
    } else {
        Xcenter = 760;
        Ycenter = 760;
    }

    ctx.beginPath();
    ctx.moveTo (Xcenter +  size * Math.cos(0 - Math.PI / 2), Ycenter +  size *  Math.sin(0 - Math.PI / 2));          

    for (let side = 0; side <= numberOfSides; side++) {
        ctx.lineTo (Xcenter + size * Math.cos(side * 2 * Math.PI / numberOfSides - Math.PI / 2), Ycenter + size * Math.sin(side * 2 * Math.PI / numberOfSides - Math.PI / 2));
    }

    ctx.fillStyle = isLightOn ? 'rgb(255,128,237)' : 'rgba(0, 0, 0, 0)'; // This is transparent black
    ctx.fill();
}

function showTargetMessage(isCaught) {
    var messageBox = document.getElementById('messageBox');
    var gameMessage = document.getElementById('gameMessage');
  
    messageBox.style.display = 'block'; // Show the message box
    gameMessage.textContent = isCaught ? 'Target Caught!' : 'Target Missed!'; // Set the message
  
    // Optionally, hide the message after a delay
    setTimeout(function() {
      messageBox.style.display = 'none';
    }, 2000); // Hide the message after 2 seconds
}

// Custom alert message in order to pause the game and display text
function showCustomAlert(message) {
    // document.getElementById('customAlertMessage').innerText = message;
    // document.getElementById('customAlert').style.display = 'flex';

    return new Promise((resolve, reject) => {
        // Display the custom alert with the message
        $('#customAlertMessage').text(message);
        $('#customAlert').show();
    
        // Set up the event handlers for the 'X' and 'OK' buttons
        $('#customAlert .custom-alert-close, #customAlert button').one('click', function() {
            $('#customAlert').hide();
            resolve(); // This resolves the Promise allowing code execution to continue
        });
    });
}

// Display message about waitnig for other player
function waitForRemotePlayer() {
    return new Promise(resolve => {
        console.log("Waiting for remote player to complete AI round...");
        
        // If remote player is already ready, resolve immediately
        if (remoteComplete) {
            console.log("Remote player already completed AI round");
            resolve();
            return;
        }
        
        // Otherwise, set up a checking interval
        const checkInterval = setInterval(() => {
            if (remoteComplete) {
                clearInterval(checkInterval);
                console.log("Remote player now completed AI round");
                resolve();
            } else {
                console.log("Still waiting for remote player...");
                // Optionally refresh the remote status directly
                const remotePath = `players/${remoteId}`;
                readState(remotePath).then(data => {
                    if (data && data.AIcomplete) {
                        remoteComplete = data.AIcomplete;
                    }
                });
            }
        }, 1000);
    });
}

// Custom waiting alert for syncing with other player - auto-dismisses when no longer paused
function waitingForPlayerAlert(message) {
    return new Promise((resolve) => {
        // Display the custom alert with the message
        $('#customAlertMessage').text(message);
        
        // Hide the close button and OK button
        $('#customAlert .custom-alert-close').hide();
        $('#customAlert button').hide();
        
        // Show the alert
        $('#customAlert').show();
        
        // Add a loading spinner
        const loadingSpinner = $('<div class="loading-spinner"></div>');
        $('#customAlertMessage').after(loadingSpinner);
        
        // Add CSS for the spinner if it doesn't exist
        if (!$('#waiting-spinner-style').length) {
            $('head').append(`
                <style id="waiting-spinner-style">
                    .loading-spinner {
                        border: 5px solid #f3f3f3;
                        border-top: 5px solid #3498db;
                        border-radius: 50%;
                        width: 30px;
                        height: 30px;
                        margin: 20px auto;
                        animation: spin 2s linear infinite;
                    }
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `);
        }
        
        // Set up polling interval to check isPaused status
        const checkPausedStatus = setInterval(() => {
            if (!isPaused) {
                // Game is no longer paused, close the alert
                clearInterval(checkPausedStatus);
                $('#customAlert').hide();
                $('.loading-spinner').remove();
                $('#customAlert .custom-alert-close').show();
                $('#customAlert button').show();
                resolve();
            }
        }, 500); // Check every 500ms
    });
}

function closeCustomAlert() {
    document.getElementById('customAlert').style.display = 'none';
}
// *************************************** INTERCEPTION ALGORITHMS ********************************** //
// Intercept Function for the Player
function attemptInterceptLocal(playerPosX, playerPosY, playerSpeed, objectPosX, objectPosY, objectVelX, objectVelY, circleRadius) {
    let success = false;
    let travelTime = Infinity;
    let interceptPosX = NaN;
    let interceptPosY = NaN;
    let totalDistanceTraveled = Infinity;

    // Check if the object is within the circle initially
    if (Math.sqrt(objectPosX ** 2 + objectPosY ** 2) > circleRadius) {
        return [ success, travelTime, interceptPosX, interceptPosY, totalDistanceTraveled ];
    }

    // Initial relative position from the player to the object
    let relativePosX = objectPosX - playerPosX;
    let relativePosY = objectPosY - playerPosY;

    // Solving quadratic equation
    let A = objectVelX ** 2 + objectVelY ** 2 - playerSpeed ** 2;
    let B = 2 * (relativePosX * objectVelX + relativePosY * objectVelY);
    let C = relativePosX ** 2 + relativePosY ** 2;

    let discriminant = B ** 2 - 4 * A * C;

    if (discriminant < 0) {
        // No real solutions, interception not possible
        return [ success, travelTime, interceptPosX, interceptPosY, totalDistanceTraveled ];
    }

    // Calculate potential times for interception
    let t1 = (-B + Math.sqrt(discriminant)) / (2 * A);
    let t2 = (-B - Math.sqrt(discriminant)) / (2 * A);

    // Determine the valid and earliest interception time
    if (t1 >= 0 && (t1 < t2 || t2 < 0)) {
        travelTime = t1;
    } else if (t2 >= 0) {
        travelTime = t2;
    } else {
        // No valid interception time found
        return [ success, travelTime, interceptPosX, interceptPosY, totalDistanceTraveled ];
    }

    interceptPosX = objectPosX + travelTime * objectVelX;
    interceptPosY = objectPosY + travelTime * objectVelY;
    totalDistanceTraveled = travelTime * playerSpeed;

    // Check if the intercept position is within the circle
    if (Math.sqrt(interceptPosX ** 2 + interceptPosY ** 2) <= circleRadius) {
        success = true;
    }

    if ((travelTime == null) | (interceptPosX== null) | ( interceptPosX==null) |
       (totalDistanceTraveled == null) | (success==null)) {
        if (DEBUG) console.log( 'Null values');
    }

    return [ success, travelTime, interceptPosX, interceptPosY, totalDistanceTraveled ];
}

// Prediction of interception accross all targets
function willSquareAndCircleOverlap(x1, y1, vx1, vy1, r1, x2, y2, vx2, vy2, r2, timeToIntercept) {
    // Function to calculate the square's corners at time t
    function getSquareCorners(x, y, r, t) {
        const halfR = r / 2;
        return [
            { x: x + halfR, y: y + halfR },
            { x: x + halfR, y: y - halfR },
            { x: x - halfR, y: y + halfR },
            { x: x - halfR, y: y - halfR }
        ].map(corner => ({
            x: corner.x + vx1 * t,
            y: corner.y + vy1 * t
        }));
    }

    // Function to calculate the circle's center at time t
    function getCircleCenter(x, y, t) {
        return {
            x: x + vx2 * t,
            y: y + vy2 * t
        };
    }

    // Function to calculate distance from point to line segment
    function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        if (lineLength === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

        const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (lineLength ** 2)));
        const closestX = x1 + t * (x2 - x1);
        const closestY = y1 + t * (y2 - y1);
        return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    }

    // Check overlap at time t
    function checkOverlap(t) {
        if (t < 0 || t > timeToIntercept) return false;

        const circle = getCircleCenter(x2, y2, t);
        const squareCorners = getSquareCorners(x1, y1, r1, t);
        const halfR = r1 / 2;

        // Check distance to all corners
        for (const corner of squareCorners) {
            const dist = Math.sqrt((circle.x - corner.x) ** 2 + (circle.y - corner.y) ** 2);
            if (dist <= r2) {
                return true;
            }
        }

        // Check distance to edges
        const edges = [
            { x1: x1 - halfR, y1: y1 - halfR, x2: x1 + halfR, y2: y1 - halfR },
            { x1: x1 + halfR, y1: y1 - halfR, x2: x1 + halfR, y2: y1 + halfR },
            { x1: x1 + halfR, y1: y1 + halfR, x2: x1 - halfR, y2: y1 + halfR },
            { x1: x1 - halfR, y1: y1 + halfR, x2: x1 - halfR, y2: y1 - halfR }
        ].map(edge => ({
            x1: edge.x1 + vx1 * t,
            y1: edge.y1 + vy1 * t,
            x2: edge.x2 + vx1 * t,
            y2: edge.y2 + vy1 * t
        }));

        for (const edge of edges) {
            const dist = pointToSegmentDistance(circle.x, circle.y, edge.x1, edge.y1, edge.x2, edge.y2);
            if (dist <= r2) {
                return true;
            }
        }

        return false;
    }

    // Solve quadratic equation to find potential times of overlap
    const a = (vx1 - vx2) ** 2 + (vy1 - vy2) ** 2;
    const b = 2 * ((x1 - x2) * (vx1 - vx2) + (y1 - y2) * (vy1 - vy2));
    const c = (x1 - x2) ** 2 + (y1 - y2) ** 2 - (r1 / 2 + r2) ** 2;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
        return false;
    }

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDiscriminant) / (2 * a);
    const t2 = (-b + sqrtDiscriminant) / (2 * a);

    // Check if overlap occurs at any potential time points within the stopping time
    return checkOverlap(t1) || checkOverlap(t2) || checkOverlap(0);
}

function splitGameHalf(obj) {
    // Center of the game view
    const center = { x: canvas.width / 2, y: canvas.height / 2 };

    // Calculate the angle between the player and the center
    let playerAngle = Math.atan2(center.y - player.y, center.x - player.x);

    // Calculate the orthogonal angle (90 degrees or PI/2 radians)
    let orthoAngle = playerAngle + Math.PI / 2;

    // Calculate the angle between the object and the center
    let objAngle = Math.atan2(obj.y - center.y, obj.x - center.x);

    // Normalize angles to range [0, 2*PI)
    function normalizeAngle(angle) {
        return (angle + 2 * Math.PI) % (2 * Math.PI);
    }

    let normalizedObjAngle = normalizeAngle(objAngle);
    let normalizedPlayerAngle = normalizeAngle(playerAngle);
    let normalizedOrthoAngle = normalizeAngle(orthoAngle);

    // Check if object is in the player's allotted pi region
    let angleDifference = Math.abs(normalizedObjAngle - normalizedPlayerAngle);

    // Determine if the object is on the left or right side of the orthogonal line
    let isInPlayerHalf = angleDifference < Math.PI / 2 || angleDifference > (3 * Math.PI) / 2;

    // if (DEBUG) {
    //     // Function to draw the orthogonal line for debugging
    //     function drawPlayerHalfDEBUG() {
    //         let orthoLineX = player.x + 100 * Math.cos(orthoAngle); // arbitrary length
    //         let orthoLineY = player.y + 100 * Math.sin(orthoAngle); // arbitrary length
    //         // Implement your drawing logic here
    //         console.log(`Drawing orthogonal line to (${orthoLineX}, ${orthoLineY})`);
    //     }

    //     drawPlayerHalfDEBUG();
    // }

    return isInPlayerHalf;
}

// ***************************************** EVENT LISTENERS ***************************************** //
let lastClickedObj = null;
$(document).ready( function(){
   // Event listener for player click locations
   canvas.addEventListener('click', function(event) {
        // Get the position of the click relative to the canvas
        // Check not first click so that initializing game doesn't leed to player movement
        const rect   = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Calculate the angle from the player to the click position
        const deltaX = clickX - (player.x + player.width / 2);
        const deltaY = clickY - (player.y + player.height / 2);
        player.angle = Math.atan2(deltaY, deltaX);

        // console.log('Player clicked:', clickX, clickY);
        let playerStartX = 0;
        let playerStartY = 0;

        let objectStartX = 0;
        let objectStartY = 0;

        let objectVelX = 0;
        let objectVelY = 0;

        let success, travelTime, interceptPosX, interceptPosY, totalDistanceTraveled = 0;

        // Extract the game state for the click and then push into the playerClicks dataframe
        let gameSnapshot = extractGameState(objects);
        // if (DEBUG) console.log('gameSnapshot:', gameSnapshot);  

        // check if player clicked on a target
        for (let i = 0; i < objects.length; i++) {
            if (isClickOnObject(objects[i], clickX, clickY)) {
                // The click is on this object
                objects[i].clicked = true;
                objects[i].marked = true;

                // unmark the previous target object
                for (let j = 0; j < objects.length; j++) {
                    if (i !== j) {
                        objects[j].marked = false;
                    }
                }

                playerStartX = ( player.x - center.x );
                playerStartY = ( player.y - center.y );

                objectStartX = ( objects[i].x - center.x );
                objectStartY = ( objects[i].y - center.y );

                objectVelX = objects[i].vx * objects[i].speed;
                objectVelY = objects[i].vy * objects[i].speed;


                // ********* CALCULATE THE DELAY IN PLANNING ********* //

                // num frames it took to make a new target choice 
                // if (player.targetObjID != null && player.targetObjID != objects[i].ID) { // add a delay variable when a new object is clicked
                if (!player.moving){ // only clicks that happen when the player is not moving
                    // console.log("number delays", clickTimes.length);
                    // console.log("Number of Frames Player not Moving", numFramesPlayernotMoving)
                    clickTimes.push(numFramesPlayernotMoving);
                 
                    let lastNumClicks = 5;  
                    avgResponseTime = getExponentialMovingAverage(lastNumClicks);
                    // console.log("Average Response Time", avgResponseTime); 
                }        

                planDelayFrames = Math.floor(avgResponseTime);

                // ********* -------------------- ********* //

                let circleRadius = 390;

                [success, travelTime, interceptPosX, 
                interceptPosY, totalDistanceTraveled] = attemptInterceptLocal(playerStartX,playerStartY, player.velocity, 
                                                        objectStartX, objectStartY, objectVelX, objectVelY, circleRadius);


                // Make sure these vars are first updated to mplib/firebase and then create assignments
                // Intercept the clicked object using the optimal intercept location
                // Firebase function handler should be leading these reassignments.
                player.targetX = interceptPosX + center.x; //+ center.x;
                player.targetY = interceptPosY + center.y; //+ center.y;
                player.moving = true;
                player.targetObjID = objects[i].ID;
                player.timeToIntercept = travelTime;

                console.log("player's new target location:", player.targetX, player.targetY);

                // ********* Update location to firebase for remote partner ********* //
                // let pathBase = `players/${player.fbID}/${frameCountGame}/location`;
                let pathBase = `players/${player.fbID}/${frameCountGame}/targetLocation`
                updateStateDirect(`${pathBase}/x`, player.targetX, 'targetLocation_'+roundID);
                updateStateDirect(`${pathBase}/y`, player.targetY, 'targetLocation_'+roundID);

                pathBase = `players/${player.fbID}/${frameCountGame}/playerIntention`
                updateStateDirect(`${pathBase}/ID`, player.targetObjID, 'playerIntention_'+roundID);
                console.log("player.targetObjID:", player.targetObjID);

                pathBase = `players/${player.fbID}/${frameCountGame}/velocity`
                updateStateDirect(`${pathBase}/dx`, player.dx, 'velocity_'+roundID);
                updateStateDirect(`${pathBase}/dy`, player.dy, 'velocity_'+roundID);
                updateStateDirect(`${pathBase}/moving`, player.moving, 'moving_'+roundID);   
                updateStateDirect(`${pathBase}/frame`, frameCountGame, 'frame_'+roundID);
                updateStateDirect(`${pathBase}/sentTime`, Date.now(), 'sentTime_'+roundID);


                // (Sanity Check) Only in the case that the object speed is beyond the player speed 
                if (totalDistanceTraveled == Infinity){
                    if (DEBUG) console.log('No interception possible');
                    objects[i].innerColor = 'red'
                }
                
                if (DEBUG) console.log("frames player not moving", numFramesPlayernotMoving);
                if (DEBUG) console.log("ai frame delay relative to human :", planDelayFrames);

                // Values for writing to dataframe
                let objectData      = {ID: objects[i].ID, value: objects[i].value,
                                    x: objects[i].x, y: objects[i].y,
                                    dx: objects[i].dx, dy: objects[i].dy,
                                    vx: objects[i].vx, vy: objects[i].vy, speed: objects[i].speed,
                                    clicked: objects[i].clicked, marked: objects[i].marked, AImarked: objects[i].AImarked};

                let playerData      = {x: player.x, y: player.y, speed: player.velocity, 
                                    dx: player.dx, dy: player.dy,
                                    targetX: player.targetX, targetY: player.targetY,
                                    angle: player.angle, moving: player.moving,
                                    score:player.score, AIscore: AIplayer.score, 
                                    playerDelay: numFramesPlayernotMoving, AIplayerDelay: planDelayFrames};

                let interceptData   = {x: interceptPosX, y: interceptPosY, time: travelTime, distance: totalDistanceTraveled,  
                                        intendedTarget: player.targetObjID, AIintendedTarget: AIplayer.ID};
                // let drtStatus       = {isOn: isLightOn, duration: drtCount, initFrame:drtInitFrame, location:drtLightChoice}; // consider adding more to this
                let eventType       = 'clickObject';

                // collapse the 4 object events (spawning, collision, clicking, exiting) into one 1 dataframe
                let eventObject     = {time: frameCountGame, eventType: eventType, 
                                    objectData: objectData, playerData: playerData, 
                                    interceptData: interceptData, gameState: gameSnapshot};

                eventStream.push(eventObject)
            }  
            // if click is around the center, then allow movement there
            if ( isClickOnCenter(clickX,clickY) ) {
                player.targetX = 400;
                player.targetY = 400;
                player.moving = true;
                player.toCenter = true;
                player.targetObjID = -1;

                let pathBase = `players/${player.fbID}/${frameCountGame}/playerIntention`
                updateStateDirect(`${pathBase}/ID`, player.targetObjID, 'playerIntention_'+roundID);
                console.log("player.targetObjID:", player.targetObjID);

                let eventType       = 'clickCenter';
                // let objectData      = 0;

                let objectData      = {ID:0, value:0,
                                    x: center.x, y: center.y,
                                    dx: 0, dy: 0,
                                    vx: 0, vy: 0, speed: 0,
                                    clicked: true, marked: true};

                let playerData      = {x: player.x, y: player.y, speed: player.velocity, 
                                    dx: player.dx, dy: player.dy,
                                    targetX: player.targetX, targetY: player.targetY,
                                    angle: player.angle, moving: player.moving,
                                    score:player.score, AIscore: AIplayer.score};
                let interceptData   = null;
                // let drtStatus       = {isOn: isLightOn, duration: drtCount, initFrame:drtInitFrame, location:drtLightChoice}; // consider adding more to this

                // collapse the 4 object events (spawning, collision, clicking, exiting) into one 1 dataframe
                let eventObject     = {time: frameCountGame, eventType: eventType, 
                                    objectData: objectData, playerData: playerData, 
                                    interceptData: interceptData, gameState: gameSnapshot};

                eventStream.push(eventObject)

                // if (DEBUG) console.log('Center Click eventObject:', eventObject);

            } else{
                player.toCenter = false;
            }
        }

        // If there is a click on an object --> mark it as such, have null case when person doesn't click on any object
        // playerClicks.push({frame:frameCountGame, targetX:clickX, targetY:clickY, curX:player.x, 
        //     curY:player.y, aiX:firstStep.x, aiY:firstStep.y, id:firstStep.ID});
    });

    window.closeCustomAlert = closeCustomAlert; // Add closeCustomAlert to the global scope
});

async function runGameSequence(message) {
    isPaused = true;
    await showCustomAlert(message);
    isPaused = false;
}

function startCountdown(secondsLeft) {
    return new Promise((resolve) => {
        // Create a brand new countdown display that overlays everything
        let overlayCountdown = document.getElementById('overlay-countdown');
        if (!overlayCountdown) {
            overlayCountdown = document.createElement('div');
            overlayCountdown.id = 'overlay-countdown';
            overlayCountdown.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #f8f9fa;
                border-radius: 10px;
                padding: 40px;
                z-index: 10000;
                box-shadow: 0 0 20px rgba(0,0,0,0.3);
                text-align: center;
                min-width: 600px;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
            `;
            document.body.appendChild(overlayCountdown);
        }

        if (currentTeamingCondition.identity == 0){
            overlayCountdown.innerHTML = `
                <div class="countdown-text" style="font-size: 1.5em; color: #34495e;">
                    <p>Your game will begin in:</p>
                    <div style="font-size: 2.5em; font-weight: bold; color: #e74c3c; margin: 20px 0;">
                        ${secondsLeft} seconds
                    </div>
                </div>
                <div style="font-size: 2em; color: #34495e; margin-bottom: 2em;">
                    <p style="font-size: 2.5em; font-weight: bold; color: #e74c3c; text-transform: uppercase; text-align: center; margin: 30px 0;">⚠️ Important! ⚠️</p>
                    <p>There will be one round with a real human and one with a real robot.</p>
                    <p>The identity of each player will be apparent.</p>
                    <p>Your human partner is an actual human.</p>
                    <p>The robot is a real robot.</p>
                </div>
            `;
        } else {
            overlayCountdown.innerHTML = `
                <div class="countdown-text" style="font-size: 1.5em; color: #34495e;">
                    <p>Your game will begin in:</p>
                    <div style="font-size: 2.5em; font-weight: bold; color: #e74c3c; margin: 20px 0;">
                        ${secondsLeft} seconds
                    </div>
                </div>
                <div style="font-size: 2em; color: #34495e; margin-bottom: 2em;">
                    <p style="font-size: 2.5em; font-weight: bold; color: #e74c3c; text-transform: uppercase; text-align: center; margin: 30px 0;">⚠️ Important! ⚠️</p>
                    <p>There will be one round with a real human and one with a real robot.</p>
                    <p>However, the identity of each player will remain ambiguous: You will be unsure if the human is human or the robot is a robot.</p>
                </div>
            `;
        }

        // Countdown logic
        const interval = setInterval(() => {
            secondsLeft--;
            if (secondsLeft <= 0) {
                clearInterval(interval);
                overlayCountdown.remove();
                resolve(); // Resolve the promise when countdown is complete
            } else {
                overlayCountdown.querySelector('.countdown-text div').textContent = `${secondsLeft} seconds`;
            }
        }, 1000);
    });
}

// Helper function to determine if the click is on the object
function isClickOnObject(obj, x, y) {
    // Calculate the center of the object
    const centerX = obj.x + obj.size / 2;
    const centerY = obj.y + obj.size / 2;

    // Calculate the distance between the click and the object's center
    const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

    // Check if the distance is less than or equal to the cursor size
    return distance <= cursorSize;
}

// Helper function to determine if the click is on the center
function isClickOnCenter(clickX,clickY){
    if ( Math.abs(clickX - center.x) <= 10 && Math.abs(clickY - center.y) <= 10 ){
        return true;
    }
}

//***************************************************** AI COMPARISON ***************************************************//

// async function loadAIComparison() {
//     var DEBUG_SURVEY = DEBUG;

//     // Survey Information
//     var TOPIC_AI_COMPARISON_DICT = {
//         "selectedAI": null,
//     };

//     // Clear previous inputs
//     // Clear previous inputs and classes
//     $('#ai-1-button').removeClass('robot-button-selected robot-button-iron robot-button-copper robot-button-green robot-button-purple robot-button-brown robot-button-blue');
//     $('#ai-2-button').removeClass('robot-button-selected robot-button-iron robot-button-copper robot-button-green robot-button-purple robot-button-brown robot-button-blue');
//     $('#survey-complete-button-comparison').prop('disabled', true);
//     // $('#ai-1-button').removeClass('robot-button-selected');
//     // $('#ai-2-button').removeClass('robot-button-selected');
//     // $('#survey-complete-button-comparison').prop('disabled', true);

//      // max targets is 5 first, then 15
//      if (visitedBlocks == 1 && currentCondition <= 4) { // takse us to the correct survey ... 
//         $('#ai-1-button').addClass('robot-button-green');
//         $('#ai-2-button').addClass('robot-button-purple');
//         $('#ai-1-button').next('figcaption').text('Green-Bot');
//         $('#ai-2-button').next('figcaption').text('Purple-Bot');
//     } else if (visitedBlocks == 2 && currentCondition <= 4 ) {
//         // $('#ai-1-button').addClass('robot-button-iron');
//         $('#ai-1-button').addClass('robot-button-blue');
//         $('#ai-2-button').addClass('robot-button-copper');
//         $('#ai-1-button').next('figcaption').text('Blue-Bot');
//         $('#ai-2-button').next('figcaption').text('Copper-Bot');
//     }

//     // max targets is 15 first, then 5
//     if (visitedBlocks == 1 && currentCondition > 4) { // takes us to the correct survey
//         // $('#ai-1-button').addClass('robot-button-iron');
//         $('#ai-1-button').addClass('robot-button-blue');
//         $('#ai-2-button').addClass('robot-button-copper');
//         $('#ai-1-button').next('figcaption').text('Blue-Bot');
//         $('#ai-2-button').next('figcaption').text('Copper-Bot');
//     } else if (visitedBlocks == 2 && currentCondition > 4) {
//         $('#ai-1-button').addClass('robot-button-green');
//         $('#ai-2-button').addClass('robot-button-purple');
//         $('#ai-1-button').next('figcaption').text('Green-Bot');
//         $('#ai-2-button').next('figcaption').text('Purple-Bot');
//     }


//     $(document).ready(function () {
       

//         function handleAISelection() {
//             /*
//                 Image Button Selection Controller.

//                 Only one AI option can be selected.
//                 Enable the submit button once an AI is selected.
//             */
//             // Retrieve the current AI that was selected
//             let selectedAI = $(this).attr("id");

//             if (selectedAI === 'ai-1-button') {
//                 $('#ai-1-button').addClass('robot-button-selected');
//                 $('#ai-2-button').removeClass('robot-button-selected');
//                 TOPIC_AI_COMPARISON_DICT["selectedAI"] = agent1Name;
//             } else {
//                 $('#ai-2-button').addClass('robot-button-selected');
//                 $('#ai-1-button').removeClass('robot-button-selected');
//                 TOPIC_AI_COMPARISON_DICT["selectedAI"] = agent2Name;
//             }

//             // Enable the submit button
//             $('#survey-complete-button-comparison').prop('disabled', false);

//             if (DEBUG) {
//                 console.log("AI Button Selected\n:", "Value :", TOPIC_AI_COMPARISON_DICT["selectedAI"]);
//             }
//         }

//         async function completeExperiment() {
//             /*
//                 When submit button is clicked, the experiment is done.

//                 This will submit the final selection and then load the
//                 "Experiment Complete" page.
//             */
//             let SURVEY_END_TIME = new Date();

//             // Write to database based on the number of surveys completed
//             // numSurveyCompleted++;
//             // AIComparisonComplete = True
            
//             if (numSurveyCompleted == 1) {
//                 let path = studyId + '/participantData/' + firebaseUserId1 + '/selfAssessment/AIcomparison1' ;
//                 // await writeRealtimeDatabase(db1, path, TOPIC_AI_COMPARISON_DICT);
//                 $("#ai-comparison-container").attr("hidden", true);
//                 // $("#full-game-container").attr("hidden", false);
//                 $("#ai-open-ended-feedback-container").attr("hidden", false);
//                 loadAIopenEndedFeedback(numSurveyCompleted);
                
//             } else if (numSurveyCompleted == 2) {
//                 let path = studyId + '/participantData/' + firebaseUserId1 + '/selfAssessment/AIcomparison2' ;
//                 // await writeRealtimeDatabase(db1, path, TOPIC_AI_COMPARISON_DICT);
//                 $("#ai-comparison-container").attr("hidden", true);
//                 // $("#full-game-container").attr("hidden", false);
//                 $("#ai-open-ended-feedback-container").attr("hidden", false);
//                 await loadAIopenEndedFeedback(numSurveyCompleted);
//                 // push them to the final page of the experiment which redirects participants
//                 // await runGameSequence("Congratulations on Finishing the Main Experiment! Click OK to Continue to the Feedback Survey.");
//                 // finalizeBlockRandomization(db1, studyId, currentCondition);
//                 // // finalizeBlockRandomization(db1, studyId, curSeeds);
//                 // $("#ai-comparison-container").attr("hidden", true);
//                 // $("#task-header").attr("hidden", true);
//                 // $("#exp-complete-header").attr("hidden", false);
//                 // $("#complete-page-content-container").attr("hidden", false);
//                 // await loadCompletePage();
//                 // $('#task-complete').load('html/complete.html');
//             } 
//         }

//         // Handle AI selection for both buttons
//         $('#ai-1-button').click(handleAISelection);
//         $('#ai-2-button').click(handleAISelection);

//         // Handle submitting survey
//         $('#survey-complete-button-comparison').off().click(completeExperiment);
//     });
// }
async function loadAIComparison() {
    var DEBUG_SURVEY = DEBUG;

    // Survey Information
    var TOPIC_AI_COMPARISON_DICT = {
        "selectedAI": null,
    };

    // Clear previous inputs and classes
    $('#ai-1-button').removeClass('robot-button-selected robot-button-iron robot-button-copper robot-button-green robot-button-purple robot-button-brown robot-button-blue');
    $('#ai-2-button').removeClass('robot-button-selected robot-button-iron robot-button-copper robot-button-green robot-button-purple robot-button-brown robot-button-blue');
    $('#survey-complete-button-comparison').prop('disabled', true);

    // Update AI comparison icons
    updateAIComparisonIcons();

    $(document).ready(function () {
        function handleAISelection() {
            /*
                Image Button Selection Controller.

                Only one AI option can be selected.
                Enable the submit button once an AI is selected.
            */
            // Retrieve the current AI that was selected
            let selectedAI = $(this).attr("id");

            if (selectedAI === 'ai-1-button') {
                $('#ai-1-button').addClass('robot-button-selected');
                $('#ai-2-button').removeClass('robot-button-selected');
                TOPIC_AI_COMPARISON_DICT["selectedAI"] = agent1Name;
            } else {
                $('#ai-2-button').addClass('robot-button-selected');
                $('#ai-1-button').removeClass('robot-button-selected');
                TOPIC_AI_COMPARISON_DICT["selectedAI"] = agent2Name;
            }

            // Enable the submit button
            $('#survey-complete-button-comparison').prop('disabled', false);

            if (DEBUG) {
                console.log("AI Button Selected\n:", "Value :", TOPIC_AI_COMPARISON_DICT["selectedAI"]);
            }
        }

        async function completeExperiment() {
            /*
                When submit button is clicked, the experiment is done.

                This will submit the final selection and then load the
                "Experiment Complete" page.
            */
            let SURVEY_END_TIME = new Date();

            if (numSurveyCompleted == 1) {
                let path = studyId + '/participantData/' + firebaseUserId1 + '/selfAssessment/AIcomparison1';
                $("#ai-comparison-container").attr("hidden", true);
                $("#ai-open-ended-feedback-container").attr("hidden", false);
                loadAIopenEndedFeedback(numSurveyCompleted);
            } else if (numSurveyCompleted == 2) {
                let path = studyId + '/participantData/' + firebaseUserId1 + '/selfAssessment/AIcomparison2';
                $("#ai-comparison-container").attr("hidden", true);
                $("#ai-open-ended-feedback-container").attr("hidden", false);
                await loadAIopenEndedFeedback(numSurveyCompleted);
            }
        }

        // Handle AI selection for both buttons
        $('#ai-1-button').click(handleAISelection);
        $('#ai-2-button').click(handleAISelection);

        // Handle submitting survey
        $('#survey-complete-button-comparison').off().click(completeExperiment);
    });
}

async function loadAIopenEndedFeedback(numSurveyCompleted) {
    var DEBUG_SURVEY = DEBUG;
    // var numSurveyCompleted = 0; // Assuming this variable is defined somewhere in your global scope

    $(document).ready(function () {
        // Clear previous inputs
        $('#ai-feedback-text').val('');
        $('#submit-feedback-button').prop('disabled', true);

        $('#ai-feedback-text').on('input', function () {
            // Enable the submit button if there's any text in the feedback
            if ($(this).val().trim() !== '') {
                $('#submit-feedback-button').prop('disabled', false);
            } else if (DEBUG_SURVEY){
                $('#submit-feedback-button').prop('disabled', false);
            } else {
                $('#submit-feedback-button').prop('disabled', true);
            }
        });

        async function completeExperiment() {
            /*
                When submit button is clicked, submit the feedback and load the complete page.
            */
            let feedback = $('#ai-feedback-text').val().trim();
            let feedbackData = {
                feedback: feedback,
                timestamp: new Date().toISOString()
            };

            // // Example of writing the feedback to the database
            // let path = studyId + '/participantData/' + firebaseUserId1 + '/AIopenEndedFeedback';
            // await writeRealtimeDatabase(db1, path, feedbackData);
            
            if (numSurveyCompleted == 1) {
                let path = studyId + '/participantData/' + firebaseUserId1 + '/selfAssessment/OpenEnded1' ;
                // await writeRealtimeDatabase(db1, path, feedbackData);
            } else if (numSurveyCompleted == 2) {
                let path = studyId + '/participantData/' + firebaseUserId1 + '/selfAssessment/OpenEnded2' ;
                // await writeRealtimeDatabase(db1, path, feedbackData);
            }

            if (numSurveyCompleted == 2) {
                // push them to the final page of the experiment which redirects participants
                $("#ai-open-ended-feedback-container").attr("hidden", true);
                $("#task-header").attr("hidden", true);
                $("#exp-complete-header").attr("hidden", false);
                $("#complete-page-content-container").attr("hidden", false);
                // finalizeBlockRandomization(db1, studyId, blockOrderCondition);
                // finalizeBlockRandomization(db1, studyId, teamingBlockCondition);
                await loadCompletePage();
            } else {
                // update AI order settings
                await updateAgentOrdering();
                $("#ai-open-ended-feedback-container").attr("hidden", true);
                $("#full-game-container").attr("hidden", false);
            }
        }

        // Handle submitting feedback
        $('#submit-feedback-button').off().click(completeExperiment);
    });
}

function updateAIComparisonIcons() {
    let ai1Button = $('#ai-1-button');
    let ai2Button = $('#ai-2-button');
    let ai1Caption = ai1Button.next('figcaption');
    let ai2Caption = ai2Button.next('figcaption');

    // Remove any existing color classes
    ai1Button.removeClass('robot-button-green robot-button-purple robot-button-blue robot-button-copper');
    ai2Button.removeClass('robot-button-green robot-button-purple robot-button-blue robot-button-copper');

    // Update icons and captions based on visitedBlocks and currentCondition
    if (visitedBlocks == 1 && currentCondition <= 4) {
        ai1Button.addClass('robot-button-green');
        ai2Button.addClass('robot-button-purple');
        ai1Caption.text('Green-Bot');
        ai2Caption.text('Purple-Bot');
    } else if (visitedBlocks == 2 && currentCondition <= 4) {
        ai1Button.addClass('robot-button-blue');
        ai2Button.addClass('robot-button-copper');
        ai1Caption.text('Blue-Bot');
        ai2Caption.text('Copper-Bot');
    } else if (visitedBlocks == 1 && currentCondition > 4) {
        ai1Button.addClass('robot-button-blue');
        ai2Button.addClass('robot-button-copper');
        ai1Caption.text('Blue-Bot');
        ai2Caption.text('Copper-Bot');
    } else if (visitedBlocks == 2 && currentCondition > 4) {
        ai1Button.addClass('robot-button-green');
        ai2Button.addClass('robot-button-purple');
        ai1Caption.text('Green-Bot');
        ai2Caption.text('Purple-Bot');
    }
}


//**************************************************** SURVEY -- FULL ****************************************************//
// Define questions array at the top level
const questions = [
    { id: 'q01', text: 'The other player and I were a team.' },
    { id: 'q02', text: 'The other player was competent.' },
    { id: 'q03', text: 'I understood the other player\'s intentions.' },
    { id: 'q04', text: 'The other player understood my intentions.' },
    { id: 'q05', text: 'I contributed more to the team\'s performance.' },
    { id: 'q06', text: 'The other player was easy to play with.' },
    { id: 'q07', text: 'The other player was fun to play with.' },
    { id: 'q08', text: 'The other player and I had a similar playing style.' },
    { id: 'q09', text: 'The other player was human-like.' },
];

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function renderSurveyQuestions(questionsToRender) {
    const tbody = $('#survey-questions-tbody');
    tbody.empty(); // Clear any existing content

    // Debug log to verify we're getting the questions
    console.log('Rendering questions in order:', questionsToRender.map(q => q.id));

    questionsToRender.forEach((question) => {
        const row = `
        <tr>
            <td class="topic">${question.text}</td>
            <td colspan="7">
            <div class="radio-group">
                <input type="radio" name="${question.id}_agent1" value="1">
                <input type="radio" name="${question.id}_agent1" value="2">
                <input type="radio" name="${question.id}_agent1" value="3">
                <input type="radio" name="${question.id}_agent1" value="4">
                <input type="radio" name="${question.id}_agent1" value="5">
                <input type="radio" name="${question.id}_agent1" value="6">
                <input type="radio" name="${question.id}_agent1" value="7">
            </div>
            </td>
            <th class="separator-column"></th>
            <td colspan="7">
            <div class="radio-group">
                <input type="radio" name="${question.id}_agent2" value="1">
                <input type="radio" name="${question.id}_agent2" value="2">
                <input type="radio" name="${question.id}_agent2" value="3">
                <input type="radio" name="${question.id}_agent2" value="4">
                <input type="radio" name="${question.id}_agent2" value="5">
                <input type="radio" name="${question.id}_agent2" value="6">
                <input type="radio" name="${question.id}_agent2" value="7">
            </div>
            </td>
        </tr>
        `;
        tbody.append(row);
    });

    // Debug log to verify the HTML content after rendering
    console.log('Table content after rendering:', tbody.html());
}

async function loadFullSurvey() {
    var DEBUG_SURVEY = DEBUG;
    var TOPIC_FULL_DICT = {
        "agent1": {},
        "agent2": {}
    };
    var TOTAL_QUESTIONS = questions.length;

    // Create a shuffled copy of the questions array
    const shuffledQuestions = shuffleArray(questions);
    
    // Debug log to verify shuffling
    console.log('Questions shuffled:', shuffledQuestions.map(q => q.id));

    // Render the shuffled questions
    renderSurveyQuestions(shuffledQuestions);

    // Reset any previous selections
    $('.radio-group input[type="radio"]').prop('checked', false);

    // Icons above the likert are adapted to the conditions
    function updateRobotIcons() {
        let agent1Icon = $('#agent1-icon');
        let agent2Icon = $('#agent2-icon');
        let agent1Caption = $('#agent1-caption');
        let agent2Caption = $('#agent2-caption');
    
        // Remove any existing color classes
        agent1Icon.removeClass('robot-green robot-purple robot-blue robot-copper');
        agent2Icon.removeClass('robot-green robot-purple robot-blue robot-copper');
    
        if (visitedBlocks == 1) {
            agent1Icon.addClass('robot-green');
            agent2Icon.addClass('robot-blue');
        }
    
        // Main logic here to update icons
        if (currentTeamingCondition.order == 0 && currentTeamingCondition.identity == 0) {
            // Human first, transparent identity
            agent1Icon.attr('src', './images/human-head-small.png');
            agent2Icon.attr('src', './images/simple-robot-250px.png');
            agent1Caption.text('Human');
            agent2Caption.text('Robot');
        } else if (currentTeamingCondition.order == 1 && currentTeamingCondition.identity == 0) {
            // AI first, transparent identity
            agent1Icon.attr('src', './images/simple-robot-250px.png');
            agent2Icon.attr('src', './images/human-head-small.png');
            agent1Caption.text('Robot');
            agent2Caption.text('Human');
        } else if (currentTeamingCondition.order == 0 && currentTeamingCondition.identity == 1) {
            // Human first, opaque identity
            agent1Icon.attr('src', './images/triangle-black-250px.png');
            agent2Icon.attr('src', './images/triangle-black-250px.png');
            agent1Caption.text('Player 1');
            agent2Caption.text('Player 2');
        } else if (currentTeamingCondition.order == 1 && currentTeamingCondition.identity == 1) {
            // AI first, opaque identity
            agent1Icon.attr('src', './images/triangle-black-250px.png');
            agent2Icon.attr('src', './images/triangle-black-250px.png');
            agent1Caption.text('Player 1');
            agent2Caption.text('Player 2');
        }
    }

    // Call the function to update robot icons
    updateRobotIcons();

    function likertTopicAbility() {
        let [questionId, agent] = $(this).attr("name").split("_");
        TOPIC_FULL_DICT[agent][questionId] = Number($(this).val());

        checkAllAnswered();

        if (DEBUG_SURVEY) {
        console.log(
            "Radio Button Selected:",
            "Question:", questionId,
            "Agent:", agent,
            "Value:", TOPIC_FULL_DICT[agent][questionId]
        );
        }
    }

    function checkAllAnswered() {
        var totalAnswered = 0;

        for (let agent in TOPIC_FULL_DICT) {
        totalAnswered += Object.keys(TOPIC_FULL_DICT[agent]).length;
        }

        var allAnswered = totalAnswered === TOTAL_QUESTIONS * 2; // 2 agents

        $('#survey-complete-button-full').prop('disabled', !allAnswered);

        if (DEBUG_SURVEY) {
        console.log("Total answered:", totalAnswered);
        console.log("All answered:", allAnswered);
        }
    }

    async function completeExperiment() {
        numSurveyCompleted++;
        
        let path;
        if (numSurveyCompleted == 1) {
        // path = studyId + '/participantData/' + firebaseUserId1 + '/selfAssessment/full1';
        } else if (numSurveyCompleted == 2) {
        // path = studyId + '/participantData/' + firebaseUserId1 + '/selfAssessment/full2';
        }

        // Save TOPIC_FULL_DICT to your database
        // await writeRealtimeDatabase(db1, path, TOPIC_FULL_DICT);

        // Proceed to the next step
        await loadAIComparison();

        $("#ai-comparison-container").attr("hidden", false);
        $("#survey-full-container").attr("hidden", true);
    }

    // Attach event handlers after rendering questions
    $('.radio-group input[type="radio"]').click(likertTopicAbility);
    $('#survey-complete-button-full').off().click(completeExperiment);

    // Initial check in case the form is pre-filled
    checkAllAnswered();
}
//*************************************************** COMPLETE -- REDIRECT ************************************************//
async function loadCompletePage(){
    // try {
    //     let response = await fetch('path/to/complete/page.html');
    //     let text = await response.text();
    //     document.getElementById('complete-page-content-container').innerHTML = text;
    // } catch (error) {
    //     console.error('Error:', error);
    // }

    var DEBUG_COMPLETE     = false;


    /******************************************************************************
        VARIABLES

            All metadata variables that are relevant to the survey page.
    ******************************************************************************/
    // console.log("Database and firebaseuid: ", db1, firebaseUserId1); 
    // Database Path
    var COMPLETE_DB_PATH        = EXPERIMENT_DATABASE_NAME + '/participantData/' + firebaseUserId1 + '/userFeedback';

    $(document).ready(function (){
        /******************************************************************************
            FUNCTIONALITY
    
                All functions that will be used for the complete page.
        ******************************************************************************/
        function replaceClass(element, remove, add) {
            /*
                Use jQuery to replace the class of the given element.
            */
    
            $(element).removeClass(remove);
            $(element).addClass(add);
        };
        
        function copyCode() {
            /*
                Copy the Unique Code to the clipboard.
    
                Use this function if you will be providing a unique code for
                participants to submit when redirected to Prolific or MTurk.
            */
            var temp = $("<input>");
            $("body").append(temp);
            temp.val($('#code').val()).select();
            document.execCommand("copy");
            alert("Copied the code: " + temp.val());
            temp.remove();
        };
    
        function redirectToProlific() {
            /*
                Redirect participants back to prolific after the study.
            */
            //  Redirect URL for Experiment 02 (explanationstyleN with eplanations file v15) (pilot 10 participants)
            var restart;
            if (confirm("If you click 'OK', you will be redirected to Prolific. If you click 'Cancel' you will stay on this page.")) {
                restart = true;
            } else {
                restart = false;
            }
            
            // The redirect URL should be back to Prolific
            if (restart) {
                if (DEBUG_COMPLETE){
                    window.location.replace("https://skarny0.github.io/target-intercept-exp-3/");
                } else {
                    // This redirect should be updated to Prolific when you are LIVE
                    window.location.replace("https://app.prolific.com/submissions/complete?cc=C683JZHM");
                }
            }
        }
    
        function feedbackToSubmit() {
            /*
                Determine if there is feedback to submit or not.
    
                If there is then the button is enabled.
                If there isn't then the button is disabled.
    
            */
            let content = $("#user-feedback-text").val().trim();
            $('#user-feedback-button').prop('disabled', content === '');
        }
    
        function submitFeedback() {
            /*
                Submit user feedback.

            */

            let feedbacktext = $('#user-feedback-text').val();
            //let path = studyId + '/participantData/' + firebaseUserId1 + 'paricipantInfo/' + 'feedback';
            let currentPath = studyId + '/participantData/' + firebaseUserId1 + '/participantInfo/' + 'feedback'
            // writeRealtimeDatabase(db1, currentPath, feedbacktext);
    
            replaceClass('#user-feedback-button', "btn-secondary", "btn-primary");
        };
        //  Copy Unique Code to Clipboard
        $('#unique-code-copy-button').click(redirectToProlific);
    
        //  Determine if there is User Feedback to be Submitted
        $('#user-feedback-text').on('keyup', feedbackToSubmit);
    
        //  Submit User Feedback
        $('#user-feedback-button').click(submitFeedback);
    });
}
    const countdownText = document.getElementById('countdown-text');