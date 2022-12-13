const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const encryptLib = require('../modules/encryption');
const pool = require('../modules/pool');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  pool
    .query(`SELECT 
              "user".id,
              "user".username,
              "user".user_type,
              (CASE WHEN user_type = 'candidate' THEN to_json(candidate) ELSE to_json(employer) END) as user_info
            FROM "user"
            LEFT JOIN candidate ON "user".id = "candidate".user_id
            LEFT JOIN employer ON "user".id = "employer".user_id
            WHERE "user".id = $1;`, [id])
    .then((result) => {
      // Handle Errors
      let user = result && result.rows && result.rows[0];
      
      if (user.user_type === "employer")
        pool
          .query('SELECT * FROM "user" JOIN "employer" ON "user".id = "employer".user_id WHERE "user".id = $1', [id])
          .then((result) => {
          
          })
      if (user) {
        // user found
        delete user.password; // remove password so it doesn't get sent Daniel - THIS IS EXTRA! 😀
        // done takes an error (null in this case) and a user
        done(null, user);
      } else {
        // user not found
        // done takes an error (null in this case) and a user (also null in this case)
        // this will result in the server returning a 401 status code
        done(null, null);
      }

      console.log('The only console', user)
    })
    .catch((error) => {
      console.log('Error with query during deserializing user ', error);
      // done takes an error (we have one) and a user (null in this case)
      // this will result in the server returning a 500 status code
      done(error, null);
    });
});

// Does actual work of logging in
passport.use(
  'local',
  new LocalStrategy((username, password, done) => {
    pool
      .query('SELECT * FROM "user" WHERE username = $1', [username])
      .then((result) => {
        const user = result && result.rows && result.rows[0];
        if (user && encryptLib.comparePassword(password, user.password)) {
          // All good! Passwords match!
          // done takes an error (null in this case) and a user
          done(null, user);
        } else {
          // Not good! Username and password do not match.
          // done takes an error (null in this case) and a user (also null in this case)
          // this will result in the server returning a 401 status code
          done(null, null);
        }
      })
      .catch((error) => {
        console.log('Error with query for user ', error);
        // done takes an error (we have one) and a user (null in this case)
        // this will result in the server returning a 500 status code
        done(error, null);
      });
  })
);

module.exports = passport;
