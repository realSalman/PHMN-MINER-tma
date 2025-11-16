const { sendToPlayersRolledNumber, sendWinner } = require('../socket/emits');

const rollDice = (room = null) => {
    // If room is provided, check if all pawns are at base for current player
    if (room) {
        const currentPlayer = room.getCurrentlyMovingPlayer();
        if (currentPlayer) {
            const playerPawns = room.getPlayerPawns(currentPlayer.color);
            const allPawnsAtBase = playerPawns.every(pawn => pawn.position === pawn.basePos);
            
            if (allPawnsAtBase) {
                // If all 4 pawns are at base, only allow 1 or 6
                const restrictedNumbers = [1, 6];
                const randomIndex = Math.floor(Math.random() * 2);
                return restrictedNumbers[randomIndex];
            }
        }
    }
    
    // Default behavior: random 1-6
    const rolledNumber = Math.ceil(Math.random() * 6);
    return rolledNumber;
};

const makeRandomMove = async roomId => {
    const { updateRoom, getRoom } = require('../services/roomService');
    const { sendToPlayersData } = require('../socket/emits');
    const room = await getRoom(roomId);
    if (!room) return; // Room doesn't exist, exit early
    if (room.winner) return;
    // If game not started or no current moving player, skip
    const currentPlayer = room.getCurrentlyMovingPlayer();
    if (!room.started || !currentPlayer) {
        return;
    }
    
    // Check if current player is disconnected
    const isPlayerDisconnected = currentPlayer.disconnected;
    
    if (room.rolledNumber === null) {
        room.rolledNumber = rollDice(room);
        sendToPlayersRolledNumber(room._id.toString(), room.rolledNumber);
    }

    const pawnsThatCanMove = room.getPawnsThatCanMove();
    if (pawnsThatCanMove.length > 0) {
        const randomPawn = pawnsThatCanMove[Math.floor(Math.random() * pawnsThatCanMove.length)];
        room.movePawn(randomPawn);
        
        // Log automatic move for disconnected players
        if (isPlayerDisconnected) {
            console.log(`🤖 Automatic move for disconnected player ${currentPlayer.name} (${currentPlayer.color}): moved pawn ${randomPawn._id} to position ${randomPawn.position}`);
        }
    } else {
        // Log when no moves are possible
        if (isPlayerDisconnected) {
            console.log(`🤖 Disconnected player ${currentPlayer.name} (${currentPlayer.color}) has no valid moves`);
        }
    }
    
    room.changeMovingPlayer();
    const winner = room.getWinner();
    if (winner) {
        room.endGame(winner);
        sendWinner(room._id.toString(), winner);
    }
    await updateRoom(room);
    
    // Send updated room data to all players so they can see the pawn movement
    sendToPlayersData(room);
};

const isMoveValid = (session, pawn, room) => {
    console.log('=== MOVE VALIDATION DEBUG ===');
    console.log('Session color:', session.color, 'Type:', typeof session.color);
    console.log('Pawn color:', pawn.color, 'Type:', typeof pawn.color);
    console.log('Session playerId:', session.playerId);
    console.log('Currently moving player:', room.getCurrentlyMovingPlayer()?._id?.toString());
    console.log('All players in room:', room.players.map(p => ({ 
        id: p._id.toString(), 
        name: p.name, 
        color: p.color, 
        nowMoving: p.nowMoving 
    })));
    console.log('All pawns in room:', room.pawns.map(p => ({ 
        id: p._id.toString(), 
        color: p.color, 
        position: p.position 
    })));
    
    if (session.color !== pawn.color) {
        console.log('❌ Move invalid: session color does not match pawn color');
        console.log('Session color:', `"${session.color}"`);
        console.log('Pawn color:', `"${pawn.color}"`);
        console.log('Colors are equal?', session.color === pawn.color);
        return false;
    }
    const currentlyMovingPlayer = room.getCurrentlyMovingPlayer();
    if (!currentlyMovingPlayer) {
        console.log('❌ Move invalid: no currently moving player');
        return false;
    }
    if (session.playerId !== currentlyMovingPlayer._id.toString()) {
        console.log('❌ Move invalid: session playerId does not match currently moving player');
        return false;
    }
    console.log('✅ Move is valid');
    console.log('=== END MOVE VALIDATION DEBUG ===');
    return true;
};

module.exports = { rollDice, makeRandomMove, isMoveValid };
