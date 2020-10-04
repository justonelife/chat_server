const { getUsersVariable } = require('./user');

var typing = [];

const addTypingMem = (_id, room_id) => {
    var result = typing.filter(val => val._id === _id && val.room_id === room_id);
    if (result.length > 0) return {err: 'exist'};
    const typingMem = {_id, room_id};
    typing.push(typingMem);
    return typingMem;
}

const removeTypingMem = (_id, room_id) => {
    var removeIndex = typing.findIndex(val => val._id === _id && val.room_id === room_id);
    if (removeIndex !== -1) 
        return typing.splice(removeIndex, 1)[0];
    return { err: 'not exist to remove', _id, room_id};
}

const listSocketIdForTyping = (_id, room_id) => {
    var users = getUsersVariable();
    var userMatch = users.filter(val => val.id !== _id && val.room === room_id);
    return userMatch.map(val => val.sid);
}

const listSocketIdGreenLight = (_id, room_id) => {
    var users = getUsersVariable();
    var userMatch = users.filter(val => val.id === _id && val.room === room_id);
    return userMatch.map(val => val.sid);
}


module.exports = { addTypingMem, removeTypingMem, listSocketIdForTyping, listSocketIdGreenLight };
