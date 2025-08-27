const bcrypt = require('bcryptjs');
const password = 'password123';
const saltRounds = 12;
bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error('Error generating hash:', err);
    } else {
        console.log('Bcrypt hash:', hash);
    }
});