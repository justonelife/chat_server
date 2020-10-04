var users = [];

const addUser = (sid, id, name, room) => {
    name = name.trim().toLowerCase();
    var user = { sid, id, name, room };
    users.push(user);
    return { user }
}
const removeUser = (sid) => {
    const index = users.findIndex(user => user.sid === sid);
    if (index !== -1) {
        return users.splice(index, 1)[0];
    }
}
const getUserRoom = (sid) => {
    const index = users.findIndex(user => user.sid === sid);
    if (index !== -1) {
        return users[index].room;
    }
    return null;
}
const getUsersVariable = () => {
    return users;
}

module.exports = { addUser, removeUser, getUserRoom, getUsersVariable };