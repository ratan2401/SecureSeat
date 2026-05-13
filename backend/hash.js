const bcrypt = require('bcryptjs');
const password = 'admin'; // Use a strong password
bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Hashed Password:', hash);
    }
});